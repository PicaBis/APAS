import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import type { TrajectoryPoint, PredictionResult } from '@/utils/physics';
import type { VectorVisibility } from '@/simulation/types';
import type { StroboscopicMark } from '@/components/apas/StroboscopicModal';
import {
  computeBounds,
  buildAxes,
  buildGround,
  buildTrajectory,
  buildCriticalPoints,
  buildProjectile,
  buildProjectile3D,
  project3D,
  getTheme3DConfig,
} from '@/simulation/sceneBuilder3D';
import type { TrajectoryMeshes, Theme3DId } from '@/simulation/sceneBuilder3D';

interface SimulationCanvas3DProps {
  trajectoryData: TrajectoryPoint[];
  prediction: PredictionResult | null;
  currentTime: number;
  height: number;
  showCriticalPoints: boolean;
  showExternalForces: boolean;
  vectorVisibility: VectorVisibility;
  mass: number;
  gravity: number;
  airResistance: number;
  lang: string;
  nightMode: boolean;
  isAnimating: boolean;
  playbackSpeed: number;
  bounceCoefficient?: number;
  phi?: number; // Azimuthal angle in degrees for 3D projection
  showLiveData?: boolean;
  stroboscopicMarks?: StroboscopicMark[];
  showStroboscopicProjections?: boolean;
  environmentId?: string;
  activePresetEmoji?: string;
  onWebglError?: (message: string) => void;
  showGrid?: boolean;
  enableMagnusSpin?: boolean;
  spinRate?: number;
  theme3d?: Theme3DId;
}

/** Linearly interpolate between two trajectory points */
function lerpPoint(a: TrajectoryPoint, b: TrajectoryPoint, t: number): { x: number; y: number } {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

/** Find interpolated position for a given time in sorted trajectory data */
function getInterpolatedPosition(data: TrajectoryPoint[], time: number): { x: number; y: number; idx: number; fractionalIdx: number } {
  if (data.length === 0) return { x: 0, y: 0, idx: 0, fractionalIdx: 0 };
  if (time <= data[0].time) return { x: data[0].x, y: data[0].y, idx: 0, fractionalIdx: 0 };
  const last = data[data.length - 1];
  if (time >= last.time) return { x: last.x, y: last.y, idx: data.length - 1, fractionalIdx: data.length - 1 };

  // Binary search for efficiency
  let lo = 0, hi = data.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (data[mid].time <= time) lo = mid;
    else hi = mid;
  }

  const a = data[lo];
  const b = data[hi];
  const dt = b.time - a.time;
  const frac = dt > 0 ? (time - a.time) / dt : 0;
  const pos = lerpPoint(a, b, frac);
  return { x: pos.x, y: pos.y, idx: hi, fractionalIdx: lo + frac };
}

/** Persistent arrow helpers updated in-place each frame (no dispose/recreate) */
interface PersistentArrows {
  V: THREE.ArrowHelper;
  Vx: THREE.ArrowHelper;
  Vy: THREE.ArrowHelper;
  Fg: THREE.ArrowHelper;
  Fd: THREE.ArrowHelper;
  Ffluid: THREE.ArrowHelper;
  Fnet: THREE.ArrowHelper;
  acc: THREE.ArrowHelper;
}

function createPersistentArrows(scene: THREE.Scene, nightMode: boolean, themeId: Theme3DId = 'refined-lab'): PersistentArrows {
  const d = new THREE.Vector3(1, 0, 0);
  const o = new THREE.Vector3(0, 0, 0);
  const make = (color: number) => {
    const a = new THREE.ArrowHelper(d, o, 1, color, 0.18, 0.09);
    a.visible = false;
    scene.add(a);
    return a;
  };
  // V (velocity) arrow: adapt to theme for visibility
  const tc = getTheme3DConfig(themeId);
  const vColor = nightMode ? 0xf0f0f0 : tc.velocityColor;
  return {
    V: make(vColor), Vx: make(0x3b82f6), Vy: make(0x22c55e),
    Fg: make(0xef4444), Fd: make(0xf59e0b), Ffluid: make(0x14b8a6), Fnet: make(0x8b5cf6), acc: make(0x06b6d4),
  };
}

function setArrow(arrow: THREE.ArrowHelper, origin: THREE.Vector3, dir: THREE.Vector3, length: number, vis: boolean) {
  if (!vis || length < 0.001 || dir.lengthSq() < 1e-12) { arrow.visible = false; return; }
  arrow.position.copy(origin);
  arrow.setDirection(dir.clone().normalize());
  arrow.setLength(length, length * 0.18, length * 0.09);
  arrow.visible = true;
}

function syncArrows(
  ar: PersistentArrows, pt: TrajectoryPoint,
  mass: number, gravity: number, airR: number,
  vis: VectorVisibility, span: number, show: boolean,
  originOverride?: THREE.Vector3,
) {
  if (!show) {
    ar.V.visible = ar.Vx.visible = ar.Vy.visible = false;
    ar.Fg.visible = ar.Fd.visible = ar.Ffluid.visible = ar.Fnet.visible = ar.acc.visible = false;
    return;
  }
  const o = originOverride || new THREE.Vector3(pt.x, pt.y, 0);
  const vs = span * 0.15, fs = span * 0.10, sp = pt.speed;
  const minVel = span * 0.03; // minimum arrow length for velocity vectors
  const minForce = span * 0.025; // minimum arrow length for force vectors

  // Normalize velocity arrows relative to max speed for consistent scaling
  // Use span/10 as a reference speed so arrows are visible even at low speeds
  const refSpeed = Math.max(sp, 1);
  const vLen = Math.max(minVel, Math.min(vs, sp * vs / Math.max(refSpeed * 2, 5)));
  setArrow(ar.V, o, new THREE.Vector3(pt.vx, pt.vy, 0), vLen, vis.V && sp > 0.005);

  const vxLen = Math.max(minVel, Math.min(vs * 0.85, Math.abs(pt.vx) * vs / Math.max(refSpeed * 2, 5)));
  setArrow(ar.Vx, o, new THREE.Vector3(pt.vx, 0, 0), vxLen, vis.Vx && Math.abs(pt.vx) > 0.005);

  const vyLen = Math.max(minVel, Math.min(vs * 0.85, Math.abs(pt.vy) * vs / Math.max(refSpeed * 2, 5)));
  setArrow(ar.Vy, o, new THREE.Vector3(0, pt.vy, 0), vyLen, vis.Vy && Math.abs(pt.vy) > 0.005);

  const wf = Math.max(mass * gravity, 0.01);
  setArrow(ar.Fg, o, new THREE.Vector3(0, -1, 0), gravity > 0.001 ? Math.max(minForce, fs) : 0, vis.Fg && gravity > 0.001);
  if (vis.Fd && airR > 0 && sp > 0.05) {
    const dm = airR * sp * sp;
    const fdLen = Math.max(minForce, Math.min(fs * 0.7, dm * fs / wf));
    setArrow(ar.Fd, o, new THREE.Vector3(-pt.vx / sp, -pt.vy / sp, 0), fdLen, true);
  } else { ar.Fd.visible = false; }
  // Fluid resistance vector (Ffluid) — shown when underwater/hydrodynamic drag is active
  if (vis.Ffluid && sp > 0.05) {
    // Ffluid opposes velocity, magnitude proportional to speed^2 in fluid
    const fluidDm = 998 * sp * sp * 0.001; // approximate fluid drag
    const fluidLen = Math.max(minForce, Math.min(fs * 0.8, fluidDm * fs / wf));
    setArrow(ar.Ffluid, o, new THREE.Vector3(-pt.vx / sp, -pt.vy / sp, 0), fluidLen, true);
  } else { ar.Ffluid.visible = false; }
  const nfx = mass * pt.ax, nfy = mass * pt.ay, nm = Math.sqrt(nfx * nfx + nfy * nfy);
  setArrow(ar.Fnet, o, new THREE.Vector3(nfx, nfy, 0), Math.max(minForce, Math.min(fs, nm * fs / wf)), vis.Fnet && nm > 0.005);
  const am = Math.sqrt(pt.ax * pt.ax + pt.ay * pt.ay);
  setArrow(ar.acc, o, new THREE.Vector3(pt.ax, pt.ay, 0), Math.max(minForce, Math.min(fs * 0.8, am * fs / Math.max(gravity, 0.01))), vis.acc && am > 0.005);
}

