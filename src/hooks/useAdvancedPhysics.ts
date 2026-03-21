/**
 * Advanced Physics Hook for APAS
 * Integrates advanced physics features: Coriolis, Centrifugal, Magnus, Gyroscopic,
 * Buoyancy, Hydrodynamic, Relativistic, Environmental Coupling
 */

import { useState, useCallback } from 'react';
import {
  calculateCoriolisAcceleration,
  getAirDensityAtAltitude,
  calculateMagnusAcceleration,
  type AdvancedPhysicsParams,
} from '@/utils/advancedPhysics';
import { getWeatherData, getWeatherForCurrentLocation, type WeatherData } from '@/services/weatherService';

export interface AdvancedPhysicsState {
  // Original toggles
  enableCoriolis: boolean;
  enableMagnus: boolean;
  enableAltitudeDensity: boolean;
  enableWeatherIntegration: boolean;
  // New toggles
  enableCentrifugal: boolean;
  enableRelativeMotion: boolean;
  enableBuoyancy: boolean;
  enableHydrodynamicDrag: boolean;
  enableFluidPressure: boolean;
  isUnderwater: boolean;
  enableGyroscopic: boolean;
  enableBallisticStability: boolean;
  enableRelativistic: boolean;
  enableEnvironmentalCoupling: boolean;

  // Original parameters
  latitude: number;
  longitude: number;
  diameter: number;
  dragCoefficient: number;
  spinRate: number;
  // New parameters
  frameVx: number;
  frameVy: number;
  frameAx: number;
  frameAy: number;
  frameOmega: number;
  fluidDensity: number;
  environmentTemperature: number;
  environmentPressure: number;
  environmentHumidity: number;

  // Weather data
  weatherData: WeatherData | null;
  weatherLoading: boolean;
  weatherError: string | null;
}

export interface UseAdvancedPhysicsReturn extends AdvancedPhysicsState {
  // Original setters
  setEnableCoriolis: (value: boolean) => void;
  setEnableMagnus: (value: boolean) => void;
  setEnableAltitudeDensity: (value: boolean) => void;
  setEnableWeatherIntegration: (value: boolean) => void;
  setLatitude: (value: number) => void;
  setLongitude: (value: number) => void;
  setDiameter: (value: number) => void;
  setDragCoefficient: (value: number) => void;
  setSpinRate: (value: number) => void;
  // New setters
  setEnableCentrifugal: (value: boolean) => void;
  setEnableRelativeMotion: (value: boolean) => void;
  setEnableBuoyancy: (value: boolean) => void;
  setEnableHydrodynamicDrag: (value: boolean) => void;
  setEnableFluidPressure: (value: boolean) => void;
  setIsUnderwater: (value: boolean) => void;
  setEnableGyroscopic: (value: boolean) => void;
  setEnableBallisticStability: (value: boolean) => void;
  setEnableRelativistic: (value: boolean) => void;
  setEnableEnvironmentalCoupling: (value: boolean) => void;
  setFrameVx: (value: number) => void;
  setFrameVy: (value: number) => void;
  setFrameAx: (value: number) => void;
  setFrameAy: (value: number) => void;
  setFrameOmega: (value: number) => void;
  setFluidDensity: (value: number) => void;
  setEnvironmentTemperature: (value: number) => void;
  setEnvironmentPressure: (value: number) => void;
  setEnvironmentHumidity: (value: number) => void;

  // Methods
  fetchWeatherData: () => Promise<void>;
  fetchWeatherForCurrentLocation: () => Promise<void>;
  buildAdvancedPhysicsParams: (
    gravity: number,
    mass: number,
    airDensity: number,
    windSpeed: number
  ) => AdvancedPhysicsParams;
  calculateCoriolisEffect: (vx: number, vy: number) => { ax: number; ay: number };
  calculateAltitudeDensity: (altitude: number, baseDensity: number) => number;
  calculateMagnusForce: (velocity: number, density: number) => number;
}

