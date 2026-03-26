import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { ParamSnapshot } from '../constants';

interface SimulationSetters {
  setVelocity: (v: number) => void;
  setAngle: (v: number) => void;
  setHeight: (v: number) => void;
  setGravity: (v: number) => void;
  setAirResistance: (v: number) => void;
  setMass: (v: number) => void;
  setWindSpeed: (v: number) => void;
}

interface SimulationValues {
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
  windSpeed: number;
}

export function useUndoRedo(sim: SimulationValues & SimulationSetters) {
  const [paramHistory, setParamHistory] = useState<ParamSnapshot[]>([{
    velocity: sim.velocity, angle: sim.angle, height: sim.height,
    gravity: sim.gravity, airResistance: sim.airResistance, mass: sim.mass,
    windSpeed: sim.windSpeed,
  }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedoRef = useRef(false);

  const currentParams = useMemo(() => ({
    velocity: sim.velocity, angle: sim.angle, height: sim.height,
    gravity: sim.gravity, airResistance: sim.airResistance, mass: sim.mass,
    windSpeed: sim.windSpeed,
  }), [sim.velocity, sim.angle, sim.height, sim.gravity, sim.airResistance, sim.mass, sim.windSpeed]);

  useEffect(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    const last = paramHistory[historyIndex];
    if (last && last.velocity === currentParams.velocity && last.angle === currentParams.angle &&
        last.height === currentParams.height && last.gravity === currentParams.gravity &&
        last.airResistance === currentParams.airResistance && last.mass === currentParams.mass &&
        last.windSpeed === currentParams.windSpeed) return;
    const newHistory = paramHistory.slice(0, historyIndex + 1);
    newHistory.push({ ...currentParams });
    // Keep max 50 entries
    if (newHistory.length > 50) newHistory.shift();
    setParamHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentParams]);

  const undoParams = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const snap = paramHistory[newIndex];
    isUndoRedoRef.current = true;
    sim.setVelocity(snap.velocity);
    sim.setAngle(snap.angle);
    sim.setHeight(snap.height);
    sim.setGravity(snap.gravity);
    sim.setAirResistance(snap.airResistance);
    sim.setMass(snap.mass);
    sim.setWindSpeed(snap.windSpeed);
    setHistoryIndex(newIndex);
  }, [historyIndex, paramHistory, sim]);

  const redoParams = useCallback(() => {
    if (historyIndex >= paramHistory.length - 1) return;
    const newIndex = historyIndex + 1;
    const snap = paramHistory[newIndex];
    isUndoRedoRef.current = true;
    sim.setVelocity(snap.velocity);
    sim.setAngle(snap.angle);
    sim.setHeight(snap.height);
    sim.setGravity(snap.gravity);
    sim.setAirResistance(snap.airResistance);
    sim.setMass(snap.mass);
    sim.setWindSpeed(snap.windSpeed);
    setHistoryIndex(newIndex);
  }, [historyIndex, paramHistory, sim]);

  return { undoParams, redoParams };
}
