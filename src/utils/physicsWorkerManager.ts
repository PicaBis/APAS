// physicsWorkerManager.ts - Manages the physics Web Worker
let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL('./physicsWorker.ts', import.meta.url),
      { type: 'module' },
    );
  }
  return worker;
}

export function computeVectorsInWorker(payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    const handler = (e: MessageEvent) => {
      if (e.data.type === 'vectorsResult') {
        w.removeEventListener('message', handler);
        resolve(e.data.result);
      } else if (e.data.type === 'error') {
        w.removeEventListener('message', handler);
        reject(e.data.error);
      }
    };
    w.addEventListener('message', handler);
    w.postMessage({ type: 'computeVectors', payload });
  });
}

export function terminatePhysicsWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}
