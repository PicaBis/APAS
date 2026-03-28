// physicsWorker.ts - Web Worker for heavy physics calculations
import { computeVectors } from '../simulation/vectorPhysics';

self.onmessage = (e) => {
  const { type, payload } = e.data;
  if (type === 'computeVectors') {
    // payload: { point, prevPoint, nextPoint, mass, gravity, airResistance }
    try {
      const result = computeVectors(
        payload.point,
        payload.prevPoint,
        payload.nextPoint,
        payload.mass,
        payload.gravity,
        payload.airResistance
      );
      self.postMessage({ type: 'vectorsResult', result });
    } catch (err) {
      self.postMessage({ type: 'error', error: err?.message || 'Physics error' });
    }
  }
};
