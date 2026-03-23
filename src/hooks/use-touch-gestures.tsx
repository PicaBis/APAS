import { useRef, useCallback, useEffect } from 'react';

interface TouchGestureOptions {
  onPinchZoom?: (scale: number) => void;
  onDrag?: (dx: number, dy: number) => void;
  onDoubleTap?: () => void;
  enabled?: boolean;
}

export function useTouchGestures(
  elementRef: React.RefObject<HTMLElement | null>,
  options: TouchGestureOptions
) {
  const { onPinchZoom, onDrag, onDoubleTap, enabled = true } = options;
  const initialDistance = useRef(0);
  const lastTap = useRef(0);
  const lastTouch = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const getDistance = useCallback((touches: TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || !enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2 && onPinchZoom) {
        e.preventDefault();
        initialDistance.current = getDistance(e.touches);
      } else if (e.touches.length === 1) {
        // Double tap detection
        const now = Date.now();
        if (now - lastTap.current < 300 && onDoubleTap) {
          e.preventDefault();
          onDoubleTap();
        }
        lastTap.current = now;

        // Drag start
        lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        isDragging.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && onPinchZoom && initialDistance.current > 0) {
        e.preventDefault();
        const currentDistance = getDistance(e.touches);
        const scale = currentDistance / initialDistance.current;
        onPinchZoom(scale);
        initialDistance.current = currentDistance;
      } else if (e.touches.length === 1 && isDragging.current && onDrag) {
        const dx = e.touches[0].clientX - lastTouch.current.x;
        const dy = e.touches[0].clientY - lastTouch.current.y;
        lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        onDrag(dx, dy);
      }
    };

    const handleTouchEnd = () => {
      initialDistance.current = 0;
      isDragging.current = false;
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, enabled, onPinchZoom, onDrag, onDoubleTap, getDistance]);
}
