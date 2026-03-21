import React, { useState, useMemo, useCallback } from 'react';
import { X, Filter, TrendingUp, Activity } from 'lucide-react';
import type { TrajectoryPoint } from '@/utils/physics';

interface NoiseFilterProps {
  open: boolean;
  onClose: () => void;
  lang: string;
  trajectoryData: TrajectoryPoint[];
  onApplyFiltered: (data: TrajectoryPoint[]) => void;
}

type FilterType = 'none' | 'moving-average' | 'kalman';

const NoiseFilter: React.FC<NoiseFilterProps> = ({ open, onClose, lang, trajectoryData, onApplyFiltered }) => {
  const [filterType, setFilterType] = useState<FilterType>('moving-average');
  const [windowSize, setWindowSize] = useState(5);
  const [kalmanQ, setKalmanQ] = useState(0.01); // process noise
  const [kalmanR, setKalmanR] = useState(0.1);  // measurement noise
  const [applied, setApplied] = useState(false);

  const t = (ar: string, en: string, fr: string) =>
    lang === 'ar' ? ar : lang === 'fr' ? fr : en;

  // Moving Average filter
  const applyMovingAverage = useCallback((data: TrajectoryPoint[], w: number): TrajectoryPoint[] => {
    if (data.length < 2) return data;
    const half = Math.floor(w / 2);
    return data.map((pt, i) => {
      const start = Math.max(0, i - half);
      const end = Math.min(data.length - 1, i + half);
      const count = end - start + 1;
      let sumX = 0, sumY = 0, sumVx = 0, sumVy = 0;
      for (let j = start; j <= end; j++) {
        sumX += data[j].x;
        sumY += data[j].y;
        sumVx += data[j].vx;
        sumVy += data[j].vy;
      }
      const avgX = sumX / count;
      const avgY = sumY / count;
      const avgVx = sumVx / count;
      const avgVy = sumVy / count;
      const speed = Math.sqrt(avgVx * avgVx + avgVy * avgVy);
      return {
        ...pt,
        x: Math.round(avgX * 1000) / 1000,
        y: Math.round(avgY * 1000) / 1000,
        vx: Math.round(avgVx * 1000) / 1000,
        vy: Math.round(avgVy * 1000) / 1000,
        speed: Math.round(speed * 1000) / 1000,
        kineticEnergy: Math.round(0.5 * speed * speed * 1000) / 1000,
        potentialEnergy: Math.round(Math.max(0, avgY) * 9.81 * 1000) / 1000,
      };
    });
  }, []);

  // 1D Kalman filter
  const kalman1D = useCallback((values: number[], q: number, r: number): number[] => {
    if (values.length === 0) return [];
    const result: number[] = [];
    let xEst = values[0];
    let pEst = 1;
    for (let i = 0; i < values.length; i++) {
      // Prediction
      const xPred = xEst;
      const pPred = pEst + q;
      // Update
      const K = pPred / (pPred + r);
      xEst = xPred + K * (values[i] - xPred);
      pEst = (1 - K) * pPred;
      result.push(Math.round(xEst * 1000) / 1000);
    }
    return result;
  }, []);

  // Kalman filter on trajectory
  const applyKalmanFilter = useCallback((data: TrajectoryPoint[], q: number, r: number): TrajectoryPoint[] => {
    if (data.length < 2) return data;
    const xs = kalman1D(data.map(p => p.x), q, r);
    const ys = kalman1D(data.map(p => p.y), q, r);
    const vxs = kalman1D(data.map(p => p.vx), q, r);
    const vys = kalman1D(data.map(p => p.vy), q, r);
    return data.map((pt, i) => {
      const speed = Math.sqrt(vxs[i] * vxs[i] + vys[i] * vys[i]);
      return {
        ...pt,
        x: xs[i],
        y: ys[i],
        vx: vxs[i],
        vy: vys[i],
        speed: Math.round(speed * 1000) / 1000,
        kineticEnergy: Math.round(0.5 * speed * speed * 1000) / 1000,
        potentialEnergy: Math.round(Math.max(0, ys[i]) * 9.81 * 1000) / 1000,
      };
    });
  }, [kalman1D]);

  // Preview filtered data
  const filteredData = useMemo(() => {
    if (trajectoryData.length < 2) return trajectoryData;
    if (filterType === 'moving-average') return applyMovingAverage(trajectoryData, windowSize);
    if (filterType === 'kalman') return applyKalmanFilter(trajectoryData, kalmanQ, kalmanR);
    return trajectoryData;
  }, [trajectoryData, filterType, windowSize, kalmanQ, kalmanR, applyMovingAverage, applyKalmanFilter]);

  // Compute noise reduction metric (RMS difference)
  const noiseReduction = useMemo(() => {
    if (filteredData.length < 2 || trajectoryData.length < 2 || filterType === 'none') return 0;
    let sumSq = 0;
    const len = Math.min(filteredData.length, trajectoryData.length);
    for (let i = 0; i < len; i++) {
      const dx = filteredData[i].x - trajectoryData[i].x;
      const dy = filteredData[i].y - trajectoryData[i].y;
      sumSq += dx * dx + dy * dy;
    }
    return Math.sqrt(sumSq / len);
  }, [filteredData, trajectoryData, filterType]);

  // Canvas preview
  const canvasPreview = useMemo(() => {
    if (trajectoryData.length < 2) return null;
    const width = 320;
    const height = 160;
    const padding = 20;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const pt of trajectoryData) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scaleX = (width - 2 * padding) / rangeX;
    const scaleY = (height - 2 * padding) / rangeY;
    const toSvgX = (x: number) => padding + (x - minX) * scaleX;
    const toSvgY = (y: number) => height - padding - (y - minY) * scaleY;

    const originalPath = trajectoryData.map((p, i) =>
      `${i === 0 ? 'M' : 'L'} ${toSvgX(p.x).toFixed(1)} ${toSvgY(p.y).toFixed(1)}`
    ).join(' ');

    const filteredPath = filteredData.map((p, i) =>
      `${i === 0 ? 'M' : 'L'} ${toSvgX(p.x).toFixed(1)} ${toSvgY(p.y).toFixed(1)}`
    ).join(' ');

    return (
      <svg width={width} height={height} className="w-full h-auto rounded-lg border border-border/30 bg-secondary/20">
        {/* Grid */}
        {Array.from({ length: 5 }, (_, i) => {
          const xPos = padding + (i / 4) * (width - 2 * padding);
          const yPos = padding + (i / 4) * (height - 2 * padding);
          return (
            <g key={i}>
              <line x1={xPos} y1={padding} x2={xPos} y2={height - padding} stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.3} />
              <line x1={padding} y1={yPos} x2={width - padding} y2={yPos} stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.3} />
            </g>
          );
        })}
        {/* Original trajectory */}
        <path d={originalPath} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} opacity={0.4} strokeDasharray="3 2" />
        {/* Filtered trajectory */}
        {filterType !== 'none' && (
          <path d={filteredPath} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} opacity={0.9} />
        )}
        {/* Legend */}
        <line x1={10} y1={height - 8} x2={22} y2={height - 8} stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="3 2" opacity={0.4} />
        <text x={25} y={height - 5} fontSize={7} fill="hsl(var(--muted-foreground))" opacity={0.6}>
          {t('الأصلي', 'Original', 'Original')}
        </text>
        {filterType !== 'none' && (
          <>
            <line x1={75} y1={height - 8} x2={87} y2={height - 8} stroke="hsl(var(--primary))" strokeWidth={2} />
            <text x={90} y={height - 5} fontSize={7} fill="hsl(var(--primary))">
              {t('المصفّى', 'Filtered', 'Filtré')}
            </text>
          </>
        )}
      </svg>
    );
  }, [trajectoryData, filteredData, filterType, t]);

  const handleApply = () => {
    if (filterType !== 'none' && filteredData.length > 0) {
      onApplyFiltered(filteredData);
      setApplied(true);
      setTimeout(() => setApplied(false), 2000);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden animate-slideDown"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30 shrink-0">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              {t('تصفية الضوضاء', 'Noise Filtering', 'Filtrage du Bruit')}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Data status */}
          <div className="bg-secondary/20 rounded-lg p-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs text-foreground">
              {trajectoryData.length > 0
                ? t(`${trajectoryData.length} نقطة بيانات متاحة`, `${trajectoryData.length} data points available`, `${trajectoryData.length} points de données disponibles`)
                : t('لا توجد بيانات - أطلق محاكاة أولاً', 'No data - run a simulation first', 'Pas de données - lancez une simulation')}
            </span>
          </div>

          {/* Filter type selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">
              {t('نوع المرشح', 'Filter Type', 'Type de Filtre')}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { key: 'none' as const, label: t('بدون', 'None', 'Aucun') },
                { key: 'moving-average' as const, label: t('متوسط متحرك', 'Moving Avg', 'Moy. Mobile') },
                { key: 'kalman' as const, label: t('كالمان', 'Kalman', 'Kalman') },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilterType(key)}
                  className={`text-[11px] font-medium py-2 px-2 rounded-lg border transition-all duration-200 ${
                    filterType === key
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'text-foreground hover:bg-primary/5 border-border/40'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Filter parameters */}
          {filterType === 'moving-average' && (
            <div className="space-y-2 bg-secondary/10 rounded-lg p-3">
              <label className="text-[11px] font-medium text-foreground flex items-center justify-between">
                <span>{t('حجم النافذة', 'Window Size', 'Taille de Fenêtre')}</span>
                <span className="font-mono text-primary">{windowSize}</span>
              </label>
              <input
                type="range"
                min={3}
                max={21}
                step={2}
                value={windowSize}
                onChange={(e) => setWindowSize(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="text-[9px] text-muted-foreground">
                {t(
                  'قيمة أعلى = تنعيم أقوى لكن فقدان تفاصيل أكثر',
                  'Higher = smoother but more detail loss',
                  'Plus élevé = plus lisse mais perte de détails'
                )}
              </p>
            </div>
          )}

          {filterType === 'kalman' && (
            <div className="space-y-3 bg-secondary/10 rounded-lg p-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground flex items-center justify-between">
                  <span>Q ({t('ضوضاء العملية', 'Process Noise', 'Bruit de Processus')})</span>
                  <span className="font-mono text-primary">{kalmanQ}</span>
                </label>
                <input
                  type="range"
                  min={0.001}
                  max={1}
                  step={0.001}
                  value={kalmanQ}
                  onChange={(e) => setKalmanQ(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground flex items-center justify-between">
                  <span>R ({t('ضوضاء القياس', 'Measurement Noise', 'Bruit de Mesure')})</span>
                  <span className="font-mono text-primary">{kalmanR}</span>
                </label>
                <input
                  type="range"
                  min={0.01}
                  max={5}
                  step={0.01}
                  value={kalmanR}
                  onChange={(e) => setKalmanR(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <p className="text-[9px] text-muted-foreground">
                {t(
                  'Q منخفض + R عالي = تنعيم قوي | Q عالي + R منخفض = متابعة البيانات',
                  'Low Q + High R = strong smoothing | High Q + Low R = follows data closely',
                  'Q bas + R haut = lissage fort | Q haut + R bas = suit les données'
                )}
              </p>
            </div>
          )}

          {/* Preview chart */}
          {trajectoryData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">
                  {t('معاينة', 'Preview', 'Aperçu')}
                </span>
              </div>
              {canvasPreview}

              {filterType !== 'none' && (
                <div className="bg-secondary/20 rounded-lg p-2 text-center">
                  <span className="text-[10px] text-muted-foreground">
                    {t('فرق RMS:', 'RMS Difference:', 'Différence RMS:')}
                  </span>
                  <span className="text-xs font-mono font-bold text-primary mx-1">
                    {noiseReduction.toFixed(4)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 p-3 border-t border-border bg-secondary/10 flex items-center gap-2">
          <button
            onClick={handleApply}
            disabled={filterType === 'none' || trajectoryData.length < 2}
            className={`flex-1 text-xs font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 ${
              applied
                ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            {applied
              ? t('تم التطبيق!', 'Applied!', 'Appliqué!')
              : t('تطبيق المرشح', 'Apply Filter', 'Appliquer le Filtre')}
          </button>
          <button
            onClick={onClose}
            className="text-xs font-medium py-2.5 px-4 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-border/40 transition-all duration-200"
          >
            {t('إغلاق', 'Close', 'Fermer')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoiseFilter;
