/**
 * APAS NEW — Standalone Projectile Video Analysis Engine
 *
 * A completely independent physics analysis pipeline that processes
 * uploaded video to extract projectile motion parameters with high accuracy.
 *
 * Pipeline:
 *   1. Video Ingestion (frame extraction at ~30fps)
 *   2. Object Detection (motion-based + color-based)
 *   3. Object Tracking (Kalman filter smoothing)
 *   4. Coordinate Normalization (px → meters)
 *   5. Physics Computation (velocity, angle, trajectory fit)
 *   6. Advanced Corrections (launch detection, noise removal)
 *   7. Report Generation
 */

import { STANDARD_GRAVITY } from '@/constants/physics';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface DetectedPoint {
  frame: number;
  timestamp: number; // seconds
  xPx: number;
  yPx: number;
  confidence: number;
  source: 'motion' | 'color' | 'predicted' | 'interpolated';
}

export interface PhysicsReport {
  initialVelocity: number;     // m/s
  launchAngle: number;         // degrees
  maxHeight: number;           // meters
  range: number;               // meters
  timeOfFlight: number;        // seconds
  trajectory: string;          // "y = ax^2 + bx + c"
  trajectoryCoeffs: [number, number, number]; // [a, b, c]
  confidence: number;          // 0-1
  vx0: number;                 // m/s horizontal component
  vy0: number;                 // m/s vertical component
  impactVelocity: number;      // m/s
  dragEstimate: 'none' | 'slight' | 'significant';
  energyAtLaunch: number;      // Joules (per unit mass)
  energyAtPeak: number;        // Joules (per unit mass)
  rSquared: number;            // trajectory fit quality
  pointsUsed: number;
  framesAnalyzed: number;
  processingTimeMs: number;
  metersPerPixel: number;
  calibrationSource: string;
  launchFrameIndex: number;
  rawTrajectory: Array<{ x: number; y: number; t: number }>;
  smoothedTrajectory: Array<{ x: number; y: number; t: number }>;
}

export interface AnalysisProgress {
  stage: string;
  stageIndex: number;
  totalStages: number;
  progress: number; // 0-100
  message: string;
}

export type ProgressCallback = (p: AnalysisProgress) => void;

export interface AnalysisConfig {
  /** Reference length in meters (if user provides manual calibration) */
  referenceMeters?: number;
  /** Target FPS for frame extraction */
  targetFps?: number;
  /** Maximum frames to extract */
  maxFrames?: number;
  /** Motion detection sensitivity (0-100, higher = more sensitive) */
  sensitivity?: number;
  /** Gravity to use (default 9.81) */
  gravity?: number;
}

// ═══════════════════════════════════════════════════════════════
// FRAME EXTRACTION
// ═══════════════════════════════════════════════════════════════

interface ExtractedFrame {
  imageData: ImageData;
  timestamp: number;
  index: number;
}

/** Resolve actual video duration (handles Infinity from MediaRecorder blobs) */
function resolveVideoDuration(video: HTMLVideoElement): Promise<number> {
  return new Promise((resolve) => {
    const dur = video.duration;
    if (dur && Number.isFinite(dur) && dur > 0) {
      resolve(dur);
      return;
    }
    video.currentTime = 1e10;
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      const resolved = video.duration;
      const clampedTime = video.currentTime;
      video.currentTime = 0;
      video.addEventListener('seeked', () => {
        resolve(Number.isFinite(resolved) && resolved > 0 ? resolved : clampedTime > 0 ? clampedTime : 5);
      }, { once: true });
    };
    video.addEventListener('seeked', onSeeked, { once: true });
  });
}

/**
 * Extract frames from a video file as ImageData arrays.
 */
