// ═══ 3D Scene Builder ═══
// Constructs all static scene elements: axes, grid, labels, trajectory curve, critical points

import * as THREE from 'three';
import type { TrajectoryPoint, PredictionResult } from '@/utils/physics';

/* ── helpers ── */

function makeTextSprite(text: string, color = '#000000', scale = 1) {
  const canvas = document.createElement('canvas');
  const size = 256;
  canvas.width = size;
  canvas.height = size / 2;
  const ctx = canvas.getContext('2d')!;
  ctx.font = 'bold 64px "IBM Plex Mono", monospace';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, size / 2, size / 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scale, scale * 0.5, 1);
  return sprite;
}

function niceStep(range: number, maxTicks: number): number {
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
}

/** Create a cylinder-based line for visible thickness in WebGL */
function makeCylinderLine(from: THREE.Vector3, to: THREE.Vector3, color: number, radius: number): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  if (length < 1e-6) return new THREE.Mesh();
  const geo = new THREE.CylinderGeometry(radius, radius, length, 6, 1);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 });
  const mesh = new THREE.Mesh(geo, mat);
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  mesh.position.copy(mid);
  const dir = direction.normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
  mesh.quaternion.copy(quat);
  return mesh;
}

export interface SceneBounds {
  maxX: number;
  maxY: number;
  span: number;
  pad: number;
}

/** Project 2D point (x, y) into 3D using azimuthal angle phi (radians) */
export function project3D(x: number, y: number, phiRad: number): THREE.Vector3 {
  return new THREE.Vector3(x * Math.cos(phiRad), y, x * Math.sin(phiRad));
}

export function computeBounds(trajectoryData: TrajectoryPoint[], height: number): SceneBounds {
  let maxX = 1, maxY = Math.max(height + 1, 1);
  for (const p of trajectoryData) {
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const span = Math.max(maxX, maxY);
  const pad = span * 0.15;
  return { maxX, maxY, span, pad };
}

export function buildAxes(scene: THREE.Scene, bounds: SceneBounds, nightMode: boolean) {
  const { maxX, maxY, span, pad } = bounds;
  const axisLen = span + pad;
  const tickLen = span * 0.012;
  const labelSize = span * 0.012;
  const axisRadius = span * 0.003;

  // Axis colors adapt to night mode for visibility
  const xAxisColor = nightMode ? 0xf87171 : 0xdc2626; // brighter red in dark
  const yAxisColor = nightMode ? 0x4ade80 : 0x16a34a; // brighter green in dark
  const zAxisColor = nightMode ? 0x60a5fa : 0x2563eb; // brighter blue in dark
  const xLabelColor = nightMode ? '#f87171' : '#dc2626';
  const yLabelColor = nightMode ? '#4ade80' : '#16a34a';
  const zLabelColor = nightMode ? '#60a5fa' : '#2563eb';

  // Axis lines using cylinder geometry for visible thickness
  scene.add(makeCylinderLine(
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(axisLen, 0, 0), xAxisColor, axisRadius
  ));
  scene.add(makeCylinderLine(
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, axisLen, 0), yAxisColor, axisRadius
  ));
  scene.add(makeCylinderLine(
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, axisLen * 0.35), zAxisColor, axisRadius
  ));

  // Axis labels
  const xL = makeTextSprite('X', xLabelColor, labelSize);
  xL.position.set(axisLen + pad * 0.25, 0, 0);
  scene.add(xL);

  const yL = makeTextSprite('Y', yLabelColor, labelSize);
  yL.position.set(0, axisLen + pad * 0.25, 0);
  scene.add(yL);

  const zL = makeTextSprite('Z', zLabelColor, labelSize);
  zL.position.set(0, 0, axisLen * 0.35 + pad * 0.25);
  scene.add(zL);

  // Tick marks & numeric labels -- adapt to day/night
  const tickColor = nightMode ? '#aabbcc' : '#666666';
  const tickHex = nightMode ? 0xaabbcc : 0x666666;
  const tickRadius = axisRadius * 0.5;
  const stepX = niceStep(maxX, 8);
  const stepY = niceStep(maxY, 6);

  for (let v = stepX; v <= maxX + stepX * 0.5; v += stepX) {
    scene.add(makeCylinderLine(
      new THREE.Vector3(v, -tickLen, 0), new THREE.Vector3(v, tickLen, 0), tickHex, tickRadius
    ));
    const lbl = makeTextSprite(v.toFixed(v >= 100 ? 0 : 1), tickColor, labelSize * 0.65);
    lbl.position.set(v, -span * 0.03, 0);
    scene.add(lbl);
  }

  for (let v = stepY; v <= maxY + stepY * 0.5; v += stepY) {
    scene.add(makeCylinderLine(
      new THREE.Vector3(-tickLen, v, 0), new THREE.Vector3(tickLen, v, 0), tickHex, tickRadius
    ));
    const lbl = makeTextSprite(v.toFixed(v >= 100 ? 0 : 1), tickColor, labelSize * 0.65);
    lbl.position.set(-span * 0.035, v, 0);
    scene.add(lbl);
  }
}

