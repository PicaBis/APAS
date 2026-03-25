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
  return (
    <div className={isFullscreen
      ? 'shrink-0 bg-background/90 backdrop-blur-sm border-t border-border px-4 py-3 space-y-2'
      : 'mt-3 space-y-2'
    }>
      <div className="flex items-center gap-2">
        <button onClick={() => { onReset(); playResetSound(isMuted); }}
          className="group apas-btn p-2.5 rounded-xl border border-border/50 hover:border-primary/30 bg-card/60 hover:bg-primary/10 flex items-center justify-center transition-all duration-300">
          <RotateCcw className="w-4 h-4 text-foreground transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-180" />
        </button>
        <button onClick={onTogglePlay}
          className="group apas-btn flex-1 min-w-[140px] bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5">
          {isAnimating ? <Pause className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" /> : <Play className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />}
          {playButtonText}
        </button>
      </div>

      {trajectoryData.length > 0 && (
        <div>
          <Slider
            value={[currentTime]}
            min={0}
            max={trajectoryData[trajectoryData.length - 1]?.time || 1}
            step={0.01}
            onValueChange={([v]) => { onSeek(v); playSliderChange(isMuted); }}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0s</span>
            <span className="font-mono">{currentTime.toFixed(2)}s</span>
            <span>{trajectoryData[trajectoryData.length - 1]?.time.toFixed(2)}s</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 sm:gap-1.5 text-xs text-muted-foreground flex-wrap">
        <span className="text-[10px] sm:text-xs">{T.playbackSpeed}</span>
        {[0.10, 0.25, 0.5, 1, 2, 4].map((s) => (
          <button key={s} onClick={() => { onSetPlaybackSpeed(s); playSpeedChange(isMuted); }}
            className={`apas-btn px-1.5 sm:px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-mono border transition-all duration-300 ${playbackSpeed === s ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20' : 'hover:bg-primary/10 border-transparent hover:border-primary/20'}`}>
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
};

export default React.memo(CanvasToolbar);