export async function extractFrames(
  file: File,
  onProgress: ProgressCallback,
  config: AnalysisConfig = {},
): Promise<{ frames: ExtractedFrame[]; width: number; height: number; duration: number; fps: number }> {
  const targetFps = config.targetFps ?? 30;
  const maxFrames = config.maxFrames ?? 120;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    const url = URL.createObjectURL(file);
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    video.addEventListener('loadedmetadata', async () => {
      try {
        const duration = await resolveVideoDuration(video);
        const totalFramesAvailable = Math.round(duration * targetFps);
        const numFrames = Math.min(maxFrames, totalFramesAvailable);

        // Scale down for performance (max 480px wide)
        const scale = Math.min(1, 480 / video.videoWidth);
        const width = Math.round(video.videoWidth * scale);
        const height = Math.round(video.videoHeight * scale);
        canvas.width = width;
        canvas.height = height;

        const timestamps: number[] = [];
        for (let i = 0; i < numFrames; i++) {
          timestamps.push((i / (numFrames - 1 || 1)) * duration);
        }

        const frames: ExtractedFrame[] = [];
        let currentIdx = 0;

        const extractNext = () => {
          if (currentIdx >= timestamps.length) {
            URL.revokeObjectURL(url);
            resolve({ frames, width, height, duration, fps: numFrames / duration });
            return;
          }

          const ts = timestamps[currentIdx];
          if (Math.abs(video.currentTime - ts) < 0.01) {
            onSeeked();
            return;
          }
          video.currentTime = ts;
        };

        const onSeeked = () => {
          ctx.drawImage(video, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);

          frames.push({
            imageData,
            timestamp: timestamps[currentIdx],
            index: currentIdx,
          });

          currentIdx++;
          const pct = Math.round((currentIdx / timestamps.length) * 100);
          onProgress({
            stage: 'Extracting Frames',
            stageIndex: 0,
            totalStages: 6,
            progress: pct,
            message: `Frame ${currentIdx}/${timestamps.length}`,
          });

          if (currentIdx >= timestamps.length) {
            URL.revokeObjectURL(url);
            resolve({ frames, width, height, duration, fps: numFrames / duration });
          } else {
            video.addEventListener('seeked', onSeeked, { once: true });
            video.currentTime = timestamps[currentIdx];
          }
        };

        video.addEventListener('seeked', onSeeked, { once: true });
        extractNext();
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    });

    video.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new Error('Error loading video'));
    });

    video.src = url;
    video.load();
  });
}

// ═══════════════════════════════════════════════════════════════
// OBJECT DETECTION (motion + color based)
// ═══════════════════════════════════════════════════════════════

function computeMotionCentroid(
  current: Uint8ClampedArray,
  previous: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number,
): { found: boolean; x: number; y: number; count: number } {
  let sumX = 0, sumY = 0, count = 0;

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const dr = Math.abs(current[i] - previous[i]);
      const dg = Math.abs(current[i + 1] - previous[i + 1]);
      const db = Math.abs(current[i + 2] - previous[i + 2]);
      const diff = (dr + dg + db) / 3;

      if (diff > threshold) {
        sumX += x;
        sumY += y;
        count++;
      }
    }
  }

  if (count < 5) {
    return { found: false, x: 0, y: 0, count };
  }

  return { found: true, x: sumX / count, y: sumY / count, count };
}

function autoDetectProjectileColor(
  current: Uint8ClampedArray,
  previous: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number,
): [number, number, number] | null {
  let sumR = 0, sumG = 0, sumB = 0, count = 0;

  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      const i = (y * width + x) * 4;
      const dr = Math.abs(current[i] - previous[i]);
      const dg = Math.abs(current[i + 1] - previous[i + 1]);
      const db = Math.abs(current[i + 2] - previous[i + 2]);
      const diff = (dr + dg + db) / 3;

      if (diff > threshold) {
        sumR += current[i];
        sumG += current[i + 1];
        sumB += current[i + 2];
        count++;
      }
    }
  }

  if (count < 5) return null;
  return [Math.round(sumR / count), Math.round(sumG / count), Math.round(sumB / count)];
}

function detectByColor(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  targetColor: [number, number, number],
  tolerance: number,
): { found: boolean; x: number; y: number; count: number } {
  let sumX = 0, sumY = 0, count = 0;
  const [tr, tg, tb] = targetColor;

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const dist = Math.sqrt(
        (data[i] - tr) ** 2 + (data[i + 1] - tg) ** 2 + (data[i + 2] - tb) ** 2
      );
      if (dist < tolerance) {
        sumX += x;
        sumY += y;
        count++;
      }
    }
  }

  if (count < 5) return { found: false, x: 0, y: 0, count };
  return { found: true, x: sumX / count, y: sumY / count, count };
}