export function buildGround(scene: THREE.Scene, bounds: SceneBounds, nightMode: boolean): THREE.GridHelper {
  const { span } = bounds;

  // Realistic white lab/testing room floor
  const planeGeo = new THREE.PlaneGeometry(span * 3, span * 3);
  const groundCanvas = document.createElement('canvas');
  groundCanvas.width = 512;
  groundCanvas.height = 512;
  const gctx = groundCanvas.getContext('2d')!;
  // Create a radial gradient from center (bright) to edges (slightly darker)
  const grad = gctx.createRadialGradient(256, 256, 0, 256, 256, 360);
  // Same white lab floor for both day and night modes for consistency
  grad.addColorStop(0, '#f5f5f3');
  grad.addColorStop(0.4, '#eeeeec');
  grad.addColorStop(0.7, '#e8e8e6');
  grad.addColorStop(1, '#e0e0de');
  gctx.fillStyle = grad;
  gctx.fillRect(0, 0, 512, 512);
  // Add subtle noise pattern for realistic surface texture
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const alpha = Math.random() * 0.04;
    gctx.fillStyle = `rgba(0,0,0,${alpha + 0.01})`;
    gctx.fillRect(x, y, 2, 2);
  }
  const groundTex = new THREE.CanvasTexture(groundCanvas);
  groundTex.needsUpdate = true;
  const planeMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    side: THREE.DoubleSide,
    roughness: 0.9,
    metalness: 0.02,
  });
  const plane = new THREE.Mesh(planeGeo, planeMat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -0.01;
  plane.receiveShadow = true;
  scene.add(plane);

  // Black grid lines for lab/testing room look
  // Same grid colors for both modes for visual consistency
  const gridColor1 = 0x222222;
  const gridColor2 = 0x333333;
  const grid = new THREE.GridHelper(span * 3, 24, gridColor1, gridColor2);
  (grid.material as THREE.Material).opacity = 0.25;
  (grid.material as THREE.Material).transparent = true;
  grid.position.y = 0;
  scene.add(grid);

  return grid;
}

export interface TrajectoryMeshes {
  solidTube: THREE.Mesh;
  dashedLine: THREE.LineSegments;
  tubeSegments: number;
  radialSegments: number;
  curve: THREE.CatmullRomCurve3;
  numControlPoints: number;
}

