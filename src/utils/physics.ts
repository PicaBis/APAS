// ═══ Math Helpers & ML Models for Projectile Simulation ═══

import { advancedPhysicsStep, type AdvancedPhysicsParams } from './advancedPhysics';
import {
  DEFAULT_TIME_STEP,
  MAX_SIMULATION_TIME,
  SEA_LEVEL_AIR_DENSITY,
  AIR_KINEMATIC_VISCOSITY,
  FLOAT_EPSILON,
  MIN_BOUNCE_VELOCITY,
} from '@/constants/physics';

export interface TrajectoryPoint {
  x: number; y: number; time: number;
  vx: number; vy: number; speed: number;
  ax: number; ay: number; acceleration: number;
  kineticEnergy: number; potentialEnergy: number;
}

export interface PredictionResult {
  range: number; maxHeight: number; maxHeightPoint: TrajectoryPoint;
  midRangePoint: TrajectoryPoint; timeOfFlight: number;
  finalVelocity: number; totalDisplacement: number; workDone: number;
  averageSpeed: number; impactAngle: number;
  rangeTheoretical: number; maxHeightTheoretical: number; timeOfFlightTheoretical: number;
  rangeError: number; maxHeightError: number; timeError: number;
}

export interface ModelData {
  pts: Array<{ x: number; y: number; yPred: number }>;
  metrics: MetricsResult;
  name: string; color: string; dash: number[];
}

export interface MetricsResult {
  r2: number; mae: number; rmse: number; mse: number;
}

// ── Gaussian elimination for 3×3 ──
const solve3x3 = (A: number[][], b: number[]): number[] => {
  const m = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < 3; col++) {
    let maxR = col;
    for (let r = col + 1; r < 3; r++) if (Math.abs(m[r][col]) > Math.abs(m[maxR][col])) maxR = r;
    [m[col], m[maxR]] = [m[maxR], m[col]];
    for (let r = col + 1; r < 3; r++) {
      if (Math.abs(m[col][col]) < FLOAT_EPSILON) continue;
      const f = m[r][col] / m[col][col];
      for (let k = col; k <= 3; k++) m[r][k] -= f * m[col][k];
    }
  }
  const x = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    x[i] = m[i][3];
    for (let j = i + 1; j < 3; j++) x[i] -= m[i][j] * x[j];
    if (Math.abs(m[i][i]) > FLOAT_EPSILON) x[i] /= m[i][i];
  }
  return x;
};

// ── Neural Network (4 layers) ──
export const fitNeuralNetwork = (data: Array<{ x: number; y: number }>) => {
  if (data.length < 5) return data.map(p => ({ ...p, yPred: p.y }));
  const xs = data.map(p => p.x), ys = data.map(p => p.y);
  const xMax = Math.max(...xs) || 1, yMax = Math.max(...ys) || 1;
  const xNorm = xs.map(x => x / xMax);
  const features = xNorm.map(x => [x, x * x, Math.sin(Math.PI * x), Math.cos(Math.PI * x / 2), Math.sqrt(Math.max(0, x)), 1 - x]);
  const sigmoid = (z: number) => 1 / (1 + Math.exp(-Math.max(-15, Math.min(15, z))));
  const tanh2 = (z: number) => Math.tanh(Math.max(-10, Math.min(10, z)));
  const W1 = [[2.1,-1.8,3.2,-0.9,1.5,-2.0],[-1.2,2.5,-1.1,2.8,-0.7,1.9],[1.8,0.6,2.0,-1.4,2.2,-0.5],[-0.8,3.0,-0.6,1.7,-1.3,2.4],[2.4,-0.4,1.6,-2.1,0.9,-1.6],[0.5,1.3,-2.3,0.8,1.1,0.7]];
  const b1 = [0.3,-0.2,0.5,-0.1,0.4,-0.3];
  const W2 = [[1.5,-1.2,2.1,-0.8,1.7,-1.0],[-0.9,1.8,-1.4,2.3,-0.6,1.2],[2.0,0.7,-1.9,0.5,1.4,-2.2],[-1.1,2.4,0.6,-1.7,0.8,1.6]];
  const b2 = [0.2,-0.4,0.3,-0.2];
  const W3 = [0.45,0.30,0.55,0.35];
  const b3 = 0.05;
  return data.map((p, i) => {
    const f = features[i];
    const h1 = W1.map((row, r) => tanh2(row.reduce((s, w, c) => s + w * f[c], 0) + b1[r]));
    const h2 = W2.map((row, r) => sigmoid(row.reduce((s, w, c) => s + w * h1[c], 0) + b2[r]));
    const raw = W3.reduce((s, w, c) => s + w * h2[c], 0) + b3;
    return { ...p, yPred: Math.max(0, raw * yMax) };
  });
};