// ═══════════════════════════════════════════════════════════════
// KALMAN FILTER (simplified 2D for tracking)
// ═══════════════════════════════════════════════════════════════

class SimpleKalman2D {
  private x: number = 0;
  private y: number = 0;
  private vx: number = 0;
  private vy: number = 0;
  private initialized = false;
  private lastT = 0;
  private processNoise = 0.5;
  private measureNoise = 3.0;
  private pX = 100;
  private pY = 100;

  init(x: number, y: number, t: number) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.lastT = t;
    this.initialized = true;
    this.pX = 100;
    this.pY = 100;
  }

  isReady() { return this.initialized; }

  predict(t: number): { x: number; y: number } {
    const dt = Math.max(0.001, t - this.lastT);
    const px = this.x + this.vx * dt;
    const py = this.y + this.vy * dt;
    this.pX += this.processNoise * dt;
    this.pY += this.processNoise * dt;
    return { x: px, y: py };
  }

  update(mx: number, my: number, t: number): { x: number; y: number } {
    if (!this.initialized) {
      this.init(mx, my, t);
      return { x: mx, y: my };
    }
    const dt = Math.max(0.001, t - this.lastT);

    // Predict
    const predX = this.x + this.vx * dt;
    const predY = this.y + this.vy * dt;
    this.pX += this.processNoise * dt;
    this.pY += this.processNoise * dt;

    // Kalman gain
    const kx = this.pX / (this.pX + this.measureNoise);
    const ky = this.pY / (this.pY + this.measureNoise);

    // Update
    this.x = predX + kx * (mx - predX);
    this.y = predY + ky * (my - predY);
    this.vx = (this.x - (this.x - kx * (mx - predX))) / dt;
    this.vy = (this.y - (this.y - ky * (my - predY))) / dt;
    this.pX *= (1 - kx);
    this.pY *= (1 - ky);
    this.lastT = t;

    return { x: this.x, y: this.y };
  }
}

// ═══════════════════════════════════════════════════════════════
// TRACKING PIPELINE
// ═══════════════════════════════════════════════════════════════

function trackProjectileInFrames(
  frames: ExtractedFrame[],
  width: number,
  height: number,
  sensitivity: number,
  onProgress: ProgressCallback,
): DetectedPoint[] {
  const motionThreshold = Math.max(10, 50 - sensitivity * 0.4);
  const colorTolerance = 55;
  const kalman = new SimpleKalman2D();
  const points: DetectedPoint[] = [];
  let detectedColor: [number, number, number] | null = null;
  let prevData: Uint8ClampedArray | null = null;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const data = new Uint8ClampedArray(frame.imageData.data);

    // Auto-detect color in early frames
    if (!detectedColor && prevData && i <= 5) {
      detectedColor = autoDetectProjectileColor(data, prevData, width, height, motionThreshold);
    }

    let found = false;
    let cx = 0, cy = 0;
    let source: DetectedPoint['source'] = 'motion';
    let confidence = 0;

    // Strategy 1: Color detection
    if (detectedColor) {
      const colorResult = detectByColor(data, width, height, detectedColor, colorTolerance);
      if (colorResult.found) {
        found = true;
        cx = colorResult.x;
        cy = colorResult.y;
        source = 'color';
        confidence = Math.min(0.95, 0.4 + colorResult.count * 0.001);
      }
    }

    // Strategy 2: Motion detection
    if (!found && prevData) {
      const motionResult = computeMotionCentroid(data, prevData, width, height, motionThreshold);
      if (motionResult.found) {
        found = true;
        cx = motionResult.x;
        cy = motionResult.y;
        source = 'motion';
        confidence = Math.min(0.7, 0.2 + motionResult.count * 0.001);
      }
    }

    // Apply Kalman filter
    if (found) {
      const filtered = kalman.update(cx, cy, frame.timestamp);
      points.push({
        frame: i,
        timestamp: frame.timestamp,
        xPx: filtered.x,
        yPx: filtered.y,
        confidence,
        source,
      });
    } else if (kalman.isReady()) {
      const predicted = kalman.predict(frame.timestamp);
      points.push({
        frame: i,
        timestamp: frame.timestamp,
        xPx: predicted.x,
        yPx: predicted.y,
        confidence: 0.15,
        source: 'predicted',
      });
    }

    prevData = data;

    if (i % 5 === 0) {
      onProgress({
        stage: 'Tracking Object',
        stageIndex: 1,
        totalStages: 6,
        progress: Math.round((i / frames.length) * 100),
        message: `Frame ${i + 1}/${frames.length}`,
      });
    }
  }

  // Interpolate gaps
  return interpolateGaps(points);
}

