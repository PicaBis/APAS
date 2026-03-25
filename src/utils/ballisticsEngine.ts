/**
 * Ballistics Intelligence Engine — 4-Stage Autonomous Reasoning Loop
 *
 * Stage 1: Hardware-Level Telemetry (projectile tracking + Kalman filter)
 * Stage 2: Real-World Calibration (pixels-to-meters ratio)
 * Stage 3: Computational Physics Engine (curve fitting, drag, energy)
 * Stage 4: Autonomous Self-Correction (cross-verification + retry)
 *
 * This engine processes video frames to extract precise physics parameters
 * without relying on LLM visual estimation.
 */

import {
  trackProjectile,
  imageDataFromDataUrl,
  type TelemetryPoint,
  type TrackingResult,
  type TrackerConfig,
} from './projectileTracker';

import {
  STANDARD_GRAVITY,
  SEA_LEVEL_AIR_DENSITY,
  DEFAULT_DRAG_COEFFICIENT,
} from '@/constants/physics';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/** Calibrated telemetry point in SI units */
export interface CalibratedPoint {
  frame: number;
  timestamp: number;
  xPx: number;          // raw pixel x
  yPx: number;          // raw pixel y
  xM: number;           // meters
  yM: number;           // meters (inverted: up = positive)
  vxMs: number;         // m/s horizontal
  vyMs: number;         // m/s vertical
  speedMs: number;      // m/s total
  axMs2: number;        // m/s² horizontal acceleration
  ayMs2: number;        // m/s² vertical acceleration
  kineticEnergy: number;  // Joules
  potentialEnergy: number; // Joules
  totalEnergy: number;    // Joules
  source: 'detected' | 'predicted' | 'interpolated';
  confidence: number;
}

/** Polynomial fit result */
export interface PolynomialFit {
  /** Coefficients [a, b, c] for y = a*x² + b*x + c */
  coefficients: [number, number, number];
  /** R² goodness of fit */
  rSquared: number;
  /** Root mean square error in meters */
  rmse: number;
}

/** Drag analysis result */
export interface DragAnalysis {
  /** Estimated drag coefficient */
  estimatedCd: number;
  /** Average drag force in Newtons */
  averageDragForce: number;
  /** Drag effect classification */
  dragEffect: 'none' | 'slight' | 'significant';
  /** Percentage deviation from vacuum trajectory */
  vacuumDeviation: number;
  /** Observed vs theoretical range difference (meters) */
  rangeDifference: number;
}

/** Energy analysis result */
export interface EnergyAnalysis {
  /** Energy at each calibrated point */
  energyTimeline: Array<{
    timestamp: number;
    kinetic: number;
    potential: number;
    total: number;
  }>;
  /** Maximum kinetic energy */
  maxKineticEnergy: number;
  /** Maximum potential energy */
  maxPotentialEnergy: number;
  /** Energy conservation error (percentage) */
  energyConservationError: number;
  /** Frames where energy gain was detected (measurement errors) */
  energyGainFlags: number[];
}

/** Self-correction verification result */
export interface VerificationResult {
  /** Time of flight from telemetry */
  tofTelemetry: number;
  /** Time of flight computed from peak altitude */
  tofComputed: number;
  /** Discrepancy percentage */
  discrepancy: number;
  /** Whether verification passed (< 5% discrepancy) */
  passed: boolean;
  /** Number of retry attempts used */
  retryAttempts: number;
  /** Overall confidence score (0-100) */
  confidenceScore: number;
}

/** Complete ballistics analysis result */
export interface BallisticsAnalysisResult {
  // Stage 1: Telemetry
  rawTelemetry: TelemetryPoint[];
  smoothedTelemetry: TelemetryPoint[];
  trackingResult: TrackingResult;

  // Stage 2: Calibration
  calibratedPoints: CalibratedPoint[];
  pixelsToMetersRatio: number;
  calibrationSource: 'user' | 'auto' | 'default';

