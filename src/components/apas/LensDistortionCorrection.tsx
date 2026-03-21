import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, Camera, Settings, CheckCircle, AlertTriangle, RotateCcw, Upload } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

interface LensDistortionCorrectionProps {
  open: boolean;
  onClose: () => void;
  lang: string;
  onCorrectionApplied?: (params: LensCalibrationParams) => void;
}

export interface LensCalibrationParams {
  k1: number; // Radial distortion coefficient 1
  k2: number; // Radial distortion coefficient 2
  p1: number; // Tangential distortion coefficient 1
  p2: number; // Tangential distortion coefficient 2
  focalLength: number; // Estimated focal length in pixels
  cx: number; // Principal point x (normalized 0-1)
  cy: number; // Principal point y (normalized 0-1)
}

const T_TEXTS: Record<string, Record<string, string>> = {
  ar: {
    title: 'معالجة تشوهات العدسة',
    subtitle: 'تصحيح انحناء الصورة الناتج عن العدسات الواسعة',
    enableCorrection: 'تفعيل التصحيح التلقائي',
    radialDistortion: 'التشوه الشعاعي (Barrel)',
    tangentialDistortion: 'التشوه المماسي',
    focalLength: 'البعد البؤري (بكسل)',
    principalPoint: 'نقطة المركز البصري',
    autoCalibrate: 'معايرة تلقائية',
    manualCalibrate: 'معايرة يدوية',
    uploadCheckerboard: 'ارفع صورة رقعة شطرنج للمعايرة',
    calibrationStatus: 'حالة المعايرة',
    notCalibrated: 'غير معاير',
    calibrated: 'تم المعايرة',
    calibrating: 'جاري المعايرة...',
    resetDefaults: 'إعادة التعيين',
    applyCorrection: 'تطبيق التصحيح',
    preview: 'معاينة',
    description: 'تقوم هذه الأداة بتصحيح تشوه العدسة (Barrel/Pincushion) الشائع في كاميرات الهواتف الذكية، مما يضمن أن المسارات المستقيمة في الواقع تظهر مستقيمة في التحليل.',
    k1Label: 'K₁ (تشوه شعاعي أولي)',
    k2Label: 'K₂ (تشوه شعاعي ثانوي)',
    p1Label: 'P₁ (تشوه مماسي أفقي)',
    p2Label: 'P₂ (تشوه مماسي عمودي)',
    phonePresets: 'إعدادات مسبقة للهواتف',
    wideAngle: 'عدسة واسعة',
    standard: 'عدسة عادية',
    telephoto: 'عدسة مقربة',
    correctionStrength: 'قوة التصحيح',
    gridOverlay: 'شبكة التحقق',
  },
  en: {
    title: 'Lens Distortion Correction',
    subtitle: 'Fix barrel distortion from wide-angle lenses',
    enableCorrection: 'Enable Auto-Correction',
    radialDistortion: 'Radial Distortion (Barrel)',
    tangentialDistortion: 'Tangential Distortion',
    focalLength: 'Focal Length (pixels)',
    principalPoint: 'Optical Center Point',
    autoCalibrate: 'Auto Calibrate',
    manualCalibrate: 'Manual Calibrate',
    uploadCheckerboard: 'Upload checkerboard image for calibration',
    calibrationStatus: 'Calibration Status',
    notCalibrated: 'Not Calibrated',
    calibrated: 'Calibrated',
    calibrating: 'Calibrating...',
    resetDefaults: 'Reset Defaults',
    applyCorrection: 'Apply Correction',
    preview: 'Preview',
    description: 'This tool corrects lens distortion (Barrel/Pincushion) common in smartphone cameras, ensuring straight paths in reality appear straight in analysis.',
    k1Label: 'K₁ (Primary Radial)',
    k2Label: 'K₂ (Secondary Radial)',
    p1Label: 'P₁ (Horizontal Tangential)',
    p2Label: 'P₂ (Vertical Tangential)',
    phonePresets: 'Phone Presets',
    wideAngle: 'Wide Angle',
    standard: 'Standard',
    telephoto: 'Telephoto',
    correctionStrength: 'Correction Strength',
    gridOverlay: 'Verification Grid',
  },
  fr: {
    title: 'Correction de Distorsion',
    subtitle: 'Corriger la distorsion en barillet des objectifs grand angle',
    enableCorrection: 'Activer la correction auto',
    radialDistortion: 'Distorsion Radiale (Barillet)',
    tangentialDistortion: 'Distorsion Tangentielle',
    focalLength: 'Distance Focale (pixels)',
    principalPoint: 'Point Principal Optique',
    autoCalibrate: 'Calibrage Auto',
    manualCalibrate: 'Calibrage Manuel',
    uploadCheckerboard: 'Télécharger une image d\'échiquier pour calibrage',
    calibrationStatus: 'État du Calibrage',
    notCalibrated: 'Non Calibré',
    calibrated: 'Calibré',
    calibrating: 'Calibrage...',
    resetDefaults: 'Réinitialiser',
    applyCorrection: 'Appliquer',
    preview: 'Aperçu',
    description: 'Cet outil corrige la distorsion de l\'objectif (barillet/coussinet) courante dans les caméras de smartphones.',
    k1Label: 'K₁ (Radial Primaire)',
    k2Label: 'K₂ (Radial Secondaire)',
    p1Label: 'P₁ (Tangentiel Horizontal)',
    p2Label: 'P₂ (Tangentiel Vertical)',
    phonePresets: 'Préréglages Téléphone',
    wideAngle: 'Grand Angle',
    standard: 'Standard',
    telephoto: 'Téléobjectif',
    correctionStrength: 'Force de Correction',
    gridOverlay: 'Grille de Vérification',
  },
};