function interpolateGaps(points: DetectedPoint[]): DetectedPoint[] {
  if (points.length < 3) return points;

  const result: DetectedPoint[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    // If there's a gap in frames, interpolate
    const frameGap = curr.frame - prev.frame;
    if (frameGap > 1 && frameGap <= 5) {
      for (let j = 1; j < frameGap; j++) {
        const t = j / frameGap;
        result.push({
          frame: prev.frame + j,
          timestamp: prev.timestamp + t * (curr.timestamp - prev.timestamp),
          xPx: prev.xPx + t * (curr.xPx - prev.xPx),
          yPx: prev.yPx + t * (curr.yPx - prev.yPx),
          confidence: Math.min(prev.confidence, curr.confidence) * 0.5,
          source: 'interpolated',
        });
      }
    }
    result.push(curr);
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// LAUNCH DETECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Detect the launch frame by finding where significant movement begins.
 * Ignores early noisy frames before the projectile is launched.
 */
function detectLaunchFrame(points: DetectedPoint[]): number {
  if (points.length < 5) return 0;

  // Compute velocity between consecutive points
  const velocities: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const dt = points[i].timestamp - points[i - 1].timestamp;
    if (dt < 0.001) { velocities.push(0); continue; }
    const dx = points[i].xPx - points[i - 1].xPx;
    const dy = points[i].yPx - points[i - 1].yPx;
    velocities.push(Math.sqrt(dx * dx + dy * dy) / dt);
  }

  // Find median velocity
  const sorted = [...velocities].sort((a, b) => a - b);
  const medianVel = sorted[Math.floor(sorted.length / 2)];

  // Launch frame is where velocity first exceeds 30% of median
  const threshold = medianVel * 0.3;
  for (let i = 0; i < velocities.length; i++) {
    if (velocities[i] > threshold) {
      // Go back 1-2 frames for safety
      return Math.max(0, i - 1);
    }
  }

  return 0;
}

// ═══════════════════════════════════════════════════════════════
// COORDINATE NORMALIZATION
// ═══════════════════════════════════════════════════════════════

function computeMetersPerPixel(
  points: DetectedPoint[],
  frameWidth: number,
  frameHeight: number,
  referenceMeters?: number,
): { ratio: number; source: string } {
  // Priority 1: User provided reference
  if (referenceMeters && referenceMeters > 0) {
    return { ratio: referenceMeters / frameWidth, source: 'user-provided' };
  }

  // Priority 2: Auto-estimate from trajectory arc height
  if (points.length >= 3) {
    const yValues = points.map(p => p.yPx);
    const arcHeightPx = Math.max(...yValues) - Math.min(...yValues);

    if (arcHeightPx > frameHeight * 0.05) {
      // Estimate: typical arc spans ~3m for amateur projectiles
      const estimatedArcM = 3.0;
      return { ratio: estimatedArcM / arcHeightPx, source: 'auto-trajectory-arc' };
    }
  }

  // Priority 3: Default FOV estimate (~8m wide)
  return { ratio: 8 / frameWidth, source: 'default-fov' };
}

// ═══════════════════════════════════════════════════════════════
// PHYSICS COMPUTATION
// ═══════════════════════════════════════════════════════════════

/**
 * Remove outlier points using IQR on velocity magnitudes.
 */
function removeOutliers(points: DetectedPoint[]): DetectedPoint[] {
  if (points.length < 5) return points;

  const velocities: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const dt = points[i].timestamp - points[i - 1].timestamp;
    if (dt < 0.001) { velocities.push(0); continue; }
    const dx = points[i].xPx - points[i - 1].xPx;
    const dy = points[i].yPx - points[i - 1].yPx;
    velocities.push(Math.sqrt(dx * dx + dy * dy) / dt);
  }

  const sorted = [...velocities].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const upper = q3 + 2.5 * iqr;

  const result = [points[0]];
  for (let i = 1; i < points.length; i++) {
    if (velocities[i - 1] <= upper) {
      result.push(points[i]);
    }
  }

  return result;
}

