/**
 * Video Worker Manager
 * Manages Web Worker lifecycle for video frame processing.
 * Offloads CPU-intensive frame analysis to a background thread
 * to prevent main thread blocking during 4K video processing.
 */

import type { WorkerResult, FrameProcessResult, BatchProcessResult } from '@/workers/videoFrameWorker';

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL('@/workers/videoFrameWorker.ts', import.meta.url),
      { type: 'module' },
    );
  }
  return worker;
}

/**
 * Analyze a single video frame in a Web Worker.
 * Returns quality metrics without blocking the main thread.
 */
export function analyzeFrameInWorker(
  imageData: ImageData,
  frameIndex: number,
  totalFrames: number,
): Promise<FrameProcessResult> {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    const handler = (e: MessageEvent<WorkerResult>) => {
      if (e.data.type === 'frameProcessed' && e.data.frameIndex === frameIndex) {
        w.removeEventListener('message', handler);
        resolve(e.data);
      }
    };
    const errorHandler = (err: ErrorEvent) => {
      w.removeEventListener('error', errorHandler);
      reject(err);
    };
    w.addEventListener('message', handler);
    w.addEventListener('error', errorHandler);
    w.postMessage({
      type: 'processFrame',
      imageData,
      frameIndex,
      totalFrames,
    });
  });
}

/**
 * Analyze a batch of frames in a Web Worker.
 * Useful for processing multiple frames at once for 4K videos.
 */
export function analyzeBatchInWorker(
  frames: { data: Uint8ClampedArray; width: number; height: number; index: number }[],
): Promise<BatchProcessResult> {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    const handler = (e: MessageEvent<WorkerResult>) => {
      if (e.data.type === 'batchProcessed') {
        w.removeEventListener('message', handler);
        resolve(e.data);
      }
    };
    const errorHandler = (err: ErrorEvent) => {
      w.removeEventListener('error', errorHandler);
      reject(err);
    };
    w.addEventListener('message', handler);
    w.addEventListener('error', errorHandler);
    w.postMessage({ type: 'processBatch', frames });
  });
}

/**
 * Get quality issue messages for display, localized.
 */
export function getVideoQualityMessage(issues: string[], lang: string): string[] {
  const isAr = lang === 'ar';
  const isFr = lang === 'fr';
  const messages: string[] = [];

  for (const issue of issues) {
    switch (issue) {
      case 'low_lighting':
        messages.push(
          isAr ? 'تم اكتشاف إضاءة منخفضة، قد تتأثر دقة التتبع'
          : isFr ? 'Faible luminosité détectée, la précision du suivi peut être réduite'
          : 'Low lighting detected, tracking accuracy might be reduced',
        );
        break;
      case 'dim_lighting':
        messages.push(
          isAr ? 'الإضاءة خافتة قليلاً، يفضل استخدام إضاءة أفضل'
          : isFr ? 'Éclairage un peu faible, un meilleur éclairage est recommandé'
          : 'Slightly dim lighting, better lighting is recommended',
        );
        break;
      case 'overexposed':
        messages.push(
          isAr ? 'الصورة مشرقة جداً، حاول تقليل التعرض للضوء'
          : isFr ? 'Image surexposée, essayez de réduire l\'exposition'
          : 'Image is overexposed, try reducing light exposure',
        );
        break;
      case 'low_contrast':
        messages.push(
          isAr ? 'التباين منخفض، قد يصعب تتبع الجسم'
          : isFr ? 'Faible contraste, le suivi de l\'objet peut être difficile'
          : 'Low contrast detected, object tracking may be difficult',
        );
        break;
      case 'blurry':
        messages.push(
          isAr ? 'الصورة ضبابية، حاول تثبيت الكاميرا أثناء التصوير'
          : isFr ? 'Image floue, essayez de stabiliser la caméra'
          : 'Image appears blurry, try stabilizing the camera while recording',
        );
        break;
      case 'slightly_blurry':
        messages.push(
          isAr ? 'الصورة غير واضحة قليلاً، حاول التركيز بشكل أفضل'
          : isFr ? 'Image légèrement floue, essayez de mieux faire la mise au point'
          : 'Image is slightly blurry, try focusing better',
        );
        break;
    }
  }
  return messages;
}

/**
 * Terminate the worker when no longer needed.
 */
export function terminateVideoWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}
