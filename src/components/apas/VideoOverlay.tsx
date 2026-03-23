import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Video, Image as ImageIcon, X } from 'lucide-react';
import type { TrajectoryPoint } from '@/utils/physics';

interface VideoOverlayProps {
  lang: string;
  mediaSrc: string | null;
  mediaType: 'video' | 'image';
  trajectoryData: TrajectoryPoint[];
  currentTime: number;
  isAnimating: boolean;
  onClose: () => void;
  muted: boolean;
}

const VideoOverlay: React.FC<VideoOverlayProps> = ({
  lang, mediaSrc, mediaType, trajectoryData, currentTime, isAnimating, onClose, muted,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaDimensions, setMediaDimensions] = useState({ width: 0, height: 0 });
  const animFrameRef = useRef<number>(0);

  const isRTL = lang === 'ar';

  const drawOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !trajectoryData.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    if (!trajectoryData.length) return;

    const maxX = Math.max(...trajectoryData.map(p => p.x), 1);
    const maxY = Math.max(...trajectoryData.map(p => p.y), 1);
    const padding = 40;
    const drawW = width - padding * 2;
    const drawH = height - padding * 2;
    const scaleX = drawW / maxX;
    const scaleY = drawH / maxY;
    const scale = Math.min(scaleX, scaleY);

    const toCanvasX = (x: number) => padding + x * scale;
    const toCanvasY = (y: number) => height - padding - y * scale;

    // Draw trajectory path up to current time
    const visiblePoints = trajectoryData.filter(p => p.time <= currentTime);
    if (visiblePoints.length < 2) return;

    // Glow effect
    ctx.save();
    ctx.shadowColor = 'rgba(59, 130, 246, 0.6)';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    visiblePoints.forEach((p, i) => {
      const cx = toCanvasX(p.x);
      const cy = toCanvasY(p.y);
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.stroke();
    ctx.restore();

    // Draw dots at intervals
    const dotInterval = Math.max(1, Math.floor(visiblePoints.length / 20));
    visiblePoints.forEach((p, i) => {
      if (i % dotInterval !== 0 && i !== visiblePoints.length - 1) return;
      const cx = toCanvasX(p.x);
      const cy = toCanvasY(p.y);
      ctx.beginPath();
      ctx.arc(cx, cy, i === visiblePoints.length - 1 ? 6 : 3, 0, Math.PI * 2);
      ctx.fillStyle = i === visiblePoints.length - 1 ? '#ef4444' : 'rgba(59, 130, 246, 0.8)';
      ctx.fill();
      if (i === visiblePoints.length - 1) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    // Current position label
    if (visiblePoints.length > 0) {
      const last = visiblePoints[visiblePoints.length - 1];
      const cx = toCanvasX(last.x);
      const cy = toCanvasY(last.y);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.roundRect(cx + 10, cy - 25, 100, 20, 4);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '11px monospace';
      ctx.fillText(`(${last.x.toFixed(1)}, ${last.y.toFixed(1)})`, cx + 15, cy - 11);
    }
  }, [trajectoryData, currentTime]);

  // Animation loop for video overlay
  useEffect(() => {
    const animate = () => {
      drawOverlay();
      animFrameRef.current = requestAnimationFrame(animate);
    };
    if (mediaLoaded) {
      animFrameRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [mediaLoaded, drawOverlay]);

  // Sync canvas size with container
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (canvasRef.current) {
          canvasRef.current.width = width;
          canvasRef.current.height = height;
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleVideoPlay = () => {
    if (!videoRef.current) return;
    if (videoPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setVideoPlaying(!videoPlaying);
  };

  const handleVideoReset = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
      setVideoPlaying(false);
    }
  };

  if (!mediaSrc) return null;

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-card/70 backdrop-blur-sm shadow-lg">
      <div className="px-4 py-2.5 border-b border-border/30 flex items-center justify-between bg-gradient-to-r from-blue-500/5 to-purple-500/5">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          {mediaType === 'video' ? <Video className="w-4 h-4 text-blue-500" /> : <ImageIcon className="w-4 h-4 text-green-500" />}
          {mediaType === 'video'
            ? (lang === 'ar' ? 'تراكب المسار على الفيديو' : lang === 'fr' ? 'Superposition de Trajectoire' : 'Trajectory Overlay')
            : (lang === 'ar' ? 'تحليل الصورة' : lang === 'fr' ? 'Analyse d\'Image' : 'Image Analysis')}
        </h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div ref={containerRef} className="relative w-full" style={{ minHeight: 300 }}>
        {mediaType === 'video' ? (
          <video
            ref={videoRef}
            src={mediaSrc}
            className="w-full h-auto max-h-[400px] object-contain bg-black"
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              setMediaDimensions({ width: v.videoWidth, height: v.videoHeight });
              setMediaLoaded(true);
            }}
            onPlay={() => setVideoPlaying(true)}
            onPause={() => setVideoPlaying(false)}
            muted={muted}
            playsInline
          />
        ) : (
          <img
            ref={imgRef}
            src={mediaSrc}
            alt="Analysis"
            className="w-full h-auto max-h-[400px] object-contain bg-black"
            onLoad={(e) => {
              const img = e.currentTarget;
              setMediaDimensions({ width: img.naturalWidth, height: img.naturalHeight });
              setMediaLoaded(true);
            }}
          />
        )}

        {/* Overlay canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ mixBlendMode: 'normal' }}
        />
      </div>

      {/* Controls */}
      {mediaType === 'video' && (
        <div className="px-4 py-2 border-t border-border/30 flex items-center gap-2" dir={isRTL ? 'rtl' : 'ltr'}>
          <button
            onClick={handleVideoPlay}
            className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {videoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleVideoReset}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <div className="flex-1 text-[10px] text-muted-foreground text-center font-mono">
            {mediaDimensions.width > 0 && `${mediaDimensions.width}×${mediaDimensions.height}`}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {lang === 'ar' ? 'المسار يتزامن مع الفيديو' : 'Trajectory syncs with video'}
          </span>
        </div>
      )}

      {mediaType === 'image' && (
        <div className="px-4 py-2 border-t border-border/30 flex items-center justify-between" dir={isRTL ? 'rtl' : 'ltr'}>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
            <ImageIcon className="w-3 h-3" />
            {lang === 'ar' ? 'تحليل ثابت للصورة' : lang === 'fr' ? 'Analyse statique' : 'Static image analysis'}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {mediaDimensions.width > 0 && `${mediaDimensions.width}×${mediaDimensions.height}`}
          </span>
        </div>
      )}
    </div>
  );
};

export default VideoOverlay;