export function buildTrajectory(
  scene: THREE.Scene,
  trajectoryData: TrajectoryPoint[],
  nightMode: boolean,
  bounds: SceneBounds,
  phiRad = 0,
): TrajectoryMeshes | null {
  if (trajectoryData.length < 2) return null;

  const curvePts = trajectoryData.map(p => project3D(p.x, p.y, phiRad));
  const curve = new THREE.CatmullRomCurve3(curvePts, false, 'catmullrom', 0.3);

  // Solid tube for the completed (trail) portion — adapt color for night mode
  const tubeColor = nightMode ? 0xc8d0e0 : 0x1a1a2e;
  const tubeRadius = bounds.span * 0.0035;
  const radialSegments = 12;
  const tubeSegments = Math.min(curvePts.length * 4, 800);
  const tube = new THREE.TubeGeometry(curve, tubeSegments, tubeRadius, radialSegments, false);
  const mat = new THREE.MeshStandardMaterial({
    color: tubeColor,
    roughness: 0.3,
    metalness: 0.15,
    emissive: tubeColor,
    emissiveIntensity: nightMode ? 0.15 : 0.05,
  });
  const solidTube = new THREE.Mesh(tube, mat);
  solidTube.castShadow = true;
  // Start with nothing drawn (will be updated in tick)
  solidTube.geometry.setDrawRange(0, 0);
  scene.add(solidTube);

  // Dashed line segments for the remaining (future) portion
  const dashGeo = new THREE.BufferGeometry();
  const dashVerts: number[] = [];
  const totalPts = curvePts.length;
  // Create dashed segments: draw every other segment
  for (let i = 0; i < totalPts - 1; i += 2) {
    const a = curvePts[i];
    const b = curvePts[Math.min(i + 1, totalPts - 1)];
    dashVerts.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  dashGeo.setAttribute('position', new THREE.Float32BufferAttribute(dashVerts, 3));
  const dashMat = new THREE.LineBasicMaterial({
    color: nightMode ? 0xaabbcc : 0x888888,
    transparent: true,
    opacity: 0.5,
  });
  const dashedLine = new THREE.LineSegments(dashGeo, dashMat);
  scene.add(dashedLine);

  return { solidTube, dashedLine, tubeSegments, radialSegments, curve, numControlPoints: curvePts.length };
}

export function buildCriticalPoints(
  scene: THREE.Scene,
  prediction: PredictionResult,
  height: number,
  bounds: SceneBounds,
  phiRad = 0,
) {
  const { span } = bounds;
  const r = span * 0.009;

  // Launch (green) -- brighter emissive
  const launchGeo = new THREE.SphereGeometry(r, 24, 24);
  const launchMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e, roughness: 0.25, metalness: 0.2,
    emissive: 0x22c55e, emissiveIntensity: 0.3,
  });
  const launch = new THREE.Mesh(launchGeo, launchMat);
  const launchPos = project3D(0, height, phiRad);
  launch.position.copy(launchPos);
  launch.castShadow = true;
  scene.add(launch);

  // Peak (blue)
  if (prediction.maxHeightPoint) {
    const peakGeo = new THREE.SphereGeometry(r, 24, 24);
    const peakMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6, roughness: 0.25, metalness: 0.2,
      emissive: 0x3b82f6, emissiveIntensity: 0.3,
    });
    const peak = new THREE.Mesh(peakGeo, peakMat);
    const peakPos = project3D(prediction.maxHeightPoint.x, prediction.maxHeightPoint.y, phiRad);
    peak.position.copy(peakPos);
    peak.castShadow = true;
    scene.add(peak);

    // Dashed line from peak to ground using cylinder segments
    const peakH = prediction.maxHeightPoint.y;
    if (peakH > 0.01) {
      const dashCount = Math.max(4, Math.round(peakH / (span * 0.02)));
      const dashLen = peakH / (dashCount * 2 - 1);
      const dashRadius = span * 0.0012;
      const peakX = prediction.maxHeightPoint.x;
      for (let i = 0; i < dashCount; i++) {
        const yBot = i * dashLen * 2;
        const yTop = yBot + dashLen;
        scene.add(makeCylinderLine(
          project3D(peakX, yBot, phiRad),
          project3D(peakX, yTop, phiRad),
          0x3b82f6, dashRadius,
        ));
      }
    }
  }

  // Impact (red)
  const impGeo = new THREE.SphereGeometry(r, 24, 24);
  const impMat = new THREE.MeshStandardMaterial({
    color: 0xef4444, roughness: 0.25, metalness: 0.2,
    emissive: 0xef4444, emissiveIntensity: 0.3,
  });
  const imp = new THREE.Mesh(impGeo, impMat);
  const impPos = project3D(prediction.range, 0, phiRad);
  imp.position.copy(impPos);
  imp.castShadow = true;
  scene.add(imp);
}

