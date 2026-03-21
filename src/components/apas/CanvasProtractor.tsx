import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Settings } from 'lucide-react';

interface CanvasProtractorProps {
  active: boolean;
  onClose: () => void;
  lang: string;
}

type DragMode = 'move' | 'rotate-arm' | 'rotate-body' | null;

const CanvasProtractor: React.FC<CanvasProtractorProps> = ({ active, onClose, lang }) => {
  const [position, setPosition] = useState({ x: -1, y: -1 });
  const [bodyRotation, setBodyRotation] = useState(0); // rotation of the entire protractor
  const [armAngle, setArmAngle] = useState(45); // angle of the movable arm (0-180)
  const [radius, setRadius] = useState(120);
  const [showConfig, setShowConfig] = useState(false);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const dragStart = useRef({ x: 0, y: 0, angle: 0 });
  const centerRef = useRef({ x: 0, y: 0 });

  const t = (ar: string, en: string, fr: string) =>
    lang === 'ar' ? ar : lang === 'fr' ? fr : en;

  // Initialize position
  useEffect(() => {
    if (active && position.x === -1) {
      setPosition({
        x: Math.max(100, window.innerWidth / 2 - radius),
        y: Math.max(200, window.innerHeight / 2),
      });
    }
  }, [active, position.x, radius]);

  useEffect(() => {
    if (!active) {
      setPosition({ x: -1, y: -1 });
      setShowConfig(false);
    }
  }, [active]);

  // Body drag (move)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.protractor-config') || target.closest('.protractor-handle') || target.closest('button') || target.closest('input')) return;
    e.preventDefault();
    e.stopPropagation();
    setDragMode('move');
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y, angle: 0 };
  }, [position]);

  // Arm rotation handle
  const handleArmStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragMode('rotate-arm');
    centerRef.current = { x: position.x, y: position.y };
    dragStart.current = { x: e.clientX, y: e.clientY, angle: armAngle };
  }, [position, armAngle]);

  // Body rotation handle
  const handleBodyRotateStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragMode('rotate-body');
    centerRef.current = { x: position.x, y: position.y };
    dragStart.current = { x: e.clientX, y: e.clientY, angle: bodyRotation };
  }, [position, bodyRotation]);

  useEffect(() => {
    if (!dragMode) return;
    const handleMove = (e: MouseEvent) => {
      if (dragMode === 'move') {
        setPosition({
          x: Math.max(-50, Math.min(window.innerWidth - 50, e.clientX - dragStart.current.x)),
          y: Math.max(0, Math.min(window.innerHeight - 20, e.clientY - dragStart.current.y)),
        });
      } else if (dragMode === 'rotate-arm') {
        const cx = centerRef.current.x;
        const cy = centerRef.current.y;
        const rawAngle = Math.atan2(-(e.clientY - cy), e.clientX - cx) * 180 / Math.PI;
        const adjusted = rawAngle - bodyRotation;
        const normalized = ((adjusted % 360) + 360) % 360;
        setArmAngle(Math.max(0, Math.min(180, normalized)));
      } else if (dragMode === 'rotate-body') {
        const cx = centerRef.current.x;
        const cy = centerRef.current.y;
        const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
        setBodyRotation(angle);
      }
    };
    const handleUp = () => setDragMode(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragMode, bodyRotation]);

  // Touch support
  const handleTouchDown = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.protractor-config') || target.closest('.protractor-handle') || target.closest('button') || target.closest('input')) return;
    const touch = e.touches[0];
    setDragMode('move');
    dragStart.current = { x: touch.clientX - position.x, y: touch.clientY - position.y, angle: 0 };
  }, [position]);

  const handleArmTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    setDragMode('rotate-arm');
    centerRef.current = { x: position.x, y: position.y };
    dragStart.current = { x: touch.clientX, y: touch.clientY, angle: armAngle };
  }, [position, armAngle]);

  const handleBodyRotateTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    setDragMode('rotate-body');
    centerRef.current = { x: position.x, y: position.y };
    dragStart.current = { x: touch.clientX, y: touch.clientY, angle: bodyRotation };
  }, [position, bodyRotation]);

  useEffect(() => {
    if (!dragMode) return;
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (dragMode === 'move') {
        setPosition({
          x: Math.max(-50, Math.min(window.innerWidth - 50, touch.clientX - dragStart.current.x)),
          y: Math.max(0, Math.min(window.innerHeight - 20, touch.clientY - dragStart.current.y)),
        });
      } else if (dragMode === 'rotate-arm') {
        const cx = centerRef.current.x;
        const cy = centerRef.current.y;
        const rawAngle = Math.atan2(-(touch.clientY - cy), touch.clientX - cx) * 180 / Math.PI;
        const adjusted = rawAngle - bodyRotation;
        const normalized = ((adjusted % 360) + 360) % 360;
        setArmAngle(Math.max(0, Math.min(180, normalized)));
      } else if (dragMode === 'rotate-body') {
        const cx = centerRef.current.x;
        const cy = centerRef.current.y;
        const angle = Math.atan2(touch.clientY - cy, touch.clientX - cx) * 180 / Math.PI;
        setBodyRotation(angle);
      }
    };
    const handleTouchEnd = () => setDragMode(null);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [dragMode, bodyRotation]);

  // Delete key to close
  useEffect(() => {
    if (!active) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && !(e.target as HTMLElement).closest('input, textarea, select')) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [active, onClose]);

  if (!active) return null;

  const svgSize = radius * 2 + 40;
  const cx = svgSize / 2;
  const cy = svgSize / 2;

  // Generate tick marks for 0-180 degrees
  const ticks: { angle: number; isMajor: boolean; label: string }[] = [];
  for (let deg = 0; deg <= 180; deg += 5) {
    const isMajor = deg % 30 === 0;
    const isMid = deg % 10 === 0;
    ticks.push({
      angle: deg,
      isMajor,
      label: isMajor ? `${deg}` : isMid ? `${deg}` : '',
    });
  }

  // Arm endpoint
  const armRad = (armAngle * Math.PI) / 180;
  const armX = cx + radius * Math.cos(armRad);
  const armY = cy - radius * Math.sin(armRad);

  // Arc path for the measured angle
  const arcRadius = radius * 0.35;
  const arcPath = describeArc(cx, cy, arcRadius, 0, armAngle);

  return (
    <>
      {/* Configuration Panel */}
      {showConfig && (
        <div
          className="protractor-config fixed z-[65] bg-card/98 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl shadow-black/20 p-3 w-[240px]"
          style={{
            left: Math.min(position.x > 0 ? position.x : 100, window.innerWidth - 260),
            top: Math.max(10, (position.y > 0 ? position.y : 200) - 200),
          }}
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <Settings className="w-3 h-3 text-primary" />
              <span className="text-[11px] font-bold text-foreground">
                {t('إعدادات المنقلة', 'Protractor Settings', 'Paramètres du Rapporteur')}
              </span>
            </div>
            <button onClick={() => setShowConfig(false)} className="p-1 rounded hover:bg-primary/10 text-muted-foreground">
              <X className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {/* Size control */}
            <div>
              <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                {t('الحجم', 'Size', 'Taille')}
              </label>
              <input
                type="range"
                min={60}
                max={200}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="text-[9px] text-muted-foreground text-center mt-0.5">{radius}px</div>
            </div>

            {/* Angle display */}
            <div className="bg-secondary/30 rounded-lg p-2 text-center">
              <div className="text-[10px] text-muted-foreground mb-0.5">
                {t('الزاوية المقاسة', 'Measured Angle', 'Angle Mesuré')}
              </div>
              <div className="text-lg font-bold font-mono text-primary">
                {armAngle.toFixed(1)}°
              </div>
              <div className="text-[9px] text-muted-foreground">
                {(armAngle * Math.PI / 180).toFixed(4)} rad
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="w-full text-[11px] font-medium py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-all duration-200"
            >
              <X className="w-3 h-3" />
              {t('حذف المنقلة', 'Remove Protractor', 'Supprimer le Rapporteur')}
            </button>
          </div>
        </div>
      )}

      {/* Protractor */}
      <div
        className="fixed z-[64] select-none"
        style={{
          left: position.x - svgSize / 2,
          top: position.y - svgSize / 2,
          cursor: dragMode === 'move' ? 'grabbing' : 'grab',
          transform: `rotate(${bodyRotation}deg)`,
          transformOrigin: `${svgSize / 2}px ${svgSize / 2}px`,
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchDown}
      >
        <svg width={svgSize} height={svgSize} className="overflow-visible">
          {/* Semi-transparent background arc */}
          <path
            d={`M ${cx + radius} ${cy} A ${radius} ${radius} 0 1 0 ${cx - radius} ${cy} L ${cx} ${cy} Z`}
            fill="rgba(100, 200, 180, 0.08)"
            stroke="hsl(var(--primary))"
            strokeWidth={1.2}
            strokeOpacity={0.4}
            style={{ backdropFilter: 'blur(8px)' }}
          />

          {/* Tick marks */}
          {ticks.map(({ angle: deg, isMajor, label }) => {
            const rad = (deg * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const outerR = radius;
            const innerR = isMajor ? radius - 14 : label ? radius - 10 : radius - 6;
            const x1 = cx + outerR * cos;
            const y1 = cy - outerR * sin;
            const x2 = cx + innerR * cos;
            const y2 = cy - innerR * sin;
            return (
              <g key={deg}>
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="hsl(var(--primary))"
                  strokeWidth={isMajor ? 1.5 : 0.8}
                  opacity={isMajor ? 0.8 : label ? 0.5 : 0.3}
                />
                {label && (
                  <text
                    x={cx + (radius - (isMajor ? 22 : 16)) * cos}
                    y={cy - (radius - (isMajor ? 22 : 16)) * sin}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="hsl(var(--primary))"
                    fontSize={isMajor ? 8 : 6}
                    fontFamily="monospace"
                    fontWeight={isMajor ? 'bold' : 'normal'}
                    opacity={isMajor ? 0.9 : 0.65}
                  >
                    {label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Base line (0 degrees) */}
          <line
            x1={cx} y1={cy} x2={cx + radius} y2={cy}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            opacity={0.7}
          />

          {/* Measured angle arc */}
          <path
            d={arcPath}
            fill="hsl(var(--primary) / 0.1)"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            opacity={0.8}
          />

          {/* Movable arm */}
          <line
            x1={cx} y1={cy} x2={armX} y2={armY}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            opacity={0.9}
          />

          {/* Arm drag handle */}
          <circle
            className="protractor-handle"
            cx={armX} cy={armY}
            r={6}
            fill="hsl(var(--primary) / 0.3)"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            style={{ cursor: 'crosshair' }}
            onMouseDown={handleArmStart}
            onTouchStart={handleArmTouchStart}
          />

          {/* Center dot */}
          <circle
            cx={cx} cy={cy}
            r={3}
            fill="hsl(var(--primary))"
            opacity={0.8}
          />

          {/* Angle label at arc */}
          <text
            x={cx + arcRadius * 0.7 * Math.cos(armRad / 2)}
            y={cy - arcRadius * 0.7 * Math.sin(armRad / 2)}
            textAnchor="middle"
            dominantBaseline="central"
            fill="hsl(var(--primary))"
            fontSize={10}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {armAngle.toFixed(1)}°
          </text>

          {/* Body rotation handle (bottom-left) */}
          <circle
            className="protractor-handle"
            cx={cx - radius - 8} cy={cy}
            r={5}
            fill="hsl(var(--primary) / 0.2)"
            stroke="hsl(var(--primary) / 0.4)"
            strokeWidth={1}
            style={{ cursor: 'crosshair' }}
            onMouseDown={handleBodyRotateStart}
            onTouchStart={handleBodyRotateTouchStart}
          />
        </svg>

        {/* Settings gear */}
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="absolute p-0.5 rounded-full bg-card/80 border border-border/30 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all shadow-sm"
          style={{
            left: svgSize / 2 - 6,
            top: -8,
          }}
        >
          <Settings className="w-2.5 h-2.5" />
        </button>
      </div>
    </>
  );
};

// Helper: SVG arc path for a sector from startAngle to endAngle (degrees)
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy - r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy - r * Math.sin(endRad);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 0 ${x2} ${y2} Z`;
}

export default CanvasProtractor;
