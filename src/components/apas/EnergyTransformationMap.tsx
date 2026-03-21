import React, { useState, useMemo } from 'react';
import { Zap, ChevronDown, Battery, TrendingUp, BarChart3 } from 'lucide-react';

interface EnergyTransformationMapProps {
  lang: string;
  trajectoryData: Array<{ x: number; y: number; time: number; vx: number; vy: number; speed: number }>;
  mass: number;
  gravity: number;
  currentTime: number;
  muted: boolean;
}

const T: Record<string, Record<string, string>> = {
  ar: {
    title: 'خريطة تحول الطاقة',
    subtitle: 'تحويل الطاقة الحركية والكامنة لحظة بلحظة',
    kineticEnergy: 'الطاقة الحركية (KE)',
    potentialEnergy: 'الطاقة الكامنة (PE)',
    totalEnergy: 'الطاقة الكلية',
    energyLoss: 'الطاقة المفقودة',
    noData: 'أطلق المحاكاة لرؤية تحول الطاقة',
    currentMoment: 'اللحظة الحالية',
    atPeak: 'عند القمة',
    atLaunch: 'عند الإطلاق',
    atImpact: 'عند السقوط',
    keTooltip: 'KE = ½mv²',
    peTooltip: 'PE = mgh',
    conservation: 'حفظ الطاقة',
    conserved: 'الطاقة محفوظة',
    notConserved: 'فقدان طاقة بسبب المقاومة',
    joules: 'جول',
  },
  en: {
    title: 'Energy Transformation Map',
    subtitle: 'Kinetic and potential energy conversion moment by moment',
    kineticEnergy: 'Kinetic Energy (KE)',
    potentialEnergy: 'Potential Energy (PE)',
    totalEnergy: 'Total Energy',
    energyLoss: 'Energy Loss',
    noData: 'Launch simulation to see energy transformation',
    currentMoment: 'Current Moment',
    atPeak: 'At Peak',
    atLaunch: 'At Launch',
    atImpact: 'At Impact',
    keTooltip: 'KE = ½mv²',
    peTooltip: 'PE = mgh',
    conservation: 'Energy Conservation',
    conserved: 'Energy is conserved',
    notConserved: 'Energy loss due to drag',
    joules: 'J',
  },
  fr: {
    title: 'Carte de Transformation d\'Énergie',
    subtitle: 'Conversion de l\'énergie cinétique et potentielle instant par instant',
    kineticEnergy: 'Énergie Cinétique (EC)',
    potentialEnergy: 'Énergie Potentielle (EP)',
    totalEnergy: 'Énergie Totale',
    energyLoss: 'Perte d\'Énergie',
    noData: 'Lancez la simulation pour voir la transformation d\'énergie',
    currentMoment: 'Moment Actuel',
    atPeak: 'Au Sommet',
    atLaunch: 'Au Lancement',
    atImpact: 'À l\'Impact',
    keTooltip: 'EC = ½mv²',
    peTooltip: 'EP = mgh',
    conservation: 'Conservation de l\'Énergie',
    conserved: 'L\'énergie est conservée',
    notConserved: 'Perte d\'énergie due à la traînée',
    joules: 'J',
  },
};

