// ═══ 3D Vector Renderer ═══
// Manages dynamic arrow helpers for force/velocity vectors

import * as THREE from 'three';
import type { TrajectoryPoint } from '@/utils/physics';
import { computeVectors } from './vectorPhysics';
import type { VectorVisibility } from './types';

export interface VectorGroup {
  arrows: THREE.ArrowHelper[];
  dispose: () => void;
}

function makeArrow(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  length: number,
  color: number,
): THREE.ArrowHelper | null {
  const n = dir.clone().normalize();
  if (n.length() < 0.001) return null;
  return new THREE.ArrowHelper(n, origin, length, color, length * 0.18, length * 0.09);
}

export function buildVectorArrows(
  scene: THREE.Scene,
  point: TrajectoryPoint,
  prevPoint: TrajectoryPoint | null,
  nextPoint: TrajectoryPoint | null,
  mass: number,
  gravity: number,
  airResistance: number,
  visibility: VectorVisibility,
  span: number,
): VectorGroup {
  const arrows: THREE.ArrowHelper[] = [];
  const vectors = computeVectors(point, prevPoint, nextPoint, mass, gravity, airResistance);
  const origin = new THREE.Vector3(point.x, point.y, 0);
  const velScale = span * 0.12;
  const forceScale = span * 0.08;

  // Velocity vector (white/black)
  if (visibility.V && vectors.velocity.magnitude > 0.1) {
    const dir = new THREE.Vector3(vectors.velocity.x, vectors.velocity.y, 0);
    const len = Math.min(velScale, vectors.velocity.magnitude * velScale / 50);
    const a = makeArrow(origin, dir, len, 0x000000);
    if (a) { scene.add(a); arrows.push(a); }
  }

  // Vx (blue)
  if (visibility.Vx && vectors.velocityX.magnitude > 0.01) {
    const dir = new THREE.Vector3(vectors.velocityX.x, 0, 0);
    const len = Math.min(velScale * 0.7, Math.abs(vectors.velocityX.x) * velScale / 50);
    const a = makeArrow(origin, dir, len, 0x3b82f6);
    if (a) { scene.add(a); arrows.push(a); }
  }

  // Vy (green)
  if (visibility.Vy && vectors.velocityY.magnitude > 0.01) {
    const dir = new THREE.Vector3(0, vectors.velocityY.y, 0);
    const len = Math.min(velScale * 0.7, Math.abs(vectors.velocityY.y) * velScale / 50);
    const a = makeArrow(origin, dir, len, 0x22c55e);
    if (a) { scene.add(a); arrows.push(a); }
  }

  // Gravity force (red, down) -- skip when gravity is zero
  if (visibility.Fg && gravity > 0.001) {
    const a = makeArrow(origin, new THREE.Vector3(0, -1, 0), forceScale, 0xef4444);
    if (a) { scene.add(a); arrows.push(a); }
  }

  // Drag force (amber)
  if (visibility.Fd && airResistance > 0 && vectors.velocity.magnitude > 0.1) {
    const dragForce = vectors.forces.find(f => f.type === 'drag');
    if (dragForce) {
      const dir = new THREE.Vector3(dragForce.direction.x, dragForce.direction.y, 0);
      const len = Math.min(forceScale * 0.6, dragForce.magnitude * forceScale / Math.max(mass * gravity, 0.01));
      const a = makeArrow(origin, dir, len, 0xf59e0b);
      if (a) { scene.add(a); arrows.push(a); }
    }
  }

  // Fluid resistance force (teal) — shown in water environment
  if (visibility.Ffluid && vectors.velocity.magnitude > 0.1) {
    const sp = vectors.velocity.magnitude;
    const fluidDragMag = 998 * sp * sp * 0.001;
    const dir = new THREE.Vector3(-vectors.velocity.x / sp, -vectors.velocity.y / sp, 0);
    const len = Math.min(forceScale * 0.7, fluidDragMag * forceScale / Math.max(mass * gravity, 0.01));
    const a = makeArrow(origin, dir, len, 0x14b8a6);
    if (a) { scene.add(a); arrows.push(a); }
  }

  // Net force (purple)
  if (visibility.Fnet && vectors.netForce.magnitude > 0.01) {
    const dir = new THREE.Vector3(vectors.netForce.x, vectors.netForce.y, 0);
    const len = Math.min(forceScale, vectors.netForce.magnitude * forceScale / Math.max(mass * gravity, 0.01));
    const a = makeArrow(origin, dir, len, 0x8b5cf6);
    if (a) { scene.add(a); arrows.push(a); }
  }

  // Acceleration (cyan)
  if (visibility.acc && vectors.acceleration.magnitude > 0.01) {
    const dir = new THREE.Vector3(vectors.acceleration.x, vectors.acceleration.y, 0);
    const len = Math.min(forceScale * 0.8, vectors.acceleration.magnitude * forceScale / Math.max(gravity, 0.01));
    const a = makeArrow(origin, dir, len, 0x06b6d4);
    if (a) { scene.add(a); arrows.push(a); }
  }

  return {
    arrows,
    dispose: () => {
      arrows.forEach(a => {
        scene.remove(a);
        a.dispose();
      });
    },
  };
}
