import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { playSliderChange, playSpeedChange, playResetSound } from '@/utils/sound';
import type { TrajectoryPoint } from '@/utils/physics';

interface CanvasToolbarProps {
  isAnimating: boolean;
  onReset: () => void;
  onTogglePlay: () => void;
  playButtonText: string;
  trajectoryData: TrajectoryPoint[];
  currentTime: number;
  onSeek: (time: number) => void;
  playbackSpeed: number;
  onSetPlaybackSpeed: (speed: number) => void;
  isMuted: boolean;
  T: Record<string, string>;
  isFullscreen: boolean;
}

const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  isAnimating, onReset, onTogglePlay, playButtonText,
  trajectoryData, currentTime, onSeek,
  playbackSpeed, onSetPlaybackSpeed, isMuted, T, isFullscreen,
}) => {
  const hasTrajectory = trajectoryData.length > 0;
  return (
    <div className={isFullscreen
      ? 'shrink-0 bg-background/90 backdrop-blur-xl border-t border-border px-4 py-3 space-y-2.5'
      : 'mt-3 space-y-2.5'
    }>
      <div className="flex items-center gap-2.5">
        <button onClick={() => { onReset(); playResetSound(isMuted); }}
          className="group apas-btn p-2.5 rounded-xl border border-border/40 hover:border-primary/40 bg-card/80 hover:bg-primary/10 flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-md">
          <RotateCcw className="w-4.5 h-4.5 text-muted-foreground group-hover:text-primary transition-all duration-300 group-hover:scale-110 group-hover:-rotate-180" />
        </button>
        <button onClick={onTogglePlay}
          className={`group apas-btn flex-1 min-w-[160px] font-bold py-3 px-5 rounded-xl flex items-center justify-center gap-2.5 text-sm transition-all duration-300 hover:-translate-y-0.5 ${
            isAnimating
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/35 hover:from-amber-500/90 hover:to-orange-500/90'
              : 'bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:from-primary/90 hover:via-primary/80 hover:to-primary/70 simulate-btn-glow'
          }`}>
          {isAnimating ? <Pause className="w-4.5 h-4.5 transition-transform duration-300 group-hover:scale-110" /> : <Play className="w-4.5 h-4.5 transition-transform duration-300 group-hover:scale-110" />}
          <span className="tracking-wide">{playButtonText}</span>
        </button>
      </div>

      {hasTrajectory && (
        <div className="bg-card/40 rounded-xl p-3 border border-border/30">
          <Slider
            value={[currentTime]}
            min={0}
            max={trajectoryData[trajectoryData.length - 1]?.time || 1}
            step={0.01}
            onValueChange={([v]) => { onSeek(v); playSliderChange(isMuted); }}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-2 px-0.5">
            <span className="font-mono bg-secondary/50 px-1.5 py-0.5 rounded">0s</span>
            <span className="font-mono font-semibold text-foreground bg-primary/10 px-2 py-0.5 rounded">{currentTime.toFixed(2)}s</span>
            <span className="font-mono bg-secondary/50 px-1.5 py-0.5 rounded">{trajectoryData[trajectoryData.length - 1]?.time.toFixed(2)}s</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground flex-wrap">
        <span className="text-[10px] sm:text-xs font-medium">{T.playbackSpeed}</span>
        <div className="flex items-center bg-card/60 rounded-lg border border-border/30 p-0.5 gap-0.5">
          {[0.25, 0.5, 1, 2, 4].map((s) => (
            <button key={s} onClick={() => { onSetPlaybackSpeed(s); playSpeedChange(isMuted); }}
              className={`px-2 sm:px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-mono font-medium transition-all duration-200 ${playbackSpeed === s ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-primary/10 text-muted-foreground hover:text-foreground'}`}>
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(CanvasToolbar);
