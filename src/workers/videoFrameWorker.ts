/**
 * Web Worker for video frame processing
 * Offloads heavy image processing tasks from the main thread
 * to prevent browser freezing during 4K video analysis.
 */

export interface FrameProcessMessage {
  type: 'processFrame';
  imageData: ImageData;
  frameIndex: number;
  totalFrames: number;
}

export interface FrameProcessResult {
  type: 'frameProcessed';
  frameIndex: number;
  brightness: number;
  contrast: number;
  sharpness: number;
  quality: 'good' | 'acceptable' | 'poor';
  issues: string[];
}

export interface BatchProcessMessage {
  type: 'processBatch';
  frames: { data: Uint8ClampedArray; width: number; height: number; index: number }[];
}

export interface BatchProcessResult {
  type: 'batchProcessed';
  results: FrameProcessResult[];
  averageQuality: number;
}

export type WorkerMessage = FrameProcessMessage | BatchProcessMessage;
export type WorkerResult = FrameProcessResult | BatchProcessResult;

function calculateBrightness(data: Uint8ClampedArray): number {
  let total = 0;
  const pixelCount = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    total += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }
  return total / pixelCount;
}

function calculateContrast(data: Uint8ClampedArray, brightness: number): number {
  let variance = 0;
  const pixelCount = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    variance += (lum - brightness) * (lum - brightness);
  }
  return Math.sqrt(variance / pixelCount);
}

function estimateSharpness(data: Uint8ClampedArray, width: number, height: number): number {
  let totalGradient = 0;
  let count = 0;
  // Sample every 4th pixel for performance on large frames
  const step = width > 1920 ? 4 : 2;

  for (let y = 1; y < height - 1; y += step) {
    for (let x = 1; x < width - 1; x += step) {
      const idx = (y * width + x) * 4;
      const idxLeft = (y * width + (x - 1)) * 4;
      const idxRight = (y * width + (x + 1)) * 4;
      const idxUp = ((y - 1) * width + x) * 4;
      const idxDown = ((y + 1) * width + x) * 4;

      const gx = Math.abs(
        (data[idxRight] - data[idxLeft]) * 0.299 +
        (data[idxRight + 1] - data[idxLeft + 1]) * 0.587 +
        (data[idxRight + 2] - data[idxLeft + 2]) * 0.114
      );
      const gy = Math.abs(
        (data[idxDown] - data[idxUp]) * 0.299 +
        (data[idxDown + 1] - data[idxUp + 1]) * 0.587 +
        (data[idxDown + 2] - data[idxUp + 2]) * 0.114
      );

      totalGradient += gx + gy;
      count++;
    }
  }

  return count > 0 ? totalGradient / count : 0;
}

function analyzeFrame(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  frameIndex: number,
): FrameProcessResult {
  const brightness = calculateBrightness(data);
  const contrast = calculateContrast(data, brightness);
  const sharpness = estimateSharpness(data, width, height);

  const issues: string[] = [];
  let qualityScore = 100;

  if (brightness < 40) {
    issues.push('low_lighting');
    qualityScore -= 30;
  } else if (brightness < 60) {
    issues.push('dim_lighting');
    qualityScore -= 15;
  }

  if (brightness > 220) {
    issues.push('overexposed');
    qualityScore -= 25;
  }

  if (contrast < 20) {
    issues.push('low_contrast');
    qualityScore -= 20;
  }

  if (sharpness < 5) {
    issues.push('blurry');
    qualityScore -= 30;
  } else if (sharpness < 10) {
    issues.push('slightly_blurry');
    qualityScore -= 10;
  }

  let quality: 'good' | 'acceptable' | 'poor';
  if (qualityScore >= 70) quality = 'good';
  else if (qualityScore >= 40) quality = 'acceptable';
  else quality = 'poor';

  return {
    type: 'frameProcessed',
    frameIndex,
    brightness,
    contrast,
    sharpness,
    quality,
    issues,
  };
}

// Worker message handler
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  if (msg.type === 'processFrame') {
    const result = analyzeFrame(
      msg.imageData.data,
      msg.imageData.width,
      msg.imageData.height,
      msg.frameIndex,
    );
    self.postMessage(result);
  } else if (msg.type === 'processBatch') {
    const results: FrameProcessResult[] = [];
    let totalQuality = 0;

    for (const frame of msg.frames) {
      const result = analyzeFrame(frame.data, frame.width, frame.height, frame.index);
      results.push(result);
      totalQuality += result.quality === 'good' ? 100 : result.quality === 'acceptable' ? 60 : 20;
    }

    const batchResult: BatchProcessResult = {
      type: 'batchProcessed',
      results,
      averageQuality: msg.frames.length > 0 ? totalQuality / msg.frames.length : 0,
    };
    self.postMessage(batchResult);
  }
};