/** Get sky/clear color for the 3D scene based on environment and night mode */
function getSceneClearColor(envId: string, _nightMode: boolean): number {
  // Use the same clear color regardless of night mode for visual consistency
  switch (envId) {
    case 'moon': return 0x050510;
    case 'mars': return 0xc27850;
    case 'underwater': return 0x0a3d6b;
    case 'sun': return 0xff6600;
    case 'vacuum': return 0x0a0a14;
    case 'jupiter': return 0x6b3e1a;
    case 'saturn': return 0x8a7850;
    default: // earth
      return 0x87ceeb;
  }
}

/** Get scene fog color for environment atmosphere */
function getSceneFogColor(envId: string, _nightMode: boolean): number | null {
  // Use the same fog color regardless of night mode for visual consistency
  switch (envId) {
    case 'mars': return 0xc27850;
    case 'underwater': return 0x0d5280;
    case 'sun': return 0xff8800;
    case 'jupiter': return 0x8b5e2a;
    case 'saturn': return 0x6a5838;
    default: return null;
  }
}

// ── Procedural sky texture helpers ──

/** Create a canvas-based gradient texture for a sky dome */
function createSkyGradientTexture(topColor: string, bottomColor: string, midColor?: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, topColor);
  if (midColor) gradient.addColorStop(0.5, midColor);
  gradient.addColorStop(1, bottomColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Build a large sky sphere with the given texture (rendered from inside) */
function buildSkySphere(texture: THREE.Texture, radius: number): THREE.Mesh {
  const geo = new THREE.SphereGeometry(radius, 32, 16);
  const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, depthWrite: false });
  return new THREE.Mesh(geo, mat);
}

/** Create scattered star particles */
function buildStars(count: number, radius: number, sizeMin: number, sizeMax: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    // Distribute on sphere surface — bias toward upper hemisphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(1 - Math.random() * 1.5); // bias upward
    const r = radius * (0.85 + Math.random() * 0.15);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi); // mostly positive Y
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    sizes[i] = sizeMin + Math.random() * (sizeMax - sizeMin);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: (sizeMin + sizeMax) / 2,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}

/** Build a glowing sphere to represent a celestial body (Earth from Moon, Sun glow, etc.) */
function buildCelestialBody(
  radius: number, color: number, emissiveColor: number, emissiveIntensity: number,
  position: THREE.Vector3, glowColor?: number, glowScale?: number,
): THREE.Group {
  const group = new THREE.Group();
  // Main sphere
  const geo = new THREE.SphereGeometry(radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: emissiveColor, emissiveIntensity,
    roughness: 0.8, metalness: 0.0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(position);
  group.add(mesh);
  // Optional glow ring
  if (glowColor !== undefined && glowScale) {
    const glowGeo = new THREE.SphereGeometry(radius * glowScale, 24, 24);
    const glowMat = new THREE.MeshBasicMaterial({
      color: glowColor, transparent: true, opacity: 0.15, side: THREE.BackSide, depthWrite: false,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(position);
    group.add(glow);
  }
  return group;
}

/** Build a puffy 3D cloud from overlapping spheres */
function buildCloud(span: number, color: number, opacity: number): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color, transparent: true, opacity,
    roughness: 1.0, metalness: 0.0, depthWrite: false,
  });
  // Central large puff
  const r0 = span * (0.12 + Math.random() * 0.08);
  const g0 = new THREE.SphereGeometry(r0, 12, 8);
  group.add(new THREE.Mesh(g0, mat));
  // 4-6 smaller puffs around the center
  const puffCount = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < puffCount; i++) {
    const r = r0 * (0.5 + Math.random() * 0.5);
    const g = new THREE.SphereGeometry(r, 10, 6);
    const m = new THREE.Mesh(g, mat);
    const angle = (i / puffCount) * Math.PI * 2 + Math.random() * 0.5;
    m.position.set(
      Math.cos(angle) * r0 * (0.6 + Math.random() * 0.4),
      (Math.random() - 0.4) * r0 * 0.5,
      Math.sin(angle) * r0 * (0.4 + Math.random() * 0.3),
    );
    group.add(m);
  }
  return group;
}

/**
 * Build all environment-specific sky decorations.
 *
 * Camera default pos: (span*0.8, span*0.6, span*1.0) looking at ~(maxX*0.4, maxY*0.35, 0).
 * So the "behind the scene" direction is negative-Z and the visible sky is
 * roughly at heights span*0.8 … span*2 and positions within ±span*2.
 * All celestial bodies / clouds are placed within this region so they are
 * immediately visible without dragging the camera.
 */