const EnergyTransformationMap: React.FC<EnergyTransformationMapProps> = ({
  lang, trajectoryData, mass, gravity, currentTime,
}) => {
  const t = T[lang] || T.en;
  const [isOpen, setIsOpen] = useState(false);

  const energyData = useMemo(() => {
    if (trajectoryData.length < 2) return null;

    const data = trajectoryData.map((p) => {
      const ke = 0.5 * mass * p.speed * p.speed;
      const pe = mass * gravity * Math.max(0, p.y);
      return { time: p.time, ke, pe, total: ke + pe, y: p.y, speed: p.speed };
    });

    const initialTotal = data[0].total;
    const currentIdx = data.findIndex(d => d.time >= currentTime);
    const current = currentIdx >= 0 ? data[currentIdx] : data[data.length - 1];
    const peak = data.reduce((max, d) => d.y > max.y ? d : max, data[0]);
    const last = data[data.length - 1];
    const maxTotal = Math.max(...data.map(d => d.total), 0.01);

    // Generate mini bar chart data (sample 20 points)
    const step = Math.max(1, Math.floor(data.length / 20));
    const chartSamples = [];
    for (let i = 0; i < data.length; i += step) {
      chartSamples.push(data[i]);
    }

    return { data, initialTotal, current, peak, last, maxTotal, chartSamples };
  }, [trajectoryData, mass, gravity, currentTime]);

  if (!energyData) return null;

  const { current, peak, last, maxTotal, initialTotal, data: eData, chartSamples } = energyData;
  const energyLossPercent = ((initialTotal - last.total) / Math.max(initialTotal, 0.01)) * 100;
  const isConserved = energyLossPercent < 1;

  return (
    <div className="border border-border/50 rounded-xl bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3.5 cursor-pointer hover:bg-primary/5 transition-all duration-300"
      >
        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          ⚡ {t.title}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="border-t border-border/30 p-4 space-y-3 animate-slideDown">
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>

          {trajectoryData.length < 2 ? (
            <p className="text-xs text-muted-foreground text-center py-4">{t.noData}</p>
          ) : (
            <>
              {/* Current Moment Energy Bar */}
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/30">
                <p className="text-[10px] text-muted-foreground mb-2 font-medium">{t.currentMoment} (t = {current.time.toFixed(2)}s)</p>
                <div className="space-y-2">
                  {/* KE Bar */}
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-blue-500 font-medium">{t.kineticEnergy}</span>
                      <span className="font-mono">{current.ke.toFixed(2)} {t.joules}</span>
                    </div>
                    <div className="h-3 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                        style={{ width: `${(current.ke / maxTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                  {/* PE Bar */}
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-green-500 font-medium">{t.potentialEnergy}</span>
                      <span className="font-mono">{current.pe.toFixed(2)} {t.joules}</span>
                    </div>
                    <div className="h-3 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                        style={{ width: `${(current.pe / maxTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                  {/* Total Bar */}
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-foreground font-semibold">{t.totalEnergy}</span>
                      <span className="font-mono font-semibold">{current.total.toFixed(2)} {t.joules}</span>
                    </div>
                    <div className="h-3 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                        style={{ width: `${(current.total / maxTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Animated stacked bar chart */}
              <div className="p-3 rounded-xl border border-border/30">
                <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-primary" />
                  {t.subtitle}
                </p>
                <div className="flex items-end gap-[2px] h-24" dir="ltr">
                  {chartSamples.map((sample, i) => {
                    const keH = (sample.ke / maxTotal) * 100;
                    const peH = (sample.pe / maxTotal) * 100;
                    const isCurrentSample = Math.abs(sample.time - currentTime) < (eData[1]?.time - eData[0]?.time || 0.1) * 3;
                    return (
                      <div
                        key={i}
                        className={`flex-1 flex flex-col-reverse rounded-t-sm overflow-hidden transition-all duration-300 ${isCurrentSample ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                        title={`t=${sample.time.toFixed(2)}s | KE=${sample.ke.toFixed(1)}J | PE=${sample.pe.toFixed(1)}J`}
                      >
                        <div
                          className="bg-blue-500/80 transition-all duration-500"
                          style={{ height: `${keH}%` }}
                        />
                        <div
                          className="bg-green-500/80 transition-all duration-500"
                          style={{ height: `${peH}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-blue-500/80" />
                    <span className="text-[9px] text-muted-foreground">{t.keTooltip}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-green-500/80" />
                    <span className="text-[9px] text-muted-foreground">{t.peTooltip}</span>
                  </div>
                </div>
              </div>

              {/* Key Moments Comparison */}
              <div className="grid grid-cols-3 gap-2">
                {/* Launch */}
                <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/30 text-center">
                  <p className="text-[9px] text-muted-foreground mb-1">{t.atLaunch}</p>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-mono text-blue-500">KE: {eData[0].ke.toFixed(1)}</p>
                    <p className="text-[10px] font-mono text-green-500">PE: {eData[0].pe.toFixed(1)}</p>
                  </div>
                </div>
                {/* Peak */}
                <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/30 text-center">
                  <p className="text-[9px] text-muted-foreground mb-1">{t.atPeak}</p>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-mono text-blue-500">KE: {peak.ke.toFixed(1)}</p>
                    <p className="text-[10px] font-mono text-green-500">PE: {peak.pe.toFixed(1)}</p>
                  </div>
                </div>
                {/* Impact */}
                <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/30 text-center">
                  <p className="text-[9px] text-muted-foreground mb-1">{t.atImpact}</p>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-mono text-blue-500">KE: {last.ke.toFixed(1)}</p>
                    <p className="text-[10px] font-mono text-green-500">PE: {last.pe.toFixed(1)}</p>
                  </div>
                </div>
              </div>

              {/* Energy Conservation Status */}
              <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${isConserved ? 'bg-green-500/5 border-green-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                <Battery className={`w-4 h-4 ${isConserved ? 'text-green-500' : 'text-amber-500'}`} />
                <div className="flex-1">
                  <p className={`text-[11px] font-medium ${isConserved ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {t.conservation}: {isConserved ? t.conserved : t.notConserved}
                  </p>
                  {!isConserved && (
                    <p className="text-[10px] text-muted-foreground">
                      {t.energyLoss}: {energyLossPercent.toFixed(1)}%
                    </p>
                  )}
                </div>
                <TrendingUp className={`w-3.5 h-3.5 ${isConserved ? 'text-green-500' : 'text-amber-500'}`} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default EnergyTransformationMap;