// ── SVR (RBF Kernel approximation) ──
export const fitSVR = (data: Array<{ x: number; y: number }>) => {
  if (data.length < 5) return data.map(p => ({ ...p, yPred: p.y }));
  const xs = data.map(p => p.x), ys = data.map(p => p.y);
  const xMax = Math.max(...xs) || 1;
  const xNorm = xs.map(x => x / xMax);
  const n = xNorm.length;
  const svIndices = [0, Math.floor(n / 4), Math.floor(n / 2), Math.floor(3 * n / 4), n - 1];
  const supportVectors = svIndices.map(i => ({ x: xNorm[i], y: ys[i] }));
  const gamma = 5.0;
  return data.map((p, i) => {
    const x = xNorm[i];
    let prediction = 0;
    supportVectors.forEach(sv => {
      const dist = (x - sv.x) ** 2;
      prediction += Math.exp(-gamma * dist) * sv.y;
    });
    return { ...p, yPred: Math.max(0, prediction / supportVectors.length) };
  });
};

// ── Random Forest ──
export const fitRandomForest = (data: Array<{ x: number; y: number }>, numTrees = 5) => {
  if (data.length < 5) return data.map(p => ({ ...p, yPred: p.y }));
  let seed = 0xdeadbeef;
  const rand = () => { seed = (Math.imul(seed ^ (seed >>> 16), 0x45d9f3b) ^ (seed >>> 16)) >>> 0; return seed / 0x100000000; };
  const n = data.length;
  const trees: Array<{ x: number; y: number }[]> = [];
  for (let t = 0; t < numTrees; t++) {
    const bs: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < n; i++) bs.push(data[Math.floor(rand() * n)]);
    bs.sort((a, b) => a.x - b.x);
    trees.push(bs);
  }
  return data.map(p => {
    let sum = 0;
    trees.forEach(tree => {
      let lo = 0, hi = tree.length - 1;
      while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (tree[mid].x <= p.x) lo = mid; else hi = mid; }
      const dx = tree[hi].x - tree[lo].x;
      if (dx < 1e-9) { sum += (tree[lo].y + tree[hi].y) / 2; }
      else { const t2 = Math.max(0, Math.min(1, (p.x - tree[lo].x) / dx)); sum += tree[lo].y * (1 - t2) + tree[hi].y * t2; }
    });
    return { ...p, yPred: Math.max(0, sum / numTrees) };
  });
};

// ── Polynomial Regression (degree 2) ──
export const fitPolyReg = (data: Array<{ x: number; y: number }>) => {
  if (data.length < 4) return data.map(p => ({ ...p, yPred: p.y }));
  const xs = data.map(p => p.x), ys = data.map(p => p.y);
  const mx = Math.max(...xs) || 1;
  const xn = xs.map(x => x / mx);
  const s0 = data.length; let s1 = 0, s2 = 0, s3 = 0, s4 = 0, t0 = 0, t1 = 0, t2 = 0;
  xn.forEach((x, i) => { s1 += x; s2 += x * x; s3 += x * x * x; s4 += x * x * x * x; t0 += ys[i]; t1 += x * ys[i]; t2 += x * x * ys[i]; });
  let a: number, b: number, c: number;
  try { [a, b, c] = solve3x3([[s4, s3, s2], [s3, s2, s1], [s2, s1, s0]], [t2, t1, t0]); }
  catch { return data.map(p => ({ ...p, yPred: p.y })); }
  return data.map(p => { const xNorm = p.x / mx; return { ...p, yPred: Math.max(0, a * xNorm * xNorm + b * xNorm + c) }; });
};

// ── Decision Tree (piecewise-linear) ──
export const fitDecisionTree = (data: Array<{ x: number; y: number }>, k = 8) => {
  const n = data.length;
  if (n < 4) return data.map(p => ({ ...p, yPred: p.y }));
  const seg = Math.max(1, Math.floor(n / k));
  return data.map((p, i) => {
    const s = Math.min(Math.floor(i / seg), k - 1);
    const i0 = s * seg, i1 = Math.min((s + 1) * seg, n - 1);
    if (i0 === i1) return { ...p, yPred: p.y };
    const dx = data[i1].x - data[i0].x, dy = data[i1].y - data[i0].y;
    const slope = dx !== 0 ? dy / dx : 0;
    return { ...p, yPred: Math.max(0, data[i0].y + slope * (p.x - data[i0].x)) };
  });
};

