import React, { useState, useEffect, useCallback } from 'react';
import { Cloud, Sun, CloudRain, Wind, Droplets, Thermometer, MapPin, Loader2, RefreshCw } from 'lucide-react';
import { getWeatherData, type WeatherData, calculateAirDensity } from '@/services/weatherService';
import { toast } from 'sonner';

interface Props {
  lang: string;
  onWeatherData?: (data: WeatherData) => void;
  compact?: boolean;
}

/**
 * LiveWeatherOverlay - Fetches real-time weather data based on geolocation
 * Shows weather conditions when user captures/uploads images/videos
 * Displays temperature, humidity, air density, and wind info with weather icons
 */
export default function LiveWeatherOverlay({ lang, onWeatherData, compact = false }: Props) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const isAr = lang === 'ar';

  // Reverse geocode to get city name
  const reverseGeocode = useCallback(async (lat: number, lon: number) => {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=${lang}`
      );
      if (resp.ok) {
        const data = await resp.json();
        const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state || '';
        const country = data.address?.country || '';
        setLocationName(city ? `${city}, ${country}` : country);
      }
    } catch {
      // Silently fail - location name is optional
    }
  }, [lang]);

  const fetchWeather = useCallback(async () => {
    if (!navigator.geolocation) {
      setError(isAr ? 'الموقع الجغرافي غير مدعوم' : 'Geolocation not supported');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const data = await getWeatherData(latitude, longitude);
          if (data) {
            setWeather(data);
            setHasPermission(true);
            onWeatherData?.(data);
            reverseGeocode(latitude, longitude);
          } else {
            setError(isAr ? 'تعذر جلب بيانات الطقس' : 'Failed to fetch weather data');
          }
        } catch {
          setError(isAr ? 'خطأ في جلب بيانات الطقس' : 'Weather fetch error');
        }
        setLoading(false);
      },
      (err) => {
        setHasPermission(false);
        setError(
          err.code === 1
            ? (isAr ? 'تم رفض إذن الموقع' : 'Location permission denied')
            : (isAr ? 'تعذر تحديد الموقع' : 'Could not determine location')
        );
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [isAr, onWeatherData, reverseGeocode]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  // Weather icon based on temperature and humidity
  const getWeatherIcon = () => {
    if (!weather) return <Cloud className="w-5 h-5" />;
    if (weather.humidity > 80) return <CloudRain className="w-5 h-5 text-blue-400" />;
    if (weather.temperature > 30) return <Sun className="w-5 h-5 text-yellow-400" />;
    if (weather.windSpeed > 5) return <Wind className="w-5 h-5 text-cyan-400" />;
    return <Sun className="w-5 h-5 text-amber-400" />;
  };

  // Generate AI-style message about the weather conditions
  const getWeatherMessage = () => {
    if (!weather) return '';
    const viscosity = (1.458e-6 * Math.pow(weather.temperature + 273.15, 1.5)) / (weather.temperature + 273.15 + 110.4);
    
    if (isAr) {
      return `${locationName ? `أنت في ${locationName} الآن، ` : ''}درجة الحرارة ${weather.temperature.toFixed(1)}°C، والرطوبة ${weather.humidity.toFixed(0)}%، سأقوم بحساب لزوجة الهواء (${(viscosity * 1e5).toFixed(2)} × 10⁻⁵ Pa·s) وتأثيرها على المقذوف بناءً على هذه البيانات.`;
    }
    return `${locationName ? `You're in ${locationName}, ` : ''}Temperature ${weather.temperature.toFixed(1)}°C, Humidity ${weather.humidity.toFixed(0)}%. Air viscosity (${(viscosity * 1e5).toFixed(2)} × 10⁻⁵ Pa·s) will be factored into projectile calculations.`;
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 animate-pulse">
        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
        <span className="text-[10px] text-blue-300">
          {isAr ? 'جاري جلب بيانات الطقس...' : 'Fetching weather data...'}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
        <Cloud className="w-4 h-4 text-yellow-400" />
        <span className="text-[10px] text-yellow-300">{error}</span>
        <button onClick={fetchWeather} className="p-1 rounded hover:bg-yellow-500/20 transition-all">
          <RefreshCw className="w-3 h-3 text-yellow-400" />
        </button>
      </div>
    );
  }

  if (!weather) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/10">
        {getWeatherIcon()}
        <span className="text-[10px] text-white font-medium">{weather.temperature.toFixed(0)}°C</span>
        <Droplets className="w-3 h-3 text-blue-300" />
        <span className="text-[10px] text-white/70">{weather.humidity.toFixed(0)}%</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/50 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent p-3 space-y-2">
      {/* Header with weather icon and location */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
          {getWeatherIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-primary shrink-0" />
            <span className="text-xs font-semibold text-foreground truncate">
              {locationName || (isAr ? 'الموقع الحالي' : 'Current Location')}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {isAr ? 'بيانات الطقس الحية' : 'Live Weather Data'}
          </p>
        </div>
        <button onClick={fetchWeather} className="p-1.5 rounded-lg hover:bg-secondary transition-all" title={isAr ? 'تحديث' : 'Refresh'}>
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Weather data grid */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="flex items-center gap-1.5 p-1.5 rounded bg-secondary/40">
          <Thermometer className="w-3 h-3 text-red-400 shrink-0" />
          <div>
            <p className="text-[9px] text-muted-foreground">{isAr ? 'الحرارة' : 'Temp'}</p>
            <p className="text-[11px] font-mono font-semibold text-foreground">{weather.temperature.toFixed(1)}°C</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 p-1.5 rounded bg-secondary/40">
          <Droplets className="w-3 h-3 text-blue-400 shrink-0" />
          <div>
            <p className="text-[9px] text-muted-foreground">{isAr ? 'الرطوبة' : 'Humidity'}</p>
            <p className="text-[11px] font-mono font-semibold text-foreground">{weather.humidity.toFixed(0)}%</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 p-1.5 rounded bg-secondary/40">
          <Wind className="w-3 h-3 text-cyan-400 shrink-0" />
          <div>
            <p className="text-[9px] text-muted-foreground">{isAr ? 'الرياح' : 'Wind'}</p>
            <p className="text-[11px] font-mono font-semibold text-foreground">{weather.windSpeed.toFixed(1)} m/s</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 p-1.5 rounded bg-secondary/40">
          <Cloud className="w-3 h-3 text-purple-400 shrink-0" />
          <div>
            <p className="text-[9px] text-muted-foreground">{isAr ? 'كثافة الهواء' : 'Air Density'}</p>
            <p className="text-[11px] font-mono font-semibold text-foreground">{weather.airDensity.toFixed(4)} kg/m³</p>
          </div>
        </div>
      </div>

      {/* AI-style weather message */}
      <div className="p-2 rounded-lg bg-primary/5 border border-primary/10">
        <p className="text-[10px] text-foreground/80 leading-relaxed" dir={isAr ? 'rtl' : 'ltr'}>
          {getWeatherMessage()}
        </p>
      </div>
    </div>
  );
}
