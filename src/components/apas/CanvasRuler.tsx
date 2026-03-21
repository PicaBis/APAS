import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Settings } from 'lucide-react';

interface CanvasRulerProps {
  active: boolean;
  onClose: () => void;
  lang: string;
}

type DragMode = 'move' | 'resize-right' | 'rotate' | null;

const CanvasRuler: React.FC<CanvasRulerProps> = ({ active, onClose, lang }) => {
  const [rulerLength, setRulerLength] = useState(300);
  const [scale, setScale] = useState(10);
  const [scaleUnit, setScaleUnit] = useState('m');
  const [position, setPosition] = useState({ x: -1, y: -1 });
  const [rotation, setRotation] = useState(0);
  const [showConfig, setShowConfig] = useState(false);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const dragStart = useRef({ x: 0, y: 0, length: 0, rotation: 0 });
  const rulerCenter = useRef({ x: 0, y: 0 });

  const t = (ar: string, en: string, fr: string) =>
    lang === 'ar' ? ar : lang === 'fr' ? fr : en;

  // Initialize position
  useEffect(() => {
    if (active && position.x === -1) {
      setPosition({
        x: Math.max(100, (window.innerWidth - rulerLength) / 2),
        y: Math.max(200, window.innerHeight / 2),
      });
    }
  }, [active, position.x, rulerLength]);

  useEffect(() => {
    if (!active) {
      setPosition({ x: -1, y: -1 });
      setShowConfig(false);
    }
  }, [active]);

  // Main body drag (move)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.ruler-config') || target.closest('.ruler-handle') || target.closest('button') || target.closest('input') || target.closest('select')) return;
    e.preventDefault();
    e.stopPropagation();
    setDragMode('move');
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y, length: rulerLength, rotation };
  }, [position, rulerLength, rotation]);

  // Right handle drag (resize)
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragMode('resize-right');
    dragStart.current = { x: e.clientX, y: e.clientY, length: rulerLength, rotation };
    rulerCenter.current = { x: position.x, y: position.y };
  }, [rulerLength, rotation, position]);

  // Rotation handle
  const handleRotateStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragMode('rotate');
    const radians = rotation * Math.PI / 180;
    const cx = position.x + (rulerLength / 2) * Math.cos(radians);
    const cy = position.y + (rulerLength / 2) * Math.sin(radians);
    rulerCenter.current = { x: cx, y: cy };
    dragStart.current = { x: e.clientX, y: e.clientY, length: rulerLength, rotation };
  }, [rotation, position, rulerLength]);

  useEffect(() => {
    if (!dragMode) return;
    const handleMove = (e: MouseEvent) => {
      if (dragMode === 'move') {
        setPosition({
          x: Math.max(-50, Math.min(window.innerWidth - 50, e.clientX - dragStart.current.x)),
          y: Math.max(0, Math.min(window.innerHeight - 20, e.clientY - dragStart.current.y)),
        });
      } else if (dragMode === 'resize-right') {
        const rad = dragStart.current.rotation * Math.PI / 180;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        const projectedDelta = dx * Math.cos(rad) + dy * Math.sin(rad);
        const newLength = Math.max(80, Math.min(800, dragStart.current.length + projectedDelta));
        setRulerLength(newLength);
      } else if (dragMode === 'rotate') {
        const cx = rulerCenter.current.x;
        const cy = rulerCenter.current.y;
        const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
        setRotation(angle);
      }
    };
    const handleUp = () => setDragMode(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragMode]);

  // Touch support
  const handleTouchDown = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.ruler-config') || target.closest('.ruler-handle') || target.closest('button') || target.closest('input') || target.closest('select')) return;
    const touch = e.touches[0];
    setDragMode('move');
    dragStart.current = { x: touch.clientX - position.x, y: touch.clientY - position.y, length: rulerLength, rotation };
  }, [position, rulerLength, rotation]);

  const handleResizeTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    setDragMode('resize-right');
    dragStart.current = { x: touch.clientX, y: touch.clientY, length: rulerLength, rotation };
    rulerCenter.current = { x: position.x, y: position.y };
  }, [rulerLength, rotation, position]);

  const handleRotateTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    setDragMode('rotate');
    const radians = rotation * Math.PI / 180;
    const cx = position.x + (rulerLength / 2) * Math.cos(radians);
    const cy = position.y + (rulerLength / 2) * Math.sin(radians);
    rulerCenter.current = { x: cx, y: cy };
    dragStart.current = { x: touch.clientX, y: touch.clientY, length: rulerLength, rotation };
  }, [rotation, position, rulerLength]);

  useEffect(() => {
    if (!dragMode) return;
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (dragMode === 'move') {
        setPosition({
          x: Math.max(-50, Math.min(window.innerWidth - 50, touch.clientX - dragStart.current.x)),
          y: Math.max(0, Math.min(window.innerHeight - 20, touch.clientY - dragStart.current.y)),
        });
      } else if (dragMode === 'resize-right') {
        const rad = dragStart.current.rotation * Math.PI / 180;
        const dx = touch.clientX - dragStart.current.x;
        const dy = touch.clientY - dragStart.current.y;
        const projectedDelta = dx * Math.cos(rad) + dy * Math.sin(rad);
        const newLength = Math.max(80, Math.min(800, dragStart.current.length + projectedDelta));
        setRulerLength(newLength);
      } else if (dragMode === 'rotate') {
        const cx = rulerCenter.current.x;
        const cy = rulerCenter.current.y;
        const angle = Math.atan2(touch.clientY - cy, touch.clientX - cx) * 180 / Math.PI;
        setRotation(angle);
      }
    };
    const handleTouchEnd = () => setDragMode(null);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [dragMode]);

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

  const tickCount = 10;
  const tickSpacing = rulerLength / tickCount;
  const valuePerTick = scale / tickCount;
  const rulerH = 36;

  // Format tick values with smart precision
  const formatTickVal = (val: number) => {
    if (val === 0) return '0';
    if (Number.isInteger(val) && Math.abs(val) < 10000) return val.toString();
    if (Math.abs(val) >= 100) return val.toFixed(0);
    if (Math.abs(val) >= 10) return val.toFixed(1);
    if (Math.abs(val) >= 1) return val.toFixed(1);
    return val.toFixed(2);
  };

  return (
    <>
      {/* Configuration Panel */}
      {showConfig && (
        <div
          className="ruler-config fixed z-[65] bg-card/98 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl shadow-black/20 p-3 w-[240px]"
          style={{
            left: Math.min(position.x > 0 ? position.x : 100, window.innerWidth - 260),
            top: Math.max(10, (position.y > 0 ? position.y : 200) - 180),
          }}
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <Settings className="w-3 h-3 text-primary" />
              <span className="text-[11px] font-bold text-foreground">
                {t('إعدادات المسطرة', 'Ruler Settings', 'Paramètres')}
              </span>
            </div>
            <button onClick={() => setShowConfig(false)} className="p-1 rounded hover:bg-primary/10 text-muted-foreground">
              <X className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {/* Scale value + unit: value input larger, unit select smaller */}
            <div>
              <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                {t('السلم', 'Scale', 'Échelle')}
              </label>
              <div className="flex items-center gap-1.5" dir="ltr">
                <input
                  type="number"
                  min={0.1}
                  max={10000}
                  step={0.1}
                  value={scale}
                  onChange={(e) => setScale(Math.max(0.1, Number(e.target.value)))}
                  className="flex-[3] text-xs font-mono px-2 py-1 rounded border border-border bg-secondary/30 text-foreground min-w-0"
                />
                <select
                  value={scaleUnit}
                  onChange={(e) => setScaleUnit(e.target.value)}
                  className="flex-[1] text-[10px] px-1 py-1 rounded border border-border bg-secondary/30 text-foreground cursor-pointer min-w-[36px]"
                >
                  <option value="m">m</option>
                  <option value="cm">cm</option>
                  <option value="km">km</option>
                  <option value="ft">ft</option>
                  <option value="in">in</option>
                </select>
              </div>
            </div>

            {/* Close ruler button */}
            <button
              onClick={onClose}
              className="w-full text-[11px] font-medium py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-all duration-200"
            >
              <X className="w-3 h-3" />
              {t('حذف المسطرة', 'Remove Ruler', 'Supprimer')}
            </button>
          </div>
        </div>
      )}

      {/* Ruler */}
      <div
        className="fixed z-[64] select-none"
        style={{
          left: position.x,
          top: position.y,
          cursor: dragMode === 'move' ? 'grabbing' : 'grab',
          transform: `rotate(${rotation}deg)`,
          transformOrigin: '0 50%',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchDown}
      >
        <div className="relative" style={{ width: rulerLength }}>
          {/* Left rotation handle */}
          <div
            className="ruler-handle absolute -left-4 top-1/2 -translate-y-1/2 w-3 h-8 rounded-full bg-primary/20 hover:bg-primary/40 border border-primary/30 cursor-crosshair transition-colors flex items-center justify-center"
            onMouseDown={handleRotateStart}
            onTouchStart={handleRotateTouchStart}
            title={t('سحب للتدوير', 'Drag to rotate', 'Glisser pour pivoter')}
          >
            <div className="w-1 h-4 rounded-full bg-primary/50" />
          </div>

          {/* Ruler body */}
          <div
            className="relative rounded-sm overflow-visible border border-primary/40 shadow-lg"
            style={{
              height: rulerH,
              background: 'linear-gradient(180deg, rgba(100, 200, 180, 0.12) 0%, rgba(100, 200, 180, 0.04) 100%)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {/* Tick marks — all labeled with small values */}
            <svg width={rulerLength} height={rulerH} className="absolute inset-0 overflow-visible">
              {Array.from({ length: tickCount + 1 }, (_, i) => {
                const x = i * tickSpacing;
                const isMain = i === 0 || i === tickCount || i === tickCount / 2;
                const tickH = isMain ? 14 : 10;
                const val = i * valuePerTick;
                return (
                  <g key={i}>
                    <line x1={x} y1={0} x2={x} y2={tickH} stroke="hsl(var(--primary))" strokeWidth={isMain ? 1.5 : 0.8} opacity={isMain ? 0.8 : 0.5} />
                    <line x1={x} y1={rulerH} x2={x} y2={rulerH - tickH} stroke="hsl(var(--primary))" strokeWidth={isMain ? 1.5 : 0.8} opacity={isMain ? 0.8 : 0.5} />
                    <text
                      x={x}
                      y={rulerH / 2 + 3}
                      textAnchor="middle"
                      fill="hsl(var(--primary))"
                      fontSize={isMain ? 7 : 6}
                      fontFamily="monospace"
                      fontWeight={isMain ? 'bold' : 'normal'}
                      opacity={isMain ? 0.9 : 0.65}
                    >
                      {formatTickVal(val)}
                    </text>
                  </g>
                );
              })}
              {/* Sub-ticks */}
              {Array.from({ length: tickCount * 5 + 1 }, (_, i) => {
                if (i % 5 === 0) return null;
                const x = (i / 5) * tickSpacing;
                return (
                  <g key={`s${i}`}>
                    <line x1={x} y1={0} x2={x} y2={4} stroke="hsl(var(--primary))" strokeWidth={0.4} opacity={0.25} />
                    <line x1={x} y1={rulerH} x2={x} y2={rulerH - 4} stroke="hsl(var(--primary))" strokeWidth={0.4} opacity={0.25} />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Right resize handle */}
          <div
            className="ruler-handle absolute -right-4 top-1/2 -translate-y-1/2 w-3 h-8 rounded-full bg-primary/20 hover:bg-primary/40 border border-primary/30 cursor-ew-resize transition-colors flex items-center justify-center"
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeTouchStart}
            title={t('سحب لتمطيط', 'Drag to resize', 'Glisser pour redimensionner')}
          >
            <div className="w-0.5 h-4 rounded-full bg-primary/50 mx-px" />
            <div className="w-0.5 h-4 rounded-full bg-primary/50 mx-px" />
          </div>

          {/* Unit label */}
          <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[8px] font-mono text-primary/60 whitespace-nowrap">
            {scale} {scaleUnit}
          </div>

          {/* Settings gear */}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="absolute -top-5 left-1/2 -translate-x-1/2 p-0.5 rounded-full bg-card/80 border border-border/30 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all shadow-sm"
          >
            <Settings className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </>
  );
};

export default CanvasRuler;
