/**
 * Relativity & Reference Frames Hook for APAS
 * Manages state for the relativity module and provides computed trajectories
 */

import { useState, useCallback, useMemo } from 'react';
import {
  computeDualFrameTrajectory,
  computeRelativityMeta,
  getRelativityExplanation,
  getSpeedDescription,
  SPEED_OF_LIGHT,
  type RelativityMode,
  type ObserverFrame,
  type RelativityParams,
  type DualFrameTrajectory,
  type RelativityMeta,
} from '@/utils/relativityPhysics';
import type { TrajectoryPoint } from '@/utils/physics';

export interface UseRelativityReturn {
  // State
  enabled: boolean;
  mode: RelativityMode;
  frameVelocity: number;
  activeObserver: ObserverFrame;
  showDualTrajectories: boolean;

  // Setters
  setEnabled: (value: boolean) => void;
  setMode: (value: RelativityMode) => void;
  setFrameVelocity: (value: number) => void;
  setActiveObserver: (value: ObserverFrame) => void;
  setShowDualTrajectories: (value: boolean) => void;

  // Computed
  params: RelativityParams;
  meta: RelativityMeta;
  speedDescription: string;

  // Methods
  computeDualTrajectory: (trajectoryS: TrajectoryPoint[]) => DualFrameTrajectory;
  getExplanations: (isUnderwater?: boolean, isAccelerating?: boolean) => string[];

  // Presets
  applyGalileanPreset: () => void;
  applyLorentzPreset: () => void;
}

export function useRelativity(lang: string = 'en'): UseRelativityReturn {
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<RelativityMode>('galilean');
  const [frameVelocity, setFrameVelocity] = useState(20); // m/s default for Galilean
  const [activeObserver, setActiveObserver] = useState<ObserverFrame>('S');
  const [showDualTrajectories, setShowDualTrajectories] = useState(true);

  const params: RelativityParams = useMemo(() => ({
    enabled,
    mode,
    frameVelocity,
    activeObserver,
    showDualTrajectories,
  }), [enabled, mode, frameVelocity, activeObserver, showDualTrajectories]);

  const meta = useMemo(
    () => computeRelativityMeta(mode, frameVelocity),
    [mode, frameVelocity]
  );

  const speedDescription = useMemo(
    () => getSpeedDescription(frameVelocity, lang),
    [frameVelocity, lang]
  );

  const computeDualTrajectory = useCallback(
    (trajectoryS: TrajectoryPoint[]): DualFrameTrajectory => {
      return computeDualFrameTrajectory(trajectoryS, params);
    },
    [params]
  );

  const getExplanations = useCallback(
    (isUnderwater = false, isAccelerating = false): string[] => {
      return getRelativityExplanation(meta, lang, isUnderwater, isAccelerating);
    },
    [meta, lang]
  );

  const applyGalileanPreset = useCallback(() => {
    setMode('galilean');
    setFrameVelocity(20);
    setEnabled(true);
    setShowDualTrajectories(true);
  }, []);

  const applyLorentzPreset = useCallback(() => {
    setMode('lorentz');
    setFrameVelocity(SPEED_OF_LIGHT * 0.5);
    setEnabled(true);
    setShowDualTrajectories(true);
  }, []);

  return {
    enabled,
    mode,
    frameVelocity,
    activeObserver,
    showDualTrajectories,

    setEnabled,
    setMode,
    setFrameVelocity,
    setActiveObserver,
    setShowDualTrajectories,

    params,
    meta,
    speedDescription,

    computeDualTrajectory,
    getExplanations,

    applyGalileanPreset,
    applyLorentzPreset,
  };
}