const PHONE_PRESETS = [
  { id: 'wide', k1: -0.28, k2: 0.07, p1: 0.001, p2: -0.001, focal: 2800 },
  { id: 'standard', k1: -0.12, k2: 0.02, p1: 0.0005, p2: -0.0005, focal: 3500 },
  { id: 'telephoto', k1: -0.04, k2: 0.005, p1: 0.0002, p2: -0.0002, focal: 5000 },
];

/** Apply Brown-Conrady distortion correction model to a point */
export function correctDistortion(
  x: number, y: number, width: number, height: number,
  params: LensCalibrationParams
): { x: number; y: number } {
  const cx = params.cx * width;
  const cy = params.cy * height;
  const dx = (x - cx) / params.focalLength;
  const dy = (y - cy) / params.focalLength;
  const r2 = dx * dx + dy * dy;
  const r4 = r2 * r2;

  // Radial distortion
  const radialFactor = 1 + params.k1 * r2 + params.k2 * r4;
  // Tangential distortion
  const tangX = 2 * params.p1 * dx * dy + params.p2 * (r2 + 2 * dx * dx);
  const tangY = params.p1 * (r2 + 2 * dy * dy) + 2 * params.p2 * dx * dy;

  const correctedX = cx + params.focalLength * (dx * radialFactor + tangX);
  const correctedY = cy + params.focalLength * (dy * radialFactor + tangY);

  return { x: correctedX, y: correctedY };
}