  // Stage 3: Physics
  polynomialFit: PolynomialFit;
  dragAnalysis: DragAnalysis;
  energyAnalysis: EnergyAnalysis;

  // Derived physics values
  launchAngle: number;       // degrees
  initialVelocity: number;   // m/s
  maxAltitude: number;       // meters
  range: number;             // meters
  timeOfFlight: number;      // seconds
  impactVelocity: number;    // m/s
  estimatedMass: number;     // kg

  // Stage 4: Verification
  verification: VerificationResult;

  // Meta
  processingTimeMs: number;
  engineVersion: string;
}

/** Progress callback */
export type ProgressCallback = (stage: number, progress: number, message: string) => void;

// ═══════════════════════════════════════════════════════════════
// STAGE 2: CALIBRATION
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate pixels-to-meters ratio from known reference or defaults.
 *
 * @param frameWidth - Video frame width in pixels
 * @param calibrationMeters - User-provided field of view in meters
 * @returns meters per pixel
 */
function calculatePixelsToMetersRatio(
  frameWidth: number,
  calibrationMeters?: number,
): { ratio: number; source: 'user' | 'auto' | 'default' } {
  if (calibrationMeters && calibrationMeters > 0) {
    return { ratio: calibrationMeters / frameWidth, source: 'user' };
  }

  // Default: assume ~8 meters field of view for a typical outdoor video
  return { ratio: 8 / frameWidth, source: 'default' };
}

/**
 * Convert raw telemetry to calibrated SI-unit points.
 */
function calibrateTelemetry(
  telemetry: TelemetryPoint[],
  frameWidth: number,
  frameHeight: number,
  metersPerPixel: number,
  mass: number,
  gravity: number,
): CalibratedPoint[] {
  const calibrated: CalibratedPoint[] = [];

  for (let i = 0; i < telemetry.length; i++) {
    const pt = telemetry[i];
    const xM = pt.x * metersPerPixel;
    // Invert y-axis: in video, y increases downward; in physics, y increases upward
    const yM = (frameHeight - pt.y) * metersPerPixel;

    let vxMs = 0, vyMs = 0, axMs2 = 0, ayMs2 = 0;

    if (i > 0) {
      const prev = calibrated[i - 1];
      const dt = pt.timestamp - telemetry[i - 1].timestamp;
      if (dt > 0.001) {
        vxMs = (xM - prev.xM) / dt;
        vyMs = (yM - prev.yM) / dt;

        if (i > 1) {
          axMs2 = (vxMs - prev.vxMs) / dt;
          ayMs2 = (vyMs - prev.vyMs) / dt;
        }
      }
    }

    const speedMs = Math.sqrt(vxMs * vxMs + vyMs * vyMs);
    const kineticEnergy = 0.5 * mass * speedMs * speedMs;
    const potentialEnergy = mass * gravity * yM;

    calibrated.push({
      frame: pt.frame,
      timestamp: pt.timestamp,
      xPx: pt.x,
      yPx: pt.y,
      xM,
      yM,
      vxMs,
      vyMs,
      speedMs,
      axMs2,
      ayMs2,
      kineticEnergy,
      potentialEnergy,
      totalEnergy: kineticEnergy + potentialEnergy,
      source: pt.source,
      confidence: pt.confidence,
    });
  }

  return calibrated;
}

// ═══════════════════════════════════════════════════════════════
// STAGE 3: COMPUTATIONAL PHYSICS ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Fit a 2nd-degree polynomial to the trajectory: y = a*x² + b*x + c
 * Uses least squares regression.
 */
