/**
 * Projectile Tracker — Stage 1 of the Ballistics Intelligence Engine
 *
 * Multi-strategy object detection for video frames using Canvas APIs:
 * 1. Color-based centroid detection (primary)
 * 2. Frame differencing for motion detection (secondary)
 * 3. Kalman Filter for prediction during occlusion
 *
 * Outputs structured telemetry data for each frame.
 */

import { KalmanFilter2D } from './kalmanFilter';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/** Raw telemetry point from tracker */
export interface TelemetryPoint {
  frame: number;
  timestamp: number;
  x: number;           // pixel x
  y: number;           // pixel y
  velocityPxS: number; // pixels/second
  accelerationPxS2: number; // pixels/second^2
  source: 'detected' | 'predicted' | 'interpolated';
  confidence: number;  // 0-100
}

/** Tracking configuration */
export interface TrackerConfig {
  /** Target color [R, G, B] for color-based detection */
  targetColor: [number, number, number] | null;
  /** Color distance tolerance (Euclidean in RGB space) */
  colorTolerance: number;
  /** Minimum cluster size (pixels) to count as detection */
  minClusterSize: number;
  /** Motion detection threshold (pixel intensity difference) */
  motionThreshold: number;
  /** Maximum Mahalanobis distance for Kalman gating */
  gatingThreshold: number;
  /** Contrast enhancement factor for retry (Stage 4) */
  contrastFactor: number;
  /** Color mask shift for retry [deltaH, deltaS, deltaV] */
  colorMaskShift: [number, number, number];
}

/** Complete tracking result for a video */
export interface TrackingResult {
  telemetry: TelemetryPoint[];
  detectedFrames: number;
  totalFrames: number;
  trackingLossFrames: number;
  averageConfidence: number;
  detectedColor: [number, number, number] | null;
  frameWidth: number;
  frameHeight: number;
  fps: number;
}

const DEFAULT_TRACKER_CONFIG: TrackerConfig = {
  targetColor: null,
  colorTolerance: 55,
  minClusterSize: 8,
  motionThreshold: 30,
  gatingThreshold: 5.0,
  contrastFactor: 1.0,
  colorMaskShift: [0, 0, 0],
};

// ═══════════════════════════════════════════════════════════════
// COLOR HELPERS
// ═══════════════════════════════════════════════════════════════

function colorDistance(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/** Convert RGB to HSV (H: 0-360, S: 0-100, V: 0-100) */
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;
  return [h, s, v];
}

/** Apply contrast enhancement to pixel data */
function applyContrastEnhancement(
  data: Uint8ClampedArray,
  factor: number,
): void {
  if (factor === 1.0) return;
  const mid = 128;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, mid + (data[i] - mid) * factor));
    data[i + 1] = Math.max(0, Math.min(255, mid + (data[i + 1] - mid) * factor));
    data[i + 2] = Math.max(0, Math.min(255, mid + (data[i + 2] - mid) * factor));
  }
}

// ═══════════════════════════════════════════════════════════════
// DETECTION STRATEGIES
// ═══════════════════════════════════════════════════════════════

interface DetectionResult {
  found: boolean;
  x: number;
  y: number;
  clusterSize: number;
  confidence: number;
}

/**
 * Strategy 1: Color-based centroid detection
 * Finds the centroid of all pixels matching the target color
 * within a tolerance threshold.
 */
function detectByColor(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  targetColor: [number, number, number],
  tolerance: number,
  minCluster: number,
): DetectionResult {
  let sumX = 0, sumY = 0, count = 0;
  const [tr, tg, tb] = targetColor;

  // Sample every 2nd pixel for performance
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const dist = colorDistance(data[i], data[i + 1], data[i + 2], tr, tg, tb);
      if (dist < tolerance) {
        sumX += x;
        sumY += y;
        count++;
      }
    }
  }

  if (count < minCluster) {
    return { found: false, x: 0, y: 0, clusterSize: count, confidence: 0 };
  }

  const cx = sumX / count;
  const cy = sumY / count;
  // Confidence based on cluster size relative to frame area
  const areaRatio = (count * 4) / (width * height); // *4 because we sample every 2nd pixel
  const conf = Math.min(95, 40 + areaRatio * 5000);

  return { found: true, x: cx, y: cy, clusterSize: count, confidence: conf };
}

