import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { GitCompare, Info } from 'lucide-react';
import type { TrajectoryPoint } from '@/utils/physics';

interface TheoreticalVsRealComparisonProps {
  lang: string;
  theoreticalData: Array<{ x: number; y: number; time: number }>;
  realWorldData: TrajectoryPoint[];
  currentTime: number;
  muted: boolean;
}

const TheoreticalVsRealComparison: React.FC<TheoreticalVsRealComparisonProps> = ({
  lang, theoreticalData, realWorldData, currentTime,
}) => {
  const isRTL = lang === 'ar';

  const comparisonData = useMemo(() => {
    if (!theoreticalData.length || !realWorldData.length) return [];

    const maxLen = Math.max(theoreticalData.length, realWorldData.length);
    const data: Array<{ x: number; yTheoretical: number | null; yReal: number | null; time: number }> = [];

    // Normalize x-ranges
    const theoMaxX = Math.max(...theoreticalData.map(p => p.x), 1);
    const realMaxX = Math.max(...realWorldData.map(p => p.x), 1);
    const maxX = Math.max(theoMaxX, realMaxX);

    const steps = Math.min(200, maxLen);
    for (let i = 0; i < steps; i++) {
      const frac = i / (steps - 1);
      const xVal = frac * maxX;

      // Interpolate theoretical
      let yTheo: number | null = null;
      for (let j = 0; j < theoreticalData.length - 1; j++) {
        if (theoreticalData[j].x <= xVal && theoreticalData[j + 1].x >= xVal) {
          const dx = theoreticalData[j + 1].x - theoreticalData[j].x;
          const t = dx > 0 ? (xVal - theoreticalData[j].x) / dx : 0;
          yTheo = theoreticalData[j].y + t * (theoreticalData[j + 1].y - theoreticalData[j].y);
          break;
        }
      }

      // Interpolate real-world
      let yReal: number | null = null;
      for (let j = 0; j < realWorldData.length - 1; j++) {
        if (realWorldData[j].x <= xVal && realWorldData[j + 1].x >= xVal) {
          const dx = realWorldData[j + 1].x - realWorldData[j].x;
          const t = dx > 0 ? (xVal - realWorldData[j].x) / dx : 0;
          yReal = realWorldData[j].y + t * (realWorldData[j + 1].y - realWorldData[j].y);
          break;
        }
      }

      const time = frac * Math.max(
        theoreticalData[theoreticalData.length - 1]?.time ?? 0,
        realWorldData[realWorldData.length - 1]?.time ?? 0,
      );

      if (yTheo !== null || yReal !== null) {
        data.push({
          x: +xVal.toFixed(3),
          yTheoretical: yTheo !== null ? +yTheo.toFixed(3) : null,
          yReal: yReal !== null ? +yReal.toFixed(3) : null,
          time: +time.toFixed(3),
        });
      }
    }

    // Filter to current time
    return data.filter(d => d.time <= currentTime);
  }, [theoreticalData, realWorldData, currentTime]);

  // Calculate deviation statistics
  const stats = useMemo(() => {
    const paired = comparisonData.filter(d => d.yTheoretical !== null && d.yReal !== null);
    if (!paired.length) return null;

    const errors = paired.map(d => Math.abs((d.yTheoretical ?? 0) - (d.yReal ?? 0)));
    const maxError = Math.max(...errors);
    const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
    const rmse = Math.sqrt(errors.reduce((s, e) => s + e * e, 0) / errors.length);

    return { maxError, avgError, rmse };
  }, [comparisonData]);

  const fmtTick = (v: number) => typeof v === 'number' ? (Math.abs(v) >= 1000 ? v.toExponential(1) : v.toFixed(1)) : '';

  const noData = !comparisonData.length;

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-card/70 backdrop-blur-sm shadow-lg" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="px-4 py-2.5 border-b border-border/30 bg-gradient-to-r from-blue-500/5 to-red-500/5">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-blue-500" />
          {lang === 'ar' ? 'المقارنة: المسار النظري مقابل الواقعي' : lang === 'fr' ? 'Comparaison: Th\u00e9orique vs R\u00e9el' : 'Theoretical vs Real-world Path'}
        </h3>
      </div>

      <div className="p-3">
        {/* Legend */}
        <div className="flex items-center gap-4 mb-3 px-2">
          <span className="text-[10px] font-medium text-foreground flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-500 inline-block rounded" />
            {lang === 'ar' ? 'المسار النظري (مثالي)' : lang === 'fr' ? 'Trajectoire Th\u00e9orique' : 'Theoretical (Ideal)'}
          </span>
          <span className="text-[10px] font-medium text-foreground flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-red-500 inline-block rounded" />
            {lang === 'ar' ? 'المسار الواقعي (AI)' : lang === 'fr' ? 'Trajectoire R\u00e9elle (IA)' : 'Real-world (AI)'}
          </span>
        </div>

        {noData ? (
          <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Info className="w-5 h-5" />
            <p className="text-xs">
              {lang === 'ar'
                ? 'قم بتحليل فيديو أولاً لمقارنة المسارات'
                : lang === 'fr'
                ? 'Analysez une vid\u00e9o d\'abord pour comparer les trajectoires'
                : 'Analyze a video first to compare paths'}
            </p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={comparisonData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="x" type="number"
                  tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={fmtTick}
                  label={{ value: lang === 'ar' ? 'المسافة (م)' : 'Distance (m)', position: 'bottom', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={fmtTick} width={40}
                  label={{ value: lang === 'ar' ? 'الارتفاع (م)' : 'Height (m)', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 6,
                    fontSize: 11,
                  }}
                />
                <Legend verticalAlign="top" height={24} iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                <Line
                  type="monotone" dataKey="yTheoretical" stroke="#3b82f6" strokeWidth={2}
                  dot={false} name={lang === 'ar' ? 'نظري' : 'Theoretical'}
                  isAnimationActive={false} connectNulls
                />
                <Line
                  type="monotone" dataKey="yReal" stroke="#ef4444" strokeWidth={2}
                  dot={false} name={lang === 'ar' ? 'واقعي' : 'Real-world'}
                  isAnimationActive={false} connectNulls strokeDasharray="5 3"
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Deviation Statistics */}
            {stats && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-lg bg-secondary/30 border border-border/30">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                    {lang === 'ar' ? 'متوسط الانحراف' : 'Avg Deviation'}
                  </p>
                  <p className="text-sm font-mono font-semibold text-foreground mt-0.5">
                    {stats.avgError.toFixed(3)} <span className="text-[9px] text-muted-foreground">m</span>
                  </p>
                </div>
                <div className="text-center p-2 rounded-lg bg-secondary/30 border border-border/30">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                    {lang === 'ar' ? 'أقصى انحراف' : 'Max Deviation'}
                  </p>
                  <p className="text-sm font-mono font-semibold text-foreground mt-0.5">
                    {stats.maxError.toFixed(3)} <span className="text-[9px] text-muted-foreground">m</span>
                  </p>
                </div>
                <div className="text-center p-2 rounded-lg bg-secondary/30 border border-border/30">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">RMSE</p>
                  <p className="text-sm font-mono font-semibold text-foreground mt-0.5">
                    {stats.rmse.toFixed(3)} <span className="text-[9px] text-muted-foreground">m</span>
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TheoreticalVsRealComparison;
