import React, { useState, useMemo } from 'react';
import { Columns2, ChevronDown, X } from 'lucide-react';
import { calculateTrajectory, type TrajectoryPoint, type PredictionResult } from '@/utils/physics';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { playUIClick, playSectionToggle } from '@/utils/sound';

interface Props {
  lang: string;
  muted: boolean;
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
  windSpeed: number;
  integrationMethod: 'euler' | 'rk4' | 'ai-apas';
}

type CompareParam = 'airResistance' | 'gravity' | 'angle' | 'velocity' | 'mass' | 'height';

const COMPARE_OPTIONS: { key: CompareParam; labelAr: string; labelEn: string; labelFr: string }[] = [
  { key: 'airResistance', labelAr: 'مع/بدون مقاومة هواء', labelEn: 'With/Without Air Drag', labelFr: 'Avec/Sans traînée' },
  { key: 'gravity', labelAr: 'الأرض vs القمر', labelEn: 'Earth vs Moon', labelFr: 'Terre vs Lune' },
  { key: 'angle', labelAr: '30° vs 60°', labelEn: '30° vs 60°', labelFr: '30° vs 60°' },
  { key: 'velocity', labelAr: 'سرعة منخفضة vs عالية', labelEn: 'Low vs High Velocity', labelFr: 'Vitesse basse vs haute' },
];

