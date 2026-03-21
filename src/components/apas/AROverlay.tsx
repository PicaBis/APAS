import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Crosshair, Sparkles, X, Play, Pause } from 'lucide-react';

interface Props {
  lang: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  /** Initial velocity for trajectory prediction (m/s) */
  velocity?: number;
  /** Launch angle (degrees) */
  angle?: number;
  /** Gravity (m/s²) */
  gravity?: number;
  /** Whether AR overlay is active */
  active: boolean;
  onToggle: (active: boolean) => void;
}

/**
 * AROverlay - Augmented Reality overlay for projectile path prediction
 * Draws a predictive trajectory path over the live camera feed
 * Allows user to adjust launch point and see predicted projectile path in real-time
 */
export default function AROverlay({ lang, videoRef, velocity = 20, angle = 45, gravity = 9.81, active, onToggle }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [launchPoint, setLaunchPoint] = useState<{ x: number; y: number } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);
  const [arVelocity, setArVelocity] = useState(velocity);
  const [arAngle, setArAngle] = useState(angle);

  const isAr = lang === 'ar';

  // Generate trajectory points
  const generateTrajectory = useCallback((startX: number, startY: number, canvasWidth: number, canvasHeight: number) => {
    const points: { x: number; y: number; t: number }[] = [];
    const radians = (arAngle * Math.PI) / 180;
    const vx = arVelocity * Math.cos(radians);
    const vy = arVelocity * Math.sin(radians);
    
    // Scale factor: pixels per meter (auto-adjust based on canvas size)
    const scale = canvasWidth / 30;
    const dt = 0.02;
    const maxTime = (2 * vy) / gravity + 1;

    for (let t = 0; t <= maxTime; t += dt) {
      const x = startX + vx * t * scale;
      const y = startY - (vy * t - 0.5 * gravity * t * t) * scale;

      // Stop if out of canvas
      if (x < 0 || x > canvasWidth || y > canvasHeight + 10) break;
      if (t > 0 && y > startY + 5) break;

      points.push({ x, y, t });
    }

    return points;
  }, [arVelocity, arAngle, gravity]);

  // Handle canvas tap to set launch point
  const handleCanvasTap = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    setLaunchPoint({ x, y });
    setAnimProgress(0);
    setIsAnimating(true);
  }, []);

  // Animation loop
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas to video size
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const defaultLaunch = launchPoint || { x: canvas.width * 0.15, y: canvas.height * 0.75 };

    let progressValue = animProgress;
    const startTime = Date.now();

    const draw = () => {
      if (!active) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const points = generateTrajectory(defaultLaunch.x, defaultLaunch.y, canvas.width, canvas.height);
      if (points.length < 2) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      // Calculate animation progress
      if (isAnimating) {
        const elapsed = (Date.now() - startTime) / 1000;
        progressValue = Math.min(elapsed / 2, 1); // 2 second animation
        if (progressValue >= 1) {
          progressValue = 1;
        }
      } else {
        progressValue = 1;
      }

      const visibleCount = Math.floor(points.length * progressValue);

      // Draw trajectory path with gradient
      if (visibleCount > 1) {
        // Glow effect
        ctx.shadowColor = 'rgba(0, 200, 255, 0.5)';
        ctx.shadowBlur = 8;

        // Main path
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < visibleCount; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        const grad = ctx.createLinearGradient(points[0].x, points[0].y, points[visibleCount - 1].x, points[visibleCount - 1].y);
        grad.addColorStop(0, 'rgba(0, 200, 255, 0.9)');
        grad.addColorStop(0.5, 'rgba(100, 255, 200, 0.8)');
        grad.addColorStop(1, 'rgba(255, 200, 0, 0.6)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Dotted time markers every 0.5 seconds
        for (let i = 0; i < visibleCount; i++) {
          if (Math.abs(points[i].t % 0.5) < 0.025) {
            ctx.beginPath();
            ctx.arc(points[i].x, points[i].y, 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(0, 200, 255, 0.8)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Time label
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${points[i].t.toFixed(1)}s`, points[i].x, points[i].y - 10);
          }
        }

        // Landing point marker
        if (progressValue >= 1 && points.length > 2) {
          const last = points[points.length - 1];
          ctx.beginPath();
          ctx.arc(last.x, last.y, 8, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Landing distance
          const distance = ((last.x - defaultLaunch.x) / (canvas.width / 30)).toFixed(1);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${distance}m`, last.x, last.y - 15);
        }

        // Max height marker
        const highestPoint = points.reduce((min, p) => p.y < min.y ? p : min, points[0]);
        if (progressValue >= 0.5) {
          ctx.beginPath();
          ctx.setLineDash([4, 4]);
          ctx.moveTo(highestPoint.x, highestPoint.y);
          ctx.lineTo(highestPoint.x, defaultLaunch.y);
          ctx.strokeStyle = 'rgba(100, 255, 200, 0.4)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.setLineDash([]);

          const maxH = ((defaultLaunch.y - highestPoint.y) / (canvas.width / 30)).toFixed(1);
          ctx.fillStyle = 'rgba(100, 255, 200, 0.9)';
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`H=${maxH}m`, highestPoint.x, highestPoint.y - 8);
        }
      }

      // Launch point crosshair
      ctx.beginPath();
      ctx.arc(defaultLaunch.x, defaultLaunch.y, 12, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(defaultLaunch.x - 18, defaultLaunch.y);
      ctx.lineTo(defaultLaunch.x + 18, defaultLaunch.y);
      ctx.moveTo(defaultLaunch.x, defaultLaunch.y - 18);
      ctx.lineTo(defaultLaunch.x, defaultLaunch.y + 18);
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Angle indicator arc
      const arcRadius = 30;
      ctx.beginPath();
      ctx.arc(defaultLaunch.x, defaultLaunch.y, arcRadius, -arAngle * Math.PI / 180, 0);
      ctx.strokeStyle = 'rgba(255, 200, 0, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 200, 0, 0.9)';
      ctx.font = '11px sans-serif';
      ctx.fillText(`${arAngle}°`, defaultLaunch.x + arcRadius + 5, defaultLaunch.y - 5);

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [active, launchPoint, isAnimating, animProgress, arVelocity, arAngle, gravity, generateTrajectory, videoRef]);

  if (!active) return null;

  return (
    <>
      {/* AR Canvas overlay on video */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-10 touch-none"
        onClick={handleCanvasTap}
        onTouchStart={handleCanvasTap}
      />

      {/* AR Controls */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-cyan-500/30">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-[11px] text-white font-medium">
            {isAr ? 'الواقع المعزز' : 'AR Mode'}
          </span>
        </div>

        <button
          onClick={() => onToggle(false)}
          className="p-2 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-all"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* AR Parameter controls */}
      <div className="absolute bottom-20 left-4 right-4 z-20">
        <div className="bg-black/60 backdrop-blur-md rounded-xl p-3 border border-white/10 space-y-2">
          <div className="flex items-center gap-3">
            <label className="text-[10px] text-white/70 w-12 shrink-0">
              {isAr ? 'السرعة' : 'V₀'}
            </label>
            <input
              type="range"
              min={5}
              max={50}
              value={arVelocity}
              onChange={(e) => { setArVelocity(Number(e.target.value)); setIsAnimating(false); }}
              className="flex-1 h-1 accent-cyan-400"
            />
            <span className="text-[10px] text-cyan-300 font-mono w-14 text-right">{arVelocity} m/s</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-[10px] text-white/70 w-12 shrink-0">
              {isAr ? 'الزاوية' : 'Angle'}
            </label>
            <input
              type="range"
              min={5}
              max={85}
              value={arAngle}
              onChange={(e) => { setArAngle(Number(e.target.value)); setIsAnimating(false); }}
              className="flex-1 h-1 accent-yellow-400"
            />
            <span className="text-[10px] text-yellow-300 font-mono w-14 text-right">{arAngle}°</span>
          </div>

          <p className="text-[9px] text-white/40 text-center pt-1">
            {isAr ? 'اضغط على الشاشة لتحديد نقطة الإطلاق' : 'Tap screen to set launch point'}
          </p>
        </div>
      </div>
    </>
  );
}
