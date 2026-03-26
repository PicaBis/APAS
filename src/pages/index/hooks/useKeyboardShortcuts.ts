import { useEffect } from 'react';
import { playResetSound, playZoomSound, playModeSwitch, playUIClick } from '@/utils/sound';

interface KeyboardShortcutsConfig {
  isAnimating: boolean;
  pauseAnimation: () => void;
  startAnimation: () => void;
  resetAnimation: () => void;
  isMuted: boolean;
  is3DMode: boolean;
  webglError: string | null;
  setIs3DMode: (v: boolean) => void;
  setCanvasZoom: (fn: (z: number) => number) => void;
  setShowGrid: (fn: (g: boolean) => boolean) => void;
  toggleFullscreen: () => void;
  undoParams: () => void;
  redoParams: () => void;
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const {
    isAnimating, pauseAnimation, startAnimation, resetAnimation,
    isMuted, is3DMode, webglError, setIs3DMode,
    setCanvasZoom, setShowGrid, toggleFullscreen,
    undoParams, redoParams,
  } = config;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo: Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z — works even in inputs
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        undoParams();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey))) {
        e.preventDefault();
        redoParams();
        return;
      }

      // Ignore other shortcuts if user is typing in an input/textarea/select
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
      if ((e.target as HTMLElement)?.closest('[role="slider"], [role="switch"], [contenteditable]')) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (isAnimating) {
          pauseAnimation();
        } else {
          startAnimation();
        }
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        resetAnimation();
        playResetSound(isMuted);
      } else if (e.code === 'KeyG') {
        e.preventDefault();
        setShowGrid(g => !g);
        playUIClick(isMuted);
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'Equal' || e.code === 'NumpadAdd') {
        e.preventDefault();
        setCanvasZoom(z => Math.min(3, z + 0.25));
        playZoomSound(isMuted, true);
      } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
        e.preventDefault();
        setCanvasZoom(z => Math.max(0.5, z - 0.25));
        playZoomSound(isMuted, false);
      } else if (e.code === 'Digit3') {
        e.preventDefault();
        if (is3DMode) {
          setIs3DMode(false);
          playModeSwitch(isMuted, false);
        } else if (!webglError) {
          setIs3DMode(true);
          playModeSwitch(isMuted, true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnimating, pauseAnimation, startAnimation, resetAnimation, isMuted, is3DMode, webglError, undoParams, redoParams, setIs3DMode, setCanvasZoom, setShowGrid, toggleFullscreen]);
}