function fitPolynomial(points: CalibratedPoint[]): PolynomialFit {
  const n = points.length;
  if (n < 3) {
    return { coefficients: [0, 0, 0], rSquared: 0, rmse: Infinity };
  }

  const xs = points.map(p => p.xM);
  const ys = points.map(p => p.yM);

  // Build normal equations for y = a*x² + b*x + c
  let sx = 0, sx2 = 0, sx3 = 0, sx4 = 0;
  let sy = 0, sxy = 0, sx2y = 0;

  for (let i = 0; i < n; i++) {
    const x = xs[i], y = ys[i];
    const x2 = x * x;
    sx += x; sx2 += x2; sx3 += x2 * x; sx4 += x2 * x2;
    sy += y; sxy += x * y; sx2y += x2 * y;
  }

  // Solve 3x3 system using Cramer's rule
  const A = [
    [sx4, sx3, sx2],
    [sx3, sx2, sx],
    [sx2, sx, n],
  ];
  const B = [sx2y, sxy, sy];

  const det = A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1])
            - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0])
            + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);

  if (Math.abs(det) < 1e-12) {
    return { coefficients: [0, 0, 0], rSquared: 0, rmse: Infinity };
  }

  const a = (B[0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1])
           - A[0][1] * (B[1] * A[2][2] - A[1][2] * B[2])
           + A[0][2] * (B[1] * A[2][1] - A[1][1] * B[2])) / det;

  const b = (A[0][0] * (B[1] * A[2][2] - A[1][2] * B[2])
           - B[0] * (A[1][0] * A[2][2] - A[1][2] * A[2][0])
           + A[0][2] * (A[1][0] * B[2] - B[1] * A[2][0])) / det;

  const c = (A[0][0] * (A[1][1] * B[2] - B[1] * A[2][1])
           - A[0][1] * (A[1][0] * B[2] - B[1] * A[2][0])
           + B[0] * (A[1][0] * A[2][1] - A[1][1] * A[2][0])) / det;

  // Compute R² and RMSE
  const meanY = sy / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const yPred = a * xs[i] * xs[i] + b * xs[i] + c;
    ssRes += (ys[i] - yPred) ** 2;
    ssTot += (ys[i] - meanY) ** 2;
  }

  const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  const rmse = Math.sqrt(ssRes / n);

  return { coefficients: [a, b, c], rSquared, rmse };
}

/**
 * Analyze drag by comparing observed trajectory to theoretical vacuum parabola.
 */
function analyzeDrag(
  calibratedPoints: CalibratedPoint[],
  polynomialFit: PolynomialFit,
  launchAngle: number,
  initialVelocity: number,
  mass: number,
  gravity: number,
): DragAnalysis {
  if (calibratedPoints.length < 3) {
    return {
      estimatedCd: 0,
      averageDragForce: 0,
      dragEffect: 'none',
      vacuumDeviation: 0,
      rangeDifference: 0,
    };
  }

  const angleRad = launchAngle * Math.PI / 180;
  const vx0 = initialVelocity * Math.cos(angleRad);
  const vy0 = initialVelocity * Math.sin(angleRad);

  // Theoretical vacuum trajectory
  const x0 = calibratedPoints[0].xM;
  const y0 = calibratedPoints[0].yM;

  // Compute vacuum range
  const tFlight = (2 * vy0) / gravity;
  const vacuumRange = vx0 * tFlight;

  // Observed range
  const lastPoint = calibratedPoints[calibratedPoints.length - 1];
  const observedRange = lastPoint.xM - x0;

  const rangeDiff = vacuumRange - observedRange;

  // Compare observed positions to vacuum prediction
  let totalDeviation = 0;
  let deviationCount = 0;

  for (const pt of calibratedPoints) {
    if (pt.timestamp === calibratedPoints[0].timestamp) continue;
    const t = pt.timestamp - calibratedPoints[0].timestamp;
    const xVacuum = x0 + vx0 * t;
    const yVacuum = y0 + vy0 * t - 0.5 * gravity * t * t;

    const dx = pt.xM - xVacuum;
    const dy = pt.yM - yVacuum;
    totalDeviation += Math.sqrt(dx * dx + dy * dy);
    deviationCount++;
  }

  const avgDeviation = deviationCount > 0 ? totalDeviation / deviationCount : 0;
  const vacuumDeviationPct = vacuumRange > 0 ? (avgDeviation / vacuumRange) * 100 : 0;

  // Estimate drag coefficient from range reduction
  // Using approximate relation: R_drag ≈ R_vacuum * exp(-k) where k relates to Cd
  let estimatedCd = DEFAULT_DRAG_COEFFICIENT;
  if (vacuumRange > 0 && observedRange > 0 && observedRange < vacuumRange) {
    const k = Math.log(vacuumRange / observedRange);
    // Cd ≈ 2*m*k / (rho*A*R) where A is cross-section
    const crossSection = Math.PI * 0.025 * 0.025; // assume ~5cm diameter
    estimatedCd = (2 * mass * k) / (SEA_LEVEL_AIR_DENSITY * crossSection * observedRange);
    estimatedCd = Math.max(0, Math.min(5, estimatedCd));
  }

  // Average drag force
  const avgSpeed = calibratedPoints.reduce((s, p) => s + p.speedMs, 0) / calibratedPoints.length;
  const crossSection = Math.PI * 0.025 * 0.025;
  const avgDragForce = 0.5 * SEA_LEVEL_AIR_DENSITY * avgSpeed * avgSpeed * estimatedCd * crossSection;

  // Classify
  let dragEffect: DragAnalysis['dragEffect'] = 'none';
  if (vacuumDeviationPct > 15) dragEffect = 'significant';
  else if (vacuumDeviationPct > 5) dragEffect = 'slight';

  return {
    estimatedCd,
    averageDragForce: avgDragForce,
    dragEffect,
    vacuumDeviation: vacuumDeviationPct,
    rangeDifference: rangeDiff,
  };
}

