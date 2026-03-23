import React from 'react';
import { Play, Pause, RotateCcw, Turtle } from 'lucide-react';

interface MobileFloatingControlsProps {
  isAnimating: boolean;
  isPaused: boolean;
  playbackSpeed: number;
  onTogglePlay: () => void;
  onReset: () => void;
  onSetPlaybackSpeed: (speed: number) => void;
  lang: string;
}

const MobileFloatingControls: React.FC<MobileFloatingControlsProps> = ({
  isAnimating,
  isPaused,
  playbackSpeed,
  onTogglePlay,
  onReset,
  onSetPlaybackSpeed,
  lang,
}) => {
  const isSlowMotion = playbackSpeed < 1;

  return (
    <div className="mobile-floating-controls absolute bottom-4 left-1/2 -translate-x-1/2 z-30 md:hidden">
      <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-background/70 backdrop-blur-xl border border-border/50 shadow-xl shadow-black/20">
        {/* Reset */}
        <button
          onClick={onReset}
          className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 active:scale-90 transition-all duration-200 touch-manipulation"
          title={lang === 'ar' ? 'إعادة' : 'Reset'}
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        {/* Play / Pause */}
        <button
          onClick={onTogglePlay}
          className={`p-3.5 rounded-2xl shadow-lg active:scale-90 transition-all duration-200 touch-manipulation ${
            isAnimating
              ? 'bg-amber-500 text-white shadow-amber-500/30'
              : 'bg-primary text-primary-foreground shadow-primary/30'
          }`}
          title={isAnimating ? (lang === 'ar' ? 'إيقاف' : 'Pause') : (lang === 'ar' ? 'تشغيل' : 'Play')}
        >
          {isAnimating ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" />
          )}
        </button>

        {/* Slow motion */}
        <button
          onClick={() => onSetPlaybackSpeed(isSlowMotion ? 1 : 0.25)}
          className={`p-2.5 rounded-xl active:scale-90 transition-all duration-200 touch-manipulation ${
            isSlowMotion
              ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
          }`}
          title={lang === 'ar' ? 'حركة بطيئة' : 'Slow Motion'}
        >
          <Turtle className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default MobileFloatingControls;
