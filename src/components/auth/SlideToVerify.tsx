import React, { useState, useRef, useCallback } from 'react';
import { CheckCircle, Shield } from 'lucide-react';

interface Props {
  lang?: string;
  onVerified: () => void;
}

const TRANSLATIONS = {
  en: { slide: 'Slide to verify', verified: 'Verified', subtitle: 'Human verification' },
  ar: { slide: 'اسحب للتحقق', verified: 'تم التحقق', subtitle: 'التحقق البشري' },
  fr: { slide: 'Glissez pour vérifier', verified: 'Vérifié', subtitle: 'Vérification humaine' },
};

export default function SlideToVerify({ lang = 'en', onVerified }: Props) {
  const [verified, setVerified] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const trackWidthRef = useRef(0);

  const T = TRANSLATIONS[lang as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

  const THUMB_SIZE = 44;
  const THRESHOLD = 0.9; // Must drag 90% to verify

  const handleStart = useCallback((clientX: number) => {
    if (verified) return;
    const track = trackRef.current;
    if (!track) return;
    trackWidthRef.current = track.getBoundingClientRect().width - THUMB_SIZE;
    startXRef.current = clientX - position;
    setDragging(true);
  }, [verified, position]);

  const handleMove = useCallback((clientX: number) => {
    if (!dragging || verified) return;
    const maxX = trackWidthRef.current;
    const newPos = Math.min(Math.max(0, clientX - startXRef.current), maxX);
    setPosition(newPos);
  }, [dragging, verified]);

  const handleEnd = useCallback(() => {
    if (!dragging || verified) return;
    setDragging(false);
    const maxX = trackWidthRef.current;
    if (position / maxX >= THRESHOLD) {
      setPosition(maxX);
      setVerified(true);
      onVerified();
    } else {
      setPosition(0);
    }
  }, [dragging, verified, position, onVerified]);

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX);
  const onMouseMove = useCallback((e: MouseEvent) => handleMove(e.clientX), [handleMove]);
  const onMouseUp = useCallback(() => handleEnd(), [handleEnd]);

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX);
  const onTouchMove = useCallback((e: TouchEvent) => handleMove(e.touches[0].clientX), [handleMove]);
  const onTouchEnd = useCallback(() => handleEnd(), [handleEnd]);

  // Attach/detach global listeners while dragging
  React.useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', onTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [dragging, onMouseMove, onMouseUp, onTouchMove, onTouchEnd]);

  const progress = trackWidthRef.current > 0 ? position / trackWidthRef.current : 0;

  return (
    <div className="space-y-2" style={{ animation: 'heroFadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both' }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Shield className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[11px] font-medium text-muted-foreground">{T.subtitle}</span>
      </div>
      <div
        ref={trackRef}
        className={`relative h-11 rounded-xl border select-none overflow-hidden transition-all duration-300 ${
          verified
            ? 'bg-green-500/10 border-green-500/40'
            : 'bg-secondary/50 border-border hover:border-primary/30'
        }`}
      >
        {/* Fill */}
        <div
          className={`absolute inset-y-0 left-0 rounded-xl transition-colors duration-300 ${
            verified ? 'bg-green-500/20' : 'bg-primary/10'
          }`}
          style={{ width: position + THUMB_SIZE / 2 }}
        />

        {/* Label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {verified ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              {T.verified}
            </span>
          ) : (
            <span
              className="text-xs font-medium text-muted-foreground transition-opacity duration-200"
              style={{ opacity: 1 - progress * 2 }}
            >
              {T.slide}
            </span>
          )}
        </div>

        {/* Thumb */}
        {!verified && (
          <div
            className={`absolute top-0.5 left-0.5 h-[calc(100%-4px)] aspect-square rounded-[10px] flex items-center justify-center cursor-grab active:cursor-grabbing transition-shadow duration-200 ${
              dragging
                ? 'bg-primary shadow-lg shadow-primary/30 scale-105'
                : 'bg-primary/90 shadow-md hover:bg-primary hover:shadow-lg hover:shadow-primary/20'
            }`}
            style={{
              transform: `translateX(${position}px)`,
              transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-primary-foreground">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