export default function SplitScreenComparison({
  lang, muted, velocity, angle, height, gravity, airResistance, mass, windSpeed, integrationMethod,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [compareParam, setCompareParam] = useState<CompareParam>('airResistance');
  const isAr = lang === 'ar';
  const isFr = lang === 'fr';

  const t = (ar: string, en: string, fr?: string) => isAr ? ar : isFr ? (fr || en) : en;

  // Generate two trajectories based on comparison parameter
  const { trajA, trajB, predA, predB, labelA, labelB } = useMemo(() => {
    let paramsA = { velocity, angle, height, gravity, airResistance, mass };
    let paramsB = { ...paramsA };
    let lA = '', lB = '';

    switch (compareParam) {
      case 'airResistance':
        paramsA = { ...paramsA, airResistance: 0 };
        paramsB = { ...paramsB, airResistance: airResistance > 0 ? airResistance : 0.05 };
        lA = t('بدون مقاومة', 'No Drag', 'Sans traînée');
        lB = t('مع مقاومة', 'With Drag', 'Avec traînée');
        break;
      case 'gravity':
        paramsA = { ...paramsA, gravity: 9.81 };
        paramsB = { ...paramsB, gravity: 1.62 };
        lA = t('الأرض (9.81)', 'Earth (9.81)', 'Terre (9,81)');
        lB = t('القمر (1.62)', 'Moon (1.62)', 'Lune (1,62)');
        break;
      case 'angle':
        paramsA = { ...paramsA, angle: 30 };
        paramsB = { ...paramsB, angle: 60 };
        lA = '30°';
        lB = '60°';
        break;
      case 'velocity':
        paramsA = { ...paramsA, velocity: Math.max(10, velocity * 0.5) };
        paramsB = { ...paramsB, velocity: velocity * 1.5 };
        lA = `v=${paramsA.velocity.toFixed(0)} m/s`;
        lB = `v=${paramsB.velocity.toFixed(0)} m/s`;
        break;
      case 'mass':
        paramsA = { ...paramsA, mass: 0.5 };
        paramsB = { ...paramsB, mass: 5 };
        lA = '0.5 kg';
        lB = '5 kg';
        break;
      case 'height':
        paramsA = { ...paramsA, height: 0 };
        paramsB = { ...paramsB, height: 20 };
        lA = 'h=0 m';
        lB = 'h=20 m';
        break;
    }

    const resA = calculateTrajectory(paramsA.velocity, paramsA.angle, paramsA.height, paramsA.gravity, paramsA.airResistance, paramsA.mass, false, 0.6, 5, windSpeed, integrationMethod);
    const resB = calculateTrajectory(paramsB.velocity, paramsB.angle, paramsB.height, paramsB.gravity, paramsB.airResistance, paramsB.mass, false, 0.6, 5, windSpeed, integrationMethod);

    return {
      trajA: resA.points,
      trajB: resB.points,
      predA: resA.prediction,
      predB: resB.prediction,
      labelA: lA,
      labelB: lB,
    };
  }, [compareParam, velocity, angle, height, gravity, airResistance, mass, windSpeed, integrationMethod]);

  // Merge trajectories for recharts
  const chartData = useMemo(() => {
    const maxLen = Math.max(trajA.length, trajB.length);
    const step = Math.max(1, Math.floor(maxLen / 150));
    const data: Array<{ x: number; yA?: number; yB?: number }> = [];

    for (let i = 0; i < trajA.length; i += step) {
      const p = trajA[i];
      data.push({ x: p.x, yA: p.y });
    }
    for (let i = 0; i < trajB.length; i += step) {
      const p = trajB[i];
      const existing = data.find(d => Math.abs(d.x - p.x) < 0.5);
      if (existing) {
        existing.yB = p.y;
      } else {
        data.push({ x: p.x, yB: p.y });
      }
    }
    return data.sort((a, b) => a.x - b.x);
  }, [trajA, trajB]);

  const MetricRow = ({ label, valA, valB, unit }: { label: string; valA: number; valB: number; unit: string }) => (
    <div className="grid grid-cols-3 text-[9px] font-mono gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-blue-400">{valA.toFixed(2)} {unit}</span>
      <span className="text-orange-400">{valB.toFixed(2)} {unit}</span>
    </div>
  );

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
      <button
        onClick={() => { setExpanded(!expanded); playSectionToggle(muted); }}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary/5 transition-all duration-300"
      >
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-tight flex items-center gap-2">
          <Columns2 className="w-3.5 h-3.5 text-primary" />
          {t('مقارنة جنباً إلى جنب', 'Split Comparison', 'Comparaison côte à côte')}
        </h3>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-border space-y-2 pt-2 animate-slideDown">
          {/* Comparison type selector */}
          <div className="flex flex-wrap gap-1">
            {COMPARE_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => { setCompareParam(opt.key); playUIClick(muted); }}
                className={`text-[10px] px-2 py-1 rounded-lg border transition-all duration-200 ${
                  compareParam === opt.key
                    ? 'bg-primary/15 border-primary/40 text-primary font-medium'
                    : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                }`}
              >
                {isAr ? opt.labelAr : isFr ? opt.labelFr : opt.labelEn}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="x" tick={{ fontSize: 9 }} label={{ value: 'x (m)', position: 'insideBottom', offset: -3, fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} label={{ value: 'y (m)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 9 }} />
                <Tooltip
                  contentStyle={{ fontSize: '10px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(value: number, name: string) => [value.toFixed(2) + ' m', name]}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Area type="monotone" dataKey="yA" name={labelA} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} dot={false} connectNulls />
                <Area type="monotone" dataKey="yB" name={labelB} stroke="#f97316" fill="#f97316" fillOpacity={0.15} strokeWidth={2} dot={false} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Metrics comparison */}
          <div className="bg-secondary/30 rounded-lg p-2 space-y-1">
            <div className="grid grid-cols-3 text-[9px] font-semibold gap-1 pb-1 border-b border-border/30">
              <span className="text-muted-foreground">{t('المعيار', 'Metric', 'Métrique')}</span>
              <span className="text-blue-400">{labelA}</span>
              <span className="text-orange-400">{labelB}</span>
            </div>
            <MetricRow label={t('المدى', 'Range', 'Portée')} valA={predA.range} valB={predB.range} unit="m" />
            <MetricRow label={t('أقصى ارتفاع', 'Max H', 'H max')} valA={predA.maxHeight} valB={predB.maxHeight} unit="m" />
            <MetricRow label={t('زمن الطيران', 'Flight T', 'T vol')} valA={predA.timeOfFlight} valB={predB.timeOfFlight} unit="s" />
            <MetricRow label={t('سرعة الاصطدام', 'Impact V', 'V impact')} valA={predA.finalVelocity} valB={predB.finalVelocity} unit="m/s" />
          </div>
        </div>
      )}
    </div>
  );
}
