import React, { useState, useCallback, useMemo } from 'react';
import { GitCompare, Play, ChevronDown, BarChart3, Layers, Info } from 'lucide-react';
import type { TrajectoryPoint } from '@/utils/physics';

interface VRLIntegrationProps {
  lang: string;
  trajectoryData: TrajectoryPoint[];
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
  prediction: { range: number; maxHeight: number; timeOfFlight: number } | null;
  muted: boolean;
}

const T: Record<string, Record<string, string>> = {
  ar: {
    title: 'مقارنة مع المحاكاة المثالية',
    subtitle: 'ربط مع المختبرات الافتراضية (VRL)',
    compare: 'قارن مع المحاكاة المثالية',
    comparing: 'جاري المقارنة...',
    noData: 'أطلق المحاكاة أولاً لرؤية المقارنة',
    idealTrajectory: 'المسار المثالي (بدون مقاومة)',
    actualTrajectory: 'المسار الفعلي',
    overlapView: 'عرض متراكب',
    rangeDeviation: 'انحراف المدى',
    heightDeviation: 'انحراف الارتفاع',
    timeDeviation: 'انحراف الزمن',
    dragImpact: 'تأثير المقاومة',
    gravityOnly: 'جاذبية فقط',
    withDrag: 'مع مقاومة',
    difference: 'الفرق',
    percentage: 'النسبة المئوية',
    simulationParams: 'معاملات المحاكاة',
    idealRange: 'المدى المثالي',
    actualRange: 'المدى الفعلي',
    idealMaxH: 'أقصى ارتفاع مثالي',
    actualMaxH: 'أقصى ارتفاع فعلي',
    idealTime: 'زمن الطيران المثالي',
    actualTime: 'زمن الطيران الفعلي',
    energyEfficiency: 'كفاءة الطاقة',
    generateReport: 'إنشاء تقرير مقارنة',
  },
  en: {
    title: 'Compare with Ideal Simulation',
    subtitle: 'Virtual Research Lab Integration (VRL)',
    compare: 'Compare with Ideal Simulation',
    comparing: 'Comparing...',
    noData: 'Launch simulation first to see comparison',
    idealTrajectory: 'Ideal Trajectory (no drag)',
    actualTrajectory: 'Actual Trajectory',
    overlapView: 'Overlap View',
    rangeDeviation: 'Range Deviation',
    heightDeviation: 'Height Deviation',
    timeDeviation: 'Time Deviation',
    dragImpact: 'Drag Impact',
    gravityOnly: 'Gravity Only',
    withDrag: 'With Drag',
    difference: 'Difference',
    percentage: 'Percentage',
    simulationParams: 'Simulation Parameters',
    idealRange: 'Ideal Range',
    actualRange: 'Actual Range',
    idealMaxH: 'Ideal Max Height',
    actualMaxH: 'Actual Max Height',
    idealTime: 'Ideal Flight Time',
    actualTime: 'Actual Flight Time',
    energyEfficiency: 'Energy Efficiency',
    generateReport: 'Generate Comparison Report',
  },
  fr: {
    title: 'Comparer avec Simulation Idéale',
    subtitle: 'Intégration Laboratoire Virtuel (VRL)',
    compare: 'Comparer avec Simulation Idéale',
    comparing: 'Comparaison...',
    noData: 'Lancez la simulation d\'abord pour voir la comparaison',
    idealTrajectory: 'Trajectoire Idéale (sans traînée)',
    actualTrajectory: 'Trajectoire Réelle',
    overlapView: 'Vue Superposée',
    rangeDeviation: 'Déviation de Portée',
    heightDeviation: 'Déviation de Hauteur',
    timeDeviation: 'Déviation de Temps',
    dragImpact: 'Impact de Traînée',
    gravityOnly: 'Gravité Seule',
    withDrag: 'Avec Traînée',
    difference: 'Différence',
    percentage: 'Pourcentage',
    simulationParams: 'Paramètres de Simulation',
    idealRange: 'Portée Idéale',
    actualRange: 'Portée Réelle',
    idealMaxH: 'Hauteur Max Idéale',
    actualMaxH: 'Hauteur Max Réelle',
    idealTime: 'Temps de Vol Idéal',
    actualTime: 'Temps de Vol Réel',
    energyEfficiency: 'Efficacité Énergétique',
    generateReport: 'Générer Rapport de Comparaison',
  },
};