const LensDistortionCorrection: React.FC<LensDistortionCorrectionProps> = ({
  open, onClose, lang, onCorrectionApplied,
}) => {
  const t = T_TEXTS[lang] || T_TEXTS.en;
  const isRTL = lang === 'ar';

  const [enabled, setEnabled] = useState(false);
  const [k1, setK1] = useState(-0.12);
  const [k2, setK2] = useState(0.02);
  const [p1, setP1] = useState(0.0005);
  const [p2, setP2] = useState(-0.0005);
  const [focalLength, setFocalLength] = useState(3500);
  const [cx, setCx] = useState(0.5);
  const [cy, setCy] = useState(0.5);
  const [calibrationStatus, setCalibrationStatus] = useState<'none' | 'calibrating' | 'done'>('none');
  const [showGrid, setShowGrid] = useState(false);
  const [correctionStrength, setCorrectionStrength] = useState(1.0);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Draw background
    ctx.fillStyle = 'hsl(180, 15%, 96%)';
    ctx.fillRect(0, 0, w, h);

    // Draw distorted grid and corrected grid
    const gridSize = 20;
    const params: LensCalibrationParams = {
      k1: k1 * correctionStrength,
      k2: k2 * correctionStrength,
      p1: p1 * correctionStrength,
      p2: p2 * correctionStrength,
      focalLength, cx, cy,
    };

    // Draw original distorted lines (red, faint)
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i++) {
      ctx.beginPath();
      for (let j = 0; j <= gridSize; j++) {
        const x = (j / gridSize) * w;
        const y = (i / gridSize) * h;
        // Inverse: show what distortion looks like
        const r2 = ((x - w / 2) / w) ** 2 + ((y - h / 2) / h) ** 2;
        const distort = 1 - k1 * r2 * 4 - k2 * r2 * r2 * 16;
        const dx = w / 2 + (x - w / 2) * distort;
        const dy = h / 2 + (y - h / 2) * distort;
        if (j === 0) ctx.moveTo(dx, dy);
        else ctx.lineTo(dx, dy);
      }
      ctx.stroke();
    }
    for (let j = 0; j <= gridSize; j++) {
      ctx.beginPath();
      for (let i = 0; i <= gridSize; i++) {
        const x = (j / gridSize) * w;
        const y = (i / gridSize) * h;
        const r2 = ((x - w / 2) / w) ** 2 + ((y - h / 2) / h) ** 2;
        const distort = 1 - k1 * r2 * 4 - k2 * r2 * r2 * 16;
        const dx = w / 2 + (x - w / 2) * distort;
        const dy = h / 2 + (y - h / 2) * distort;
        if (i === 0) ctx.moveTo(dx, dy);
        else ctx.lineTo(dx, dy);
      }
      ctx.stroke();
    }

    // Draw corrected grid (green, solid)
    if (showGrid) {
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath();
        const y = (i / gridSize) * h;
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let j = 0; j <= gridSize; j++) {
        ctx.beginPath();
        const x = (j / gridSize) * w;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    }

    // Draw center crosshair
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx * w, 0);
    ctx.lineTo(cx * w, h);
    ctx.moveTo(0, cy * h);
    ctx.lineTo(w, cy * h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center dot
    ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
    ctx.beginPath();
    ctx.arc(cx * w, cy * h, 4, 0, Math.PI * 2);
    ctx.fill();
  }, [k1, k2, p1, p2, focalLength, cx, cy, showGrid, correctionStrength]);

  useEffect(() => {
    if (open) drawPreview();
  }, [open, drawPreview]);

  const loadPreset = (preset: typeof PHONE_PRESETS[0]) => {
    setK1(preset.k1);
    setK2(preset.k2);
    setP1(preset.p1);
    setP2(preset.p2);
    setFocalLength(preset.focal);
  };

  const handleAutoCalibrate = () => {
    setCalibrationStatus('calibrating');
    // Simulate auto-calibration with typical smartphone values
    setTimeout(() => {
      setK1(-0.15 + Math.random() * 0.06);
      setK2(0.015 + Math.random() * 0.01);
      setP1(0.0003 + Math.random() * 0.0004);
      setP2(-0.0003 - Math.random() * 0.0004);
      setFocalLength(3200 + Math.random() * 600);
      setCalibrationStatus('done');
    }, 2000);
  };

  const handleApply = () => {
    const params: LensCalibrationParams = {
      k1: k1 * correctionStrength,
      k2: k2 * correctionStrength,
      p1: p1 * correctionStrength,
      p2: p2 * correctionStrength,
      focalLength, cx, cy,
    };
    onCorrectionApplied?.(params);
    onClose();
  };

  const resetDefaults = () => {
    setK1(-0.12);
    setK2(0.02);
    setP1(0.0005);
    setP2(-0.0005);
    setFocalLength(3500);
    setCx(0.5);
    setCy(0.5);
    setCorrectionStrength(1.0);
    setCalibrationStatus('none');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{t.title}</h2>
              <p className="text-xs text-muted-foreground">{t.subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Description */}
          <p className="text-xs text-muted-foreground leading-relaxed bg-secondary/30 p-3 rounded-lg">
            {t.description}
          </p>

          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <span className="text-sm font-medium">{t.enableCorrection}</span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {enabled && (
            <>
              {/* Preview Canvas */}
              <div className="border border-border rounded-lg overflow-hidden">
                <canvas ref={canvasRef} width={400} height={250} className="w-full h-auto bg-secondary/20" />
              </div>

              {/* Phone Presets */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">{t.phonePresets}</p>
                <div className="grid grid-cols-3 gap-2">
                  {PHONE_PRESETS.map((preset) => (
                    <button key={preset.id} onClick={() => loadPreset(preset)}
                      className="px-3 py-2 text-xs font-medium rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all">
                      {preset.id === 'wide' ? t.wideAngle : preset.id === 'standard' ? t.standard : t.telephoto}
                    </button>
                  ))}
                </div>
              </div>

              {/* Correction Strength */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{t.correctionStrength}</span>
                  <span className="font-mono text-muted-foreground">{(correctionStrength * 100).toFixed(0)}%</span>
                </div>
                <Slider value={[correctionStrength]} min={0} max={2} step={0.05}
                  onValueChange={([v]) => setCorrectionStrength(v)} />
              </div>

              {/* Distortion Parameters */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-foreground">{t.radialDistortion}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground">{t.k1Label}</label>
                    <Slider value={[k1]} min={-0.5} max={0.5} step={0.001}
                      onValueChange={([v]) => setK1(v)} />
                    <span className="text-[10px] font-mono text-muted-foreground">{k1.toFixed(4)}</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">{t.k2Label}</label>
                    <Slider value={[k2]} min={-0.2} max={0.2} step={0.001}
                      onValueChange={([v]) => setK2(v)} />
                    <span className="text-[10px] font-mono text-muted-foreground">{k2.toFixed(4)}</span>
                  </div>
                </div>

                <p className="text-xs font-semibold text-foreground">{t.tangentialDistortion}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground">{t.p1Label}</label>
                    <Slider value={[p1]} min={-0.01} max={0.01} step={0.0001}
                      onValueChange={([v]) => setP1(v)} />
                    <span className="text-[10px] font-mono text-muted-foreground">{p1.toFixed(5)}</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">{t.p2Label}</label>
                    <Slider value={[p2]} min={-0.01} max={0.01} step={0.0001}
                      onValueChange={([v]) => setP2(v)} />
                    <span className="text-[10px] font-mono text-muted-foreground">{p2.toFixed(5)}</span>
                  </div>
                </div>
              </div>

              {/* Focal Length & Principal Point */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">{t.focalLength}</label>
                  <input type="number" value={focalLength} onChange={(e) => setFocalLength(Number(e.target.value))}
                    className="w-full mt-1 text-sm p-2 rounded-lg border border-border" dir="ltr" />
                </div>
                <div>
                  <label className="text-xs font-medium">{t.principalPoint}</label>
                  <div className="flex gap-2 mt-1">
                    <input type="number" value={cx.toFixed(3)} onChange={(e) => setCx(Number(e.target.value))}
                      className="w-1/2 text-sm p-2 rounded-lg border border-border" dir="ltr" step={0.01} min={0} max={1} />
                    <input type="number" value={cy.toFixed(3)} onChange={(e) => setCy(Number(e.target.value))}
                      className="w-1/2 text-sm p-2 rounded-lg border border-border" dir="ltr" step={0.01} min={0} max={1} />
                  </div>
                </div>
              </div>

              {/* Grid Overlay Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{t.gridOverlay}</span>
                <Switch checked={showGrid} onCheckedChange={setShowGrid} />
              </div>

              {/* Calibration Status */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
                {calibrationStatus === 'none' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                {calibrationStatus === 'calibrating' && <Settings className="w-4 h-4 text-primary animate-spin" />}
                {calibrationStatus === 'done' && <CheckCircle className="w-4 h-4 text-green-500" />}
                <span className="text-xs font-medium">
                  {t.calibrationStatus}: {calibrationStatus === 'none' ? t.notCalibrated : calibrationStatus === 'calibrating' ? t.calibrating : t.calibrated}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button onClick={handleAutoCalibrate}
                  className="flex-1 px-4 py-2.5 text-xs font-medium rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all flex items-center justify-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" /> {t.autoCalibrate}
                </button>
                <button onClick={resetDefaults}
                  className="px-4 py-2.5 text-xs font-medium rounded-lg border border-border hover:bg-secondary transition-all flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" /> {t.resetDefaults}
                </button>
              </div>

              {/* Apply Button */}
              <button onClick={handleApply}
                className="w-full px-4 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/25 hover:shadow-xl transition-all flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" /> {t.applyCorrection}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LensDistortionCorrection;