/**
 * Fit a 2nd-degree polynomial to trajectory: y = ax^2 + bx + c
 * Returns coefficients and R-squared.
 */
function fitTrajectoryPolynomial(
  xs: number[], ys: number[],
): { coeffs: [number, number, number]; rSquared: number } {
  const n = xs.length;
  if (n < 3) return { coeffs: [0, 0, 0], rSquared: 0 };

  // Normal equations for quadratic fit
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

  if (Math.abs(det) < 1e-12) return { coeffs: [0, 0, 0], rSquared: 0 };

  const a = (B[0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1])
           - A[0][1] * (B[1] * A[2][2] - A[1][2] * B[2])
           + A[0][2] * (B[1] * A[2][1] - A[1][1] * B[2])) / det;

  const b = (A[0][0] * (B[1] * A[2][2] - A[1][2] * B[2])
           - B[0] * (A[1][0] * A[2][2] - A[1][2] * A[2][0])
           + A[0][2] * (A[1][0] * B[2] - B[1] * A[2][0])) / det;

  const c = (A[0][0] * (A[1][1] * B[2] - B[1] * A[2][1])
           - A[0][1] * (A[1][0] * B[2] - B[1] * A[2][0])
           + B[0] * (A[1][0] * A[2][1] - A[1][1] * A[2][0])) / det;

  // R-squared
  const meanY = sy / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const yPred = a * xs[i] * xs[i] + b * xs[i] + c;
    ssRes += (ys[i] - yPred) ** 2;
    ssTot += (ys[i] - meanY) ** 2;
  }

  const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  return { coeffs: [a, b, c], rSquared };
}

/**
 * Compute full physics report from detected points.
 */
