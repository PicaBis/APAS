import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Ruler, Check, RotateCcw } from 'lucide-react';

interface LiveCalibrationProps {
  open: boolean;
  onClose: () => void;
  lang: string;
  onCalibrate: (pixelsPerMeter: number) => void;
}

type CalibrationStep = 'draw' | 'measure' | 'done';

const LiveCalibration: React.FC<LiveCalibrationProps> = ({ open, onClose, lang, onCalibrate }) => {
  const [step, setStep] = useState<CalibrationStep>('draw');
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null);
  const [lineEnd, setLineEnd] = useState<{ x: number; y: number } | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [realLength, setRealLength] = useState('1.0');
  const [unit, setUnit] = useState<'m' | 'cm' | 'mm'>('m');
  const [pixelsPerMeter, setPixelsPerMeter] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const t = (ar: string, en: string, fr: string) =>
    lang === 'ar' ? ar : lang === 'fr' ? fr : en;

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setStep('draw');
      setLineStart(null);
      setLineEnd(null);
      setDrawing(false);
      setRealLength('1.0');
      setPixelsPerMeter(null);
    }
  }, [open]);

  // Draw the calibration line on canvas
  const drawLine = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !lineStart) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const end = lineEnd || lineStart;

    // Draw the line
    ctx.strokeStyle = 'hsl(142, 76%, 36%)';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(lineStart.x, lineStart.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // Draw endpoints
    [lineStart, end].forEach(pt => {
      ctx.fillStyle = 'hsl(142, 76%, 36%)';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw pixel length label
    const dx = end.x - lineStart.x;
    const dy = end.y - lineStart.y;
    const pixelLen = Math.sqrt(dx * dx + dy * dy);
    const midX = (lineStart.x + end.x) / 2;
    const midY = (lineStart.y + end.y) / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    const labelText = `${Math.round(pixelLen)} px`;
    ctx.font = 'bold 14px monospace';
    const metrics = ctx.measureText(labelText);
    const padding = 6;
    ctx.fillRect(midX - metrics.width / 2 - padding, midY - 22, metrics.width + padding * 2, 24);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, midX, midY - 10);
  }, [lineStart, lineEnd]);

  useEffect(() => {
    drawLine();
  }, [drawLine]);

  // Mouse handlers for drawing the line
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (step !== 'draw') return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLineStart({ x, y });
    setLineEnd(null);
    setDrawing(true);
  }, [step]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drawing || step !== 'draw') return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setLineEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [drawing, step]);

  const handleMouseUp = useCallback(() => {
    if (!drawing || step !== 'draw') return;
    setDrawing(false);
    if (lineStart && lineEnd) {
      const dx = lineEnd.x - lineStart.x;
      const dy = lineEnd.y - lineStart.y;
      const pixelLen = Math.sqrt(dx * dx + dy * dy);
      if (pixelLen > 20) {
        setStep('measure');
      }
    }
  }, [drawing, step, lineStart, lineEnd]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (step !== 'draw') return;
    const touch = e.touches[0];
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setLineStart({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
    setLineEnd(null);
    setDrawing(true);
  }, [step]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!drawing || step !== 'draw') return;
    const touch = e.touches[0];
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setLineEnd({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
  }, [drawing, step]);

  const handleTouchEnd = useCallback(() => {
    if (!drawing || step !== 'draw') return;
    setDrawing(false);
    if (lineStart && lineEnd) {
      const dx = lineEnd.x - lineStart.x;
      const dy = lineEnd.y - lineStart.y;
      const pixelLen = Math.sqrt(dx * dx + dy * dy);
      if (pixelLen > 20) {
        setStep('measure');
      }
    }
  }, [drawing, step, lineStart, lineEnd]);

  // Calculate and apply calibration
  const handleCalibrate = useCallback(() => {
    if (!lineStart || !lineEnd) return;
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const pixelLen = Math.sqrt(dx * dx + dy * dy);

    const realVal = parseFloat(realLength) || 1;
    let realMeters = realVal;
    if (unit === 'cm') realMeters = realVal / 100;
    if (unit === 'mm') realMeters = realVal / 1000;

    const ppm = pixelLen / realMeters;
    setPixelsPerMeter(ppm);
    onCalibrate(ppm);
    setStep('done');
  }, [lineStart, lineEnd, realLength, unit, onCalibrate]);

  const handleReset = () => {
    setStep('draw');
    setLineStart(null);
    setLineEnd(null);
    setDrawing(false);
    setPixelsPerMeter(null);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const getPixelLength = () => {
    if (!lineStart || !lineEnd) return 0;
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]" ref={overlayRef}>
      {/* Drawing canvas overlay */}
      {step === 'draw' && (
        <div
          className="absolute inset-0 cursor-crosshair"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
          {/* Instructions */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl px-5 py-3 text-center" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <div className="flex items-center gap-2 justify-center mb-1">
              <Ruler className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-foreground">
                {t('المعايرة الحية', 'Live Calibration', 'Calibration en Direct')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t(
                'ارسم خطاً على جسم معروف الطول في الصورة',
                'Draw a line along an object of known length',
                'Tracez une ligne le long d\'un objet de longueur connue'
              )}
            </p>
            <button
              onClick={onClose}
              className="absolute -top-2 -right-2 p-1 rounded-full bg-background border border-border hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Measurement dialog */}
      {step === 'measure' && (
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border border-border rounded-xl shadow-2xl p-5 w-[340px]"
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">
                  {t('تحديد الطول الحقيقي', 'Set Real Length', 'Définir la Longueur Réelle')}
                </span>
              </div>
              <button onClick={onClose} className="p-1 rounded hover:bg-primary/10 text-muted-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Pixel length info */}
            <div className="bg-secondary/30 rounded-lg p-3 mb-4 text-center">
              <div className="text-[10px] text-muted-foreground mb-0.5">
                {t('طول الخط بالبكسل', 'Line Length in Pixels', 'Longueur de la Ligne en Pixels')}
              </div>
              <div className="text-lg font-bold font-mono text-primary">
                {Math.round(getPixelLength())} px
              </div>
            </div>

            {/* Real-world length input */}
            <div className="space-y-2 mb-4">
              <label className="text-xs font-medium text-foreground">
                {t('الطول الحقيقي', 'Real-World Length', 'Longueur Réelle')}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={realLength}
                  onChange={(e) => setRealLength(e.target.value)}
                  className="flex-1 text-sm px-3 py-2 rounded-lg border border-border bg-secondary/20 text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                  min={0.001}
                  step={0.1}
                  autoFocus
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as 'm' | 'cm' | 'mm')}
                  className="text-sm px-3 py-2 rounded-lg border border-border bg-secondary/20 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="m">{t('متر', 'm', 'm')}</option>
                  <option value="cm">{t('سم', 'cm', 'cm')}</option>
                  <option value="mm">{t('مم', 'mm', 'mm')}</option>
                </select>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleCalibrate}
                className="flex-1 text-xs font-semibold py-2.5 px-4 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                {t('معايرة', 'Calibrate', 'Calibrer')}
              </button>
              <button
                onClick={handleReset}
                className="text-xs font-medium py-2.5 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-border/40 transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" />
                {t('إعادة', 'Redo', 'Refaire')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Done confirmation */}
      {step === 'done' && pixelsPerMeter !== null && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div
            className="bg-background border border-border rounded-xl shadow-2xl p-5 w-[340px] text-center"
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
          >
            <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-green-500" />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-2">
              {t('تمت المعايرة بنجاح!', 'Calibration Complete!', 'Calibration Terminée!')}
            </h3>
            <div className="bg-secondary/30 rounded-lg p-3 mb-4 space-y-1">
              <div className="text-[10px] text-muted-foreground">
                {t('معامل التحويل', 'Conversion Factor', 'Facteur de Conversion')}
              </div>
              <div className="text-base font-bold font-mono text-primary">
                {pixelsPerMeter.toFixed(1)} px/{t('م', 'm', 'm')}
              </div>
              <div className="text-[10px] text-muted-foreground">
                1 px = {(1 / pixelsPerMeter * 100).toFixed(3)} {t('سم', 'cm', 'cm')}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 text-xs font-semibold py-2.5 px-4 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-all"
              >
                {t('تم', 'Done', 'Terminé')}
              </button>
              <button
                onClick={handleReset}
                className="text-xs font-medium py-2.5 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-border/40 transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" />
                {t('إعادة', 'Redo', 'Refaire')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveCalibration;