export function buildProjectile(span: number): THREE.Mesh {
  const r = span * 0.014;
  const geo = new THREE.SphereGeometry(r, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xe8e8e8,
    roughness: 0.15,
    metalness: 0.6,
    emissive: 0xccccdd,
    emissiveIntensity: 0.15,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

/* ── 3D Preset Models ── */

/** Build a 3D football (soccer ball) — white sphere with black pentagon patches */
function buildFootball3D(span: number): THREE.Group {
  const group = new THREE.Group();
  const r = span * 0.016;
  // Main white sphere
  const ballGeo = new THREE.SphereGeometry(r, 32, 32);
  const ballMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.5, metalness: 0.05,
    emissive: 0xffffff, emissiveIntensity: 0.05,
  });
  const ball = new THREE.Mesh(ballGeo, ballMat);
  ball.castShadow = true;
  group.add(ball);
  // Black pentagon patches as small dark spheres on surface
  const patchMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });
  const patchR = r * 0.25;
  const patchPositions = [
    [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1],
    [0.7, 0.7, 0], [-0.7, 0.7, 0], [0.7, -0.7, 0], [-0.7, -0.7, 0],
    [0, 0.7, 0.7], [0, -0.7, 0.7],
  ];
  patchPositions.forEach(([x, y, z]) => {
    const patchGeo = new THREE.SphereGeometry(patchR, 8, 8);
    const patch = new THREE.Mesh(patchGeo, patchMat);
    patch.position.set(x * r * 0.85, y * r * 0.85, z * r * 0.85);
    group.add(patch);
  });
  return group;
}

/** Build a 3D basketball — orange sphere with dark seam lines */
function buildBasketball3D(span: number): THREE.Group {
  const group = new THREE.Group();
  const r = span * 0.016;
  // Main orange sphere
  const ballGeo = new THREE.SphereGeometry(r, 32, 32);
  const ballMat = new THREE.MeshStandardMaterial({
    color: 0xe87817, roughness: 0.65, metalness: 0.02,
    emissive: 0xe87817, emissiveIntensity: 0.08,
  });
  const ball = new THREE.Mesh(ballGeo, ballMat);
  ball.castShadow = true;
  group.add(ball);
  // Seam lines as thin torus rings
  const seamMat = new THREE.MeshStandardMaterial({ color: 0x2a1500, roughness: 0.8 });
  const seamR = r * 0.03;
  // Equatorial seam
  const seamGeo1 = new THREE.TorusGeometry(r * 1.002, seamR, 8, 48);
  const seam1 = new THREE.Mesh(seamGeo1, seamMat);
  group.add(seam1);
  // Vertical seam
  const seam2 = new THREE.Mesh(seamGeo1.clone(), seamMat);
  seam2.rotation.y = Math.PI / 2;
  group.add(seam2);
  // Side seam
  const seam3 = new THREE.Mesh(seamGeo1.clone(), seamMat);
  seam3.rotation.x = Math.PI / 2;
  group.add(seam3);
  return group;
}

/** Build a 3D cannonball — dark metallic sphere with rivets */
function buildCannonball3D(span: number): THREE.Group {
  const group = new THREE.Group();
  const r = span * 0.018;
  // Main dark sphere
  const ballGeo = new THREE.SphereGeometry(r, 32, 32);
  const ballMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a, roughness: 0.25, metalness: 0.85,
    emissive: 0x111111, emissiveIntensity: 0.05,
  });
  const ball = new THREE.Mesh(ballGeo, ballMat);
  ball.castShadow = true;
  group.add(ball);
  // Fuse on top — small cylinder
  const fuseMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 });
  const fuseGeo = new THREE.CylinderGeometry(r * 0.06, r * 0.06, r * 0.4, 8);
  const fuse = new THREE.Mesh(fuseGeo, fuseMat);
  fuse.position.y = r * 1.0;
  group.add(fuse);
  return group;
}

/** Build a 3D arrow — shaft + arrowhead + fletching, pointing along +X axis */
function buildArrow3D(span: number): THREE.Group {
  const group = new THREE.Group();
  const len = span * 0.045;
  const shaftR = span * 0.002;
  // Shaft (cylinder along X axis → rotate from Y to X)
  const shaftGeo = new THREE.CylinderGeometry(shaftR, shaftR, len, 8);
  const shaftMat = new THREE.MeshStandardMaterial({ color: 0x8B6914, roughness: 0.6, metalness: 0.1 });
  const shaft = new THREE.Mesh(shaftGeo, shaftMat);
  shaft.rotation.z = -Math.PI / 2; // align along +X
  group.add(shaft);
  // Arrowhead (cone at front)
  const headLen = len * 0.15;
  const headR = shaftR * 3;
  const headGeo = new THREE.ConeGeometry(headR, headLen, 8);
  const headMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.2, metalness: 0.8 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.rotation.z = -Math.PI / 2; // point along +X
  head.position.x = len / 2 + headLen / 2;
  group.add(head);
  // Fletching (3 small fins at the back)
  const finMat = new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.7 });
  for (let i = 0; i < 3; i++) {
    const finGeo = new THREE.PlaneGeometry(len * 0.1, shaftR * 6);
    const fin = new THREE.Mesh(finGeo, finMat);
    fin.material.side = THREE.DoubleSide;
    const angle = (i / 3) * Math.PI * 2;
    fin.position.x = -len / 2 + len * 0.05;
    fin.position.y = Math.cos(angle) * shaftR * 2;
    fin.position.z = Math.sin(angle) * shaftR * 2;
    fin.rotation.y = Math.PI / 2;
    fin.rotation.x = angle;
    group.add(fin);
  }
  return group;
}