function computePhysics(
  points: DetectedPoint[],
  frameWidth: number,
  frameHeight: number,
  metersPerPixel: number,
  gravity: number,
  launchIdx: number,
): Omit<PhysicsReport, 'processingTimeMs' | 'metersPerPixel' | 'calibrationSource' | 'framesAnalyzed'> {
  // Use only post-launch points
  const activePoints = points.slice(launchIdx);
  if (activePoints.length < 3) {
    return {
      initialVelocity: 0, launchAngle: 0, maxHeight: 0, range: 0,
      timeOfFlight: 0, trajectory: 'y = 0', trajectoryCoeffs: [0, 0, 0],
      confidence: 0, vx0: 0, vy0: 0, impactVelocity: 0,
      dragEstimate: 'none', energyAtLaunch: 0, energyAtPeak: 0,
      rSquared: 0, pointsUsed: 0, launchFrameIndex: launchIdx,
      rawTrajectory: [], smoothedTrajectory: [],
    };
  }

  // Convert to meters (y inverted: up = positive)
  const origin = activePoints[0];
  const xM = activePoints.map(p => (p.xPx - origin.xPx) * metersPerPixel);
  const yM = activePoints.map(p => (origin.yPx - p.yPx) * metersPerPixel); // inverted
  const tS = activePoints.map(p => p.timestamp - origin.timestamp);

  // Compute velocity at launch using first few frames (3-5 frames after launch)
  const velocityWindow = Math.min(5, activePoints.length - 1);
  let vxSum = 0, vySum = 0, vCount = 0;
  for (let i = 1; i <= velocityWindow; i++) {
    const dt = tS[i] - tS[i - 1];
    if (dt > 0.001) {
      vxSum += (xM[i] - xM[i - 1]) / dt;
      vySum += (yM[i] - yM[i - 1]) / dt;
      vCount++;
    }
  }

  const vx0 = vCount > 0 ? vxSum / vCount : 0;
  const vy0 = vCount > 0 ? vySum / vCount : 0;
  const initialVelocity = Math.sqrt(vx0 * vx0 + vy0 * vy0);

  // Launch angle from velocity vector at launch moment
  const launchAngle = Math.atan2(vy0, vx0) * (180 / Math.PI);

  // Trajectory polynomial fit: y = f(x)
  const { coeffs, rSquared } = fitTrajectoryPolynomial(xM, yM);

  // Max height from trajectory
  // For y = ax^2 + bx + c, peak at x = -b/(2a)
  const [coeffA, coeffB, coeffC] = coeffs;
  let maxHeight = 0;
  if (coeffA < 0) {
    const xPeak = -coeffB / (2 * coeffA);
    maxHeight = Math.max(0, coeffA * xPeak * xPeak + coeffB * xPeak + coeffC);
  } else {
    // Fallback: max of observed y values
    maxHeight = Math.max(0, ...yM);
  }

  // Range: horizontal distance from launch to landing
  const range = Math.max(0, xM[xM.length - 1]);

  // Time of flight
  const timeOfFlight = tS[tS.length - 1];

  // Impact velocity (from last few frames)
  const endWindow = Math.min(5, activePoints.length - 1);
  let vxEnd = 0, vyEnd = 0, veCount = 0;
  for (let i = activePoints.length - endWindow; i < activePoints.length; i++) {
    if (i < 1) continue;
    const dt = tS[i] - tS[i - 1];
    if (dt > 0.001) {
      vxEnd += (xM[i] - xM[i - 1]) / dt;
      vyEnd += (yM[i] - yM[i - 1]) / dt;
      veCount++;
    }
  }
  vxEnd = veCount > 0 ? vxEnd / veCount : 0;
  vyEnd = veCount > 0 ? vyEnd / veCount : 0;
  const impactVelocity = Math.sqrt(vxEnd * vxEnd + vyEnd * vyEnd);

  // Drag estimation
  const theoreticalRange = (initialVelocity * initialVelocity * Math.sin(2 * launchAngle * Math.PI / 180)) / gravity;
  const rangeRatio = theoreticalRange > 0 ? range / theoreticalRange : 1;
  const dragEstimate: PhysicsReport['dragEstimate'] =
    rangeRatio > 0.9 ? 'none' : rangeRatio > 0.7 ? 'slight' : 'significant';

  // Energy (per unit mass)
  const energyAtLaunch = 0.5 * initialVelocity * initialVelocity;
  const energyAtPeak = 0.5 * vx0 * vx0 + gravity * maxHeight;

  // Confidence
  const detectedRatio = activePoints.filter(p => p.source !== 'predicted').length / activePoints.length;
  const confidence = Math.min(0.99, rSquared * 0.5 + detectedRatio * 0.5);

  // Trajectory string
  const trajectory = `y = ${coeffA.toFixed(4)}x^2 + ${coeffB.toFixed(4)}x + ${coeffC.toFixed(4)}`;

  // Build trajectory arrays
  const rawTrajectory = activePoints.map((p, i) => ({ x: xM[i], y: yM[i], t: tS[i] }));

  // Smoothed trajectory from polynomial fit
  const smoothedTrajectory: Array<{ x: number; y: number; t: number }> = [];
  const xMin = Math.min(...xM);
  const xMax = Math.max(...xM);
  const steps = 50;
  for (let s = 0; s <= steps; s++) {
    const x = xMin + (s / steps) * (xMax - xMin);
    const y = coeffA * x * x + coeffB * x + coeffC;
    const tInterp = timeOfFlight * (s / steps);
    smoothedTrajectory.push({ x, y, t: tInterp });
  }

  return {
    initialVelocity,
    launchAngle,
    maxHeight,
    range,
    timeOfFlight,
    trajectory,
    trajectoryCoeffs: coeffs,
    confidence,
    vx0,
    vy0,
    impactVelocity,
    dragEstimate,
    energyAtLaunch,
    energyAtPeak,
    rSquared,
    pointsUsed: activePoints.length,
    launchFrameIndex: launchIdx,
    rawTrajectory,
    smoothedTrajectory,
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN ANALYSIS PIPELINE
// ═══════════════════════════════════════════════════════════════

export async function analyzeVideo(
  file: File,
  onProgress: ProgressCallback,
  config: AnalysisConfig = {},
): Promise<PhysicsReport> {
  const startTime = performance.now();
  const gravity = config.gravity ?? STANDARD_GRAVITY;
  const sensitivity = config.sensitivity ?? 50;

  // Stage 1: Extract frames
  onProgress({ stage: 'Extracting Frames', stageIndex: 0, totalStages: 6, progress: 0, message: 'Loading video...' });
  const { frames, width, height, duration } = await extractFrames(file, onProgress, config);

  // Stage 2: Detect & track object
  onProgress({ stage: 'Tracking Object', stageIndex: 1, totalStages: 6, progress: 0, message: 'Detecting projectile...' });
  const rawPoints = trackProjectileInFrames(frames, width, height, sensitivity, onProgress);

  // Stage 3: Remove outliers
  onProgress({ stage: 'Noise Reduction', stageIndex: 2, totalStages: 6, progress: 50, message: 'Removing outliers...' });
  const cleanedPoints = removeOutliers(rawPoints);

  // Stage 4: Detect launch frame
  onProgress({ stage: 'Launch Detection', stageIndex: 3, totalStages: 6, progress: 0, message: 'Finding launch moment...' });
  const launchIdx = detectLaunchFrame(cleanedPoints);
  onProgress({ stage: 'Launch Detection', stageIndex: 3, totalStages: 6, progress: 100, message: `Launch at frame ${launchIdx}` });

  // Stage 5: Coordinate normalization
  onProgress({ stage: 'Calibration', stageIndex: 4, totalStages: 6, progress: 0, message: 'Computing scale...' });
  const { ratio: metersPerPixel, source: calSource } = computeMetersPerPixel(
    cleanedPoints, width, height, config.referenceMeters
  );
  onProgress({ stage: 'Calibration', stageIndex: 4, totalStages: 6, progress: 100, message: `Scale: ${calSource}` });

  // Stage 6: Physics computation
  onProgress({ stage: 'Physics Engine', stageIndex: 5, totalStages: 6, progress: 0, message: 'Computing physics...' });
  const physics = computePhysics(cleanedPoints, width, height, metersPerPixel, gravity, launchIdx);
  onProgress({ stage: 'Physics Engine', stageIndex: 5, totalStages: 6, progress: 100, message: 'Analysis complete!' });

  const processingTimeMs = performance.now() - startTime;

  return {
    ...physics,
    processingTimeMs,
    metersPerPixel,
    calibrationSource: calSource,
    framesAnalyzed: frames.length,
  };
}

// ═══════════════════════════════════════════════════════════════
// AI INTERPRETATION (uses Supabase edge function)
// ═══════════════════════════════════════════════════════════════

export async function generateAIInsights(
  report: PhysicsReport,
  lang: 'ar' | 'en',
  supabaseUrl: string,
  supabaseKey: string,
): Promise<string> {
  const prompt = lang === 'ar'
    ? `أنت محلل فيزيائي محترف. قم بتحليل نتائج حركة مقذوف من فيديو وقدم تقريرا مختصرا وعمليا.

النتائج:
- السرعة الابتدائية: ${report.initialVelocity.toFixed(2)} م/ث
- زاوية الإطلاق: ${report.launchAngle.toFixed(1)}°
- الارتفاع الأقصى: ${report.maxHeight.toFixed(2)} م
- المدى: ${report.range.toFixed(2)} م
- زمن التحليق: ${report.timeOfFlight.toFixed(2)} ث
- معادلة المسار: ${report.trajectory}
- جودة التلائم R²: ${report.rSquared.toFixed(3)}
- تأثير مقاومة الهواء: ${report.dragEstimate === 'none' ? 'لا يوجد' : report.dragEstimate === 'slight' ? 'طفيف' : 'كبير'}
- الثقة: ${(report.confidence * 100).toFixed(0)}%

قدم 3-5 ملاحظات تحليلية مختصرة حول:
1. هل زاوية الإطلاق مثالية (45°)؟
2. تقييم دقة القياسات
3. ملاحظات حول الطاقة والسرعة
4. نصائح لتحسين الأداء

اكتب بأسلوب مهني ومختصر. لا تستخدم LaTeX.`
    : `You are a professional physics analyst. Analyze these projectile motion results from video and provide a concise, actionable report.

Results:
- Initial velocity: ${report.initialVelocity.toFixed(2)} m/s
- Launch angle: ${report.launchAngle.toFixed(1)}°
- Max height: ${report.maxHeight.toFixed(2)} m
- Range: ${report.range.toFixed(2)} m
- Time of flight: ${report.timeOfFlight.toFixed(2)} s
- Trajectory: ${report.trajectory}
- Fit quality R²: ${report.rSquared.toFixed(3)}
- Drag estimate: ${report.dragEstimate}
- Confidence: ${(report.confidence * 100).toFixed(0)}%

Provide 3-5 concise analytical observations about:
1. Is the launch angle optimal (45°)?
2. Measurement accuracy assessment
3. Energy and velocity observations
4. Suggestions for improvement

Write in a professional, concise style. Do NOT use LaTeX.`;

  const edgeUrl = `${supabaseUrl}/functions/v1/physics-tutor`;

  try {
    const response = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt: lang === 'ar'
          ? 'أنت محلل فيزيائي خبير. أجب بالعربية فقط. لا تستخدم LaTeX. كن مختصرا ومهنيا.'
          : 'You are an expert physics analyst. Answer in English only. Do NOT use LaTeX. Be concise and professional.',
      }),
    });

    if (!response.ok) {
      throw new Error(`Edge function error: ${response.status}`);
    }

    // Parse SSE stream
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) fullText += content;
          } catch {
            // Non-JSON data line — append as plain text
            if (data && data !== '[DONE]') fullText += data;
          }
        }
      }
    }

    return fullText || 'No insights generated.';
  } catch (error) {
    console.error('AI insights error:', error);
    // Generate fallback insights locally
    return generateLocalInsights(report, lang);
  }
}

