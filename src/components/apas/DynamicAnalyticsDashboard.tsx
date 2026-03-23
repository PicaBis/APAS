import React, { useMemo } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, TrendingUp, Zap } from 'lucide-react';
import type { TrajectoryPoint } from '@/utils/physics';

interface DynamicAnalyticsDashboardProps {
  lang: string;
  trajectoryData: TrajectoryPoint[];
  currentTime: number;
  mass: number;
  gravity: number;
  observerType?: 'stationary' | 'moving';
  frameVelocity?: number;
}

const DynamicAnalyticsDashboard: React.FC<DynamicAnalyticsDashboardProps> = ({
  lang, trajectoryData, currentTime, mass, gravity,
  observerType = 'stationary', frameVelocity = 0,
}) => {
  const isRTL = lang === 'ar';

  // Filter data up to current animation time
  const visibleData = useMemo(() => {
    if (!trajectoryData.length) return [];
    return trajectoryData.filter(p => p.time <= currentTime);
  }, [trajectoryData, currentTime]);

  // Velocity vs Time data
  const velocityData = useMemo(() => {
    return visibleData.map(p => {
      let vx = p.vx;
      const vy = p.vy;
      // If moving observer, subtract frame velocity from horizontal component
      if (observerType === 'moving' && frameVelocity !== 0) {
        vx = p.vx - frameVelocity;
      }
      return {
        time: +p.time.toFixed(3),
        vx: +vx.toFixed(2),
        vy: +vy.toFixed(2),
        speed: +Math.sqrt(vx * vx + vy * vy).toFixed(2),
      };
    });
  }, [visibleData, observerType, frameVelocity]);

  // Height vs Distance data
  const trajectoryChartData = useMemo(() => {
    return visibleData.map(p => {
      let x = p.x;
      // If moving observer, transform x position
      if (observerType === 'moving' && frameVelocity !== 0) {
        x = p.x - frameVelocity * p.time;
      }
      return {
        x: +x.toFixed(3),
        y: +p.y.toFixed(3),
      };
    });
  }, [visibleData, observerType, frameVelocity]);

  // Energy data
  const energyData = useMemo(() => {
    return visibleData.map(p => {
      let vx = p.vx;
      const vy = p.vy;
      if (observerType === 'moving' && frameVelocity !== 0) {
        vx = p.vx - frameVelocity;
      }
      const speed = Math.sqrt(vx * vx + vy * vy);
      const ke = 0.5 * mass * speed * speed;
      const pe = mass * gravity * Math.max(0, p.y);
      return {
        time: +p.time.toFixed(3),
        KE: +ke.toFixed(2),
        PE: +pe.toFixed(2),
        Total: +(ke + pe).toFixed(2),
      };
    });
  }, [visibleData, mass, gravity, observerType, frameVelocity]);

  const fmtTick = (v: number) => typeof v === 'number' ? (Math.abs(v) >= 1000 ? v.toExponential(1) : v.toFixed(1)) : '';

  const chartStyle = {
    backgroundColor: 'hsl(var(--background))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 6,
    color: 'hsl(var(--foreground))',
    fontSize: 11,
  };

  const noData = !visibleData.length;

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-card/70 backdrop-blur-sm shadow-lg" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="px-4 py-2.5 border-b border-border/30 bg-gradient-to-r from-emerald-500/5 to-blue-500/5">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" />
          {lang === 'ar' ? 'لوحة التحليلات الديناميكية' : lang === 'fr' ? 'Tableau de Bord Analytique' : 'Dynamic Analytics Dashboard'}
          {observerType === 'moving' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-normal">
              {lang === 'ar' ? 'مراقب متحرك' : lang === 'fr' ? 'Observateur Mobile' : 'Moving Observer'}
              {frameVelocity !== 0 && ` (${frameVelocity.toFixed(1)} m/s)`}
            </span>
          )}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3">
        {/* Velocity vs Time */}
        <div className="border border-border/30 rounded-lg p-2.5 bg-background/50">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs font-semibold text-foreground">
              {lang === 'ar' ? 'السرعة / الزمن' : 'v / t'}
            </span>
          </div>
          {noData ? (
            <div className="h-[140px] flex items-center justify-center text-[10px] text-muted-foreground">
              {lang === 'ar' ? 'ابدأ المحاكاة' : 'Start simulation'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={velocityData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={fmtTick} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={fmtTick} width={35} />
                <Tooltip contentStyle={chartStyle} />
                <Line type="monotone" dataKey="vx" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Vx" isAnimationActive={false} />
                <Line type="monotone" dataKey="vy" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Vy" isAnimationActive={false} />
                <Line type="monotone" dataKey="speed" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="|V|" strokeDasharray="4 2" isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
          <div className="flex items-center justify-center gap-3 mt-1">
            <span className="text-[9px] text-muted-foreground flex items-center gap-1"><span className="w-2 h-0.5 bg-blue-500 inline-block" />Vx</span>
            <span className="text-[9px] text-muted-foreground flex items-center gap-1"><span className="w-2 h-0.5 bg-red-500 inline-block" />Vy</span>
            <span className="text-[9px] text-muted-foreground flex items-center gap-1"><span className="w-2 h-0.5 bg-purple-500 inline-block" />|V|</span>
          </div>
        </div>

        {/* Height vs Distance (y/x) */}
        <div className="border border-border/30 rounded-lg p-2.5 bg-background/50">
          <div className="flex items-center gap-1.5 mb-2">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-semibold text-foreground">
              {lang === 'ar' ? 'الارتفاع / المسافة' : 'y / x'}
            </span>
          </div>
          {noData ? (
            <div className="h-[140px] flex items-center justify-center text-[10px] text-muted-foreground">
              {lang === 'ar' ? 'ابدأ المحاكاة' : 'Start simulation'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={trajectoryChartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <defs>
                  <linearGradient id="trajectoryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="x" type="number" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={fmtTick} />
                <YAxis dataKey="y" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={fmtTick} width={35} />
                <Tooltip contentStyle={chartStyle} />
                <Area type="monotone" dataKey="y" stroke="#10b981" strokeWidth={2} fill="url(#trajectoryGrad)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <p className="text-[9px] text-muted-foreground text-center mt-1">
            {lang === 'ar' ? 'المسار القطع مكافئ' : 'Parabolic trajectory'}
          </p>
        </div>

        {/* Mechanical Energy */}
        <div className="border border-border/30 rounded-lg p-2.5 bg-background/50">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-foreground">
              {lang === 'ar' ? 'الطاقة الميكانيكية' : lang === 'fr' ? '\u00c9nergie M\u00e9canique' : 'Mechanical Energy'}
            </span>
          </div>
          {noData ? (
            <div className="h-[140px] flex items-center justify-center text-[10px] text-muted-foreground">
              {lang === 'ar' ? 'ابدأ المحاكاة' : 'Start simulation'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={energyData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <defs>
                  <linearGradient id="keGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="peGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={fmtTick} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={fmtTick} width={35} />
                <Tooltip contentStyle={chartStyle} />
                <Area type="monotone" dataKey="KE" stroke="#f59e0b" strokeWidth={1.5} fill="url(#keGrad)" dot={false} name={lang === 'ar' ? 'حركية' : 'KE'} isAnimationActive={false} />
                <Area type="monotone" dataKey="PE" stroke="#6366f1" strokeWidth={1.5} fill="url(#peGrad)" dot={false} name={lang === 'ar' ? 'كامنة' : 'PE'} isAnimationActive={false} />
                <Line type="monotone" dataKey="Total" stroke="#10b981" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name={lang === 'ar' ? 'كلية' : 'Total'} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <div className="flex items-center justify-center gap-3 mt-1">
            <span className="text-[9px] text-muted-foreground flex items-center gap-1"><span className="w-2 h-0.5 bg-amber-500 inline-block" />{lang === 'ar' ? 'حركية' : 'KE'}</span>
            <span className="text-[9px] text-muted-foreground flex items-center gap-1"><span className="w-2 h-0.5 bg-indigo-500 inline-block" />{lang === 'ar' ? 'كامنة' : 'PE'}</span>
            <span className="text-[9px] text-muted-foreground flex items-center gap-1"><span className="w-2 h-0.5 bg-emerald-500 inline-block" />{lang === 'ar' ? 'كلية' : 'Total'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicAnalyticsDashboard;