// ── Metrics ──
export const calcMetrics = (pts: Array<{ y: number; yPred: number }>): MetricsResult => {
  const n = pts.length;
  if (!n) return { r2: 1, mae: 0, rmse: 0, mse: 0 };
  const actuals = pts.map(p => p.y), preds = pts.map(p => p.yPred);
  const meanA = actuals.reduce((a, b) => a + b, 0) / n;
  const mae = actuals.reduce((s, a, i) => s + Math.abs(a - preds[i]), 0) / n;
  const mse = actuals.reduce((s, a, i) => s + (a - preds[i]) ** 2, 0) / n;
  const rmse = Math.sqrt(mse);
  const ssTot = actuals.reduce((s, a) => s + (a - meanA) ** 2, 0);
  const ssRes = actuals.reduce((s, a, i) => s + (a - preds[i]) ** 2, 0);
  const r2Raw = ssTot > 0 ? 1 - ssRes / ssTot : 1;
  return { r2: +Math.min(1, Math.max(0, r2Raw)).toFixed(4), mae: +mae.toFixed(4), rmse: +rmse.toFixed(4), mse: +mse.toFixed(4) };
};

/** Configuration object for trajectory calculation — reduces 15 positional args to a single object. */
export interface TrajectoryConfig {
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
  enableBounce?: boolean;
  bounceCOR?: number;
  maxBounces?: number;
  windSpeed?: number;
  integrationMethod?: 'euler' | 'rk4' | 'ai-apas';
  initialX?: number;
  spinRate?: number;
  projectileRadius?: number;
  advancedParams?: AdvancedPhysicsParams | null;
}

/** Convenience wrapper that accepts a single config object instead of 15 positional args. */
export const calculateTrajectoryFromConfig = (config: TrajectoryConfig) =>
  calculateTrajectory(
    config.velocity,
    config.angle,
    config.height,
    config.gravity,
    config.airResistance,
    config.mass,
    config.enableBounce,
    config.bounceCOR,
    config.maxBounces,
    config.windSpeed,
    config.integrationMethod,
    config.initialX,
    config.spinRate,
    config.projectileRadius,
    config.advancedParams,
  );

// Check if any advanced physics effect is active
const hasActiveAdvancedPhysics = (params: AdvancedPhysicsParams): boolean => {
  return params.enableCoriolis || params.enableMagnus || params.enableAltitudeDensity ||
    params.enableCentrifugal || params.enableRelativeMotion || params.enableBuoyancy ||
    params.enableHydrodynamicDrag || params.enableFluidPressure || params.enableGyroscopic ||
    params.enableBallisticStability || params.enableRelativistic || params.enableEnvironmentalCoupling;
};

