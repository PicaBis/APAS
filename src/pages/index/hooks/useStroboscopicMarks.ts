import { useState, useEffect } from 'react';
import type { StroboscopicSettings, StroboscopicMark } from '@/components/apas/StroboscopicModal';
import type { TrajectoryPoint } from '@/utils/physics';

export function useStroboscopicMarks(
  stroboscopicSettings: StroboscopicSettings,
  currentTime: number,
  trajectoryData: TrajectoryPoint[],
) {
  const [stroboscopicMarks, setStroboscopicMarks] = useState<StroboscopicMark[]>([]);

  // Compute marks from trajectory data based on deltaT
  useEffect(() => {
    if (!stroboscopicSettings.enabled || !trajectoryData.length) {
      return;
    }
    const dt = stroboscopicSettings.deltaT;
    if (dt <= 0) return;
    const data = trajectoryData;
    const lastData = data[data.length - 1];
    if (!lastData) return;

    // Only generate marks up to currentTime (synchronized with animation)
    const maxTime = currentTime;
    if (maxTime <= 0) {
      setStroboscopicMarks([]);
      return;
    }

    const newMarks: StroboscopicMark[] = [];
    for (let t = dt; t <= maxTime + 0.001; t += dt) {
      // Find the two points surrounding this time
      let lo = 0, hi = data.length - 1;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (data[mid].time <= t) lo = mid;
        else hi = mid;
      }
      const a = data[lo];
      const b = data[hi];
      const segDt = b.time - a.time;
      const frac = segDt > 0 ? Math.min(1, (t - a.time) / segDt) : 0;
      newMarks.push({
        x: a.x + (b.x - a.x) * frac,
        y: a.y + (b.y - a.y) * frac,
        time: t,
        vx: a.vx + (b.vx - a.vx) * frac,
        vy: a.vy + (b.vy - a.vy) * frac,
        speed: a.speed + (b.speed - a.speed) * frac,
      });
    }
    setStroboscopicMarks(newMarks);
  }, [stroboscopicSettings.enabled, stroboscopicSettings.deltaT, currentTime, trajectoryData]);

  // Clear marks on reset (currentTime goes to 0)
  useEffect(() => {
    if (currentTime === 0) {
      setStroboscopicMarks([]);
    }
  }, [currentTime]);

  return stroboscopicMarks;
}
