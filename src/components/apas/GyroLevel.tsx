import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react';

interface Props {
  lang: string;
  onLevelStatusChange?: (isLevel: boolean) => void;
  /** Max tilt angle in degrees before warning (default: 5) */
  maxTilt?: number;
  compact?: boolean;
}

/**
 * GyroLevel - Digital spirit level using device orientation
 * Shows a visual level indicator and warns if the phone is tilted
 * Uses DeviceOrientationEvent for accurate tilt detection
 */
export default function GyroLevel({ lang, onLevelStatusChange, maxTilt = 5, compact = false }: Props) {
  const [beta, setBeta] = useState(0); // Front-back tilt
  const [gamma, setGamma] = useState(0); // Left-right tilt
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLevel, setIsLevel] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const isAr = lang === 'ar';

  const requestPermission = useCallback(async () => {
    if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
      try {
        const perm = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        setHasPermission(perm === 'granted');
      } catch {
        setHasPermission(false);
      }
    } else {
      setHasPermission(true);
    }
  }, []);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    if (hasPermission !== true) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const b = e.beta ?? 0; // -180 to 180 (front-back)
      const g = e.gamma ?? 0; // -90 to 90 (left-right)
      setBeta(b);
      setGamma(g);

      // Consider "level" if both axes within threshold (relative to 0 = flat, or 90 = upright for camera)
      // When holding phone upright for camera: beta ~90, gamma ~0
      const adjustedBeta = Math.abs(b - 90); // How far from upright position
      const adjustedGamma = Math.abs(g);
      const level = adjustedBeta <= maxTilt && adjustedGamma <= maxTilt;
      setIsLevel(level);
      onLevelStatusChange?.(level);
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [hasPermission, maxTilt, onLevelStatusChange]);

  // Draw spirit level bubble on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;
      const radius = Math.min(W, H) / 2 - 4;

      ctx.clearRect(0, 0, W, H);

      // Outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = isLevel ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Center crosshair
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy);
      ctx.lineTo(cx + 8, cy);
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx, cy + 8);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Target zone circle
      ctx.beginPath();
      ctx.arc(cx, cy, radius * (maxTilt / 45), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Bubble position - map tilt to canvas coordinates
      const adjustedBeta = beta - 90; // Relative to upright
      const bubbleX = cx + (gamma / 45) * radius * 0.8;
      const bubbleY = cy + (adjustedBeta / 45) * radius * 0.8;

      // Clamp to circle
      const dx = bubbleX - cx;
      const dy = bubbleY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = radius * 0.85;
      const finalX = dist > maxDist ? cx + (dx / dist) * maxDist : bubbleX;
      const finalY = dist > maxDist ? cy + (dy / dist) * maxDist : bubbleY;

      // Bubble
      const bubbleRadius = 8;
      const grad = ctx.createRadialGradient(finalX - 2, finalY - 2, 0, finalX, finalY, bubbleRadius);
      if (isLevel) {
        grad.addColorStop(0, 'rgba(34, 197, 94, 0.9)');
        grad.addColorStop(1, 'rgba(34, 197, 94, 0.4)');
      } else {
        grad.addColorStop(0, 'rgba(239, 68, 68, 0.9)');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0.4)');
      }
      ctx.beginPath();
      ctx.arc(finalX, finalY, bubbleRadius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = isLevel ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [beta, gamma, isLevel, maxTilt]);

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full backdrop-blur-sm border ${
        isLevel 
          ? 'bg-green-500/20 border-green-500/30' 
          : 'bg-red-500/20 border-red-500/30 animate-pulse'
      }`}>
        {isLevel ? (
          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
        ) : (
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
        )}
        <span className={`text-[10px] font-medium ${isLevel ? 'text-green-300' : 'text-red-300'}`}>
          {isLevel
            ? (isAr ? 'مستوي' : 'Level')
            : (isAr ? 'عدّل الزاوية' : 'Adjust angle')}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/50 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-foreground">
            {isAr ? 'ميزان الجيروسكوب' : 'Gyro Level'}
          </span>
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
          isLevel 
            ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
            : 'bg-red-500/10 text-red-500 border border-red-500/20'
        }`}>
          {isLevel ? (
            <>
              <CheckCircle className="w-3 h-3" />
              {isAr ? 'مستوي' : 'Level'}
            </>
          ) : (
            <>
              <AlertTriangle className="w-3 h-3" />
              {isAr ? 'مائل' : 'Tilted'}
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Spirit level canvas */}
        <canvas
          ref={canvasRef}
          width={80}
          height={80}
          className="rounded-full bg-black/20 border border-border/30"
        />

        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">{isAr ? 'الميل الأمامي' : 'Front tilt'}</span>
            <span className="font-mono text-foreground">{(beta - 90).toFixed(1)}°</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">{isAr ? 'الميل الجانبي' : 'Side tilt'}</span>
            <span className="font-mono text-foreground">{gamma.toFixed(1)}°</span>
          </div>

          {!isLevel && (
            <p className={`text-[10px] mt-1 p-1.5 rounded bg-red-500/10 border border-red-500/20 ${
              isAr ? 'text-right' : 'text-left'
            }`}>
              <span className="text-red-400">
                {isAr
                  ? 'عدل زاوية الهاتف للحصول على نتائج دقيقة'
                  : 'Adjust phone angle for accurate results'}
              </span>
            </p>
          )}
        </div>
      </div>

      {hasPermission === false && (
        <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-[10px] text-yellow-400 text-center">
            {isAr ? 'يرجى السماح بالوصول إلى مستشعرات الجهاز' : 'Please allow device sensor access'}
          </p>
          <button
            onClick={requestPermission}
            className="w-full mt-1 text-[10px] py-1 bg-primary text-primary-foreground rounded"
          >
            {isAr ? 'طلب إذن' : 'Request Permission'}
          </button>
        </div>
      )}
    </div>
  );
}