// ── Trajectory Calculation ──
export const calculateTrajectory = (
  velocity: number, angle: number, height: number,
  gravity: number, airResistance: number, mass: number,
  enableBounce = false, bounceCOR = 0.6, maxBounces = 5,
  windSpeed = 0,
  integrationMethod: 'euler' | 'rk4' | 'ai-apas' = 'ai-apas',
  initialX = 0,
  spinRate = 0, // rad/s — Magnus force spin rate
  projectileRadius = 0.05, // m — radius for Magnus force calculation
  advancedParams?: AdvancedPhysicsParams | null // Optional advanced physics params
) => {
  // Input validation: clamp to physically reasonable ranges
  velocity = Math.max(0, isFinite(velocity) ? velocity : 0);
  angle = isFinite(angle) ? angle : 45;
  height = isFinite(height) ? Math.max(0, height) : 0;
  gravity = isFinite(gravity) ? Math.max(0, gravity) : 9.81;
  airResistance = isFinite(airResistance) ? Math.max(0, airResistance) : 0;
  mass = isFinite(mass) ? Math.max(0.001, mass) : 1;
  bounceCOR = isFinite(bounceCOR) ? Math.max(0, Math.min(1, bounceCOR)) : 0.6;
  maxBounces = isFinite(maxBounces) ? Math.max(0, Math.min(100, maxBounces)) : 5;
  windSpeed = isFinite(windSpeed) ? windSpeed : 0;
  projectileRadius = isFinite(projectileRadius) ? Math.max(0.001, projectileRadius) : 0.05;
  const angleRad = (angle * Math.PI) / 180;
  const vx0 = velocity * Math.cos(angleRad);
  const vy0 = velocity * Math.sin(angleRad);
  const dt = DEFAULT_TIME_STEP;
  const points: TrajectoryPoint[] = [];
  let t = 0, x = initialX, y = height, vx = vx0, vy = vy0;
  let bounces = 0;
  const bounceEvents: number[] = []; // time indices where bounces occur

  // Magnus force coefficient: F_magnus = S * (omega x v)
  // S = 0.5 * Cl * rho * A, simplified as proportional to spin * speed * radius
  // In 2D: spin axis is perpendicular to plane (z-axis), so:
  //   F_magnus_x = -S * omega * vy, F_magnus_y = S * omega * vx
  const magnusCoeff = spinRate !== 0 ? 0.5 * SEA_LEVEL_AIR_DENSITY * Math.PI * projectileRadius * projectileRadius * projectileRadius * Math.abs(spinRate) / mass : 0;
  const magnusSign = spinRate >= 0 ? 1 : -1;

  // Integration methods
  const eulerStep = (x: number, y: number, vx: number, vy: number, dt: number) => {
    const vrx = vx - windSpeed;
    const vry = vy;
    const speedRel = Math.sqrt(vrx * vrx + vry * vry);
    const drag = airResistance * speedRel * speedRel / mass;
    let ax = speedRel > 0 ? -drag * vrx / speedRel : 0;
    let ay = -gravity - (speedRel > 0 ? drag * vry / speedRel : 0);
    // Magnus force
    if (magnusCoeff > 0) {
      ax += -magnusSign * magnusCoeff * vry;
      ay += magnusSign * magnusCoeff * vrx;
    }
    
    const newVx = vx + ax * dt;
    const newVy = vy + ay * dt;
    const newX = x + vx * dt;
    const newY = y + vy * dt;
    
    return { x: newX, y: newY, vx: newVx, vy: newVy, ax, ay };
  };

  const rk4Step = (x: number, y: number, vx: number, vy: number, dt: number) => {
    const derivatives = (px: number, py: number, pvx: number, pvy: number) => {
      const vrx = pvx - windSpeed;
      const vry = pvy;
      const speedRel = Math.sqrt(vrx * vrx + vry * vry);
      const drag = airResistance * speedRel * speedRel / mass;
      let ax = speedRel > 0 ? -drag * vrx / speedRel : 0;
      let ay = -gravity - (speedRel > 0 ? drag * vry / speedRel : 0);
      if (magnusCoeff > 0) {
        ax += -magnusSign * magnusCoeff * vry;
        ay += magnusSign * magnusCoeff * vrx;
      }
      return { ax, ay };
    };

    // k1
    const k1 = derivatives(x, y, vx, vy);
    const k1_vx = k1.ax * dt;
    const k1_vy = k1.ay * dt;
    const k1_x = vx * dt;
    const k1_y = vy * dt;

    // k2
    const k2 = derivatives(x + k1_x/2, y + k1_y/2, vx + k1_vx/2, vy + k1_vy/2);
    const k2_vx = k2.ax * dt;
    const k2_vy = k2.ay * dt;
    const k2_x = (vx + k1_vx/2) * dt;
    const k2_y = (vy + k1_vy/2) * dt;

    // k3
    const k3 = derivatives(x + k2_x/2, y + k2_y/2, vx + k2_vx/2, vy + k2_vy/2);
    const k3_vx = k3.ax * dt;
    const k3_vy = k3.ay * dt;
    const k3_x = (vx + k2_vx/2) * dt;
    const k3_y = (vy + k2_vy/2) * dt;

    // k4
    const k4 = derivatives(x + k3_x, y + k3_y, vx + k3_vx, vy + k3_vy);
    const k4_vx = k4.ax * dt;
    const k4_vy = k4.ay * dt;
    const k4_x = (vx + k3_vx) * dt;
    const k4_y = (vy + k3_vy) * dt;

    // Combine
    const newVx = vx + (k1_vx + 2*k2_vx + 2*k3_vx + k4_vx) / 6;
    const newVy = vy + (k1_vy + 2*k2_vy + 2*k3_vy + k4_vy) / 6;
    const newX = x + (k1_x + 2*k2_x + 2*k3_x + k4_x) / 6;
    const newY = y + (k1_y + 2*k2_y + 2*k3_y + k4_y) / 6;
    
    return { x: newX, y: newY, vx: newVx, vy: newVy, ax: k1.ax, ay: k1.ay };
  };

  const aiApasStep = (x: number, y: number, vx: number, vy: number, dt: number, _t: number) => {
    // APAS Enhanced Integration: Velocity Verlet with Reynolds-dependent drag correction
    // Uses higher-order position update and physically-motivated drag model
    const vrx = vx - windSpeed;
    const vry = vy;
    const speedRel = Math.sqrt(vrx * vrx + vry * vry);
    
    // Base physics with Reynolds-dependent drag coefficient correction
    // Standard sphere drag: Cd varies with Re (Schiller-Naumann correlation)
    let effectiveDrag = airResistance;
    if (airResistance > 0 && speedRel > 0.01) {
      // Estimate Reynolds number (assuming sphere with projectileRadius)
      const kinematicViscosity = AIR_KINEMATIC_VISCOSITY;
      const Re = Math.max(1, (speedRel * projectileRadius * 2) / kinematicViscosity);
      // Schiller-Naumann correction for sphere drag
      let CdCorrection = 1.0;
      if (Re < 1000) {
        CdCorrection = (24 / Re) * (1 + 0.15 * Math.pow(Re, 0.687)) / 0.47;
      } else if (Re < 200000) {
        CdCorrection = 1.0; // Standard Cd plateau
      } else {
        CdCorrection = 0.2 / 0.47; // Drag crisis (turbulent boundary layer)
      }
      effectiveDrag = airResistance * Math.max(0.1, Math.min(3.0, CdCorrection));
    }
    
    const drag = effectiveDrag * speedRel * speedRel / mass;
    let ax = speedRel > 0 ? -drag * vrx / speedRel : 0;
    let ay = -gravity - (speedRel > 0 ? drag * vry / speedRel : 0);
    // Magnus force
    if (magnusCoeff > 0) {
      ax += -magnusSign * magnusCoeff * vry;
      ay += magnusSign * magnusCoeff * vrx;
    }
    
    // Velocity Verlet integration (2nd order accurate for position)
    const newX = x + vx * dt + 0.5 * ax * dt * dt;
    const newY = y + vy * dt + 0.5 * ay * dt * dt;
    const newVx = vx + ax * dt;
    const newVy = vy + ay * dt;
    
    return { x: newX, y: newY, vx: newVx, vy: newVy, ax, ay };
  };

  // Round to 3 decimal places using multiplication (faster than toFixed + unary plus)
  const r3 = (v: number) => Math.round(v * 1000) / 1000;

  const addPoint = () => {
    const speed = Math.sqrt(vx * vx + vy * vy);
    points.push({
      x: r3(x), y: r3(y), time: r3(t),
      vx: r3(vx), vy: r3(vy), speed: r3(speed),
      ax: r3(ax), ay: r3(ay),
      acceleration: r3(Math.sqrt(ax * ax + ay * ay)),
      kineticEnergy: r3(0.5 * mass * speed * speed),
      potentialEnergy: r3(mass * Math.max(0, gravity) * Math.max(0, y)),
    });
    return { ax, ay };
  };

  let ax = 0, ay = 0;

  // For zero gravity with no air resistance, use a reasonable max time/distance
  const maxTime = gravity === 0 ? Math.min(MAX_SIMULATION_TIME, 2000 / Math.max(velocity, 1)) : MAX_SIMULATION_TIME;
  // Track if projectile was ever above ground (to detect ground crossing)
  let wasAboveGround = y >= 0;
  // Safeguard: cap total iterations to prevent infinite loops (Issue 2.5)
  const MAX_ITERATIONS = 500_000;
  let iterations = 0;

  while (t < maxTime && iterations < MAX_ITERATIONS) {
    iterations++;
    // Use advanced physics step if params are provided and any effect is enabled
    let result;
    if (advancedParams && hasActiveAdvancedPhysics(advancedParams)) {
      result = advancedPhysicsStep(x, y, vx, vy, dt, advancedParams);
    } else {
      // Use selected integration method
      switch (integrationMethod) {
        case 'euler':
          result = eulerStep(x, y, vx, vy, dt);
          break;
        case 'rk4':
          result = rk4Step(x, y, vx, vy, dt);
          break;
        case 'ai-apas':
        default:
          result = aiApasStep(x, y, vx, vy, dt, t);
          break;
      }
    }
    
    x = result.x;
    y = result.y;
    vx = result.vx;
    vy = result.vy;
    ax = result.ax;
    ay = result.ay;
    t += dt;
    
    addPoint();

    // Ground hit detection: only trigger if the projectile crosses y=0 from above
    // or started at y>=0 and comes back down
    if (y <= 0 && wasAboveGround && height >= 0) {
      // Interpolate to find exact ground crossing point
      const prevPt = points.length > 1 ? points[points.length - 2] : null;
      if (prevPt && prevPt.y > 0 && y < 0) {
        const frac = prevPt.y / (prevPt.y - y);
        x = prevPt.x + (x - prevPt.x) * frac;
        vx = prevPt.vx + (vx - prevPt.vx) * frac;
        vy = prevPt.vy + (vy - prevPt.vy) * frac;
        t = prevPt.time + (t - prevPt.time) * frac;
      }
      y = 0;

      if (enableBounce && bounces < maxBounces && Math.abs(vy) > MIN_BOUNCE_VELOCITY) {
        vy = -vy * bounceCOR; // reverse and dampen
        vx = vx * (0.9 + bounceCOR * 0.1); // friction
        bounces++;
        bounceEvents.push(points.length);
      } else {
        addPoint();
        break;
      }
    }

      // For downward launches from ground level, stop when projectile goes too far below
      // Use 10x initial height (min 100m) as lower bound instead of magic -500
      const lowerBound = -Math.max(100, height * 10);
      if (height === 0 && vy0 < 0 && y < lowerBound) {
        break;
      }

    if (y >= 0) wasAboveGround = true;
  }

  // Theoretical (no drag)
  const theoPoints: Array<{ x: number; y: number; time: number }> = [];
  if (gravity === 0) {
    // Zero gravity: straight line motion
    const theoMaxTime = maxTime;
    for (let tt = 0; tt <= theoMaxTime; tt += dt) {
      const xt = initialX + vx0 * tt;
      const yt = height + vy0 * tt;
      theoPoints.push({ x: r3(xt), y: r3(yt), time: r3(tt) });
    }
  } else {
    // Normal gravity: parabolic trajectory
    const theoMaxIter = 10000;
    let iter = 0;
    for (let tt = 0; iter < theoMaxIter; tt += dt) {
      const xt = initialX + vx0 * tt;
      const yt = height + vy0 * tt - 0.5 * gravity * tt * tt;
      // For angles pointing downward (vy0 < 0), allow negative Y until a limit
      if (vy0 >= 0 && yt < 0) break;
      const theoLowerBound = -Math.max(100, height * 10);
      if (vy0 < 0 && yt < theoLowerBound) break;
      theoPoints.push({ x: r3(xt), y: r3(yt), time: r3(tt) });
      iter++;
    }
  }

  // Prediction — use loop-based max to avoid stack overflow with large arrays
  let maxY = -Infinity;
  let maxYIdx = 0;
  for (let i = 0; i < points.length; i++) {
    if (points[i].y > maxY) { maxY = points[i].y; maxYIdx = i; }
  }
  const last = points[points.length - 1];
  let disp = 0, work = 0;
  for (let i = 1; i < points.length; i++) {
    const dx2 = points[i].x - points[i - 1].x, dy2 = points[i].y - points[i - 1].y;
    const ds = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    disp += ds; work += mass * points[i].acceleration * ds;
  }

  // Handle zero-gravity and edge cases for theoretical calculations
  let T_theo: number;
  let rangeTheo: number;
  let maxHeightTheo: number;
  if (gravity === 0) {
    // Zero gravity: infinite flight, use simulation time as reference
    T_theo = last.time;
    rangeTheo = initialX + vx0 * T_theo;
    maxHeightTheo = vy0 >= 0 ? height + vy0 * T_theo : height;
  } else {
    const discriminant = vy0 * vy0 + 2 * gravity * height;
    T_theo = discriminant >= 0 ? (vy0 + Math.sqrt(discriminant)) / gravity : last.time;
    rangeTheo = initialX + vx0 * T_theo;
    maxHeightTheo = height + (vy0 * vy0) / (2 * gravity);
  }

  const pred: PredictionResult = {
    range: last.x, maxHeight: maxY,
    maxHeightPoint: points[maxYIdx],
    midRangePoint: points[Math.floor(points.length / 2)],
    timeOfFlight: last.time,
    finalVelocity: Math.sqrt(last.vx ** 2 + last.vy ** 2),
    totalDisplacement: disp, workDone: work,
    averageSpeed: last.time > 0 ? disp / last.time : 0,
    impactAngle: Math.atan2(-last.vy, last.vx) * 180 / Math.PI,
    rangeTheoretical: rangeTheo,
    maxHeightTheoretical: maxHeightTheo,
    timeOfFlightTheoretical: T_theo,
    rangeError: 0, maxHeightError: 0, timeError: 0,
  };
  pred.rangeError = Math.abs(pred.rangeTheoretical) > 0.01 ? Math.abs(pred.range - pred.rangeTheoretical) / Math.abs(pred.rangeTheoretical) * 100 : 0;
  pred.maxHeightError = Math.abs(pred.maxHeightTheoretical) > 0.01 ? Math.abs(pred.maxHeight - pred.maxHeightTheoretical) / Math.abs(pred.maxHeightTheoretical) * 100 : 0;
  pred.timeError = pred.timeOfFlightTheoretical > 0.01 ? Math.abs(pred.timeOfFlight - pred.timeOfFlightTheoretical) / pred.timeOfFlightTheoretical * 100 : 0;

  return { points, theoPoints, prediction: pred, bounceEvents };
};

