import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Ruler, Check, RotateCcw, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface LiveCalibrationProps {
  open: boolean;
  onClose: () => void;
  lang: string;
  onCalibrate: (pixelsPerMeter: number) => void;
  mediaSrc?: string | null;
  onRequestMedia?: () => void;
}

type CalibrationStep = 'upload' | 'draw' | 'measure' | 'done';

const DIAGRAM_UNITS = ['m', 'cm', 'mm'] as const;
type LengthUnit = typeof DIAGRAM_UNITS[number];

const LiveCalibration: React.FC<LiveCalibrationProps> = ({ open, onClose, lang, onCalibrate, mediaSrc, onRequestMedia }) => {
  const [step, setStep] = useState<CalibrationStep>('upload');
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null);
  const [lineEnd, setLineEnd] = useState<{ x: number; y: number } | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [realLength, setRealLength] = useState('1.0');
  const [unit, setUnit] = useState<LengthUnit>('m');
  const [diagramLength, setDiagramLength] = useState('1.0');
  const [diagramUnit, setDiagramUnit] = useState<LengthUnit>('cm');
  const [pixelsPerMeter, setPixelsPerMeter] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const imageUrlRef = useRef<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const drawAreaRef = useRef<HTMLDivElement>(null);

  const t = (ar: string, en: string, fr: string) =>
    lang === 'ar' ? ar : lang === 'fr' ? fr : en;

  // Keep ref in sync with state for cleanup
  useEffect(() => {
    imageUrlRef.current = imageUrl;
  }, [imageUrl]);

  // Revoke blob URL on unmount or when imageUrl changes
  useEffect(() => {
    return () => {
      if (imageUrlRef.current && imageUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrlRef.current);
      }
    };
  }, []);

  // Reset state when opened
  useEffect(() => {
    if (open) {
      // Revoke old blob URL before resetting
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
      setStep(mediaSrc ? 'draw' : 'upload');
      setLineStart(null);
      setLineEnd(null);
      setDrawing(false);
      setRealLength('1.0');
      setUnit('m');
      setDiagramLength('1.0');
      setDiagramUnit('cm');
      setPixelsPerMeter(null);
      setImageUrl(mediaSrc || null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mediaSrc]);

  // Draw the calibration line on canvas
  const drawLine = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !lineStart) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawArea = drawAreaRef.current;
    if (drawArea) {
      canvas.width = drawArea.clientWidth;
      canvas.height = drawArea.clientHeight;
    } else {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
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
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLineStart({ x, y });
    setLineEnd(null);
    setDrawing(true);
  }, [step]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drawing || step !== 'draw') return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
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
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setLineStart({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
    setLineEnd(null);
    setDrawing(true);
  }, [step]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!drawing || step !== 'draw') return;
    const touch = e.touches[0];
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
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

  // Convert length to meters
  const toMeters = (val: number, u: LengthUnit): number => {
    if (u === 'cm') return val / 100;
    if (u === 'mm') return val / 1000;
    return val;
  };

  // Calculate and apply calibration
  const handleCalibrate = useCallback(() => {
    if (!lineStart || !lineEnd) return;
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const pixelLen = Math.sqrt(dx * dx + dy * dy);

    const realVal = parseFloat(realLength) || 1;
    const realMeters = toMeters(realVal, unit);

    const ppm = pixelLen / realMeters;
    setPixelsPerMeter(ppm);
    onCalibrate(ppm);
    setStep('done');
  }, [lineStart, lineEnd, realLength, unit, onCalibrate]);

  const handleReset = () => {
    setStep(imageUrl ? 'draw' : 'upload');
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

  // Calculate scale factor info
  const getScaleInfo = () => {
    const pixelLen = getPixelLength();
    if (pixelLen <= 0) return null;
    const realVal = parseFloat(realLength) || 1;
    const realMeters = toMeters(realVal, unit);
    const diagVal = parseFloat(diagramLength) || 1;
    const diagMeters = toMeters(diagVal, diagramUnit);
    if (realMeters <= 0 || diagMeters <= 0) return null;

    const scaleFactor = diagMeters / realMeters;
    const pxPerMeter = pixelLen / realMeters;
    const cmPerPx = (1 / pxPerMeter) * 100;

    return { scaleFactor, pxPerMeter, cmPerPx };
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]" ref={overlayRef}>
      {/* Upload step - prompt to attach image/video from logs */}
      {step === 'upload' && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div
            className="bg-background border border-border rounded-xl shadow-2xl p-6 w-[420px] max-w-[95vw]"
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">
                  {t('المعايرة', 'Calibration', 'Calibration')}
                </span>
              </div>
              <button onClick={onClose} className="p-1 rounded hover:bg-primary/10 text-muted-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                <ImageIcon className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  {t('أرفق صورة أو فيديو', 'Attach an Image or Video', 'Joindre une Image ou Vidéo')}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t(
                    'أرفق صورة أو فيديو للجسم المراد معايرته ثم ارسم خطاً عليه',
                    'Attach an image or video of the object to calibrate, then draw a line on it',
                    'Joignez une image ou vidéo de l\'objet à calibrer, puis tracez une ligne dessus'
                  )}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    if (mediaSrc) {
                      setImageUrl(mediaSrc);
                      setStep('draw');
                    } else if (onRequestMedia) {
                      onRequestMedia();
                    }
                  }}
                  className="w-full text-xs font-semibold py-3 px-4 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-all flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  {mediaSrc
                    ? t('فتح من السجلات', 'Open from Logs', 'Ouvrir depuis les Logs')
                    : t('فتح سجل الرؤية الذكية', 'Open Smart Vision Log', 'Ouvrir le Journal Vision')}
                </button>
                {!mediaSrc && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <AlertCircle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                    <p className="text-[10px] text-yellow-600 dark:text-yellow-400">
                      {t(
                        'لا يوجد سجل — أرفق صورة أو فيديو من الرؤية الذكية أولاً',
                        'No log available — attach an image or video from Smart Vision first',
                        'Aucun journal — joignez d\'abord une image ou vidéo depuis Vision Intelligente'
                      )}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => { setStep('draw'); }}
                  className="w-full text-xs font-medium py-3 px-4 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-border/40 transition-all flex items-center justify-center gap-2"
                >
                  <Ruler className="w-4 h-4" />
                  {t('بدون صورة', 'Without Image', 'Sans Image')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drawing step - draw line on image or overlay */}
      {step === 'draw' && (
        <div
          ref={drawAreaRef}
          className="absolute inset-0 cursor-crosshair"
          style={{ background: imageUrl ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.3)' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Background image */}
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Calibration"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            />
          )}
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
              {imageUrl
                ? t(
                    'ارسم خطاً على الصورة لتحديد طول معروف',
                    'Draw a line on the image along a known length',
                    'Tracez une ligne sur l\'image le long d\'une longueur connue'
                  )
                : t(
                    'ارسم خطاً على جسم معروف الطول في الصورة',
                    'Draw a line along an object of known length',
                    'Tracez une ligne le long d\'un objet de longueur connue'
                  )
              }
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
        <div className="absolute inset-0" style={{ background: imageUrl ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.3)' }}>
          {/* Background image */}
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Calibration"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            />
          )}
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border border-border rounded-xl shadow-2xl p-5 w-[420px] max-w-[95vw]"
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

            {/* Pixel length info - reduced size */}
            <div className="bg-secondary/30 rounded-lg p-2 mb-3 text-center">
              <div className="text-[10px] text-muted-foreground mb-0.5">
                {t('طول الخط بالبكسل', 'Line Length in Pixels', 'Longueur de la Ligne en Pixels')}
              </div>
              <div className="text-sm font-semibold font-mono text-primary">
                {Math.round(getPixelLength())} px
              </div>
            </div>

            {/* Real-world length input */}
            <div className="space-y-1.5 mb-2">
              <label className="text-[10px] font-medium text-foreground">
                {t('الطول الحقيقي', 'Real Length', 'Longueur Réelle')}
              </label>
              <div className="flex gap-1.5 items-center">
                <input
                  type="number"
                  value={realLength}
                  onChange={(e) => setRealLength(e.target.value)}
                  className="min-w-0 w-full text-xs px-2 py-1.5 rounded-md border border-border bg-secondary/30 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary placeholder:text-muted-foreground/50"
                  style={{ flex: '1 1 0%', minWidth: '80px' }}
                  min={0.001}
                  step={0.1}
                  placeholder="1.0"
                  autoFocus
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as LengthUnit)}
                  className="text-[10px] px-1.5 py-1.5 rounded-md border border-border bg-secondary/30 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 flex-shrink-0 w-12"
                >
                  <option value="m">m</option>
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                </select>
              </div>
            </div>

            {/* Length on Diagram input */}
            <div className="space-y-1.5 mb-2">
              <label className="text-[10px] font-medium text-foreground">
                {t('الطول على المخطط', 'Length on Diagram', 'Longueur sur le Diagramme')}
              </label>
              <div className="flex gap-1.5 items-center">
                <input
                  type="number"
                  value={diagramLength}
                  onChange={(e) => setDiagramLength(e.target.value)}
                  className="min-w-0 w-full text-xs px-2 py-1.5 rounded-md border border-border bg-secondary/30 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary placeholder:text-muted-foreground/50"
                  style={{ flex: '1 1 0%', minWidth: '80px' }}
                  min={0.001}
                  step={0.1}
                  placeholder="1.0"
                />
                <select
                  value={diagramUnit}
                  onChange={(e) => setDiagramUnit(e.target.value as LengthUnit)}
                  className="text-[10px] px-1.5 py-1.5 rounded-md border border-border bg-secondary/30 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 flex-shrink-0 w-12"
                >
                  <option value="m">m</option>
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                </select>
              </div>
            </div>

            {/* Scale factor preview */}
            {realLength && parseFloat(realLength) > 0 && diagramLength && parseFloat(diagramLength) > 0 && lineStart && lineEnd && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5 mb-3 text-center space-y-1">
                {(() => {
                  const info = getScaleInfo();
                  if (!info) return null;
                  const { scaleFactor, cmPerPx } = info;
                  const realVal = parseFloat(realLength) || 1;
                  const diagVal = parseFloat(diagramLength) || 1;
                  const unitLabel = (u: LengthUnit) => t(u === 'm' ? 'متر' : u === 'cm' ? 'سم' : 'مم', u, u);
                  return (
                    <>
                      <div className="text-[10px] text-muted-foreground">
                        {t('معامل المقياس', 'Scale Factor', 'Facteur d\'Échelle')}
                      </div>
                      <div className="text-xs font-bold font-mono text-primary">
                        {realVal} {unitLabel(unit)} → {diagVal} {unitLabel(diagramUnit)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        1:{(1 / scaleFactor).toFixed(1)} | 1 px = {cmPerPx.toFixed(3)} {t('سم', 'cm', 'cm')}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

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
            className="bg-background border border-border rounded-xl shadow-2xl p-5 w-[360px] max-w-[95vw] text-center"
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
          >
            <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-green-500" />
            </div>
            <h3 className="text-sm font-bold text-foreground mb-2">
              {t('تمت المعايرة بنجاح!', 'Calibration Complete!', 'Calibration Terminée!')}
            </h3>
            <div className="bg-secondary/30 rounded-lg p-3 mb-3 space-y-1">
              <div className="text-[10px] text-muted-foreground">
                {t('معامل التحويل', 'Conversion Factor', 'Facteur de Conversion')}
              </div>
              <div className="text-sm font-semibold font-mono text-primary">
                {pixelsPerMeter.toFixed(1)} px/{t('م', 'm', 'm')}
              </div>
              <div className="text-[10px] text-muted-foreground">
                1 px = {(1 / pixelsPerMeter * 100).toFixed(3)} {t('سم', 'cm', 'cm')}
              </div>
            </div>
            {/* Diagram scale summary */}
            {parseFloat(diagramLength) > 0 && parseFloat(realLength) > 0 && (() => {
              const unitLabel = (u: LengthUnit) => t(u === 'm' ? 'متر' : u === 'cm' ? 'سم' : 'مم', u, u);
              return (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5 mb-3 space-y-0.5">
                  <div className="text-[10px] text-muted-foreground">
                    {t('مقياس المخطط', 'Diagram Scale', 'Échelle du Diagramme')}
                  </div>
                  <div className="text-xs font-bold font-mono text-primary">
                    {parseFloat(realLength)} {unitLabel(unit)} = {parseFloat(diagramLength)} {unitLabel(diagramUnit)} {t('على المخطط', 'on diagram', 'sur le diagramme')}
                  </div>
                </div>
              );
            })()}
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