function buildEnvironmentSky(scene: THREE.Scene, envId: string, span: number, nightMode: boolean): void {
  const skyR = span * 4;

  switch (envId) {
    case 'earth': {
      // Always show day blue sky for visual consistency between modes
      const skyTex = createSkyGradientTexture('#4a90d9', '#b8d4f0', '#87ceeb');
      scene.add(buildSkySphere(skyTex, skyR));

      // Sun — upper right, behind scene, visible from default camera
      const sunGroup = buildCelestialBody(
        span * 0.2, 0xffee88, 0xffdd44, 1.0,
        new THREE.Vector3(span * 0.8, span * 1.8, -span * 1.5),
        0xffee88, 2.0,
      );
      scene.add(sunGroup);

      const sunLight = new THREE.PointLight(0xfff5e0, 0.4, span * 10);
      sunLight.position.set(span * 0.8, span * 1.8, -span * 1.5);
      scene.add(sunLight);

      // Puffy 3D clouds scattered at visible heights
      for (let i = 0; i < 8; i++) {
        const cloud = buildCloud(span, 0xffffff, 0.55 + Math.random() * 0.2);
        cloud.position.set(
          (Math.random() - 0.3) * span * 2.5,
          span * (1.0 + Math.random() * 1.2),
          (Math.random() - 0.6) * span * 2.5,
        );
        scene.add(cloud);
      }
      break;
    }

    case 'moon': {
      // Dark space sky with stars
      const skyTex = createSkyGradientTexture('#020208', '#08081a', '#050510');
      scene.add(buildSkySphere(skyTex, skyR));
      scene.add(buildStars(800, skyR * 0.9, span * 0.01, span * 0.04));

      // Earth — positioned behind the scene at a visible angle from default camera
      const earthRadius = span * 0.35;
      const earthPos = new THREE.Vector3(-span * 0.6, span * 1.4, -span * 1.5);
      const earthGroup = buildCelestialBody(
        earthRadius, 0x2255aa, 0x1144aa, 0.35,
        earthPos, 0x4488cc, 1.5,
      );
      scene.add(earthGroup);

      // Atmosphere ring around Earth
      const atmosGeo = new THREE.RingGeometry(earthRadius * 1.02, earthRadius * 1.1, 48);
      const atmosMat = new THREE.MeshBasicMaterial({
        color: 0x88bbff, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false,
      });
      const atmos = new THREE.Mesh(atmosGeo, atmosMat);
      atmos.position.copy(earthPos);
      atmos.lookAt(span * 0.8, span * 0.6, span * 1.0); // face default camera
      scene.add(atmos);
      break;
    }

    case 'mars': {
      // Reddish-orange sky
      const skyTex = createSkyGradientTexture('#4a2010', '#c27850', '#d4956a');
      scene.add(buildSkySphere(skyTex, skyR));

      // Distant sun (smaller from Mars) — visible from default angle
      const sunGroup = buildCelestialBody(
        span * 0.12, 0xffe8cc, 0xffcc88, 0.7,
        new THREE.Vector3(span * 1.0, span * 1.5, -span * 1.0),
        0xffddaa, 2.2,
      );
      scene.add(sunGroup);

      // Reddish dust clouds (no particles — only puffy clouds for atmosphere)
      for (let i = 0; i < 4; i++) {
        const cloud = buildCloud(span, 0xc27850, 0.25 + Math.random() * 0.15);
        cloud.position.set(
          (Math.random() - 0.3) * span * 2,
          span * (0.8 + Math.random() * 1.0),
          (Math.random() - 0.6) * span * 2,
        );
        scene.add(cloud);
      }
      break;
    }

    case 'sun': {
      // Intense orange-red sky
      const skyTex = createSkyGradientTexture('#ff4400', '#ff8800', '#ffaa33');
      scene.add(buildSkySphere(skyTex, skyR));

      // Solar flare glow from above
      const flareLight = new THREE.PointLight(0xff6600, 1.2, span * 10);
      flareLight.position.set(0, span * 2.5, 0);
      scene.add(flareLight);

      // Warm ambient glow to simulate solar surface (no particles or orbs)
      const warmLight = new THREE.PointLight(0xffaa44, 0.6, span * 8);
      warmLight.position.set(-span, span * 1.5, -span);
      scene.add(warmLight);
      break;
    }

    case 'underwater': {
      // Deep blue gradient
      const skyTex = createSkyGradientTexture('#051e35', '#0a3d6b', '#1a6eb5');
      scene.add(buildSkySphere(skyTex, skyR));

      // Light rays from above (caustics feel)
      const waterLight = new THREE.SpotLight(0x4499cc, 0.6, span * 8, Math.PI / 4, 0.5);
      waterLight.position.set(0, span * 2.5, 0);
      waterLight.target.position.set(0, 0, 0);
      scene.add(waterLight);
      scene.add(waterLight.target);

      // Bubble particles — within visible range, above ground
      const bubblePositions = new Float32Array(200 * 3);
      for (let i = 0; i < 200; i++) {
        bubblePositions[i * 3] = (Math.random() - 0.3) * span * 2.5;
        bubblePositions[i * 3 + 1] = span * 0.2 + Math.random() * span * 2.3;
        bubblePositions[i * 3 + 2] = (Math.random() - 0.5) * span * 2.5;
      }
      const bubbleGeo = new THREE.BufferGeometry();
      bubbleGeo.setAttribute('position', new THREE.Float32BufferAttribute(bubblePositions, 3));
      const bubbleMat = new THREE.PointsMaterial({
        color: 0x88ccff, size: span * 0.025, transparent: true, opacity: 0.45,
        sizeAttenuation: true, depthWrite: false,
      });
      scene.add(new THREE.Points(bubbleGeo, bubbleMat));
      break;
    }

    case 'vacuum': {
      // Deep space
      const skyTex = createSkyGradientTexture('#020206', '#06060e', '#08081a');
      scene.add(buildSkySphere(skyTex, skyR));
      scene.add(buildStars(1200, skyR * 0.9, span * 0.008, span * 0.03));
      break;
    }

    case 'jupiter': {
      // Brown/orange banded atmosphere
      const skyTex = createSkyGradientTexture('#3a2510', '#8b5e2a', '#4a2a10');
      scene.add(buildSkySphere(skyTex, skyR));

      // Atmospheric band effect using subtle horizontal planes
      for (let i = 0; i < 6; i++) {
        const bandGeo = new THREE.PlaneGeometry(span * 6, span * 0.3);
        const bandColor = i % 2 === 0 ? 0xc88040 : 0x6a3820;
        const bandMat = new THREE.MeshBasicMaterial({
          color: bandColor, transparent: true, opacity: 0.06,
          side: THREE.DoubleSide, depthWrite: false,
        });
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.position.set(0, span * (0.8 + i * 0.5), -span * 2);
        scene.add(band);
      }

      // Great Red Spot as a subtle glowing sphere
      const spotGroup = buildCelestialBody(
        span * 0.15, 0xb43c1e, 0xcc4422, 0.3,
        new THREE.Vector3(span * 0.8, span * 1.2, -span * 2.0),
        0xcc4422, 1.4,
      );
      scene.add(spotGroup);

      // Dim distant sun
      const jupSunGroup = buildCelestialBody(
        span * 0.08, 0xffee88, 0xffdd44, 0.8,
        new THREE.Vector3(-span * 1.5, span * 2.0, -span * 2.5),
        0xffee88, 1.8,
      );
      scene.add(jupSunGroup);
      break;
    }

    case 'saturn': {
      // Pale gold/tan atmosphere
      const skyTex = createSkyGradientTexture('#2a2518', '#8a7850', '#3a3020');
      scene.add(buildSkySphere(skyTex, skyR));

      // Atmospheric bands
      for (let i = 0; i < 5; i++) {
        const bandGeo = new THREE.PlaneGeometry(span * 6, span * 0.25);
        const bandColor = i % 2 === 0 ? 0xd4b878 : 0x8a7050;
        const bandMat = new THREE.MeshBasicMaterial({
          color: bandColor, transparent: true, opacity: 0.05,
          side: THREE.DoubleSide, depthWrite: false,
        });
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.position.set(0, span * (0.9 + i * 0.45), -span * 2);
        scene.add(band);
      }

      // Saturn's rings as a large torus visible in the sky
      const ringGeo = new THREE.RingGeometry(span * 0.6, span * 1.0, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xd4c8a0, transparent: true, opacity: 0.12,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(span * 0.3, span * 2.0, -span * 2.5);
      ring.rotation.x = -Math.PI * 0.35;
      ring.rotation.z = -0.1;
      scene.add(ring);

      // Inner ring (brighter)
      const innerRingGeo = new THREE.RingGeometry(span * 0.45, span * 0.58, 64);
      const innerRingMat = new THREE.MeshBasicMaterial({
        color: 0xe8d8b0, transparent: true, opacity: 0.08,
        side: THREE.DoubleSide, depthWrite: false,
      });
      const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
      innerRing.position.copy(ring.position);
      innerRing.rotation.copy(ring.rotation);
      scene.add(innerRing);

      // Dim distant sun
      const satSunGroup = buildCelestialBody(
        span * 0.06, 0xffee88, 0xffdd44, 0.6,
        new THREE.Vector3(-span * 1.8, span * 2.2, -span * 2.8),
        0xffee88, 1.6,
      );
      scene.add(satSunGroup);
      break;
    }

    default:
      break;
  }
}

/** Build animated wind particles for 3D environments (except vacuum) */
function buildWindParticles(scene: THREE.Scene, span: number, envId: string, airRes: number): THREE.Points | null {
  // No wind in vacuum chamber
  if (envId === 'vacuum' || envId === 'moon') return null;
  // Only show if air resistance is > 0
  if (airRes <= 0) return null;

  const count = envId === 'underwater' ? 0 : 300; // underwater uses waves instead
  if (count === 0) return null;

  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.3) * span * 3;
    positions[i * 3 + 1] = span * 0.1 + Math.random() * span * 2.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * span * 3;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  // Color varies by environment
  let color = 0xcccccc;
  let opacity = 0.35;
  let size = span * 0.015;
  switch (envId) {
    case 'mars': color = 0xd4956a; opacity = 0.4; size = span * 0.02; break;
    case 'sun': color = 0xffaa44; opacity = 0.3; size = span * 0.018; break;
    case 'jupiter': color = 0xc88040; opacity = 0.3; size = span * 0.02; break;
    case 'saturn': color = 0xd4c8a0; opacity = 0.3; size = span * 0.018; break;
    case 'earth': default: color = 0xbbbbbb; opacity = 0.25; size = span * 0.012; break;
  }

  const mat = new THREE.PointsMaterial({
    color, size, transparent: true, opacity,
    sizeAttenuation: true, depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.name = 'wind-particles';
  scene.add(points);
  return points;
}

/** Build animated water wave meshes for underwater 3D environment */
function buildWaterWaves(scene: THREE.Scene, span: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'water-waves';

  // Create several horizontal wave planes at different heights
  for (let i = 0; i < 5; i++) {
    const waveGeo = new THREE.PlaneGeometry(span * 4, span * 4, 32, 32);
    const waveMat = new THREE.MeshBasicMaterial({
      color: 0x2288cc,
      transparent: true,
      opacity: 0.06 + i * 0.01,
      side: THREE.DoubleSide,
      depthWrite: false,
      wireframe: true,
    });
    const wave = new THREE.Mesh(waveGeo, waveMat);
    wave.rotation.x = -Math.PI / 2;
    wave.position.y = span * (0.3 + i * 0.4);
    wave.userData.waveIndex = i;
    wave.userData.baseY = wave.position.y;
    group.add(wave);
  }

  // Add animated current streaks (line segments showing water flow)
  const streakCount = 60;
  const streakPositions = new Float32Array(streakCount * 6); // 2 points per line
  for (let i = 0; i < streakCount; i++) {
    const x = (Math.random() - 0.3) * span * 3;
    const y = span * 0.1 + Math.random() * span * 2;
    const z = (Math.random() - 0.5) * span * 3;
    const len = span * (0.05 + Math.random() * 0.1);
    streakPositions[i * 6] = x;
    streakPositions[i * 6 + 1] = y;
    streakPositions[i * 6 + 2] = z;
    streakPositions[i * 6 + 3] = x + len;
    streakPositions[i * 6 + 4] = y + (Math.random() - 0.5) * span * 0.02;
    streakPositions[i * 6 + 5] = z;
  }
  const streakGeo = new THREE.BufferGeometry();
  streakGeo.setAttribute('position', new THREE.Float32BufferAttribute(streakPositions, 3));
  const streakMat = new THREE.LineBasicMaterial({
    color: 0x66bbdd, transparent: true, opacity: 0.3, linewidth: 1,
  });
  const streaks = new THREE.LineSegments(streakGeo, streakMat);
  streaks.name = 'water-streaks';
  group.add(streaks);

  scene.add(group);
  return group;
}

/** Animate wind particles each frame */
function animateWindParticles(points: THREE.Points, span: number, deltaTime: number, envId: string) {
  const positions = points.geometry.attributes.position;
  if (!positions) return;
  const arr = positions.array as Float32Array;
  const count = arr.length / 3;
  // Wind speed varies by environment
  let windSpeedX = span * 0.3;
  let windSpeedZ = span * 0.05;
  switch (envId) {
    case 'mars': windSpeedX = span * 0.5; windSpeedZ = span * 0.15; break;
    case 'sun': windSpeedX = span * 0.2; windSpeedZ = span * 0.08; break;
    case 'jupiter': windSpeedX = span * 0.6; windSpeedZ = span * 0.2; break;
    case 'saturn': windSpeedX = span * 0.4; windSpeedZ = span * 0.12; break;
  }
  for (let i = 0; i < count; i++) {
    arr[i * 3] += windSpeedX * deltaTime;
    arr[i * 3 + 2] += windSpeedZ * deltaTime * Math.sin(i * 0.1);
    // Wrap around when particles go too far
    if (arr[i * 3] > span * 2) arr[i * 3] = -span * 1.5;
    if (arr[i * 3 + 2] > span * 1.5) arr[i * 3 + 2] = -span * 1.5;
    if (arr[i * 3 + 2] < -span * 1.5) arr[i * 3 + 2] = span * 1.5;
  }
  positions.needsUpdate = true;
}

/** Animate water waves each frame */
function animateWaterWaves(group: THREE.Group, _span: number, time: number) {
  group.children.forEach((child) => {
    if (child instanceof THREE.Mesh && child.userData.waveIndex !== undefined) {
      const idx = child.userData.waveIndex as number;
      const baseY = child.userData.baseY as number;
      // Gentle vertical oscillation
      child.position.y = baseY + Math.sin(time * 0.8 + idx * 1.2) * 0.15;
      // Slight horizontal drift
      child.position.x = Math.sin(time * 0.3 + idx * 0.7) * 0.5;
      // Wave deformation via vertex animation
      const geo = child.geometry as THREE.PlaneGeometry;
      const posAttr = geo.attributes.position;
      if (posAttr) {
        const posArr = posAttr.array as Float32Array;
        const vertCount = posArr.length / 3;
        for (let v = 0; v < vertCount; v++) {
          const origX = posArr[v * 3];
          const origZ = posArr[v * 3 + 1]; // in plane geometry, Y maps to Z before rotation
          posArr[v * 3 + 2] = Math.sin(origX * 2 + time * 1.5 + idx) * 0.3
            + Math.cos(origZ * 1.5 + time * 0.8 + idx * 0.5) * 0.2;
        }
        posAttr.needsUpdate = true;
      }
    }
    // Animate streaks
    if (child instanceof THREE.LineSegments && child.name === 'water-streaks') {
      const posAttr = child.geometry.attributes.position;
      if (posAttr) {
        const arr = posAttr.array as Float32Array;
        const lineCount = arr.length / 6;
        for (let i = 0; i < lineCount; i++) {
          arr[i * 6] += 0.02;
          arr[i * 6 + 3] += 0.02;
          // Wrap
          if (arr[i * 6] > 10) {
            const resetX = -8 + Math.random() * 2;
            const len = arr[i * 6 + 3] - arr[i * 6];
            arr[i * 6] = resetX;
            arr[i * 6 + 3] = resetX + len;
          }
        }
        posAttr.needsUpdate = true;
      }
    }
  });
}

const SimulationCanvas3D: React.FC<SimulationCanvas3DProps> = ({
  trajectoryData, prediction, currentTime, height,
  showCriticalPoints, showExternalForces, vectorVisibility,
  mass, gravity, airResistance, lang, nightMode, isAnimating,
  playbackSpeed, bounceCoefficient = 0.8, phi = 0, showLiveData = true,
  stroboscopicMarks = [], showStroboscopicProjections = false,
  environmentId = 'earth', activePresetEmoji, showGrid = true, onWebglError,
  enableMagnusSpin = false, spinRate = 0,
  theme3d = 'refined-lab',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const projectileRef = useRef<THREE.Object3D | null>(null);
  const arrowsRef = useRef<PersistentArrows | null>(null);
  const frameRef = useRef(0);
  const aliveRef = useRef(true);
  const boundsRef = useRef({ maxX: 1, maxY: 1, span: 1, pad: 0.15 });
  const currentTimeRef = useRef(currentTime);
  const isAnimatingRef = useRef(isAnimating);
  const trajectoryRef = useRef(trajectoryData);
  const showExternalForcesRef = useRef(showExternalForces);
  const vectorVisibilityRef = useRef(vectorVisibility);
  const massRef = useRef(mass);
  const gravityRef = useRef(gravity);
  const airResistanceRef = useRef(airResistance);
  const playbackSpeedRef = useRef(playbackSpeed);
  const smoothTimeRef = useRef(currentTime);
  const lastTickTsRef = useRef(0);
  const wasAnimatingRef = useRef(false);
  const savedCameraPos = useRef<THREE.Vector3 | null>(null);
  const savedCameraTarget = useRef<THREE.Vector3 | null>(null);
  const trajectoryMeshesRef = useRef<TrajectoryMeshes | null>(null);
  const stroboscopicGroupRef = useRef<THREE.Group | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const phiRef = useRef(phi);
  const onWebglErrorRef = useRef(onWebglError);
  const windParticlesRef = useRef<THREE.Points | null>(null);
  const waterWavesRef = useRef<THREE.Group | null>(null);
  const environmentIdRef = useRef(environmentId);
  const enableMagnusSpinRef = useRef(enableMagnusSpin);
  const spinRateRef = useRef(spinRate);
  const theme3dRef = useRef(theme3d);
  theme3dRef.current = theme3d;
  onWebglErrorRef.current = onWebglError;
  phiRef.current = phi;
  environmentIdRef.current = environmentId;
  enableMagnusSpinRef.current = enableMagnusSpin;
  spinRateRef.current = spinRate;

  // Keep refs in sync
  currentTimeRef.current = currentTime;
  isAnimatingRef.current = isAnimating;
  playbackSpeedRef.current = playbackSpeed;
  trajectoryRef.current = trajectoryData;
  showExternalForcesRef.current = showExternalForces;
  vectorVisibilityRef.current = vectorVisibility;
  massRef.current = mass;
  gravityRef.current = gravity;
  airResistanceRef.current = airResistance;

  const [hoverData, setHoverData] = useState<TrajectoryPoint | null>(null);
  const [sceneId, setSceneId] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const detailsGroupRef = useRef<THREE.Group | null>(null);
  const hoverDataRef = useRef<TrajectoryPoint | null>(null);
  const [webglError, setWebglError] = useState<string | null>(() => {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return lang === 'ar'
        ? 'متصفحك لا يدعم WebGL. جرّب فتح التطبيق في تبويب جديد.'
        : 'Your browser does not support WebGL. Try opening in a new tab.';
      return null;
    } catch {
      return lang === 'ar'
        ? 'متصفحك لا يدعم WebGL.'
        : 'Your browser does not support WebGL.';
    }
  });

  // ── Build scene once when trajectory or static settings change ──
  useEffect(() => {
    if (webglError || !containerRef.current || trajectoryData.length === 0) return;

    const container = containerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;

    // Renderer — antialias + high-performance GPU
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        stencil: false,
        depth: true,
      });
    } catch {
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true });
      } catch {
        const msg = lang === 'ar'
          ? 'متصفحك لا يدعم WebGL.'
          : 'Your browser does not support WebGL.';
        setWebglError(msg);
        onWebglErrorRef.current?.(msg);
        return;
      }
    }

    rendererRef.current = renderer;
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    // Apply theme clear color override, or use environment default
    const themeConfig = getTheme3DConfig(theme3d);
    const clearColor = themeConfig.clearColorOverride ?? getSceneClearColor(environmentId, nightMode);
    renderer.setClearColor(clearColor);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = false;
    // Let CSS control the canvas size so it always fills its container
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    setSceneId(prev => prev + 1);

    // Bounds (computed first — needed by lighting, camera, and scene elements)
    const bounds = computeBounds(trajectoryData, height);
    boundsRef.current = bounds;

    // Lighting: simple, efficient setup
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(5, 12, 8);
    scene.add(dirLight);
    scene.add(new THREE.HemisphereLight(0x87ceeb, 0xf0e68c, 0.2));

    // Camera
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, bounds.span * 20);
    if (savedCameraPos.current) {
      camera.position.copy(savedCameraPos.current);
    } else {
      camera.position.set(bounds.span * 0.8, bounds.span * 0.6, bounds.span * 1.0);
      camera.lookAt(bounds.maxX * 0.4, bounds.maxY * 0.35, 0);
    }
    cameraRef.current = camera;

    const phiRad = (phiRef.current * Math.PI) / 180;

    // Environment fog for atmosphere
    const fogColor = getSceneFogColor(environmentId, nightMode);
    if (fogColor !== null) {
      scene.fog = new THREE.FogExp2(fogColor, 0.003 / Math.max(bounds.span, 1));
    } else {
      scene.fog = null;
    }

    // Environment sky decorations (stars, celestial bodies, clouds, etc.)
    buildEnvironmentSky(scene, environmentId, bounds.span, nightMode);

    // Dynamic 3D environment effects: wind particles and water waves
    const windPts = buildWindParticles(scene, bounds.span, environmentId, airResistance);
    windParticlesRef.current = windPts;
    if (environmentId === 'underwater') {
      const waves = buildWaterWaves(scene, bounds.span);
      waterWavesRef.current = waves;
    } else {
      waterWavesRef.current = null;
    }

    // Static scene elements
    const groundGrid = buildGround(scene, bounds, nightMode, theme3d);
    groundGrid.visible = showGrid;
    gridRef.current = groundGrid;
    buildAxes(scene, bounds, nightMode, theme3d);
    const trajMeshes = buildTrajectory(scene, trajectoryData, nightMode, bounds, phiRad, theme3d);
    trajectoryMeshesRef.current = trajMeshes;

    if (showCriticalPoints && prediction) {
      buildCriticalPoints(scene, prediction, height, bounds, phiRad);
    }

    // Projectile — use 3D model if a preset is active
    const projectile = buildProjectile3D(bounds.span, activePresetEmoji);
    scene.add(projectile);
    projectileRef.current = projectile;

    // Determine if this is a directional model that needs tangent alignment
    const isDirectional = activePresetEmoji === '🚀' || activePresetEmoji === '🏹';

    // Set initial position
    const initPos = getInterpolatedPosition(trajectoryData, currentTimeRef.current);
    const initPos3D = project3D(initPos.x, initPos.y, phiRad);
    projectile.position.copy(initPos3D);

    // Persistent vector arrows (created once, updated in-place each frame)
    const arrows = createPersistentArrows(scene, nightMode, theme3d);
    arrowsRef.current = arrows;

    // Controls -- smooth damping for stable camera
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.7;
    controls.enablePan = true;
    controls.rotateSpeed = 0.6;
    controls.minDistance = bounds.span * 0.2;
    controls.maxDistance = bounds.span * 5;
    if (savedCameraTarget.current) {
      controls.target.copy(savedCameraTarget.current);
    } else {
      controls.target.set(bounds.maxX * 0.4, bounds.maxY * 0.3, 0);
    }
    controls.update();
    controlsRef.current = controls;

    // Render loop — all dynamic updates in one tick for smooth 60fps
    aliveRef.current = true;
    smoothTimeRef.current = currentTimeRef.current;
    lastTickTsRef.current = 0;
    wasAnimatingRef.current = false;
    let lastHoverUpdate = 0;
    const tick = (timestamp: number) => {
      if (!aliveRef.current) return;
      frameRef.current = requestAnimationFrame(tick);

      controls.update();

      // Update projectile position + vectors every frame
      const data = trajectoryRef.current;
      if (data.length > 0) {
        const animating = isAnimatingRef.current;

        // Smooth time advancement: drive time locally using frame deltas
        // instead of waiting for React state updates (which lag 1-2 frames)
        if (animating) {
          if (!wasAnimatingRef.current) {
            // Animation just started — sync from React's time
            smoothTimeRef.current = currentTimeRef.current;
            lastTickTsRef.current = timestamp;
          } else if (lastTickTsRef.current > 0) {
            // Detect seek: if React time jumped significantly, re-sync
            const reactDrift = Math.abs(currentTimeRef.current - smoothTimeRef.current);
            if (reactDrift > 0.15) {
              smoothTimeRef.current = currentTimeRef.current;
            } else {
              // Advance smoothly using real frame delta
              // Parent uses 0.03 * playbackSpeed per frame ≈ 1.8 * playbackSpeed sim-sec/real-sec at 60fps
              const dtSec = Math.min((timestamp - lastTickTsRef.current) / 1000, 0.1);
              smoothTimeRef.current += dtSec * 1.8 * playbackSpeedRef.current;
            }
          }
          // Clamp to trajectory bounds
          const last = data[data.length - 1];
          if (last && smoothTimeRef.current > last.time) {
            smoothTimeRef.current = last.time;
          }
        } else {
          // Not animating — follow React's time exactly (paused, seeked, stopped)
          smoothTimeRef.current = currentTimeRef.current;
        }
        wasAnimatingRef.current = animating;
        lastTickTsRef.current = timestamp;

        const displayTime = smoothTimeRef.current;
        const pos = getInterpolatedPosition(data, displayTime);
        const curPhiRad = (phiRef.current * Math.PI) / 180;

        // Use the CatmullRom curve to position the projectile so it stays
        // exactly on the tube path (linear lerp between raw points can
        // deviate from the spline between control points).
        const n = data.length;
        const curveParam = n > 1 ? Math.min(pos.fractionalIdx / (n - 1), 1) : 0;

        let pos3D: THREE.Vector3;
        if (trajMeshes && trajMeshes.curve) {
          pos3D = trajMeshes.curve.getPointAt(curveParam);
        } else {
          pos3D = project3D(pos.x, pos.y, curPhiRad);
        }
        projectile.position.copy(pos3D);

        // Align directional models (rocket, arrow) tangent to the path
        if (isDirectional && trajMeshes && trajMeshes.curve) {
          // Get tangent direction from the curve at the current parameter
          const tangent = trajMeshes.curve.getTangentAt(curveParam);
          if (tangent.lengthSq() > 1e-9) {
            // Models are built along +X axis, so align +X with tangent
            const up = new THREE.Vector3(0, 1, 0);
            const quat = new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(1, 0, 0),
              tangent.normalize()
            );
            projectile.quaternion.copy(quat);
          }
        }

        // Progressive trajectory: update solid tube draw range and dashed line visibility
        // Use the same curve parameter so the tube end always matches the projectile.
        if (trajMeshes) {
          const totalIndices = trajMeshes.tubeSegments * trajMeshes.radialSegments * 6;
          const drawCount = Math.floor(curveParam * totalIndices);
          trajMeshes.solidTube.geometry.setDrawRange(0, drawCount);
          // Hide dashed line once trajectory is fully drawn
          trajMeshes.dashedLine.visible = curveParam < 0.999;
        }

        // Keep default projectile always the default silver/gray color
        if (!activePresetEmoji && (projectile as THREE.Mesh).material) {
          const projMat = (projectile as THREE.Mesh).material as THREE.MeshStandardMaterial;
          projMat.color.setHex(0xe8e8e8);
          projMat.emissive.setHex(0xccccdd);
          projMat.emissiveIntensity = 0.15;
        }

        // Update vector arrows in-place (zero allocation)
        const curPt = data[pos.idx];
        if (curPt && arrowsRef.current) {
          syncArrows(
            arrowsRef.current, curPt,
            massRef.current, gravityRef.current, airResistanceRef.current,
            vectorVisibilityRef.current, bounds.span,
            showExternalForcesRef.current,
            pos3D,
          );
        }

        // Throttle React state updates to ~15fps
        if (curPt && timestamp - lastHoverUpdate > 66) {
          lastHoverUpdate = timestamp;
          if (hoverDataRef.current !== curPt) {
            hoverDataRef.current = curPt;
            setHoverData(curPt);
          }
        }
      }

      // Animate dynamic 3D environment effects
      const dtSec = lastTickTsRef.current > 0 ? Math.min((timestamp - lastTickTsRef.current) / 1000, 0.1) : 0.016;
      const elapsedSec = timestamp / 1000;
      if (windParticlesRef.current) {
        animateWindParticles(windParticlesRef.current, bounds.span, dtSec, environmentIdRef.current);
      }
      if (waterWavesRef.current) {
        animateWaterWaves(waterWavesRef.current, bounds.span, elapsedSec);
      }

      // Real rotation (Magnus spin) — spin the projectile around its velocity axis
      if (enableMagnusSpinRef.current && spinRateRef.current !== 0 && projectile) {
        const spinAngle = spinRateRef.current * dtSec * Math.PI * 2;
        projectile.rotateZ(spinAngle);
      }

      renderer.render(scene, camera);
    };
    frameRef.current = requestAnimationFrame(tick);

    // Resize handler — use ResizeObserver so fullscreen enter/exit is detected
    const onResize = () => {
      if (!container) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      if (nw === 0 || nh === 0) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh, false);
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      // Save camera position and target before cleanup
      if (cameraRef.current) {
        savedCameraPos.current = cameraRef.current.position.clone();
      }
      if (controlsRef.current) {
        savedCameraTarget.current = controlsRef.current.target.clone();
      }
      aliveRef.current = false;
      cancelAnimationFrame(frameRef.current);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        const mat = (obj as THREE.Mesh).material;
        if (mat) {
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else (mat as THREE.Material).dispose();
        }
      });
      arrowsRef.current = null;
      stroboscopicGroupRef.current = null;
      detailsGroupRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      projectileRef.current = null;
      rendererRef.current = null;
    };
  }, [trajectoryData, prediction, height, showCriticalPoints, nightMode, webglError, lang, phi, environmentId, activePresetEmoji, airResistance, theme3d]);

  // ── Toggle 3D grid visibility ──
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.visible = showGrid;
    }
  }, [showGrid]);

  // ── Stroboscopic marks in 3D ──
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old stroboscopic group
    if (stroboscopicGroupRef.current) {
      scene.remove(stroboscopicGroupRef.current);
      stroboscopicGroupRef.current.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        const mat = (obj as THREE.Mesh).material;
        if (mat) {
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else (mat as THREE.Material).dispose();
        }
      });
      stroboscopicGroupRef.current = null;
    }

    if (stroboscopicMarks.length === 0) return;

    const group = new THREE.Group();
    group.name = 'stroboscopic';
    const curPhiRad = (phiRef.current * Math.PI) / 180;
    const bounds = boundsRef.current;
    const markSize = bounds.span * 0.015;

    // Red X mark material
    const markMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.3 });

    stroboscopicMarks.forEach((mark) => {
      const pos3D = project3D(mark.x, mark.y, curPhiRad);

      // Create X shape using two crossed thin boxes
      const barGeom = new THREE.BoxGeometry(markSize * 2, markSize * 0.3, markSize * 0.3);

      const bar1 = new THREE.Mesh(barGeom, markMat);
      bar1.position.copy(pos3D);
      bar1.rotation.z = Math.PI / 4;
      group.add(bar1);

      const bar2 = new THREE.Mesh(barGeom, markMat);
      bar2.position.copy(pos3D);
      bar2.rotation.z = -Math.PI / 4;
      group.add(bar2);

      // Projection lines
      if (showStroboscopicProjections && stroboscopicMarks.length >= 2) {
        // Green dashed line to ground (Y=0)
        const groundPos = project3D(mark.x, 0, curPhiRad);
        const greenLineMat = new THREE.LineDashedMaterial({ color: 0x22c55e, dashSize: markSize, gapSize: markSize * 0.7, linewidth: 1 });
        const greenGeom = new THREE.BufferGeometry().setFromPoints([pos3D.clone(), groundPos]);
        const greenLine = new THREE.Line(greenGeom, greenLineMat);
        greenLine.computeLineDistances();
        group.add(greenLine);

        // Small green sphere on ground
        const greenDot = new THREE.Mesh(
          new THREE.SphereGeometry(markSize * 0.25, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.3 })
        );
        greenDot.position.copy(groundPos);
        group.add(greenDot);

        // Orange dashed line to Y axis (x=0, z=0)
        const yAxisPos = project3D(0, mark.y, 0);
        const orangeLineMat = new THREE.LineDashedMaterial({ color: 0xf97316, dashSize: markSize, gapSize: markSize * 0.7, linewidth: 1 });
        const orangeGeom = new THREE.BufferGeometry().setFromPoints([pos3D.clone(), yAxisPos]);
        const orangeLine = new THREE.Line(orangeGeom, orangeLineMat);
        orangeLine.computeLineDistances();
        group.add(orangeLine);

        // Small orange sphere on Y axis
        const orangeDot = new THREE.Mesh(
          new THREE.SphereGeometry(markSize * 0.25, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xf97316, emissiveIntensity: 0.3 })
        );
        orangeDot.position.copy(yAxisPos);
        group.add(orangeDot);
      }
    });

    scene.add(group);
    stroboscopicGroupRef.current = group;
  }, [stroboscopicMarks, showStroboscopicProjections, sceneId]);

  // ── Axis details (labels, values, names) toggle ──
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old details group
    if (detailsGroupRef.current) {
      scene.remove(detailsGroupRef.current);
      detailsGroupRef.current.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        const mat = (obj as THREE.Mesh).material;
        if (mat) {
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else (mat as THREE.Material).dispose();
        }
      });
      detailsGroupRef.current = null;
    }

    if (!showDetails) return;

    const bounds = boundsRef.current;
    const { maxX, maxY, span } = bounds;
    const group = new THREE.Group();
    group.name = 'axis-details';

    // Ball radius is span*0.014, so we make labels about that size for visibility
    const ballDiameter = span * 0.028;

    // --- Helper: create a ground-plane decal (flat text lying on the ground) ---
    const makeGroundLabel = (text: string, color: string, size: number) => {
      const canvas = document.createElement('canvas');
      const res = 512;
      canvas.width = res;
      canvas.height = res / 2;
      const ctx = canvas.getContext('2d')!;
      ctx.font = `bold 80px "IBM Plex Mono", monospace`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, res / 2, res / 4);
      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      const geo = new THREE.PlaneGeometry(size, size * 0.5);
      const mat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, side: THREE.DoubleSide,
        depthTest: true, depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      // Rotate to lie flat on the ground (face up)
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.02; // just above ground
      return mesh;
    };

    // --- Helper: upright billboard sprite (for Y axis & info text) ---
    const makeSprite = (text: string, color: string, size: number) => {
      const canvas = document.createElement('canvas');
      const res = 1024;
      canvas.width = res;
      canvas.height = res / 2;
      const ctx = canvas.getContext('2d')!;
      ctx.font = `bold 90px "IBM Plex Mono", monospace`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, res / 2, res / 4);
      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(size, size * 0.5, 1);
      return sprite;
    };

    const axisLen = span + bounds.pad;

    // ── Tick step calculation ──
    const niceStep = (range: number, maxTicks: number) => {
      if (range <= 0) return 1;
      const rough = range / maxTicks;
      const mag = Math.pow(10, Math.floor(Math.log10(rough)));
      const frac = rough / mag;
      let nice: number;
      if (frac <= 1.5) nice = 1;
      else if (frac <= 3) nice = 2;
      else if (frac <= 7) nice = 5;
      else nice = 10;
      return nice * mag;
    };

    const stepX = niceStep(maxX, 8);
    const stepY = niceStep(maxY, 6);
    const valSize = ballDiameter * 1.8; // value labels ~1.8× ball diameter
    const nameSize = ballDiameter * 3;  // axis name labels ~3× ball diameter

    // Adapt label colors to night mode for visibility
    const valColor = nightMode ? '#ddeeff' : '#000000';
    const xAxisLabelColor = nightMode ? '#f87171' : '#dc2626';
    const yAxisLabelColor = nightMode ? '#4ade80' : '#16a34a';
    const zAxisLabelColor = nightMode ? '#60a5fa' : '#2563eb';
    const infoColor = nightMode ? '#e0e8f0' : '#111111';

    // ═══ X AXIS: values printed on the ground plane ═══
    for (let v = stepX; v <= maxX + stepX * 0.5; v += stepX) {
      const lbl = makeGroundLabel(v.toFixed(v >= 100 ? 0 : 1), valColor, valSize);
      lbl.position.set(v, 0.02, span * 0.06); // on ground, slightly in front of axis
      group.add(lbl);
    }
    // Origin "0" on the ground
    const originLbl = makeGroundLabel('0', valColor, valSize);
    originLbl.position.set(-valSize * 0.3, 0.02, span * 0.06);
    group.add(originLbl);

    // X axis name label on the ground (large, red)
    const xName = makeGroundLabel(
      lang === 'ar' ? 'X (المحور الأفقي) - m' : 'X (Horizontal) - m',
      xAxisLabelColor, nameSize
    );
    xName.position.set(maxX * 0.5, 0.03, span * 0.14);
    group.add(xName);

    // ═══ Y AXIS: upright sprite labels next to the Y axis, clearly visible ═══
    for (let v = stepY; v <= maxY + stepY * 0.5; v += stepY) {
      const lbl = makeSprite(v.toFixed(v >= 100 ? 0 : 1), valColor, valSize);
      lbl.position.set(-span * 0.07, v, 0);
      group.add(lbl);
    }

    // Y axis name label (large, green, upright)
    const yName = makeSprite(
      lang === 'ar' ? 'Y (المحور العمودي) - m' : 'Y (Vertical) - m',
      yAxisLabelColor, nameSize
    );
    yName.position.set(-span * 0.14, maxY * 0.5, 0);
    group.add(yName);

    // ═══ Z AXIS: values on the ground along Z ═══
    const zLen = axisLen * 0.35;
    const stepZ = niceStep(zLen, 4);
    for (let v = stepZ; v <= zLen + stepZ * 0.5; v += stepZ) {
      const lbl = makeGroundLabel(v.toFixed(v >= 100 ? 0 : 1), valColor, valSize);
      lbl.position.set(-span * 0.06, 0.02, v);
      group.add(lbl);
    }

    // Z axis name label on ground (large, blue)
    const zName = makeGroundLabel(
      lang === 'ar' ? 'Z (العمق) - m' : 'Z (Depth) - m',
      zAxisLabelColor, nameSize
    );
    zName.position.set(-span * 0.14, 0.03, zLen * 0.5);
    group.add(zName);

    // ═══ Range / Max height info (upright, above trajectory) ═══
    const rangeText = lang === 'ar'
      ? `المدى: ${maxX.toFixed(1)}m | أقصى ارتفاع: ${maxY.toFixed(1)}m`
      : `Range: ${maxX.toFixed(1)}m | Max H: ${maxY.toFixed(1)}m`;
    const infoLbl = makeSprite(rangeText, infoColor, nameSize * 1.5);
    infoLbl.position.set(maxX * 0.5, maxY + span * 0.12, 0);
    group.add(infoLbl);

    scene.add(group);
    detailsGroupRef.current = group;
  }, [showDetails, sceneId, lang, nightMode]);

  // Reset camera
  const resetCamera = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const b = boundsRef.current;
    camera.position.set(b.span * 0.8, b.span * 0.6, b.span * 1.0);
    controls.target.set(b.maxX * 0.4, b.maxY * 0.3, 0);
    controls.update();
    savedCameraPos.current = null;
    savedCameraTarget.current = null;
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full min-h-[350px]" />

      {webglError && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/95 text-foreground p-6 text-center">
          <div className="max-w-sm space-y-3">
            <div className="text-4xl">🖥️</div>
            <p className="font-semibold text-base">{lang === 'ar' ? 'وضع 3D غير متاح' : '3D Mode Unavailable'}</p>
            <p className="text-sm text-muted-foreground">{webglError}</p>
          </div>
        </div>
      )}

      {/* Reset Camera & Show Details Buttons */}
      {!webglError && (
        <div className="absolute top-3 right-3 flex gap-1.5">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`px-2 py-1 text-[10px] font-medium backdrop-blur border rounded-md transition-all duration-200 ${
              showDetails
                ? 'bg-primary text-primary-foreground border-primary/50 shadow-md shadow-primary/20'
                : 'bg-background/90 border-border text-foreground hover:bg-secondary hover:border-foreground/30 hover:shadow-md'
            }`}
          >
            {lang === 'ar' ? 'عرض التفاصيل' : 'Show Details'}
          </button>
          <button
            onClick={resetCamera}
            className="px-2 py-1 text-[10px] font-medium bg-background/90 backdrop-blur border border-border rounded-md hover:bg-secondary hover:border-foreground/30 hover:shadow-md transition-all duration-200 text-foreground"
          >
            {lang === 'ar' ? 'إعادة الكاميرا' : 'Reset Camera'}
          </button>
        </div>
      )}

      {/* Live Data Overlay */}
      {hoverData && !webglError && showLiveData && (
        <div className="absolute top-3 left-3 bg-background/90 backdrop-blur border border-border rounded-lg p-3 text-xs shadow-md">
          <p className="font-semibold text-foreground mb-1.5">{lang === 'ar' ? 'البيانات الحية' : 'Live Data'}</p>
          <p className="text-muted-foreground">t = {hoverData.time.toFixed(3)} s</p>
          <p className="text-muted-foreground">X = {hoverData.x.toFixed(2)} m</p>
          <p className="text-muted-foreground">Y = {hoverData.y.toFixed(2)} m</p>
          <p className="text-foreground font-medium">V = {hoverData.speed.toFixed(2)} m/s</p>
          <p className="text-muted-foreground">Vx = {hoverData.vx.toFixed(2)} m/s</p>
          <p className="text-muted-foreground">Vy = {hoverData.vy.toFixed(2)} m/s</p>
          <p className="text-foreground font-medium">θ = {(Math.atan2(hoverData.vy, hoverData.vx) * 180 / Math.PI).toFixed(1)}°</p>
          <p className="text-muted-foreground">{lang === 'ar' ? 'الميل' : 'Slope'} = {Math.abs(hoverData.vx) > 1e-6 ? (hoverData.vy / hoverData.vx).toFixed(3) : (hoverData.vy >= 0 ? '∞' : '-∞')}</p>
        </div>
      )}
    </div>
  );
};

export default SimulationCanvas3D;
