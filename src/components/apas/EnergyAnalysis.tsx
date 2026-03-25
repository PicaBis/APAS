import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { ChevronDown } from 'lucide-react';
import type { TrajectoryPoint } from '@/utils/physics';
import { playSectionToggle } from '@/utils/sound';

interface Props {
  lang: string;
  trajectoryData: TrajectoryPoint[];
  currentTime: number;
  mass: number;
  airResistance: number;
  gravity: number;
  velocity: number;
  angle: number;
  height: number;
  spinRate?: number;
  projectileRadius?: number;
}

export default function EnergyAnalysis({ lang, trajectoryData, currentTime, mass, airResistance, gravity, velocity, angle, height, spinRate = 0, projectileRadius = 0.05 }: Props) {
  const isRTL = lang === 'ar';
  const [isOpen, setIsOpen] = useState(false);

  // Rotational kinetic energy: KE_rot = 0.5 * I * omega^2
  // For a solid sphere: I = (2/5) * m * r^2
  const rotationalKE = spinRate > 0
    ? 0.5 * (2 / 5) * mass * projectileRadius * projectileRadius * spinRate * spinRate
    : 0;

  const energyData = useMemo(() => {
    if (!trajectoryData.length) return [];
    const step = Math.max(1, Math.floor(trajectoryData.length / 150));
    return trajectoryData
      .filter((_, i) => i % step === 0 || i === trajectoryData.length - 1)
      .map(p => {
        if (!p) return null;
        const translationalKE = p.kineticEnergy ?? 0;
        const pe = p.potentialEnergy ?? 0;
        const totalKE = translationalKE + rotationalKE;
        return {
          time: Number((p.time ?? 0).toFixed(3)),
          KE: Number(totalKE.toFixed(2)),
          PE: Number(pe.toFixed(2)),
          Total: Number((totalKE + pe).toFixed(2)),
          ...(rotationalKE > 0 ? { RotKE: Number(rotationalKE.toFixed(2)) } : {}),
        };
      }).filter((d): d is NonNullable<typeof d> => d != null);
  }, [trajectoryData, rotationalKE]);

  const analysis = useMemo(() => {
    if (!trajectoryData.length) return null;
    const idx = trajectoryData.findIndex(p => p.time >= currentTime);
    const pt = idx >= 0 ? trajectoryData[idx] : trajectoryData[trajectoryData.length - 1];
    const first = trajectoryData[0];
    const last = trajectoryData[trajectoryData.length - 1];

    const totalInitial = (first.kineticEnergy ?? 0) + (first.potentialEnergy ?? 0) + rotationalKE;
    const totalCurrent = (pt.kineticEnergy ?? 0) + (pt.potentialEnergy ?? 0) + rotationalKE;
    const totalFinal = (last.kineticEnergy ?? 0) + (last.potentialEnergy ?? 0) + rotationalKE;
    const loss = Math.max(0, totalInitial - totalCurrent);
    const totalLoss = Math.max(0, totalInitial - totalFinal);

    // Find peak point (max PE)
    const peakPt = trajectoryData.reduce((a, b) => (b.potentialEnergy ?? 0) > (a.potentialEnergy ?? 0) ? b : a, trajectoryData[0]);

    // Energy efficiency: KE at end / KE at start
    const efficiency = (first.kineticEnergy ?? 0) > 0 ? ((last.kineticEnergy ?? 0) / (first.kineticEnergy ?? 1)) * 100 : 100;

    // KE to PE conversion at peak
    const keTopeConversion = totalInitial > 0 ? ((peakPt.potentialEnergy ?? 0) / totalInitial) * 100 : 0;

    // Current percentages
    const kePercent = totalCurrent > 0 ? ((pt.kineticEnergy ?? 0) / totalCurrent) * 100 : 0;
    const pePercent = totalCurrent > 0 ? ((pt.potentialEnergy ?? 0) / totalCurrent) * 100 : 0;

    return {
      ke: pt.kineticEnergy ?? 0,
      pe: pt.potentialEnergy ?? 0,
      total: totalCurrent,
      totalInitial,
      loss,
      totalLoss,
      efficiency: Math.min(100, efficiency),
      keTopeConversion,
      kePercent,
      pePercent,
      peakPE: peakPt.potentialEnergy ?? 0,
      peakHeight: peakPt.y ?? 0,
      impactKE: last.kineticEnergy ?? 0,
      impactSpeed: last.speed ?? 0,
    };
  }, [trajectoryData, currentTime, rotationalKE]);

  if (!energyData.length || !analysis) return null;

  const t = (ar: string, fr: string, en: string) =>
    lang === 'ar' ? ar : lang === 'fr' ? fr : en;

  const labels = {
    ke: t('الطاقة الحركية', 'Énergie Cinétique', 'Kinetic Energy'),
    pe: t('طاقة الوضع', 'Énergie Potentielle', 'Potential Energy'),
    total: t('الطاقة الكلية', 'Énergie Totale', 'Total Energy'),
    loss: t('الطاقة المفقودة', 'Perte d\'Énergie', 'Energy Loss'),
    title: t('⚡ تحليل الطاقة', '⚡ Analyse d\'Énergie', '⚡ Energy Analysis'),
    unit: 'J',
  };

  return (
    <div className="border border-border/40 rounded-xl overflow-hidden bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-border/60" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Collapsible Header */}
      <button
        onClick={() => { setIsOpen(!isOpen); playSectionToggle(false); }}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary/5 transition-all duration-300 group"
      >
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          {labels.title}
        </h3>
        <div className="flex items-center gap-2">
          {!isOpen && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono animate-slideDown">
              <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400">KE</span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">PE</span>
              <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">
                {t('الكلية', 'Totale', 'Total')}
              </span>
            </span>
          )}
          <div className="w-6 h-6 rounded-md bg-secondary/50 flex items-center justify-center group-hover:bg-primary/10 transition-all duration-300">
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/30 animate-slideDown pt-3">
          {/* Graph */}
          <div className="bg-background rounded-lg border border-border p-2">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={energyData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="keGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="peGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="time"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  label={{ value: 't (s)', position: 'insideBottomRight', offset: -5, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  width={50}
                  tickFormatter={(v: number) => v != null && typeof v === 'number' && !isNaN(v) ? (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)) : '0'}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 6,
                    fontSize: 11,
                    color: 'hsl(var(--foreground))',
                  }}
                  formatter={(value: number, name: string) => {
                    const label = name === 'KE' ? labels.ke : name === 'PE' ? labels.pe : labels.total;
                    return [`${value != null && typeof value === 'number' && !isNaN(value) ? value.toFixed(1) : '0'} J`, label];
                  }}
                />
                <Legend
                  formatter={(value: string) =>
                    value === 'KE' ? labels.ke : value === 'PE' ? labels.pe : labels.total
                  }
                  wrapperStyle={{ fontSize: 11 }}
                />
                {/* Current time indicator */}
                <ReferenceLine x={Number((currentTime ?? 0).toFixed(3))} stroke="hsl(var(--foreground))" strokeDasharray="3 3" strokeWidth={1} />
                <Area type="monotone" dataKey="KE" stroke="#ef4444" strokeWidth={2} fill="url(#keGrad)" dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="PE" stroke="#3b82f6" strokeWidth={2} fill="url(#peGrad)" dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="Total" stroke="#22c55e" strokeWidth={1.5} strokeDasharray="5 3" fill="url(#totalGrad)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Current Energy Values */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <InfoCard color="#ef4444" label={labels.ke} value={analysis.ke} unit={labels.unit} percent={analysis.kePercent} />
            <InfoCard color="#3b82f6" label={labels.pe} value={analysis.pe} unit={labels.unit} percent={analysis.pePercent} />
            <InfoCard color="#22c55e" label={labels.total} value={analysis.total} unit={labels.unit} />
            {airResistance > 0 && (
              <InfoCard color="#f59e0b" label={labels.loss} value={analysis.loss} unit={labels.unit} />
            )}
          </div>

          {/* Energy Bar */}
          <div className="bg-secondary/30 rounded-lg p-3 border border-border/30">
            <p className="text-xs text-muted-foreground mb-2 font-medium">
              {t('توزيع الطاقة الحالي', 'Distribution actuelle', 'Current Energy Distribution')}
            </p>
            <div className="h-3 rounded-full overflow-hidden flex bg-secondary">
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${analysis.kePercent}%`, backgroundColor: '#ef4444' }}
              />
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${analysis.pePercent}%`, backgroundColor: '#3b82f6' }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{labels.ke}: {analysis.kePercent.toFixed(1)}%</span>
              <span>{labels.pe}: {analysis.pePercent.toFixed(1)}%</span>
            </div>
          </div>

          {/* Detailed Analysis */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <DetailCard
              icon="🔋"
              label={t('الطاقة الابتدائية', 'Énergie Initiale', 'Initial Energy')}
              value={`${fmtE(analysis.totalInitial)} J`}
            />
            <DetailCard
              icon="⛰️"
              label={t('أقصى طاقة وضع', 'PE Max', 'Peak PE')}
              value={`${fmtE(analysis.peakPE)} J`}
              sub={`h = ${analysis.peakHeight.toFixed(1)} m`}
            />
            <DetailCard
              icon="💥"
              label={t('طاقة الاصطدام', 'KE d\'Impact', 'Impact KE')}
              value={`${fmtE(analysis.impactKE)} J`}
              sub={`v = ${analysis.impactSpeed.toFixed(1)} m/s`}
            />
            <DetailCard
              icon="🔄"
              label={t('تحويل KE → PE', 'Conversion KE→PE', 'KE→PE Conversion')}
              value={`${analysis.keTopeConversion.toFixed(1)}%`}
              sub={t('عند الذروة', 'Au sommet', 'At peak')}
            />
            <DetailCard
              icon="📊"
              label={t('كفاءة الطاقة', 'Efficacité', 'Energy Efficiency')}
              value={`${analysis.efficiency.toFixed(1)}%`}
              sub={airResistance > 0 ? t('مع مقاومة الهواء', 'Avec traînée', 'With drag') : t('بدون مقاومة', 'Sans traînée', 'No drag')}
            />
            {airResistance > 0 && (
              <DetailCard
                icon="🌬️"
                label={t('إجمالي المفقود', 'Perte Totale', 'Total Loss')}
                value={`${fmtE(analysis.totalLoss)} J`}
                sub={`${analysis.totalInitial > 0 ? ((analysis.totalLoss / analysis.totalInitial) * 100).toFixed(1) : 0}%`}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function fmtE(v: number): string {
  if (v == null || typeof v !== 'number' || isNaN(v)) return '0';
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(2)}k`;
  return v.toFixed(1);
}

function InfoCard({ color, label, value, unit, percent }: { color: string; label: string; value: number; unit: string; percent?: number }) {
  return (
    <div className="bg-secondary/30 rounded-lg p-3.5 text-center border border-border/30">
      <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ backgroundColor: color }} />
      <div className="text-xs text-muted-foreground mb-1 font-medium leading-tight">{label}</div>
      <div className="text-base font-bold font-mono text-foreground">{fmtE(value)}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{unit}</div>
      {percent !== undefined && (
        <div className="text-xs font-mono text-muted-foreground mt-0.5">{percent.toFixed(1)}%</div>
      )}
    </div>
  );
}

function DetailCard({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-background/60 rounded-lg p-3 text-center border border-border/30">
      <div className="text-sm mb-1">{icon}</div>
      <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
      <div className="text-sm font-bold font-mono text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
