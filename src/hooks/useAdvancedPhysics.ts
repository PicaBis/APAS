/**
 * Advanced Physics Hook for APAS
 * Integrates advanced physics features: Coriolis, Centrifugal, Magnus, Gyroscopic,
 * Buoyancy, Hydrodynamic, Relativistic, Environmental Coupling
 *
 * Uses useReducer to consolidate 23+ individual useState calls into a single
 * state object, reducing the dependency list from 28 items down to 1 (state).
 */

import { useReducer, useCallback } from 'react';
import {
  calculateCoriolisAcceleration,
  getAirDensityAtAltitude,
  calculateMagnusAcceleration,
  type AdvancedPhysicsParams,
} from '@/utils/advancedPhysics';
import { getWeatherData, getWeatherForCurrentLocation, type WeatherData } from '@/services/weatherService';
import { getErrorMessage } from '@/utils/errorHandler';

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

// ── Reducer actions ──────────────────────────────────────────

type AdvancedPhysicsAction =
  | { type: 'SET_FIELD'; field: keyof AdvancedPhysicsState; value: AdvancedPhysicsState[keyof AdvancedPhysicsState] }
  | { type: 'WEATHER_LOADING' }
  | { type: 'WEATHER_SUCCESS'; data: WeatherData }
  | { type: 'WEATHER_SUCCESS_WITH_LOCATION'; data: WeatherData }
  | { type: 'WEATHER_ERROR'; error: string };

const initialState: AdvancedPhysicsState = {
  enableCoriolis: false,
  enableMagnus: false,
  enableAltitudeDensity: false,
  enableWeatherIntegration: false,
  enableCentrifugal: false,
  enableRelativeMotion: false,
  enableBuoyancy: false,
  enableHydrodynamicDrag: false,
  enableFluidPressure: false,
  isUnderwater: false,
  enableGyroscopic: false,
  enableBallisticStability: false,
  enableRelativistic: false,
  enableEnvironmentalCoupling: false,
  latitude: 0,
  longitude: 0,
  diameter: 0.045,
  dragCoefficient: 0.47,
  spinRate: 0,
  frameVx: 0,
  frameVy: 0,
  frameAx: 0,
  frameAy: 0,
  frameOmega: 0,
  fluidDensity: 1000,
  environmentTemperature: 15,
  environmentPressure: 101325,
  environmentHumidity: 0.5,
  weatherData: null,
  weatherLoading: false,
  weatherError: null,
};