/** Build a 3D rocket — body + nose cone + fins + exhaust nozzle, pointing along +X axis */
function buildRocket3D(span: number): THREE.Group {
  const group = new THREE.Group();
  const bodyLen = span * 0.05;
  const bodyR = span * 0.008;
  // Body (cylinder along X axis)
  const bodyGeo = new THREE.CylinderGeometry(bodyR, bodyR, bodyLen, 16);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xdddddd, roughness: 0.3, metalness: 0.4,
    emissive: 0xdddddd, emissiveIntensity: 0.05,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.z = -Math.PI / 2; // align along +X
  group.add(body);
  // Nose cone (cone at front)
  const noseLen = bodyLen * 0.25;
  const noseGeo = new THREE.ConeGeometry(bodyR, noseLen, 16);
  const noseMat = new THREE.MeshStandardMaterial({ color: 0xee3333, roughness: 0.3, metalness: 0.3 });
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.rotation.z = -Math.PI / 2; // point along +X
  nose.position.x = bodyLen / 2 + noseLen / 2;
  group.add(nose);
  // Fins (4 fins at the back)
  const finMat = new THREE.MeshStandardMaterial({
    color: 0xee3333, roughness: 0.4, metalness: 0.2,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 4; i++) {
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(-bodyLen * 0.15, 0);
    finShape.lineTo(0, bodyR * 2.5);
    finShape.closePath();
    const finGeo = new THREE.ShapeGeometry(finShape);
    const fin = new THREE.Mesh(finGeo, finMat);
    const angle = (i / 4) * Math.PI * 2;
    fin.position.x = -bodyLen / 2;
    fin.rotation.x = angle;
    // Rotate fin to be radially outward
    const finGroup = new THREE.Group();
    finGroup.add(fin);
    finGroup.rotation.x = angle;
    finGroup.position.x = -bodyLen / 2;
    // Reset and reposition
    fin.position.x = 0;
    fin.rotation.x = 0;
    fin.rotation.y = Math.PI / 2;
    fin.position.y = bodyR * 0.5;
    group.add(finGroup);
  }
  // Exhaust nozzle (small dark cone at back)
  const nozzleGeo = new THREE.ConeGeometry(bodyR * 0.7, bodyLen * 0.08, 12);
  const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.2, metalness: 0.8 });
  const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
  nozzle.rotation.z = Math.PI / 2; // point backwards along -X
  nozzle.position.x = -bodyLen / 2 - bodyLen * 0.04;
  group.add(nozzle);
  // Window porthole
  const windowGeo = new THREE.SphereGeometry(bodyR * 0.3, 12, 12);
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x4488ff, roughness: 0.1, metalness: 0.5,
    emissive: 0x2244aa, emissiveIntensity: 0.3,
  });
  const window1 = new THREE.Mesh(windowGeo, windowMat);
  window1.position.set(bodyLen * 0.15, bodyR * 0.85, 0);
  group.add(window1);
  return group;
}

/**
 * Build a 3D projectile model based on preset emoji.
 * All models are centered at origin and aligned along +X axis.
 * Returns a Group (for complex models) or Mesh (for default sphere).
 */
export function buildProjectile3D(span: number, presetEmoji?: string): THREE.Object3D {
  switch (presetEmoji) {
    case '⚽': return buildFootball3D(span);
    case '🏀': return buildBasketball3D(span);
    case '💣': return buildCannonball3D(span);
    case '🏹': return buildArrow3D(span);
    case '🚀': return buildRocket3D(span);
    default: return buildProjectile(span);
  }
}
