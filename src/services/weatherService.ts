/**
 * Weather Service for APAS
 * Integrates with OpenWeather API to get real-time weather conditions
 * 
 * Features:
 * - Get current weather at location
 * - Extract wind speed and direction
 * - Get air density from pressure and temperature
 * - Cache weather data to reduce API calls
 */

export interface WeatherData {
  temperature: number; // Celsius
  pressure: number; // hPa
  humidity: number; // %
  windSpeed: number; // m/s
  windDirection: number; // degrees
  airDensity: number; // kg/m³
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface OpenWeatherResponse {
  main: {
    temp: number;
    pressure: number;
    humidity: number;
  };
  wind: {
    speed: number;
    deg?: number;
  };
  coord: {
    lat: number;
    lon: number;
  };
}

// Cache for weather data
const weatherCache = new Map<string, { data: WeatherData; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Calculate air density from temperature and pressure
 * Using ideal gas law: ρ = (P / (R * T))
 * @param temperatureCelsius - Temperature in Celsius
 * @param pressureHPa - Pressure in hectopascals
 * @param humidityPercent - Humidity percentage
 * @returns Air density in kg/m³
 */
export const calculateAirDensity = (
  temperatureCelsius: number,
  pressureHPa: number,
  humidityPercent: number = 50
): number => {
  // Convert to SI units
  const temperatureKelvin = temperatureCelsius + 273.15;
  const pressurePa = pressureHPa * 100;
  
  // Specific gas constant for dry air
  const R_DRY = 287.05; // J/(kg·K)
  
  // Partial pressure of water vapor (simplified)
  const saturationVaporPressure = 611.2 * Math.exp((17.62 * temperatureCelsius) / (243.12 + temperatureCelsius));
  const vaporPressure = (humidityPercent / 100) * saturationVaporPressure;
  
  // Partial pressure of dry air
  const dryPressure = pressurePa - vaporPressure;
  
  // Density calculation
  const dryAirDensity = dryPressure / (R_DRY * temperatureKelvin);
  
  // Specific gas constant for water vapor
  const R_VAPOR = 461.5; // J/(kg·K)
  const vaporDensity = vaporPressure / (R_VAPOR * temperatureKelvin);
  
  // Total density
  const totalDensity = dryAirDensity + vaporDensity;
  
  return Math.max(0.1, totalDensity); // Ensure positive value
};

/**
 * Get weather data from OpenWeather API
 * @param latitude - Location latitude
 * @param longitude - Location longitude
 * @param apiKey - OpenWeather API key (optional, uses free tier if not provided)
 * @returns Weather data
 */
export const getWeatherData = async (
  latitude: number,
  longitude: number,
  apiKey?: string
): Promise<WeatherData | null> => {
  const cacheKey = `${latitude.toFixed(2)}_${longitude.toFixed(2)}`;
  
  // Check cache
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  try {
    // Use free API if no key provided
    const url = apiKey
      ? `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`
      : `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,pressure_msl,wind_speed_10m,wind_direction_10m`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Weather API error: ${response.status}`);
    
    const data = await response.json();
    
    let weatherData: WeatherData;
    
    if (apiKey) {
      // OpenWeather API format
      const owData = data as OpenWeatherResponse;
      weatherData = {
        temperature: owData.main.temp,
        pressure: owData.main.pressure,
        humidity: owData.main.humidity,
        windSpeed: owData.wind.speed,
        windDirection: owData.wind.deg || 0,
        airDensity: calculateAirDensity(owData.main.temp, owData.main.pressure, owData.main.humidity),
        latitude: owData.coord.lat,
        longitude: owData.coord.lon,
        timestamp: Date.now()
      };
    } else {
      // Open-Meteo API format (free, no key required)
      const current = data.current;
      weatherData = {
        temperature: current.temperature_2m,
        pressure: current.pressure_msl,
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m / 3.6, // Convert km/h to m/s
        windDirection: current.wind_direction_10m,
        airDensity: calculateAirDensity(
          current.temperature_2m,
          current.pressure_msl,
          current.relative_humidity_2m
        ),
        latitude,
        longitude,
        timestamp: Date.now()
      };
    }
    
    // Cache the result
    weatherCache.set(cacheKey, { data: weatherData, timestamp: Date.now() });
    
    return weatherData;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
};

/**
 * Get weather for current user location
 * @param apiKey - OpenWeather API key (optional)
 * @returns Weather data
 */
export const getWeatherForCurrentLocation = async (apiKey?: string): Promise<WeatherData | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      resolve(null);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const weatherData = await getWeatherData(latitude, longitude, apiKey);
        resolve(weatherData);
      },
      (error) => {
        console.error('Geolocation error:', error);
        resolve(null);
      }
    );
  });
};

/**
 * Get wind component in projectile direction
 * @param windSpeed - Wind speed (m/s)
 * @param windDirection - Wind direction (degrees, 0 = North)
 * @param projectileDirection - Projectile direction (degrees, 0 = East)
 * @returns Component of wind in projectile direction
 */
export const getWindComponent = (
  windSpeed: number,
  windDirection: number,
  projectileDirection: number
): number => {
  // Convert to radians
  const windRad = (windDirection * Math.PI) / 180;
  const projRad = (projectileDirection * Math.PI) / 180;
  
  // Calculate component
  const angle = windRad - projRad;
  return windSpeed * Math.cos(angle);
};

/**
 * Get standard atmosphere data at altitude
 * @param altitude - Altitude in meters
 * @returns {temperature, pressure, density}
 */
export const getStandardAtmosphere = (altitude: number) => {
  // Standard atmosphere model (ISA)
  const T0 = 288.15; // Sea level temperature (K)
  const P0 = 101325; // Sea level pressure (Pa)
  const rho0 = 1.225; // Sea level density (kg/m³)
  const L = 0.0065; // Temperature lapse rate (K/m)
  const g = 9.81; // Gravity
  const R = 287.05; // Specific gas constant for air
  
  // Temperature at altitude
  const temperature = T0 - L * altitude;
  
  if (temperature <= 0) {
    // Return minimal values above stratosphere
    return { temperature: 0, pressure: 0, density: 0 };
  }
  
  // Pressure at altitude
  const exponent = -(g / (R * L));
  const pressure = P0 * Math.pow(temperature / T0, exponent);
  
  // Density at altitude
  const density = pressure / (R * temperature);
  
  return {
    temperature: temperature - 273.15, // Convert to Celsius
    pressure: pressure / 100, // Convert to hPa
    density: Math.max(0, density)
  };
};

/**
 * Estimate air density at altitude without weather data
 * @param altitude - Altitude in meters
 * @param seaLevelDensity - Sea level density (default: 1.225 kg/m³)
 * @returns Air density in kg/m³
 */
export const estimateAirDensityAtAltitude = (
  altitude: number,
  seaLevelDensity: number = 1.225
): number => {
  const atmosphere = getStandardAtmosphere(altitude);
  if (atmosphere.density > 0) {
    return atmosphere.density;
  }
  
  // Fallback to exponential model
  const scaleHeight = 8500;
  return seaLevelDensity * Math.exp(-altitude / scaleHeight);
};

/**
 * Get weather conditions description
 * @param weatherData - Weather data object
 * @returns Human-readable description
 */
export const getWeatherDescription = (weatherData: WeatherData): string => {
  const parts: string[] = [];
  
  parts.push(`${weatherData.temperature.toFixed(1)}°C`);
  parts.push(`Wind: ${weatherData.windSpeed.toFixed(1)} m/s`);
  parts.push(`Pressure: ${weatherData.pressure.toFixed(0)} hPa`);
  parts.push(`Humidity: ${weatherData.humidity.toFixed(0)}%`);
  parts.push(`Air Density: ${weatherData.airDensity.toFixed(4)} kg/m³`);
  
  return parts.join(' | ');
};

/**
 * Clear weather cache
 */
export const clearWeatherCache = (): void => {
  weatherCache.clear();
};

/**
 * Get cache statistics
 */
export const getWeatherCacheStats = () => {
  return {
    size: weatherCache.size,
    entries: Array.from(weatherCache.keys())
  };
};
