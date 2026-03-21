// ═══ Vector Physics Calculator ═══
// Computes all force and velocity vectors for any trajectory point

import type { TrajectoryPoint } from '@/utils/physics';
import type { ForceVector } from './types';

export interface VectorSet {
  velocity: { x: number; y: number; z: number; magnitude: number };
  velocityX: { x: number; y: number; z: number; magnitude: number };
  velocityY: { x: number; y: number; z: number; magnitude: number };
  acceleration: { x: number; y: number; z: number; magnitude: number };
  forces: ForceVector[];
  netForce: { x: number; y: number; z: number; magnitude: number };
}

export function computeVectors(
  point: TrajectoryPoint,
  _prevPoint: TrajectoryPoint | null,
  _nextPoint: TrajectoryPoint | null,
  mass: number,
  gravity: number,
  airResistance: number,
): VectorSet {
  // Velocity — use instantaneous velocity components directly from physics engine
  const vx = point.vx;
  const vy = point.vy;
  const speed = Math.sqrt(vx * vx + vy * vy);

  const velocity = { x: vx, y: vy, z: 0, magnitude: speed };
  const velocityX = { x: vx, y: 0, z: 0, magnitude: Math.abs(vx) };
  const velocityY = { x: 0, y: vy, z: 0, magnitude: Math.abs(vy) };

  // Acceleration
  const ax = point.ax;
  const ay = point.ay;
  const aMag = Math.sqrt(ax * ax + ay * ay);
  const acceleration = { x: ax, y: ay, z: 0, magnitude: aMag };

  // Forces
  const forces: ForceVector[] = [];

  // Gravity
  const Fg = mass * gravity;
  forces.push({
    type: 'gravity',
    direction: { x: 0, y: -1, z: 0 },
    magnitude: Fg,
    color: 0xef4444,
    label: 'Fg',
  });

  // Air drag (opposite to velocity)
  if (airResistance > 0 && speed > 0.1) {
    const dragMag = airResistance * speed * speed;
    forces.push({
      type: 'drag',
      direction: { x: -vx / speed, y: -vy / speed, z: 0 },
      magnitude: dragMag,
      color: 0xf59e0b,
      label: 'Fd',
    });
  }

  // Net force = m * a
  const netForce = {
    x: mass * ax,
    y: mass * ay,
    z: 0,
    magnitude: mass * aMag,
  };

  forces.push({
    type: 'net',
    direction: aMag > 1e-6
      ? { x: ax / aMag, y: ay / aMag, z: 0 }
      : { x: 0, y: -1, z: 0 },
    magnitude: netForce.magnitude,
    color: 0x8b5cf6,
    label: 'Fnet',
  });

  return { velocity, velocityX, velocityY, acceleration, forces, netForce };
}
