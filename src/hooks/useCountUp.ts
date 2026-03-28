import { useState, useEffect, useRef } from 'react';

/**
 * Animated count-up hook — smoothly transitions a displayed number
 * from its previous value to a new target over `duration` ms.
 */
export function useCountUp(target: number, duration = 600): string {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = target;
    prevRef.current = target;

    if (Math.abs(to - from) < 0.001) {
      setDisplay(to);
      return;
    }

    const start = performance.now();

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  if (display == null || !isFinite(display)) return '0.00';
  return display.toFixed(2);
}
