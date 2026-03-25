import React, { useState, useMemo } from 'react';
import { X, Wind, Compass, Globe2, Brain, Calculator, ArrowRight, ChevronLeft, Sparkles, TrendingUp, Clock, Ruler } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { calculateTrajectory, type TrajectoryPoint } from '@/utils/physics';

interface MultiSimulationModalProps {
  open: boolean;
  onClose: () => void;
  lang: string;
  // Current simulation parameters
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
  windSpeed: number;
  enableBounce: boolean;
  bounceCoefficient: number;
  selectedIntegrationMethod: 'euler' | 'rk4' | 'ai-apas';
  hasExperimentalData: boolean;
  experimentalTrajectory?: Array<{ x: number; y: number }>;
  trajectoryData: TrajectoryPoint[];
}

type SimMode = null | 'vacuum-vs-air' | 'multi-angle' | 'multi-env' | 'ai-vs-exp' | 'numerical-methods';

interface ChartDataRow {
  x: number;
  [key: string]: number | undefined;
}

interface StatData {
  range: number;
  maxH: number;
  time: number;
}

interface TrajectoryInfo {
  angle?: number;
  env?: (typeof ENVIRONMENTS)[number];
  points: { x: number; y: number }[];
  prediction: { range: number; maxHeight: number; timeOfFlight: number };
  color: string;
}

const ENVIRONMENTS = [
  { name: { ar: 'الأرض', en: 'Earth', fr: 'Terre' }, gravity: 9.81, emoji: '🌍' },
  { name: { ar: 'القمر', en: 'Moon', fr: 'Lune' }, gravity: 1.62, emoji: '🌙' },
  { name: { ar: 'المريخ', en: 'Mars', fr: 'Mars' }, gravity: 3.71, emoji: '🔴' },
  { name: { ar: 'المشتري', en: 'Jupiter', fr: 'Jupiter' }, gravity: 24.79, emoji: '🟤' },
  { name: { ar: 'الزهرة', en: 'Venus', fr: 'Vénus' }, gravity: 8.87, emoji: '🟡' },
];