const VRLIntegration: React.FC<VRLIntegrationProps> = ({
  lang, trajectoryData, velocity, angle, height, gravity, airResistance, prediction,
}) => {
  const t = T[lang] || T.en;
  const [isOpen, setIsOpen] = useState(false);
  const [hasCompared, setHasCompared] = useState(false);
  const [isComparing, setIsComparing] = useState(false);

  // Calculate ideal trajectory (no air resistance)
  const idealMetrics = useMemo(() => {
    const rad = (angle * Math.PI) / 180;
    const v0x = velocity * Math.cos(rad);
    const v0y = velocity * Math.sin(rad);

    // Ideal range (with initial height)
    const disc = v0y * v0y + 2 * gravity * height;
    const idealTime = disc >= 0 ? (v0y + Math.sqrt(disc)) / gravity : (2 * v0y) / gravity;
    const idealRange = v0x * idealTime;
    const idealMaxH = height + (v0y * v0y) / (2 * gravity);

    return { idealRange, idealMaxH, idealTime };
  }, [velocity, angle, height, gravity]);

  const comparison = useMemo(() => {
    if (!prediction) return null;
    const actualRange = prediction.range;
    const actualMaxH = prediction.maxHeight;
    const actualTime = prediction.timeOfFlight;

    const rangeDiff = idealMetrics.idealRange - actualRange;
    const rangePercent = idealMetrics.idealRange > 0 ? (rangeDiff / idealMetrics.idealRange) * 100 : 0;
    const heightDiff = idealMetrics.idealMaxH - actualMaxH;
    const heightPercent = idealMetrics.idealMaxH > 0 ? (heightDiff / idealMetrics.idealMaxH) * 100 : 0;
    const timeDiff = idealMetrics.idealTime - actualTime;
    const timePercent = idealMetrics.idealTime > 0 ? (timeDiff / idealMetrics.idealTime) * 100 : 0;

    // Energy efficiency: ratio of actual range to ideal range
    const energyEfficiency = idealMetrics.idealRange > 0 ? (actualRange / idealMetrics.idealRange) * 100 : 100;

    return {
      actualRange, actualMaxH, actualTime,
      rangeDiff, rangePercent,
      heightDiff, heightPercent,
      timeDiff, timePercent,
      energyEfficiency,
    };
  }, [prediction, idealMetrics]);

  const handleCompare = useCallback(() => {
    setIsComparing(true);
    setTimeout(() => {
      setHasCompared(true);
      setIsComparing(false);
    }, 1200);
  }, []);

  const getDeviationColor = (percent: number) => {
    const abs = Math.abs(percent);
    if (abs < 2) return 'text-green-500';
    if (abs < 10) return 'text-blue-500';
    if (abs < 25) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="border border-border/50 rounded-xl bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3.5 cursor-pointer hover:bg-primary/5 transition-all duration-300"
      >
        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-primary" />
          🔬 {t.title}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="border-t border-border/30 p-4 space-y-3 animate-slideDown">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" /> {t.subtitle}
          </p>

          {trajectoryData.length < 5 ? (
            <p className="text-xs text-muted-foreground text-center py-4">{t.noData}</p>
          ) : (
            <>
              <button
                onClick={handleCompare}
                disabled={isComparing}
                className="w-full px-4 py-2.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-primary to-primary/80 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Play className={`w-4 h-4 ${isComparing ? 'animate-pulse' : ''}`} />
                {isComparing ? t.comparing : t.compare}
              </button>

              {hasCompared && comparison && (
                <div className="space-y-3">
                  {/* Comparison Table */}
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="bg-secondary/30 px-3 py-2 border-b border-border">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                        <BarChart3 className="w-3.5 h-3.5 text-primary" />
                        {t.overlapView}
                      </p>
                    </div>
                    <div className="p-3 space-y-2">
                      {/* Range */}
                      <div className="grid grid-cols-4 gap-2 text-[11px]">
                        <span className="text-muted-foreground font-medium">{''}</span>
                        <span className="text-center font-semibold text-green-600 dark:text-green-400">{t.gravityOnly}</span>
                        <span className="text-center font-semibold text-blue-600 dark:text-blue-400">{t.withDrag}</span>
                        <span className="text-center font-semibold text-muted-foreground">{t.difference}</span>
                      </div>

                      {/* Range Row */}
                      <div className="grid grid-cols-4 gap-2 text-[11px] p-2 rounded-lg bg-secondary/20">
                        <span className="text-foreground font-medium">{lang === 'ar' ? 'المدى' : 'Range'}</span>
                        <span className="text-center font-mono">{idealMetrics.idealRange.toFixed(2)} m</span>
                        <span className="text-center font-mono">{comparison.actualRange.toFixed(2)} m</span>
                        <span className={`text-center font-mono ${getDeviationColor(comparison.rangePercent)}`}>
                          {comparison.rangePercent > 0 ? '-' : '+'}{Math.abs(comparison.rangePercent).toFixed(1)}%
                        </span>
                      </div>

                      {/* Height Row */}
                      <div className="grid grid-cols-4 gap-2 text-[11px] p-2 rounded-lg">
                        <span className="text-foreground font-medium">{lang === 'ar' ? 'أقصى ارتفاع' : 'Max H'}</span>
                        <span className="text-center font-mono">{idealMetrics.idealMaxH.toFixed(2)} m</span>
                        <span className="text-center font-mono">{comparison.actualMaxH.toFixed(2)} m</span>
                        <span className={`text-center font-mono ${getDeviationColor(comparison.heightPercent)}`}>
                          {comparison.heightPercent > 0 ? '-' : '+'}{Math.abs(comparison.heightPercent).toFixed(1)}%
                        </span>
                      </div>

                      {/* Time Row */}
                      <div className="grid grid-cols-4 gap-2 text-[11px] p-2 rounded-lg bg-secondary/20">
                        <span className="text-foreground font-medium">{lang === 'ar' ? 'زمن الطيران' : 'Time'}</span>
                        <span className="text-center font-mono">{idealMetrics.idealTime.toFixed(3)} s</span>
                        <span className="text-center font-mono">{comparison.actualTime.toFixed(3)} s</span>
                        <span className={`text-center font-mono ${getDeviationColor(comparison.timePercent)}`}>
                          {comparison.timePercent > 0 ? '-' : '+'}{Math.abs(comparison.timePercent).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Energy Efficiency */}
                  <div className="p-3 rounded-xl bg-secondary/30 border border-border/30">
                    <p className="text-xs text-muted-foreground mb-2">{t.energyEfficiency}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(100, comparison.energyEfficiency)}%` }}
                        />
                      </div>
                      <span className={`text-lg font-bold ${getDeviationColor(100 - comparison.energyEfficiency)}`}>
                        {comparison.energyEfficiency.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Visual comparison bar chart */}
                  <div className="p-3 rounded-xl border border-border/30">
                    <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      {t.dragImpact}
                    </p>
                    <div className="space-y-2">
                      {[
                        { label: lang === 'ar' ? 'المدى' : 'Range', ideal: idealMetrics.idealRange, actual: comparison.actualRange },
                        { label: lang === 'ar' ? 'الارتفاع' : 'Height', ideal: idealMetrics.idealMaxH, actual: comparison.actualMaxH },
                      ].map((item) => {
                        const maxVal = Math.max(item.ideal, item.actual, 0.01);
                        return (
                          <div key={item.label} className="space-y-1">
                            <span className="text-[10px] font-medium text-foreground">{item.label}</span>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] w-8 text-green-500">{t.gravityOnly.substring(0, 4)}</span>
                                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                  <div className="h-full bg-green-500/70 rounded-full" style={{ width: `${(item.ideal / maxVal) * 100}%` }} />
                                </div>
                                <span className="text-[9px] font-mono w-14 text-end">{item.ideal.toFixed(1)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] w-8 text-blue-500">{t.withDrag.substring(0, 4)}</span>
                                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500/70 rounded-full" style={{ width: `${(item.actual / maxVal) * 100}%` }} />
                                </div>
                                <span className="text-[9px] font-mono w-14 text-end">{item.actual.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default VRLIntegration;