/**
 * Strategy 2: Frame differencing for motion detection
 * Compares current frame to previous frame to find moving regions.
 */
function detectByMotion(
  currentData: Uint8ClampedArray,
  previousData: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number,
  minCluster: number,
): DetectionResult {
  let sumX = 0, sumY = 0, count = 0;

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const dr = Math.abs(currentData[i] - previousData[i]);
      const dg = Math.abs(currentData[i + 1] - previousData[i + 1]);
      const db = Math.abs(currentData[i + 2] - previousData[i + 2]);
      const diff = (dr + dg + db) / 3;

      if (diff > threshold) {
        sumX += x;
        sumY += y;
        count++;
      }
    }
  }

  if (count < minCluster) {
    return { found: false, x: 0, y: 0, clusterSize: count, confidence: 0 };
  }

  const cx = sumX / count;
  const cy = sumY / count;
  const conf = Math.min(70, 20 + count * 0.5);

  return { found: true, x: cx, y: cy, clusterSize: count, confidence: conf };
}

/**
 * Auto-detect the most likely projectile color from first few frames
 * by finding the most prominent moving cluster.
 */
function autoDetectColor(
  currentData: Uint8ClampedArray,
  previousData: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number,
): [number, number, number] | null {
  let sumR = 0, sumG = 0, sumB = 0, count = 0;

  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      const i = (y * width + x) * 4;
      const dr = Math.abs(currentData[i] - previousData[i]);
      const dg = Math.abs(currentData[i + 1] - previousData[i + 1]);
      const db = Math.abs(currentData[i + 2] - previousData[i + 2]);
      const diff = (dr + dg + db) / 3;

      if (diff > threshold) {
        sumR += currentData[i];
        sumG += currentData[i + 1];
        sumB += currentData[i + 2];
        count++;
      }
    }
  }

  if (count < 5) return null;

  return [
    Math.round(sumR / count),
    Math.round(sumG / count),
    Math.round(sumB / count),
  ];
}

// ═══════════════════════════════════════════════════════════════
// MAIN TRACKER
// ═══════════════════════════════════════════════════════════════

/**
 * Track a projectile across multiple video frames.
 *
 * @param frames - Array of ImageData from extracted video frames
 * @param timestamps - Corresponding timestamps in seconds
 * @param config - Tracker configuration
 * @returns TrackingResult with full telemetry data
 */
