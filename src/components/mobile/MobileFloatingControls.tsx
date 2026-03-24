import React from 'react';
import { Play, Pause, RotateCcw, Turtle, FastForward } from 'lucide-react';

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
  const isFastMotion = playbackSpeed > 1;

  const cycleSpeed = () => {
    if (playbackSpeed === 1) onSetPlaybackSpeed(0.25);
    else if (playbackSpeed === 0.25) onSetPlaybackSpeed(0.5);
    else if (playbackSpeed === 0.5) onSetPlaybackSpeed(2);
    else if (playbackSpeed === 2) onSetPlaybackSpeed(4);
    else onSetPlaybackSpeed(1);
  };

  return (
    <div className="mobile-floating-controls absolute bottom-2 left-1/2 -translate-x-1/2 z-30 md:hidden">
      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-background/60 backdrop-blur-xl border border-border/40 shadow-lg shadow-black/10">
        {/* Reset */}
        <button
          onClick={onReset}
          className="p-1.5 rounded-full text-muted-foreground hover:text-foreground active:scale-90 transition-all duration-150 touch-manipulation"
          title={lang === 'ar' ? 'إعادة' : 'Reset'}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Play / Pause */}
        <button
          onClick={onTogglePlay}
          className={`p-2 rounded-full shadow-md active:scale-90 transition-all duration-150 touch-manipulation ${
            isAnimating
              ? 'bg-amber-500 text-white shadow-amber-500/20'
              : 'bg-primary text-primary-foreground shadow-primary/20'
          }`}
          title={isAnimating ? (lang === 'ar' ? 'إيقاف' : 'Pause') : (lang === 'ar' ? 'تشغيل' : 'Play')}
        >
          {isAnimating ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </button>

        {/* Speed cycle */}
        <button
          onClick={cycleSpeed}
          className={`p-1.5 rounded-full active:scale-90 transition-all duration-150 touch-manipulation relative ${
            isSlowMotion
              ? 'text-blue-500'
              : isFastMotion
              ? 'text-orange-500'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title={lang === 'ar' ? 'سرعة التشغيل' : 'Playback Speed'}
        >
          {isFastMotion ? <FastForward className="w-3.5 h-3.5" /> : <Turtle className="w-3.5 h-3.5" />}
          <span className="absolute -top-1 -right-1 text-[7px] font-bold bg-background/80 rounded px-0.5">
            {playbackSpeed !== 1 ? `${playbackSpeed}x` : ''}
          </span>
        </button>
      </div>
    </div>
  );
};

export default MobileFloatingControls;