function generateLocalInsights(report: PhysicsReport, lang: 'ar' | 'en'): string {
  const optimalAngle = 45;
  const angleDiff = Math.abs(report.launchAngle - optimalAngle);

  if (lang === 'ar') {
    const lines: string[] = [];
    lines.push('## تحليل حركة المقذوف');
    lines.push('');

    if (angleDiff < 3) {
      lines.push('- زاوية الإطلاق قريبة جدا من الزاوية المثالية (45°) - أداء ممتاز!');
    } else if (report.launchAngle < optimalAngle) {
      lines.push(`- زاوية الإطلاق (${report.launchAngle.toFixed(1)}°) أقل من المثالية. زيادة الزاوية ستزيد المدى.`);
    } else {
      lines.push(`- زاوية الإطلاق (${report.launchAngle.toFixed(1)}°) أعلى من المثالية. تقليل الزاوية سيزيد المدى.`);
    }

    if (report.rSquared > 0.95) {
      lines.push('- جودة التلائم ممتازة (R² > 0.95) - القياسات دقيقة جدا.');
    } else if (report.rSquared > 0.8) {
      lines.push('- جودة التلائم جيدة. بعض الضوضاء في القياسات.');
    } else {
      lines.push('- جودة التلائم منخفضة. قد يكون الفيديو غير واضح أو الحركة معقدة.');
    }

    if (report.dragEstimate !== 'none') {
      lines.push(`- تم رصد تأثير مقاومة الهواء (${report.dragEstimate === 'slight' ? 'طفيف' : 'كبير'}).`);
    }

    lines.push(`- الطاقة عند الإطلاق: ${report.energyAtLaunch.toFixed(1)} J/kg`);

    return lines.join('\n');
  }

  const lines: string[] = [];
  lines.push('## Projectile Motion Analysis');
  lines.push('');

  if (angleDiff < 3) {
    lines.push('- Launch angle is very close to optimal (45 deg) - excellent performance!');
  } else if (report.launchAngle < optimalAngle) {
    lines.push(`- Launch angle (${report.launchAngle.toFixed(1)} deg) is below optimal. Increasing angle would extend range.`);
  } else {
    lines.push(`- Launch angle (${report.launchAngle.toFixed(1)} deg) is above optimal. Decreasing angle would extend range.`);
  }

  if (report.rSquared > 0.95) {
    lines.push('- Fit quality is excellent (R-squared > 0.95) - measurements are highly accurate.');
  } else if (report.rSquared > 0.8) {
    lines.push('- Fit quality is good. Some noise in measurements detected.');
  } else {
    lines.push('- Fit quality is low. Video may be unclear or motion is complex.');
  }

  if (report.dragEstimate !== 'none') {
    lines.push(`- Air resistance effect detected: ${report.dragEstimate}.`);
  }

  lines.push(`- Energy at launch: ${report.energyAtLaunch.toFixed(1)} J/kg`);

  return lines.join('\n');
}