function advancedPhysicsReducer(
  state: AdvancedPhysicsState,
  action: AdvancedPhysicsAction
): AdvancedPhysicsState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'WEATHER_LOADING':
      return { ...state, weatherLoading: true, weatherError: null };
    case 'WEATHER_SUCCESS':
      return { ...state, weatherLoading: false, weatherData: action.data };
    case 'WEATHER_SUCCESS_WITH_LOCATION':
      return {
        ...state,
        weatherLoading: false,
        weatherData: action.data,
        latitude: action.data.latitude,
        longitude: action.data.longitude,
      };
    case 'WEATHER_ERROR':
      return { ...state, weatherLoading: false, weatherError: action.error };
    default:
      return state;
  }
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
  const [state, dispatch] = useReducer(advancedPhysicsReducer, initialState);

  // Setters (stable references — dispatch identity never changes)
  const setEnableCoriolis = useCallback((v: boolean) => dispatch({ type: 'SET_FIELD', field: 'enableCoriolis', value: v }), []);
  const setEnableMagnus = useCallback((v: boolean) => dispatch({ type: 'SET_FIELD', field: 'enableMagnus', value: v }), []);
  const setEnableAltitudeDensity = useCallback((v: boolean) => dispatch({ type: 'SET_FIELD', field: 'enableAltitudeDensity', value: v }), []);
  const setEnableWeatherIntegration = useCallback((v: boolean) => dispatch({ type: 'SET_FIELD', field: 'enableWeatherIntegration', value: v }), []);
  const setEnableCentrifugal = useCallback((v: boolean) => dispatch({ type: 'SET_FIELD', field: 'enableCentrifugal', value: v }), []);
  const setEnableRelativeMotion = useCallback((v: boolean) => dispatch({ type: 'SET_FIELD', field: 'enableRelativeMotion', value: v }), []);
  const setEnableBuoyancy = useCallback((v: boolean) => dispatch({ type: 'SET_FIELD', field: 'enableBuoyancy', value: v }), []);
  const setEnableHydrodynamicDrag = useCallback((v: boolean) => dispatch({ type: 'SET_FIELD', field: 'enableHydrodynamicDrag', value: v }), []);
  const setEnableFluidPressure = useCallback((v: boolean) => dispatch({ type: 'SET_FIELD', field: 'enableFluidPressure', value: v }), []);
  const setIsUnderwater = useCallback((v: boolean) => dispatch({ type: 'SET_FIELD', field: 'isUnderwater', value: v }), []);
  const setEnableGyroscopic = useCallback((v: boolean) => dispatch({ type: 'SET_FIELD', field: 'enableGyroscopic', value: v }), []);
  const setEnableBallisticStability = useCallback((v: boolean) => dispatch({ type: 'SET_FIELD', field: 'enableBallisticStability', value: v }), []);
  const setEnableRelativistic = useCallback((v: boolean) => dispatch({ type: 'SET_FIELD', field: 'enableRelativistic', value: v }), []);
  const setEnableEnvironmentalCoupling = useCallback((v: boolean) => dispatch({ type: 'SET_FIELD', field: 'enableEnvironmentalCoupling', value: v }), []);
  const setLatitude = useCallback((v: number) => dispatch({ type: 'SET_FIELD', field: 'latitude', value: v }), []);
  const setLongitude = useCallback((v: number) => dispatch({ type: 'SET_FIELD', field: 'longitude', value: v }), []);
  const setDiameter = useCallback((v: number) => dispatch({ type: 'SET_FIELD', field: 'diameter', value: v }), []);
  const setDragCoefficient = useCallback((v: number) => dispatch({ type: 'SET_FIELD', field: 'dragCoefficient', value: v }), []);
  const setSpinRate = useCallback((v: number) => dispatch({ type: 'SET_FIELD', field: 'spinRate', value: v }), []);
  const setFrameVx = useCallback((v: number) => dispatch({ type: 'SET_FIELD', field: 'frameVx', value: v }), []);
  const setFrameVy = useCallback((v: number) => dispatch({ type: 'SET_FIELD', field: 'frameVy', value: v }), []);
  const setFrameAx = useCallback((v: number) => dispatch({ type: 'SET_FIELD', field: 'frameAx', value: v }), []);
  const setFrameAy = useCallback((v: number) => dispatch({ type: 'SET_FIELD', field: 'frameAy', value: v }), []);
  const setFrameOmega = useCallback((v: number) => dispatch({ type: 'SET_FIELD', field: 'frameOmega', value: v }), []);
  const setFluidDensity = useCallback((v: number) => dispatch({ type: 'SET_FIELD', field: 'fluidDensity', value: v }), []);
  const setEnvironmentTemperature = useCallback((v: number) => dispatch({ type: 'SET_FIELD', field: 'environmentTemperature', value: v }), []);
  const setEnvironmentPressure = useCallback((v: number) => dispatch({ type: 'SET_FIELD', field: 'environmentPressure', value: v }), []);
  const setEnvironmentHumidity = useCallback((v: number) => dispatch({ type: 'SET_FIELD', field: 'environmentHumidity', value: v }), []);

  // Async actions
  const fetchWeatherData = useCallback(async () => {
    dispatch({ type: 'WEATHER_LOADING' });
    try {
      const data = await getWeatherData(state.latitude, state.longitude);
      if (data) {
        dispatch({ type: 'WEATHER_SUCCESS', data });
      } else {
        dispatch({ type: 'WEATHER_ERROR', error: 'Failed to fetch weather data' });
      }
    } catch (error) {
      dispatch({ type: 'WEATHER_ERROR', error: getErrorMessage(error) });
    }
  }, [state.latitude, state.longitude]);

  const fetchWeatherForCurrentLocation = useCallback(async () => {
    dispatch({ type: 'WEATHER_LOADING' });
    try {
      const data = await getWeatherForCurrentLocation();
      if (data) {
        dispatch({ type: 'WEATHER_SUCCESS_WITH_LOCATION', data });
      } else {
        dispatch({ type: 'WEATHER_ERROR', error: 'Could not get current location weather' });
      }
    } catch (error) {
      dispatch({ type: 'WEATHER_ERROR', error: getErrorMessage(error) });
    }
  }, []);

  // Derived callbacks (depend on consolidated state)
  const buildAdvancedPhysicsParams = useCallback(
    (gravity: number, mass: number, airDensity: number, windSpeed: number): AdvancedPhysicsParams => {
      let effectiveAirDensity = airDensity;
      let effectiveWindSpeed = windSpeed;

      if (state.enableWeatherIntegration && state.weatherData) {
        effectiveAirDensity = state.weatherData.airDensity;
        effectiveWindSpeed = state.weatherData.windSpeed;
      }

      return {
        gravity,
        mass,
        diameter: state.diameter,
        dragCoefficient: state.dragCoefficient,
        airDensity: effectiveAirDensity,
        windSpeed: effectiveWindSpeed,
        latitude: state.latitude,
        spinRate: state.spinRate,
        enableCoriolis: state.enableCoriolis,
        enableMagnus: state.enableMagnus,
        enableAltitudeDensity: state.enableAltitudeDensity,
        enableCentrifugal: state.enableCentrifugal,
        enableRelativeMotion: state.enableRelativeMotion,
        frameVx: state.frameVx,
        frameVy: state.frameVy,
        frameAx: state.frameAx,
        frameAy: state.frameAy,
        frameOmega: state.frameOmega,
        enableBuoyancy: state.enableBuoyancy,
        enableHydrodynamicDrag: state.enableHydrodynamicDrag,
        enableFluidPressure: state.enableFluidPressure,
        isUnderwater: state.isUnderwater,
        fluidDensity: state.fluidDensity,
        enableGyroscopic: state.enableGyroscopic,
        enableBallisticStability: state.enableBallisticStability,
        enableRelativistic: state.enableRelativistic,
        enableEnvironmentalCoupling: state.enableEnvironmentalCoupling,
        environmentTemperature: state.environmentTemperature,
        environmentPressure: state.environmentPressure,
        environmentHumidity: state.environmentHumidity,
      };
    },
    [state]
  );

  const calculateCoriolisEffect = useCallback(
    (vx: number, vy: number) => {
      if (!state.enableCoriolis) return { ax: 0, ay: 0 };
      return calculateCoriolisAcceleration(vx, vy, state.latitude);
    },
    [state.enableCoriolis, state.latitude]
  );

  const calculateAltitudeDensity = useCallback(
    (altitude: number, baseDensity: number) => {
      if (!state.enableAltitudeDensity) return baseDensity;
      return getAirDensityAtAltitude(altitude, baseDensity);
    },
    [state.enableAltitudeDensity]
  );

  const calculateMagnusForce = useCallback(
    (velocity: number, density: number) => {
      if (!state.enableMagnus || state.spinRate === 0) return 0;
      return calculateMagnusAcceleration(velocity, state.spinRate, state.diameter, density);
    },
    [state.enableMagnus, state.spinRate, state.diameter]
  );

  return {
    ...state,

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