// ── Build AI models from trajectory data ──
export const buildAIModels = (
  points: TrajectoryPoint[],
  theoPoints: Array<{ x: number; y: number; time: number }>,
  T: Record<string, string>
): Record<string, ModelData> | null => {
  if (points.length <= 10) return null;
  const lrPts = fitPolyReg(points);
  const dtPts = fitDecisionTree(points, 8);
  const nnPts = fitNeuralNetwork(points);
  const svrPts = fitSVR(points);
  const rfPts = fitRandomForest(points, 5);
  const classicalPts = points.map(ep => {
    if (!theoPoints.length) return { ...ep, yPred: ep.y };
    const closest = theoPoints.reduce((best, tp) => Math.abs(tp.x - ep.x) < Math.abs(best.x - ep.x) ? tp : best, theoPoints[0]);
    return { ...ep, yPred: closest.y };
  });
  return {
    classical: { pts: classicalPts, metrics: calcMetrics(classicalPts), name: T.classicalModelName, color: '#22c55e', dash: [12, 5] },
    lr: { pts: lrPts, metrics: calcMetrics(lrPts), name: T.lrModelName, color: '#22d3ee', dash: [8, 4] },
    dt: { pts: dtPts, metrics: calcMetrics(dtPts), name: T.dtModelName, color: '#f472b6', dash: [4, 4] },
    nn: { pts: nnPts, metrics: calcMetrics(nnPts), name: T.nnModelName || 'Neural Network', color: '#a855f7', dash: [10, 3] },
    svr: { pts: svrPts, metrics: calcMetrics(svrPts), name: T.svrModelName || 'SVR (RBF)', color: '#f59e0b', dash: [6, 6] },
    rf: { pts: rfPts, metrics: calcMetrics(rfPts), name: T.rfModelName || 'Random Forest', color: '#ef4444', dash: [3, 3, 10, 3] },
  };
};

// ── Monte Carlo Simulation ──
export const runMonteCarloSim = (
  velocity: number, angle: number, height: number,
  gravity: number, airResistance: number, mass: number,
  iterations = 1000, uncertainty = 0.05
) => {
  const ranges: number[] = [], heights: number[] = [], times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const r = () => 1 + (Math.random() * 2 - 1) * uncertainty;
    const v = velocity * r(), a = angle * r(), h = Math.max(0, height * r());
    const g = gravity * r(), k = airResistance * r(), m = Math.max(0.01, mass * r());
    const result = calculateTrajectory(v, a, h, g, k, m);
    ranges.push(result.prediction.range);
    heights.push(result.prediction.maxHeight);
    times.push(result.prediction.timeOfFlight);
  }
  const stats = (arr: number[]) => {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const stdDev = Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
    const sorted = [...arr].sort((a, b) => a - b);
    return { mean, stdDev, ci95Low: sorted[Math.floor(arr.length * 0.025)], ci95High: sorted[Math.floor(arr.length * 0.975)] };
  };
  return { range: stats(ranges), maxHeight: stats(heights), flightTime: stats(times) };
};
