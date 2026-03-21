import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Play, Square, X, RotateCcw, Circle } from 'lucide-react';
import { toast } from 'sonner';

interface TrackedPoint {
  x: number;
  y: number;
  t: number;
}

interface Props {
  lang: string;
  muted: boolean;
  onTrajectoryDetected?: (points: Array<{ x: number; y: number; t: number }>) => void;
}

export default function CameraTracker({ lang, muted, onTrajectoryDetected }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [trackedPoints, setTrackedPoints] = useState<TrackedPoint[]>([]);
  const [trackColor, setTrackColor] = useState<[number, number, number]>([255, 100, 0]); // Default orange ball
  const [colorTolerance, setColorTolerance] = useState(50);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const lastDetectedRef = useRef<{ x: number; y: number } | null>(null);

  const isAr = lang === 'ar';

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraReady(true);
      }
    } catch {
      toast.error(isAr ? 'تعذر الوصول إلى الكاميرا' : 'Camera access denied');
    }
  }, [isAr]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    cancelAnimationFrame(animFrameRef.current);
  }, []);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setIsTracking(false);
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  const colorDistance = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) => {
    return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
  };

  const detectBall = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const overlay = overlayCanvasRef.current;
    if (!video || !canvas || !overlay || !video.videoWidth) return;

    const ctx = canvas.getContext('2d');
    const octx = overlay.getContext('2d');
    if (!ctx || !octx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;

    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Find matching pixels (centroid approach)
    let sumX = 0, sumY = 0, count = 0;
    const [tr, tg, tb] = trackColor;

    for (let y = 0; y < canvas.height; y += 2) {
      for (let x = 0; x < canvas.width; x += 2) {
        const i = (y * canvas.width + x) * 4;
        const dist = colorDistance(data[i], data[i + 1], data[i + 2], tr, tg, tb);
        if (dist < colorTolerance) {
          sumX += x;
          sumY += y;
          count++;
        }
      }
    }

    // Draw overlay
    octx.clearRect(0, 0, overlay.width, overlay.height);

    // Draw previous trajectory
    if (trackedPoints.length > 1) {
      octx.beginPath();
      octx.strokeStyle = 'rgba(0, 255, 100, 0.8)';
      octx.lineWidth = 2;
      for (let i = 0; i < trackedPoints.length; i++) {
        const px = (trackedPoints[i].x / 100) * overlay.width;
        const py = (trackedPoints[i].y / 100) * overlay.height;
        if (i === 0) octx.moveTo(px, py);
        else octx.lineTo(px, py);
      }
      octx.stroke();

      // Draw points
      for (const pt of trackedPoints) {
        const px = (pt.x / 100) * overlay.width;
        const py = (pt.y / 100) * overlay.height;
        octx.beginPath();
        octx.arc(px, py, 4, 0, Math.PI * 2);
        octx.fillStyle = 'rgba(0, 255, 100, 0.9)';
        octx.fill();
      }
    }

    if (count > 10) { // Minimum cluster size
      const cx = sumX / count;
      const cy = sumY / count;

      // Draw detection circle
      octx.beginPath();
      octx.arc(cx, cy, 20, 0, Math.PI * 2);
      octx.strokeStyle = 'rgba(255, 255, 0, 0.9)';
      octx.lineWidth = 3;
      octx.stroke();

      // Crosshair
      octx.beginPath();
      octx.moveTo(cx - 30, cy);
      octx.lineTo(cx + 30, cy);
      octx.moveTo(cx, cy - 30);
      octx.lineTo(cx, cy + 30);
      octx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
      octx.lineWidth = 1;
      octx.stroke();

      // Coordinates text
      const pxNorm = (cx / canvas.width) * 100;
      const pyNorm = (cy / canvas.height) * 100;
      octx.fillStyle = 'rgba(255, 255, 0, 0.9)';
      octx.font = '12px monospace';
      octx.fillText(`(${pxNorm.toFixed(1)}%, ${pyNorm.toFixed(1)}%)`, cx + 25, cy - 10);

      if (isTracking) {
        const t = (Date.now() - startTimeRef.current) / 1000;
        const last = lastDetectedRef.current;
        // Only add if moved enough
        if (!last || Math.abs(cx - last.x) > 3 || Math.abs(cy - last.y) > 3) {
          const normalizedX = (cx / canvas.width) * 100;
          const normalizedY = ((canvas.height - cy) / canvas.height) * 100;
          setTrackedPoints(prev => [...prev, { x: normalizedX, y: normalizedY, t }]);
          lastDetectedRef.current = { x: cx, y: cy };
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(detectBall);
  }, [trackColor, colorTolerance, isTracking, trackedPoints]);

  useEffect(() => {
    if (cameraReady) {
      animFrameRef.current = requestAnimationFrame(detectBall);
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [cameraReady, detectBall]);

  const startTracking = () => {
    setTrackedPoints([]);
    startTimeRef.current = Date.now();
    lastDetectedRef.current = null;
    setIsTracking(true);
  };

  const stopTracking = () => {
    setIsTracking(false);
    if (trackedPoints.length > 2 && onTrajectoryDetected) {
      onTrajectoryDetected(trackedPoints);
      toast.success(isAr ? `تم تتبع ${trackedPoints.length} نقطة` : `Tracked ${trackedPoints.length} points`);
    }
  };

  // Color picker from video
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isTracking) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const pixel = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
    setTrackColor([pixel[0], pixel[1], pixel[2]]);
    toast.info(isAr ? 'تم اختيار اللون للتتبع' : 'Color selected for tracking');
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="group w-full text-xs font-medium py-3 px-4 rounded-lg flex items-center gap-2 text-foreground hover:bg-primary/10 border border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300"
      >
        <Camera className="w-4 h-4 text-primary transition-transform duration-200 group-hover:scale-110" />
        <span className="font-semibold">{isAr ? 'التقاط مباشر بالكاميرا' : 'Live Camera Tracking'}</span>
        <span className="ml-auto text-[10px] text-muted-foreground">{isAr ? 'تتبع حقيقي' : 'Real-time'}</span>
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm" onClick={() => { if (!isTracking) { setIsOpen(false); } }}>
          <div
            className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slideDown"
            dir={isAr ? 'rtl' : 'ltr'}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">{isAr ? 'التقاط مباشر بالكاميرا' : 'Live Camera Tracking'}</h3>
                {isTracking && (
                  <span className="flex items-center gap-1 text-[10px] text-red-500 font-medium">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    {isAr ? 'تتبع...' : 'Tracking...'}
                  </span>
                )}
              </div>
              {!isTracking && (
                <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-all">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Video + overlay */}
              <div className="relative rounded-lg overflow-hidden border border-border bg-black">
                <video ref={videoRef} className="w-full" playsInline autoPlay muted style={{ display: cameraReady ? 'block' : 'none' }} />
                <canvas ref={canvasRef} className="hidden" />
                <canvas
                  ref={overlayCanvasRef}
                  className="absolute inset-0 w-full h-full cursor-crosshair"
                  onClick={handleCanvasClick}
                />
                {!cameraReady && (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="text-center text-muted-foreground text-sm">
                      <Camera className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                      <p>{isAr ? 'جاري تشغيل الكاميرا...' : 'Starting camera...'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Settings */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-secondary/20">
                  <p className="text-[10px] font-medium text-muted-foreground mb-2">{isAr ? 'لون التتبع' : 'Track Color'}</p>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg border-2 border-border shadow-inner"
                      style={{ backgroundColor: `rgb(${trackColor[0]},${trackColor[1]},${trackColor[2]})` }}
                    />
                    <p className="text-[10px] font-mono text-muted-foreground">
                      R:{trackColor[0]} G:{trackColor[1]} B:{trackColor[2]}
                    </p>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-1">
                    {isAr ? 'انقر على الفيديو لاختيار لون الكرة' : 'Click video to pick ball color'}
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-secondary/20">
                  <p className="text-[10px] font-medium text-muted-foreground mb-2">{isAr ? 'حساسية اللون' : 'Color Sensitivity'}</p>
                  <input
                    type="range"
                    min={20}
                    max={120}
                    value={colorTolerance}
                    onChange={e => setColorTolerance(Number(e.target.value))}
                    className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <p className="text-[10px] font-mono text-muted-foreground text-center mt-1">{colorTolerance}</p>
                </div>
              </div>

              {/* Tracked points info */}
              {trackedPoints.length > 0 && (
                <div className="p-3 rounded-lg border border-border bg-gradient-to-br from-green-500/5 to-transparent">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-foreground">{isAr ? 'النقاط المتتبعة' : 'Tracked Points'}</p>
                    <span className="text-[10px] font-mono bg-green-500/10 text-green-600 px-2 py-0.5 rounded">
                      {trackedPoints.length} {isAr ? 'نقطة' : 'pts'}
                    </span>
                  </div>
                  <div className="max-h-[100px] overflow-y-auto space-y-0.5">
                    {trackedPoints.slice(-10).map((pt, i) => (
                      <div key={i} className="flex gap-4 text-[9px] font-mono text-muted-foreground">
                        <span>t={pt.t.toFixed(2)}s</span>
                        <span>x={pt.x.toFixed(1)}%</span>
                        <span>y={pt.y.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="p-4 border-t border-border bg-secondary/20 flex items-center gap-2">
              {!isTracking ? (
                <>
                  <button
                    onClick={startTracking}
                    disabled={!cameraReady}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium text-xs shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/30 transition-all duration-300 disabled:opacity-50"
                  >
                    <Circle className="w-3.5 h-3.5" />
                    {isAr ? 'بدء التتبع' : 'Start Tracking'}
                  </button>
                  {trackedPoints.length > 0 && (
                    <button onClick={() => setTrackedPoints([])} className="p-2.5 rounded-lg border border-border hover:bg-secondary transition-all" title={isAr ? 'مسح' : 'Clear'}>
                      <RotateCcw className="w-3.5 h-3.5 text-foreground" />
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={stopTracking}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium text-xs shadow-lg transition-all duration-300"
                >
                  <Square className="w-3.5 h-3.5" />
                  {isAr ? 'إيقاف التتبع' : 'Stop Tracking'}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