/**
 * Perform energy analysis: compute Ek, Ep at every point and check conservation.
 */
function analyzeEnergy(calibratedPoints: CalibratedPoint[]): EnergyAnalysis {
  if (calibratedPoints.length === 0) {
    return {
      energyTimeline: [],
      maxKineticEnergy: 0,
      maxPotentialEnergy: 0,
      energyConservationError: 0,
      energyGainFlags: [],
    };
  }

  const timeline = calibratedPoints.map(pt => ({
    timestamp: pt.timestamp,
    kinetic: pt.kineticEnergy,
    potential: pt.potentialEnergy,
    total: pt.totalEnergy,
  }));

  const maxKE = Math.max(...calibratedPoints.map(p => p.kineticEnergy));
  const maxPE = Math.max(...calibratedPoints.map(p => p.potentialEnergy));

  // Check energy conservation: total energy should only decrease (due to drag)
  const energyGainFlags: number[] = [];
  const initialEnergy = calibratedPoints[0].totalEnergy || 1;

  for (let i = 1; i < calibratedPoints.length; i++) {
    const prev = calibratedPoints[i - 1].totalEnergy;
    const curr = calibratedPoints[i].totalEnergy;
    // Energy gain > 5% of initial energy is flagged as measurement error
    if (curr > prev && (curr - prev) / Math.max(1, initialEnergy) > 0.05) {
      energyGainFlags.push(calibratedPoints[i].frame);
    }
  }

  // Overall conservation error
  const finalEnergy = calibratedPoints[calibratedPoints.length - 1].totalEnergy;
  const energyLoss = initialEnergy - finalEnergy;
  // For a projectile with drag, some energy loss is expected
  // Error is the variance in total energy relative to expected monotonic decrease
  let energyVariance = 0;
  for (let i = 1; i < calibratedPoints.length; i++) {
    const expected = initialEnergy - (energyLoss * i) / calibratedPoints.length;
    energyVariance += (calibratedPoints[i].totalEnergy - expected) ** 2;
  }
  const conservationError = initialEnergy > 0
    ? (Math.sqrt(energyVariance / calibratedPoints.length) / initialEnergy) * 100
    : 0;

  return {
    energyTimeline: timeline,
    maxKineticEnergy: maxKE,
    maxPotentialEnergy: maxPE,
    energyConservationError: conservationError,
    energyGainFlags,
  };
}