const COLORS = ['#ef4444', '#c9a84c', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#4a6fa5'];

export default function MultiSimulationModal({
  open, onClose, lang, velocity, angle, height, gravity, airResistance, mass,
  windSpeed, enableBounce, bounceCoefficient, selectedIntegrationMethod,
  hasExperimentalData, experimentalTrajectory, trajectoryData,
}: MultiSimulationModalProps) {
  const [activeMode, setActiveMode] = useState<SimMode>(null);
  const [customAngles, setCustomAngles] = useState<number[]>([15, 30, 45, 60, 75]);

  const t = (ar: string, en: string, fr?: string) => lang === 'ar' ? ar : lang === 'fr' ? (fr || en) : en;

  // Generate comparison data based on active mode
  const comparisonData = useMemo(() => {
    if (!activeMode) return null;

    if (activeMode === 'vacuum-vs-air') {
      const withAir = calculateTrajectory(velocity, angle, height, gravity, airResistance, mass, enableBounce, bounceCoefficient, 5, windSpeed, selectedIntegrationMethod);
      const noAir = calculateTrajectory(velocity, angle, height, gravity, 0, mass, false, 0.6, 5, 0, selectedIntegrationMethod);
      // Merge into chart data
      const maxLen = Math.max(withAir.points.length, noAir.points.length);
      const data: ChartDataRow[] = [];
      for (let i = 0; i < maxLen; i += Math.max(1, Math.floor(maxLen / 200))) {
        const pAir = withAir.points[Math.min(i, withAir.points.length - 1)];
        const pVac = noAir.points[Math.min(i, noAir.points.length - 1)];
        data.push({ x: pVac?.x ?? pAir?.x, yVacuum: pVac?.y, yAir: pAir?.y });
      }
      return {
        type: 'vacuum-vs-air' as const,
        chartData: data,
        series: [
          { key: 'yVacuum', name: t('بدون مقاومة هواء', 'Vacuum (No Air)'), color: '#22c55e' },
          { key: 'yAir', name: t('مع مقاومة الهواء', 'With Air Resistance'), color: '#ef4444' },
        ],
        stats: {
          vacuum: { range: noAir.prediction.range, maxH: noAir.prediction.maxHeight, time: noAir.prediction.timeOfFlight },
          air: { range: withAir.prediction.range, maxH: withAir.prediction.maxHeight, time: withAir.prediction.timeOfFlight },
        }
      };
    }

    if (activeMode === 'multi-angle') {
      const trajectories = customAngles.map((a, i) => {
        const result = calculateTrajectory(velocity, a, height, gravity, airResistance, mass, enableBounce, bounceCoefficient, 5, windSpeed, selectedIntegrationMethod);
        return { angle: a, points: result.points, prediction: result.prediction, color: COLORS[i % COLORS.length] };
      });
      // Merge all into one dataset by x position
      const allPoints: ChartDataRow[] = [];
      const step = 0.5;
      const maxX = Math.max(...trajectories.map(t => t.prediction.range));
      for (let x = 0; x <= maxX; x += step) {
        const row: ChartDataRow = { x: +x.toFixed(1) };
        trajectories.forEach((tr, i) => {
          const closest = tr.points.reduce((prev, curr) => Math.abs(curr.x - x) < Math.abs(prev.x - x) ? curr : prev);
          if (Math.abs(closest.x - x) < step * 2) {
            row[`y_${tr.angle}`] = closest.y;
          }
        });
        allPoints.push(row);
      }
      return {
        type: 'multi-angle' as const,
        chartData: allPoints,
        series: trajectories.map((tr, i) => ({
          key: `y_${tr.angle}`,
          name: `${tr.angle}°`,
          color: tr.color,
        })),
        trajectories,
      };
    }

    if (activeMode === 'multi-env') {
      const trajectories = ENVIRONMENTS.map((env, i) => {
        const result = calculateTrajectory(velocity, angle, height, env.gravity, airResistance > 0 ? airResistance : 0, mass, false, 0.6, 5, 0, selectedIntegrationMethod);
        return { env, points: result.points, prediction: result.prediction, color: COLORS[i % COLORS.length] };
      });
      const allPoints: ChartDataRow[] = [];
      const step = 0.5;
      const maxX = Math.max(...trajectories.map(t => t.prediction.range));
      for (let x = 0; x <= maxX; x += step) {
        const row: ChartDataRow = { x: +x.toFixed(1) };
        trajectories.forEach((tr) => {
          const envKey = tr.env.name.en.toLowerCase();
          const closest = tr.points.reduce((prev, curr) => Math.abs(curr.x - x) < Math.abs(prev.x - x) ? curr : prev);
          if (Math.abs(closest.x - x) < step * 2) {
            row[`y_${envKey}`] = closest.y;
          }
        });
        allPoints.push(row);
      }
      return {
        type: 'multi-env' as const,
        chartData: allPoints,
        series: trajectories.map((tr) => ({
          key: `y_${tr.env.name.en.toLowerCase()}`,
          name: `${tr.env.emoji} ${tr.env.name[lang as 'ar' | 'en' | 'fr'] || tr.env.name.en}`,
          color: tr.color,
        })),
        trajectories,
      };
    }

    if (activeMode === 'ai-vs-exp') {
      const aiResult = calculateTrajectory(velocity, angle, height, gravity, airResistance, mass, enableBounce, bounceCoefficient, 5, windSpeed, 'ai-apas');
      const data: ChartDataRow[] = [];
      const step = Math.max(1, Math.floor(aiResult.points.length / 200));
      for (let i = 0; i < aiResult.points.length; i += step) {
        const p = aiResult.points[i];
        const row: ChartDataRow = { x: +p.x.toFixed(2), yAI: p.y };
        // Find closest experimental point
        if (experimentalTrajectory && experimentalTrajectory.length > 0) {
          const closest = experimentalTrajectory.reduce((prev, curr) => Math.abs(curr.x - p.x) < Math.abs(prev.x - p.x) ? curr : prev);
          if (Math.abs(closest.x - p.x) < 2) {
            row.yExp = closest.y;
          }
        }
        data.push(row);
      }
      return {
        type: 'ai-vs-exp' as const,
        chartData: data,
        series: [
          { key: 'yAI', name: t('تنبؤ AI APAS', 'AI APAS Prediction'), color: '#a855f7' },
          { key: 'yExp', name: t('المسار التجريبي', 'Experimental Trajectory'), color: '#f59e0b' },
        ],
      };
    }

    if (activeMode === 'numerical-methods') {
      const euler = calculateTrajectory(velocity, angle, height, gravity, airResistance, mass, enableBounce, bounceCoefficient, 5, windSpeed, 'euler');
      const rk4 = calculateTrajectory(velocity, angle, height, gravity, airResistance, mass, enableBounce, bounceCoefficient, 5, windSpeed, 'rk4');
      const aiApas = calculateTrajectory(velocity, angle, height, gravity, airResistance, mass, enableBounce, bounceCoefficient, 5, windSpeed, 'ai-apas');
      const maxLen = Math.max(euler.points.length, rk4.points.length, aiApas.points.length);
      const data: ChartDataRow[] = [];
      for (let i = 0; i < maxLen; i += Math.max(1, Math.floor(maxLen / 200))) {
        const pE = euler.points[Math.min(i, euler.points.length - 1)];
        const pR = rk4.points[Math.min(i, rk4.points.length - 1)];
        const pA = aiApas.points[Math.min(i, aiApas.points.length - 1)];
        data.push({
          x: pA?.x ?? pR?.x ?? pE?.x,
          yEuler: pE?.y,
          yRK4: pR?.y,
          yAIAPAS: pA?.y,
        });
      }
      return {
        type: 'numerical-methods' as const,
        chartData: data,
        series: [
          { key: 'yEuler', name: 'Euler', color: '#3b82f6' },
          { key: 'yRK4', name: 'RK4', color: '#22c55e' },
          { key: 'yAIAPAS', name: 'AI APAS', color: '#a855f7' },
        ],
        stats: {
          euler: { range: euler.prediction.range, maxH: euler.prediction.maxHeight, time: euler.prediction.timeOfFlight },
          rk4: { range: rk4.prediction.range, maxH: rk4.prediction.maxHeight, time: rk4.prediction.timeOfFlight },
          aiApas: { range: aiApas.prediction.range, maxH: aiApas.prediction.maxHeight, time: aiApas.prediction.timeOfFlight },
        }
      };
    }

    return null;
  }, [activeMode, velocity, angle, height, gravity, airResistance, mass, windSpeed, enableBounce, bounceCoefficient, selectedIntegrationMethod, customAngles, experimentalTrajectory, lang]);

  if (!open) return null;

  const buttons: Array<{
    id: SimMode;
    icon: React.ReactNode;
    label: string;
    description: string;
    disabled?: boolean;
    disabledReason?: string;
  }> = [
    {
      id: 'vacuum-vs-air',
      icon: <Wind className="w-5 h-5" />,
      label: t('مقارنة المسارات (فراغ / مقاومة هواء)', 'Compare Trajectories (Vacuum vs Air Resistance)', 'Comparer les Trajectoires (Vide vs Résistance)'),
      description: t(
        'عرض مسارين متزامنين: أحدهما بدون مقاومة هواء والآخر مع مقاومة الهواء لمشاهدة تأثير السحب الديناميكي الهوائي',
        'Display two simultaneous trajectories to observe the effect of aerodynamic drag on projectile motion',
        'Afficher deux trajectoires simultanées pour observer l\'effet de la traînée aérodynamique'
      ),
    },
    {
      id: 'multi-angle',
      icon: <Compass className="w-5 h-5" />,
      label: t('مقارنة زوايا الإطلاق المتعددة', 'Multiple Launch Angles Comparison', 'Comparaison d\'Angles de Lancement'),
      description: t(
        'عرض خمسة مسارات بزوايا إطلاق مختلفة لمقارنة تأثير الزاوية على المدى والارتفاع',
        'Display five trajectories with different launch angles to compare range and height effects',
        'Afficher cinq trajectoires avec différents angles de tir'
      ),
    },
    {
      id: 'multi-env',
      icon: <Globe2 className="w-5 h-5" />,
      label: t('مقارنة المسارات حسب البيئة', 'Environment-Based Trajectory Comparison', 'Comparaison par Environnement'),
      description: t(
        'عرض نفس المقذوف في بيئات جاذبية مختلفة: الأرض، القمر، المريخ، المشتري، الزهرة',
        'Simulate the same projectile across different gravitational fields: Earth, Moon, Mars, Jupiter, Venus',
        'Simuler le même projectile dans différents champs gravitationnels'
      ),
    },
    {
      id: 'ai-vs-exp',
      icon: <Brain className="w-5 h-5" />,
      label: t('تنبؤ AI مقابل المسار التجريبي', 'AI Prediction vs Experimental Trajectory', 'Prédiction IA vs Trajectoire Expérimentale'),
      description: hasExperimentalData
        ? t(
            'مقارنة المسار المتنبأ به من نموذج AI APAS مع البيانات التجريبية المدخلة',
            'Compare AI APAS predicted trajectory against your entered experimental data',
            'Comparer la trajectoire prédite par l\'IA avec les données expérimentales'
          )
        : t(
            '⚠️ يجب أولاً إدخال القيم التجريبية في قسم "القيم التجريبية 🧪" ثم الضغط على "تحليل"',
            '⚠️ You must first enter experimental values in the "🧪 Experimental Values" section and press "Analyze"',
            '⚠️ Vous devez d\'abord entrer les valeurs expérimentales et appuyer sur "Analyser"'
          ),
      disabled: !hasExperimentalData,
    },
    {
      id: 'numerical-methods',
      icon: <Calculator className="w-5 h-5" />,
      label: t('مقارنة الطرق العددية', 'Numerical Method Comparison', 'Comparaison des Méthodes Numériques'),
      description: t(
        'عرض نتائج المحاكاة باستخدام ثلاث طرق: أويلر، رونج-كوتا RK4، وطريقة AI APAS',
        'Display trajectory results using three numerical methods: Euler, RK4, and AI APAS',
        'Afficher les résultats avec trois méthodes numériques: Euler, RK4, et AI APAS'
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="relative w-[95vw] max-w-5xl max-h-[90vh] bg-background border border-border/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent overflow-hidden">
          <div className="absolute top-0 end-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  {t('لوحة المحاكاة المتعددة', 'Multi-Simulation Panel', 'Panneau Multi-Simulation')}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                  {t(
                    'تشغيل محاكاات متعددة مع الحفاظ على معاملات النمذجة الحالية',
                    'Run multiple simulations preserving current parameters',
                    'Exécuter plusieurs simulations en préservant les paramètres actuels'
                  )}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary/80 transition-all duration-200 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {!activeMode ? (
            /* Mode Selection Grid */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {buttons.map((btn, i) => {
                  const gradients = [
                    'from-emerald-500/10 to-emerald-500/5',
                    'from-blue-500/10 to-blue-500/5',
                    'from-orange-500/10 to-orange-500/5',
                    'from-purple-500/10 to-purple-500/5',
                    'from-cyan-500/10 to-cyan-500/5',
                  ];
                  const iconColors = [
                    'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                    'bg-blue-500/15 text-blue-600 dark:text-blue-400',
                    'bg-orange-500/15 text-orange-600 dark:text-orange-400',
                    'bg-purple-500/15 text-purple-600 dark:text-purple-400',
                    'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
                  ];
                  const borderColors = [
                    'hover:border-emerald-500/30',
                    'hover:border-blue-500/30',
                    'hover:border-orange-500/30',
                    'hover:border-purple-500/30',
                    'hover:border-cyan-500/30',
                  ];
                  return (
                    <button
                      key={btn.id}
                      disabled={btn.disabled}
                      onClick={() => setActiveMode(btn.id)}
                      className={`group text-start p-4 rounded-xl border transition-all duration-300 ${
                        btn.disabled
                          ? 'border-border/30 bg-secondary/10 opacity-50 cursor-not-allowed'
                          : `border-border/50 ${borderColors[i]} bg-gradient-to-br ${gradients[i]} hover:shadow-lg hover:scale-[1.01] cursor-pointer`
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl shrink-0 transition-all duration-300 ${btn.disabled ? 'bg-secondary/50 text-muted-foreground' : iconColors[i] + ' group-hover:scale-110'}`}>
                          {btn.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">{btn.label}</p>
                            {!btn.disabled && (
                              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{btn.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Results View */
            <div className="space-y-4">
              {/* Back button & Mode title */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveMode(null)}
                  className="p-2 rounded-xl hover:bg-secondary/80 transition-all duration-200 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className={`w-5 h-5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                </button>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {buttons.find(b => b.id === activeMode)?.label}
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {t('اضغط للعودة إلى القائمة', 'Click to return to menu', 'Cliquez pour revenir au menu')}
                  </p>
                </div>
              </div>

              {/* Angle inputs for multi-angle mode */}
              {activeMode === 'multi-angle' && (
                <div className="flex flex-wrap items-center gap-2.5 p-3.5 bg-gradient-to-r from-blue-500/5 to-transparent rounded-xl border border-blue-500/20">
                  <span className="text-xs text-foreground font-semibold">
                    {t('زوايا الإطلاق:', 'Launch Angles:', 'Angles de Lancement:')}
                  </span>
                  {customAngles.map((a, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <input
                        type="number"
                        value={a}
                        min={0}
                        max={90}
                        onChange={(e) => {
                          const newAngles = [...customAngles];
                          newAngles[i] = Number(e.target.value);
                          setCustomAngles(newAngles);
                        }}
                        className="w-14 text-xs text-center font-mono py-1.5 rounded-lg border border-border/60 bg-background/80 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                        dir="ltr"
                      />
                      <span className="text-xs text-muted-foreground">°</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Chart */}
              {comparisonData && (
                <div className="bg-gradient-to-b from-secondary/10 to-secondary/5 rounded-xl border border-border/50 p-4 shadow-sm">
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={comparisonData.chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                      <defs>
                        {comparisonData.series.map((s) => (
                          <linearGradient key={s.key} id={`grad_${s.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={s.color} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis
                        dataKey="x"
                        type="number"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        label={{ value: 'X (m)', position: 'insideBottom', offset: -10, fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        label={{ value: 'Y (m)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        width={50}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 10,
                          color: 'hsl(var(--foreground))',
                          fontSize: 11,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      {comparisonData.series.map((s) => (
                        <Area
                          key={s.key}
                          type="monotone"
                          dataKey={s.key}
                          name={s.name}
                          stroke={s.color}
                          strokeWidth={2.5}
                          fill={`url(#grad_${s.key})`}
                          dot={false}
                          isAnimationActive={false}
                          connectNulls
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Stats panels */}
              {comparisonData?.type === 'vacuum-vs-air' && comparisonData.stats && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: t('فراغ (بدون مقاومة)', 'Vacuum (No Drag)'), data: (comparisonData.stats as Record<string, StatData>).vacuum, color: '#22c55e', bgClass: 'from-emerald-500/10 to-emerald-500/5' },
                    { label: t('مع مقاومة الهواء', 'With Air Resistance'), data: (comparisonData.stats as Record<string, StatData>).air, color: '#ef4444', bgClass: 'from-red-500/10 to-red-500/5' },
                  ].map((item) => (
                    <div key={item.label} className={`p-4 rounded-xl border border-border/50 bg-gradient-to-br ${item.bgClass}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                        <span className="text-xs font-bold text-foreground">{item.label}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-[10px]">
                        <div className="text-center p-2 rounded-lg bg-background/50">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Ruler className="w-3 h-3 text-muted-foreground" />
                            <p className="text-muted-foreground">{t('المدى', 'Range')}</p>
                          </div>
                          <p className="font-mono font-bold text-foreground text-xs">{item.data.range.toFixed(2)} m</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-background/50">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <TrendingUp className="w-3 h-3 text-muted-foreground" />
                            <p className="text-muted-foreground">{t('أقصى ارتفاع', 'Max H')}</p>
                          </div>
                          <p className="font-mono font-bold text-foreground text-xs">{item.data.maxH.toFixed(2)} m</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-background/50">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <p className="text-muted-foreground">{t('زمن الطيران', 'Flight T')}</p>
                          </div>
                          <p className="font-mono font-bold text-foreground text-xs">{item.data.time.toFixed(2)} s</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {comparisonData?.type === 'multi-angle' && (comparisonData as { trajectories?: TrajectoryInfo[] }).trajectories && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                  {((comparisonData as { trajectories?: TrajectoryInfo[] }).trajectories ?? []).map((tr) => (
                    <div key={tr.angle} className="p-3 rounded-xl border border-border/50 bg-gradient-to-b from-secondary/10 to-transparent text-center">
                      <div className="w-4 h-4 rounded-full mx-auto mb-2 shadow-sm" style={{ backgroundColor: tr.color }} />
                      <p className="text-sm font-bold text-foreground">{tr.angle}°</p>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-[10px] px-1">
                          <span className="text-muted-foreground">{t('المدى', 'Range')}</span>
                          <span className="font-mono font-semibold text-foreground">{tr.prediction.range.toFixed(1)}m</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] px-1">
                          <span className="text-muted-foreground">{t('ارتفاع', 'Max H')}</span>
                          <span className="font-mono font-semibold text-foreground">{tr.prediction.maxHeight.toFixed(1)}m</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {comparisonData?.type === 'multi-env' && (comparisonData as { trajectories?: TrajectoryInfo[] }).trajectories && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                  {((comparisonData as { trajectories?: TrajectoryInfo[] }).trajectories ?? []).map((tr) => (
                    <div key={tr.env.name.en} className="p-3 rounded-xl border border-border/50 bg-gradient-to-b from-secondary/10 to-transparent text-center">
                      <div className="text-2xl mb-2">{tr.env.emoji}</div>
                      <p className="text-xs font-bold text-foreground">{tr.env.name[lang as 'ar' | 'en' | 'fr'] || tr.env.name.en}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 font-mono">g = {tr.env.gravity} m/s²</p>
                      <div className="mt-2 pt-2 border-t border-border/30">
                        <div className="flex items-center justify-between text-[10px] px-1">
                          <span className="text-muted-foreground">{t('المدى', 'Range')}</span>
                          <span className="font-mono font-semibold text-foreground">{tr.prediction.range.toFixed(1)}m</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] px-1 mt-1">
                          <span className="text-muted-foreground">{t('ارتفاع', 'Max H')}</span>
                          <span className="font-mono font-semibold text-foreground">{tr.prediction.maxHeight.toFixed(1)}m</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {comparisonData?.type === 'numerical-methods' && comparisonData.stats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Euler', data: (comparisonData.stats as Record<string, StatData>).euler, color: '#3b82f6', accuracy: '~90%', bgClass: 'from-blue-500/10 to-blue-500/5' },
                    { label: 'RK4', data: (comparisonData.stats as Record<string, StatData>).rk4, color: '#22c55e', accuracy: '~98%', bgClass: 'from-emerald-500/10 to-emerald-500/5' },
                    { label: 'AI APAS', data: (comparisonData.stats as Record<string, StatData>).aiApas, color: '#a855f7', accuracy: '~99.9%', bgClass: 'from-purple-500/10 to-purple-500/5' },
                  ].map((item) => (
                    <div key={item.label} className={`p-4 rounded-xl border border-border/50 bg-gradient-to-br ${item.bgClass}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                        <span className="text-xs font-bold text-foreground">{item.label}</span>
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-background/60 text-muted-foreground ms-auto">{item.accuracy}</span>
                      </div>
                      <div className="space-y-2 text-[10px]">
                        <div className="flex justify-between items-center p-1.5 rounded-lg bg-background/40">
                          <span className="text-muted-foreground flex items-center gap-1"><Ruler className="w-3 h-3" />{t('المدى', 'Range')}</span>
                          <span className="font-mono font-bold text-foreground">{item.data.range.toFixed(3)} m</span>
                        </div>
                        <div className="flex justify-between items-center p-1.5 rounded-lg bg-background/40">
                          <span className="text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" />{t('أقصى ارتفاع', 'Max H')}</span>
                          <span className="font-mono font-bold text-foreground">{item.data.maxH.toFixed(3)} m</span>
                        </div>
                        <div className="flex justify-between items-center p-1.5 rounded-lg bg-background/40">
                          <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{t('زمن الطيران', 'Flight T')}</span>
                          <span className="font-mono font-bold text-foreground">{item.data.time.toFixed(3)} s</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Current Parameters Reference */}
              <div className="p-3.5 bg-gradient-to-r from-secondary/15 to-transparent rounded-xl border border-border/40">
                <p className="text-[10px] font-bold text-muted-foreground mb-2.5 uppercase tracking-wider">
                  {t('المعاملات الحالية المستخدمة', 'Current Parameters Used', 'Paramètres Actuels Utilisés')}
                </p>
                <div className="flex flex-wrap gap-2 text-[10px]">
                  {[
                    { label: 'V₀', value: `${velocity.toFixed(1)} m/s` },
                    { label: 'θ', value: `${angle.toFixed(1)}°` },
                    { label: 'h₀', value: `${height.toFixed(1)} m` },
                    { label: 'g', value: `${gravity.toFixed(2)} m/s²` },
                    { label: 'm', value: `${mass.toFixed(2)} kg` },
                    ...(airResistance > 0 ? [{ label: 'k', value: airResistance.toFixed(3) }] : []),
                    ...(windSpeed !== 0 ? [{ label: 'wind', value: `${windSpeed.toFixed(1)} m/s` }] : []),
                  ].map((param) => (
                    <span key={param.label} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-background/60 border border-border/30 font-mono text-foreground">
                      <span className="text-muted-foreground">{param.label}=</span>{param.value}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
