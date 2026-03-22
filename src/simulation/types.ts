// ═══ Simulation Type Definitions ═══
// Central types shared across all simulation modules

export interface VectorVisibility {
  V: boolean;
  Vx: boolean;
  Vy: boolean;
  Fg: boolean;
  Fd: boolean;
  Fw: boolean;
  Ffluid: boolean;
  Fnet: boolean;
  acc: boolean;
}

export interface SimulationSnapshot {
  id: string;
  timestamp: number;
  trajectoryData: import('@/utils/physics').TrajectoryPoint[];
  params: {
    velocity: number;
    angle: number;
    height: number;
    gravity: number;
    airResistance: number;
    mass: number;
  };
  label?: string;
}

export interface Camera3DState {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
}

export type ForceType = 'gravity' | 'drag' | 'net' | 'buoyancy' | 'magnus' | 'coriolis';

export interface ForceVector {
  type: ForceType;
  direction: { x: number; y: number; z: number };
  magnitude: number;
  color: number;
  label: string;
}