export function useAdvancedPhysics(): UseAdvancedPhysicsReturn {
  // Original toggles
  const [enableCoriolis, setEnableCoriolis] = useState(false);
  const [enableMagnus, setEnableMagnus] = useState(false);
  const [enableAltitudeDensity, setEnableAltitudeDensity] = useState(false);
  const [enableWeatherIntegration, setEnableWeatherIntegration] = useState(false);
  // New toggles
  const [enableCentrifugal, setEnableCentrifugal] = useState(false);
  const [enableRelativeMotion, setEnableRelativeMotion] = useState(false);
  const [enableBuoyancy, setEnableBuoyancy] = useState(false);
  const [enableHydrodynamicDrag, setEnableHydrodynamicDrag] = useState(false);
  const [enableFluidPressure, setEnableFluidPressure] = useState(false);
  const [isUnderwater, setIsUnderwater] = useState(false);
  const [enableGyroscopic, setEnableGyroscopic] = useState(false);
  const [enableBallisticStability, setEnableBallisticStability] = useState(false);
  const [enableRelativistic, setEnableRelativistic] = useState(false);
  const [enableEnvironmentalCoupling, setEnableEnvironmentalCoupling] = useState(false);

  // Original parameters
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [diameter, setDiameter] = useState(0.045);
  const [dragCoefficient, setDragCoefficient] = useState(0.47);
  const [spinRate, setSpinRate] = useState(0);
  // New parameters
  const [frameVx, setFrameVx] = useState(0);
  const [frameVy, setFrameVy] = useState(0);
  const [frameAx, setFrameAx] = useState(0);
  const [frameAy, setFrameAy] = useState(0);
  const [frameOmega, setFrameOmega] = useState(0);
  const [fluidDensity, setFluidDensity] = useState(1000); // water
  const [environmentTemperature, setEnvironmentTemperature] = useState(15);
  const [environmentPressure, setEnvironmentPressure] = useState(101325);
  const [environmentHumidity, setEnvironmentHumidity] = useState(0.5);

  // Weather data
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const fetchWeatherData = useCallback(async () => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const data = await getWeatherData(latitude, longitude);
      if (data) {
        setWeatherData(data);
      } else {
        setWeatherError('Failed to fetch weather data');
      }
    } catch (error) {
      setWeatherError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setWeatherLoading(false);
    }
  }, [latitude, longitude]);

  const fetchWeatherForCurrentLocation = useCallback(async () => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const data = await getWeatherForCurrentLocation();
      if (data) {
        setWeatherData(data);
        setLatitude(data.latitude);
        setLongitude(data.longitude);
      } else {
        setWeatherError('Could not get current location weather');
      }
    } catch (error) {
      setWeatherError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  const buildAdvancedPhysicsParams = useCallback(
    (gravity: number, mass: number, airDensity: number, windSpeed: number): AdvancedPhysicsParams => {
      let effectiveAirDensity = airDensity;
      let effectiveWindSpeed = windSpeed;

      if (enableWeatherIntegration && weatherData) {
        effectiveAirDensity = weatherData.airDensity;
        effectiveWindSpeed = weatherData.windSpeed;
      }

      return {
        gravity,
        mass,
        diameter,
        dragCoefficient,
        airDensity: effectiveAirDensity,
        windSpeed: effectiveWindSpeed,
        latitude,
        spinRate,
        enableCoriolis,
        enableMagnus,
        enableAltitudeDensity,
        // New fields
        enableCentrifugal,
        enableRelativeMotion,
        frameVx,
        frameVy,
        frameAx,
        frameAy,
        frameOmega,
        enableBuoyancy,
        enableHydrodynamicDrag,
        enableFluidPressure,
        isUnderwater,
        fluidDensity,
        enableGyroscopic,
        enableBallisticStability,
        enableRelativistic,
        enableEnvironmentalCoupling,
        environmentTemperature,
        environmentPressure,
        environmentHumidity,
      };
    },
    [enableCoriolis, enableMagnus, enableAltitudeDensity, enableWeatherIntegration,
     diameter, dragCoefficient, latitude, spinRate, weatherData,
     enableCentrifugal, enableRelativeMotion, frameVx, frameVy, frameAx, frameAy, frameOmega,
     enableBuoyancy, enableHydrodynamicDrag, enableFluidPressure, isUnderwater, fluidDensity,
     enableGyroscopic, enableBallisticStability, enableRelativistic,
     enableEnvironmentalCoupling, environmentTemperature, environmentPressure, environmentHumidity]
  );

  const calculateCoriolisEffect = useCallback(
    (vx: number, vy: number) => {
      if (!enableCoriolis) return { ax: 0, ay: 0 };
      return calculateCoriolisAcceleration(vx, vy, latitude);
    },
    [enableCoriolis, latitude]
  );

  const calculateAltitudeDensity = useCallback(
    (altitude: number, baseDensity: number) => {
      if (!enableAltitudeDensity) return baseDensity;
      return getAirDensityAtAltitude(altitude, baseDensity);
    },
    [enableAltitudeDensity]
  );

  const calculateMagnusForce = useCallback(
    (velocity: number, density: number) => {
      if (!enableMagnus || spinRate === 0) return 0;
      return calculateMagnusAcceleration(velocity, spinRate, diameter, density);
    },
    [enableMagnus, spinRate, diameter]
  );

  return {
    // State
    enableCoriolis,
    enableMagnus,
    enableAltitudeDensity,
    enableWeatherIntegration,
    enableCentrifugal,
    enableRelativeMotion,
    enableBuoyancy,
    enableHydrodynamicDrag,
    enableFluidPressure,
    isUnderwater,
    enableGyroscopic,
    enableBallisticStability,
    enableRelativistic,
    enableEnvironmentalCoupling,
    latitude,
    longitude,
    diameter,
    dragCoefficient,
    spinRate,
    frameVx,
    frameVy,
    frameAx,
    frameAy,
    frameOmega,
    fluidDensity,
    environmentTemperature,
    environmentPressure,
    environmentHumidity,
    weatherData,
    weatherLoading,
    weatherError,

    // Setters
    setEnableCoriolis,
    setEnableMagnus,
    setEnableAltitudeDensity,
    setEnableWeatherIntegration,
    setEnableCentrifugal,
    setEnableRelativeMotion,
    setEnableBuoyancy,
    setEnableHydrodynamicDrag,
    setEnableFluidPressure,
    setIsUnderwater,
    setEnableGyroscopic,
    setEnableBallisticStability,
    setEnableRelativistic,
    setEnableEnvironmentalCoupling,
    setLatitude,
    setLongitude,
    setDiameter,
    setDragCoefficient,
    setSpinRate,
    setFrameVx,
    setFrameVy,
    setFrameAx,
    setFrameAy,
    setFrameOmega,
    setFluidDensity,
    setEnvironmentTemperature,
    setEnvironmentPressure,
    setEnvironmentHumidity,

    // Methods
    fetchWeatherData,
    fetchWeatherForCurrentLocation,
    buildAdvancedPhysicsParams,
    calculateCoriolisEffect,
    calculateAltitudeDensity,
    calculateMagnusForce,
  };
}