// ═══════════════════════════════════════════════════════════════
// STAGE 4: SELF-CORRECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Cross-verify results: Time of Flight should match Peak Altitude given gravity.
 *
 * For a projectile: h_max = v0y²/(2g), t_peak = v0y/g, t_total ≈ 2*t_peak
 * Verify: t_total from telemetry ≈ t_total from h_max calculation
 */
function verifyResults(
  calibratedPoints: CalibratedPoint[],
  maxAltitude: number,
  timeOfFlight: number,
  gravity: number,
  retryAttempts: number,
  trackingResult: TrackingResult,
): VerificationResult {
  if (calibratedPoints.length < 3 || maxAltitude <= 0) {
    return {
      tofTelemetry: timeOfFlight,
      tofComputed: 0,
      discrepancy: 100,
      passed: false,
      retryAttempts,
      confidenceScore: 0,
    };
  }

  // Compute expected time of flight from peak altitude
  // h_max = v0y²/(2g) → v0y = sqrt(2*g*h_max)
  // t_total ≈ 2 * v0y / g = 2 * sqrt(2*h_max/g)
  const v0y = Math.sqrt(2 * gravity * maxAltitude);
  const tofComputed = 2 * v0y / gravity;

  const discrepancy = tofComputed > 0
    ? Math.abs(timeOfFlight - tofComputed) / tofComputed * 100
    : 100;

  // Confidence score based on multiple factors
  const trackingConfidence = trackingResult.averageConfidence;
  const detectionRatio = trackingResult.detectedFrames / Math.max(1, trackingResult.totalFrames);
  const verificationFactor = discrepancy < 5 ? 1.0 : discrepancy < 15 ? 0.7 : 0.4;

  const confidenceScore = Math.round(
    trackingConfidence * 0.4 +
    detectionRatio * 100 * 0.3 +
    verificationFactor * 100 * 0.3
  );

  return {
    tofTelemetry: timeOfFlight,
    tofComputed,
    discrepancy,
    passed: discrepancy < 5,
    retryAttempts,
    confidenceScore: Math.max(0, Math.min(100, confidenceScore)),
  };
}

// ═══════════════════════════════════════════════════════════════
// SMOOTHING
// ═══════════════════════════════════════════════════════════════

/**
 * Apply Savitzky-Golay-like moving average smoothing to telemetry.
 */
function smoothTelemetry(telemetry: TelemetryPoint[], windowSize: number = 5): TelemetryPoint[] {
  if (telemetry.length < windowSize) return [...telemetry];

  const half = Math.floor(windowSize / 2);
  const smoothed: TelemetryPoint[] = [];

  for (let i = 0; i < telemetry.length; i++) {
    const start = Math.max(0, i - half);
    const end = Math.min(telemetry.length - 1, i + half);
    const count = end - start + 1;

    let sumX = 0, sumY = 0, sumV = 0, sumA = 0;
    for (let j = start; j <= end; j++) {
      sumX += telemetry[j].x;
      sumY += telemetry[j].y;
      sumV += telemetry[j].velocityPxS;
      sumA += telemetry[j].accelerationPxS2;
    }

    smoothed.push({
      ...telemetry[i],
      x: sumX / count,
      y: sumY / count,
      velocityPxS: sumV / count,
      accelerationPxS2: sumA / count,
    });
  }

  return smoothed;
}

// ═══════════════════════════════════════════════════════════════
// MAIN ENGINE
// ═══════════════════════════════════════════════════════════════

export interface BallisticsEngineConfig {
  /** Known calibration distance in meters (field of view width) */
  calibrationMeters?: number;
  /** Gravity value (default: 9.80665 m/s²) */
  gravity?: number;
  /** Estimated mass in kg (default: 0.5) */
  mass?: number;
  /** Target color [R,G,B] for tracking (auto-detected if not provided) */
  targetColor?: [number, number, number];
  /** Maximum retry attempts for self-correction */
  maxRetries?: number;
}

