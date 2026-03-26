import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Video, Image as ImageIcon, X, Move, ZoomIn, RotateCw, FlipHorizontal, Eye, EyeOff } from 'lucide-react';
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

  // Alignment controls for matching trajectory to video content
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [userScale, setUserScale] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [showPath, setShowPath] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [opacity, setOpacity] = useState(80);

  const isRTL = lang === 'ar';
  const tl = (ar: string, en: string) => lang === 'ar' ? ar : en;

  const drawOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    if (!trajectoryData.length || !showPath) return;

    // Compute trajectory bounds
    const minX = Math.min(...trajectoryData.map(p => p.x));
    const maxX = Math.max(...trajectoryData.map(p => p.x));
    const maxY = Math.max(...trajectoryData.map(p => p.y));
    const rangeX = maxX - minX || 1;
    const rangeY = maxY || 1;

    // Calculate the displayed media area within the canvas (object-contain logic)
    const mediaW = mediaDimensions.width || width;
    const mediaH = mediaDimensions.height || height;
    const mediaAspect = mediaW / mediaH;
    const canvasAspect = width / height;
    let displayW: number, displayH: number, displayOffX: number, displayOffY: number;

    if (canvasAspect > mediaAspect) {
      displayH = height;
      displayW = height * mediaAspect;
      displayOffX = (width - displayW) / 2;
      displayOffY = 0;
    } else {
      displayW = width;
      displayH = width / mediaAspect;
      displayOffX = 0;
      displayOffY = (height - displayH) / 2;
    }

    // Margin inside the displayed media area
    const margin = Math.min(displayW, displayH) * 0.06;
    const drawW = displayW - margin * 2;
    const drawH = displayH - margin * 2;

    // Uniform scale to preserve trajectory aspect ratio
    const scaleFactorX = drawW / rangeX;
    const scaleFactorY = drawH / rangeY;
    const baseFactor = Math.min(scaleFactorX, scaleFactorY);
    const finalScale = baseFactor * (userScale / 100);

    // Center the trajectory within the display area
    const trajDrawnW = rangeX * finalScale;
    const trajDrawnH = rangeY * finalScale;
    const centerOffX = displayOffX + margin + (drawW - trajDrawnW) / 2;
    const centerOffY = displayOffY + margin + (drawH - trajDrawnH) / 2;

    // Apply user offsets (percentage of display area)
    const userOffX = (offsetX / 100) * displayW;
    const userOffY = (offsetY / 100) * displayH;

    // Transform: rotate around the trajectory center
    const trajCenterX = centerOffX + trajDrawnW / 2 + userOffX;
    const trajCenterY = centerOffY + trajDrawnH / 2 - userOffY;

    ctx.save();
    ctx.globalAlpha = opacity / 100;
    ctx.translate(trajCenterX, trajCenterY);
    ctx.rotate((rotation * Math.PI) / 180);
    if (flipH) ctx.scale(-1, 1);
    ctx.translate(-trajCenterX, -trajCenterY);

    const toCanvasX = (x: number) => centerOffX + (x - minX) * finalScale + userOffX;
    const toCanvasY = (y: number) => centerOffY + (rangeY - y) * finalScale - userOffY;

    // Draw trajectory path up to current time
    const visiblePoints = trajectoryData.filter(p => p.time <= currentTime);
    if (visiblePoints.length < 2) { ctx.restore(); return; }

    // Draw full trajectory as faded guide
    if (trajectoryData.length > 2) {
      ctx.beginPath();
      trajectoryData.forEach((p, i) => {
        const cx = toCanvasX(p.x);
        const cy = toCanvasY(p.y);
        if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
      });
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw visible trajectory with glow + gradient
    ctx.shadowColor = 'rgba(59, 130, 246, 0.6)';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const firstPt = visiblePoints[0];
    const lastPt = visiblePoints[visiblePoints.length - 1];
    const grad = ctx.createLinearGradient(
      toCanvasX(firstPt.x), toCanvasY(firstPt.y),
      toCanvasX(lastPt.x), toCanvasY(lastPt.y)
    );
    grad.addColorStop(0, 'rgba(59, 130, 246, 0.9)');
    grad.addColorStop(0.5, 'rgba(100, 200, 255, 0.85)');
    grad.addColorStop(1, 'rgba(255, 150, 50, 0.8)');
    ctx.strokeStyle = grad;
    ctx.beginPath();
    visiblePoints.forEach((p, i) => {
      const cx = toCanvasX(p.x);
      const cy = toCanvasY(p.y);
      if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

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

    // Launch point marker
    const first = visiblePoints[0];
    const fx = toCanvasX(first.x);
    const fy = toCanvasY(first.y);
    ctx.beginPath();
    ctx.arc(fx, fy, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Current position label
    const last = visiblePoints[visiblePoints.length - 1];
    const cx = toCanvasX(last.x);
    const cy = toCanvasY(last.y);
    const labelText = '(' + last.x.toFixed(1) + ', ' + last.y.toFixed(1) + ')m';
    ctx.font = '11px monospace';
    const textW = ctx.measureText(labelText).width;
    const pillW = textW + 16;
    const pillH = 22;
    const pillX = cx + 12;
    const pillY = cy - pillH / 2 - 8;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, pillX + 8, pillY + pillH / 2);
    ctx.textBaseline = 'alphabetic';

    // Max height indicator
    const highestPoint = trajectoryData.reduce((best, p) => p.y > best.y ? p : best, trajectoryData[0]);
    if (highestPoint && currentTime >= highestPoint.time) {
      const hx = toCanvasX(highestPoint.x);
      const hy = toCanvasY(highestPoint.y);
      const groundY = toCanvasY(0);
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx, groundY);
      ctx.strokeStyle = 'rgba(100, 255, 200, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(100, 255, 200, 0.9)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('H=' + highestPoint.y.toFixed(1) + 'm', hx, hy - 6);
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    }

    ctx.restore();
  }, [trajectoryData, currentTime, mediaDimensions, offsetX, offsetY, userScale, rotation, flipH, showPath, opacity]);

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

  const resetAlignment = () => {
    setOffsetX(0);
    setOffsetY(0);
    setUserScale(100);
    setRotation(0);
    setFlipH(false);
    setOpacity(80);
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
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowPath(!showPath)}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title={tl('إظهار/إخفاء المسار', 'Show/Hide Path')}
          >
            {showPath ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setShowControls(!showControls)}
            className={`p-1 rounded transition-colors ${showControls ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
            title={tl('أدوات المحاذاة', 'Alignment Tools')}
          >
            <Move className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
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

      {/* Alignment controls panel */}
      {showControls && (
        <div className="px-4 py-3 border-t border-border/30 bg-secondary/10 space-y-2" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-foreground flex items-center gap-1">
              <Move className="w-3 h-3" />
              {tl('محاذاة المسار', 'Path Alignment')}
            </span>
            <button onClick={resetAlignment} className="text-[9px] text-primary hover:underline">
              {tl('إعادة تعيين', 'Reset')}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <div className="flex items-center gap-2">
              <label className="text-[9px] text-muted-foreground w-14 shrink-0">{tl('أفقي', 'X Offset')}</label>
              <input type="range" min={-50} max={50} value={offsetX} onChange={e => setOffsetX(Number(e.target.value))}
                className="flex-1 h-1 accent-blue-500" />
              <span className="text-[9px] font-mono text-muted-foreground w-8 text-end">{offsetX}%</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[9px] text-muted-foreground w-14 shrink-0">{tl('عمودي', 'Y Offset')}</label>
              <input type="range" min={-50} max={50} value={offsetY} onChange={e => setOffsetY(Number(e.target.value))}
                className="flex-1 h-1 accent-blue-500" />
              <span className="text-[9px] font-mono text-muted-foreground w-8 text-end">{offsetY}%</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[9px] text-muted-foreground w-14 shrink-0 flex items-center gap-0.5">
                <ZoomIn className="w-2.5 h-2.5" /> {tl('حجم', 'Scale')}
              </label>
              <input type="range" min={20} max={200} value={userScale} onChange={e => setUserScale(Number(e.target.value))}
                className="flex-1 h-1 accent-green-500" />
              <span className="text-[9px] font-mono text-muted-foreground w-8 text-end">{userScale}%</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[9px] text-muted-foreground w-14 shrink-0 flex items-center gap-0.5">
                <RotateCw className="w-2.5 h-2.5" /> {tl('دوران', 'Rotate')}
              </label>
              <input type="range" min={-180} max={180} value={rotation} onChange={e => setRotation(Number(e.target.value))}
                className="flex-1 h-1 accent-yellow-500" />
              <span className="text-[9px] font-mono text-muted-foreground w-8 text-end">{rotation}°</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[9px] text-muted-foreground w-14 shrink-0">{tl('شفافية', 'Opacity')}</label>
              <input type="range" min={10} max={100} value={opacity} onChange={e => setOpacity(Number(e.target.value))}
                className="flex-1 h-1 accent-purple-500" />
              <span className="text-[9px] font-mono text-muted-foreground w-8 text-end">{opacity}%</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFlipH(!flipH)}
                className={`flex items-center gap-1 text-[9px] px-2 py-1 rounded border transition-colors ${
                  flipH ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                <FlipHorizontal className="w-2.5 h-2.5" />
                {tl('عكس أفقي', 'Flip H')}
              </button>
            </div>
          </div>
        </div>
      )}

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
            {mediaDimensions.width > 0 && (mediaDimensions.width + '×' + mediaDimensions.height)}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {tl('المسار يتزامن مع الفيديو', 'Trajectory syncs with video')}
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
            {mediaDimensions.width > 0 && (mediaDimensions.width + '×' + mediaDimensions.height)}
          </span>
        </div>
      )}
    </div>
  );
};

export default VideoOverlay;