export function trackProjectile(
  frames: ImageData[],
  timestamps: number[],
  config?: Partial<TrackerConfig>,
): TrackingResult {
  const cfg: TrackerConfig = { ...DEFAULT_TRACKER_CONFIG, ...config };
  const kalman = new KalmanFilter2D({
    processNoise: 0.8,
    measurementNoise: 3.0,
    initialPositionUncertainty: 15,
    initialVelocityUncertainty: 100,
  });

  const telemetry: TelemetryPoint[] = [];
  let detectedFrames = 0;
  let trackingLossFrames = 0;
  let detectedColor = cfg.targetColor;
  let prevData: Uint8ClampedArray | null = null;
  let prevVelocity = 0;

  if (frames.length === 0) {
    return {
      telemetry: [],
      detectedFrames: 0,
      totalFrames: 0,
      trackingLossFrames: 0,
      averageConfidence: 0,
      detectedColor: null,
      frameWidth: 0,
      frameHeight: 0,
      fps: 30,
    };
  }

  const width = frames[0].width;
  const height = frames[0].height;
  const fps = timestamps.length > 1
    ? 1 / Math.max(0.001, (timestamps[timestamps.length - 1] - timestamps[0]) / (timestamps.length - 1))
    : 30;

  for (let f = 0; f < frames.length; f++) {
    const frameData = new Uint8ClampedArray(frames[f].data);
    const ts = timestamps[f];

    // Apply contrast enhancement if configured
    if (cfg.contrastFactor !== 1.0) {
      applyContrastEnhancement(frameData, cfg.contrastFactor);
    }

    // ── Auto-detect color from motion in early frames ──
    if (!detectedColor && prevData && f <= 5) {
      detectedColor = autoDetectColor(frameData, prevData, width, height, cfg.motionThreshold);
    }

    // ── Try detection strategies in order ──
    let detection: DetectionResult = { found: false, x: 0, y: 0, clusterSize: 0, confidence: 0 };

    // Strategy 1: Color detection (if we have a target color)
    if (detectedColor) {
      // Apply color mask shift for retry
      const shiftedColor: [number, number, number] = [
        Math.max(0, Math.min(255, detectedColor[0] + cfg.colorMaskShift[0])),
        Math.max(0, Math.min(255, detectedColor[1] + cfg.colorMaskShift[1])),
        Math.max(0, Math.min(255, detectedColor[2] + cfg.colorMaskShift[2])),
      ];
      detection = detectByColor(frameData, width, height, shiftedColor, cfg.colorTolerance, cfg.minClusterSize);
    }

    // Strategy 2: Fall back to motion detection
    if (!detection.found && prevData) {
      detection = detectByMotion(frameData, prevData, width, height, cfg.motionThreshold, cfg.minClusterSize);
    }

    // ── Kalman filter integration ──
    let finalX: number, finalY: number;
    let source: TelemetryPoint['source'];
    let confidence: number;

    if (detection.found) {
      // Check gating: is this detection plausible given prediction?
      if (kalman.isInitialized()) {
        const mDist = kalman.mahalanobisDistance(detection.x, detection.y);
        if (mDist > cfg.gatingThreshold) {
          // Detection is too far from prediction — might be noise
          // Use prediction instead but reduce confidence
          const predicted = kalman.predict(ts);
          finalX = predicted.x;
          finalY = predicted.y;
          source = 'predicted';
          confidence = Math.max(10, detection.confidence * 0.3);
          trackingLossFrames++;
        } else {
          // Good detection — update Kalman filter
          const filtered = kalman.update(detection.x, detection.y, ts);
          finalX = filtered.x;
          finalY = filtered.y;
          source = 'detected';
          confidence = detection.confidence;
          detectedFrames++;
        }
      } else {
        // First detection — initialize Kalman
        kalman.initialize(detection.x, detection.y, ts);
        finalX = detection.x;
        finalY = detection.y;
        source = 'detected';
        confidence = detection.confidence;
        detectedFrames++;
      }
    } else {
      // No detection — use Kalman prediction
      if (kalman.isInitialized()) {
        const predicted = kalman.predict(ts);
        finalX = predicted.x;
        finalY = predicted.y;
        source = 'predicted';
        // Confidence decays with consecutive predictions
        confidence = Math.max(5, 50 - kalman.getPredictionCount() * 10);
        trackingLossFrames++;
      } else {
        // Nothing detected, no Kalman initialized — skip
        prevData = frameData;
        continue;
      }
    }

    // ── Compute velocity and acceleration ──
    let velocityPxS = 0;
    let accelerationPxS2 = 0;

    if (telemetry.length > 0) {
      const prev = telemetry[telemetry.length - 1];
      const dt = ts - prev.timestamp;
      if (dt > 0.001) {
        const dx = finalX - prev.x;
        const dy = finalY - prev.y;
        velocityPxS = Math.sqrt(dx * dx + dy * dy) / dt;
        accelerationPxS2 = (velocityPxS - prevVelocity) / dt;
      }
    }

    prevVelocity = velocityPxS;

    telemetry.push({
      frame: f,
      timestamp: ts,
      x: finalX,
      y: finalY,
      velocityPxS,
      accelerationPxS2,
      source,
      confidence,
    });

    prevData = frameData;
  }

  // ── Compute average confidence ──
  const avgConf = telemetry.length > 0
    ? telemetry.reduce((s, t) => s + t.confidence, 0) / telemetry.length
    : 0;

  return {
    telemetry,
    detectedFrames,
    totalFrames: frames.length,
    trackingLossFrames,
    averageConfidence: avgConf,
    detectedColor,
    frameWidth: width,
    frameHeight: height,
    fps,
  };
}

/**
 * Extract ImageData from video frames using a canvas.
 * Used by the ballistics engine to get raw pixel data from extracted JPEG frames.
 */
export function imageDataFromDataUrl(
  dataUrl: string,
  targetWidth: number,
  targetHeight: number,
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('No canvas context')); return; }
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      resolve(ctx.getImageData(0, 0, targetWidth, targetHeight));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

// Suppress unused warning
void rgbToHsv;