/**
 * Run the complete 4-stage Ballistics Intelligence Engine.
 *
 * @param frameDataUrls - Array of data URLs from extracted video frames
 * @param frameTimestamps - Corresponding timestamps in seconds
 * @param config - Engine configuration
 * @param onProgress - Progress callback
 * @returns Complete ballistics analysis
 */
export async function runBallisticsEngine(
  frameDataUrls: string[],
  frameTimestamps: number[],
  config?: BallisticsEngineConfig,
  onProgress?: ProgressCallback,
): Promise<BallisticsAnalysisResult> {
  const startTime = performance.now();
  const gravity = config?.gravity ?? STANDARD_GRAVITY;
  const mass = config?.mass ?? 0.5;
  const maxRetries = config?.maxRetries ?? 3;

  onProgress?.(1, 0, 'Converting frames to pixel data...');

  // ── Convert data URLs to ImageData ──
  const targetWidth = 384;
  const targetHeight = 288;
  const frames: ImageData[] = [];

  for (let i = 0; i < frameDataUrls.length; i++) {
    try {
      const imgData = await imageDataFromDataUrl(frameDataUrls[i], targetWidth, targetHeight);
      frames.push(imgData);
    } catch {
      // Skip frames that fail to load
    }
    onProgress?.(1, Math.round((i / frameDataUrls.length) * 30), `Processing frame ${i + 1}/${frameDataUrls.length}`);
  }

  if (frames.length < 3) {
    throw new Error('Insufficient frames for analysis (need at least 3)');
  }

  // ═══ STAGE 1: HARDWARE-LEVEL TELEMETRY ═══
  onProgress?.(1, 30, 'Stage 1: Tracking projectile...');

  let trackerConfig: Partial<TrackerConfig> = {
    targetColor: config?.targetColor ?? null,
  };

  let trackingResult = trackProjectile(frames, frameTimestamps, trackerConfig);
  let rawTelemetry = trackingResult.telemetry;
  let retryAttempts = 0;

  // ═══ STAGE 4 (INTERLEAVED): SELF-CORRECTION RETRY LOOP ═══
  // If tracking quality is poor, retry with different parameters
  while (
    retryAttempts < maxRetries &&
    (trackingResult.averageConfidence < 30 || trackingResult.detectedFrames < frames.length * 0.3)
  ) {
    retryAttempts++;
    onProgress?.(4, retryAttempts * 25, `Self-correction: retry ${retryAttempts}/${maxRetries}`);

    // Retry strategy: alternate between contrast enhancement and color shift
    if (retryAttempts % 2 === 1) {
      // Increase contrast
      trackerConfig = {
        ...trackerConfig,
        contrastFactor: 1.3 + retryAttempts * 0.2,
      };
    } else {
      // Shift color tolerance
      trackerConfig = {
        ...trackerConfig,
        colorTolerance: 55 + retryAttempts * 15,
        colorMaskShift: [10 * retryAttempts, -5 * retryAttempts, 5 * retryAttempts],
      };
    }

    const retryResult = trackProjectile(frames, frameTimestamps, trackerConfig);
    if (retryResult.averageConfidence > trackingResult.averageConfidence) {
      trackingResult = retryResult;
      rawTelemetry = retryResult.telemetry;
    }
  }

  // Smooth telemetry
  const smoothedTelemetry = smoothTelemetry(rawTelemetry);

  // ═══ STAGE 2: REAL-WORLD CALIBRATION ═══
  onProgress?.(2, 60, 'Stage 2: Calibrating to real-world units...');

  const { ratio: metersPerPixel, source: calSource } = calculatePixelsToMetersRatio(
    trackingResult.frameWidth,
    config?.calibrationMeters,
  );

  const calibratedPoints = calibrateTelemetry(
    smoothedTelemetry,
    trackingResult.frameWidth,
    trackingResult.frameHeight,
    metersPerPixel,
    mass,
    gravity,
  );

  // ═══ STAGE 3: COMPUTATIONAL PHYSICS ENGINE ═══
  onProgress?.(3, 70, 'Stage 3: Computing physics...');

  // Polynomial fit
  const polynomialFit = fitPolynomial(calibratedPoints);

  // Extract key physics values
  let launchAngle = 45;
  let initialVelocity = 15;
  let maxAltitude = 0;
  let range = 0;
  let timeOfFlight = 0;
  let impactVelocity = 0;

  if (calibratedPoints.length >= 2) {
    // Launch angle from polynomial: dy/dx at x=0 gives tan(angle)
    // For y = ax² + bx + c: dy/dx = 2ax + b, at x=x0: slope = b (approximately)
    const [fitA, fitB] = polynomialFit.coefficients;
    if (Math.abs(fitB) > 0.001) {
      launchAngle = Math.abs(Math.atan(fitB) * 180 / Math.PI);
      launchAngle = Math.max(1, Math.min(89, launchAngle));
    }

    // Initial velocity from first calibrated points
    if (calibratedPoints.length > 1) {
      const v0 = calibratedPoints[1].speedMs;
      initialVelocity = v0 > 0 ? v0 : 15;
    }

    // Max altitude
    const yValues = calibratedPoints.map(p => p.yM);
    const minY = Math.min(...yValues);
    maxAltitude = Math.max(...yValues) - minY;

    // Range
    const xValues = calibratedPoints.map(p => p.xM);
    range = Math.max(...xValues) - Math.min(...xValues);

    // Time of flight
    timeOfFlight = calibratedPoints[calibratedPoints.length - 1].timestamp - calibratedPoints[0].timestamp;

    // Impact velocity
    impactVelocity = calibratedPoints[calibratedPoints.length - 1].speedMs;

    // Better velocity estimate from parabola coefficient
    if (Math.abs(fitA) > 1e-6 && Math.abs(Math.cos(launchAngle * Math.PI / 180)) > 0.01) {
      const cosA = Math.cos(launchAngle * Math.PI / 180);
      const v0FromFit = Math.sqrt(Math.abs(gravity / (2 * fitA * cosA * cosA)));
      if (v0FromFit > 1 && v0FromFit < 200) {
        initialVelocity = v0FromFit;
      }
    }
  }

  onProgress?.(3, 80, 'Analyzing drag and energy...');

  // Drag analysis
  const dragAnalysis = analyzeDrag(
    calibratedPoints, polynomialFit,
    launchAngle, initialVelocity, mass, gravity,
  );

  // Energy analysis
  const energyAnalysis = analyzeEnergy(calibratedPoints);

  // ═══ STAGE 4: VERIFICATION ═══
  onProgress?.(4, 90, 'Stage 4: Cross-verifying results...');

  const verification = verifyResults(
    calibratedPoints, maxAltitude, timeOfFlight,
    gravity, retryAttempts, trackingResult,
  );

  const processingTimeMs = performance.now() - startTime;

  onProgress?.(4, 100, 'Analysis complete!');

  return {
    rawTelemetry,
    smoothedTelemetry,
    trackingResult,
    calibratedPoints,
    pixelsToMetersRatio: metersPerPixel,
    calibrationSource: calSource,
    polynomialFit,
    dragAnalysis,
    energyAnalysis,
    launchAngle: Math.round(launchAngle * 10) / 10,
    initialVelocity: Math.round(initialVelocity * 10) / 10,
    maxAltitude: Math.round(maxAltitude * 100) / 100,
    range: Math.round(range * 100) / 100,
    timeOfFlight: Math.round(timeOfFlight * 100) / 100,
    impactVelocity: Math.round(impactVelocity * 10) / 10,
    estimatedMass: mass,
    verification,
    processingTimeMs: Math.round(processingTimeMs),
    engineVersion: '1.0.0',
  };
}
