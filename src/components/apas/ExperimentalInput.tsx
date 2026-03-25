import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';

interface Props {
  lang: string;
  prediction: {
    range: number;
    maxHeight: number;
    timeOfFlight: number;
    finalVelocity: number;
    rangeTheoretical: number;
    maxHeightTheoretical: number;
    timeOfFlightTheoretical: number;
  } | null;
  onAnalyzed?: (hasData: boolean) => void;
}

interface ExperimentalValues {
  range: string;
  maxHeight: string;
  flightTime: string;
}

export default function ExperimentalInput({ lang, prediction, onAnalyzed }: Props) {
  const [values, setValues] = useState<ExperimentalValues>({ range: '', maxHeight: '', flightTime: '' });
  const [results, setResults] = useState<{
    label: string;
    theoretical: number;
    simulated: number;
    experimental: number;
    errVsTheo: number;
    errVsSim: number;
    absErrTheo: number;
    absErrSim: number;
  }[] | null>(null);

  if (!prediction) return null;

  const analyze = () => {
    const items = [
      {
        label: lang === 'ar' ? 'المدى الأفقي' : 'Range',
        theoretical: prediction.rangeTheoretical,
        simulated: prediction.range,
        experimental: parseFloat(values.range),
      },
      {
        label: lang === 'ar' ? 'أقصى ارتفاع' : 'Max Height',
        theoretical: prediction.maxHeightTheoretical,
        simulated: prediction.maxHeight,
        experimental: parseFloat(values.maxHeight),
      },
      {
        label: lang === 'ar' ? 'زمن الطيران' : 'Flight Time',
        theoretical: prediction.timeOfFlightTheoretical,
        simulated: prediction.timeOfFlight,
        experimental: parseFloat(values.flightTime),
      },
    ].filter(item => !isNaN(item.experimental) && item.experimental > 0);

    const analyzed = items.map(item => {
      const errVsTheo = item.theoretical > 0 ? Math.abs(item.experimental - item.theoretical) / item.theoretical * 100 : 0;
      const errVsSim = item.simulated > 0 ? Math.abs(item.experimental - item.simulated) / item.simulated * 100 : 0;
      const absErrTheo = Math.abs(item.experimental - item.theoretical);
      const absErrSim = Math.abs(item.experimental - item.simulated);
      return { ...item, errVsTheo, errVsSim, absErrTheo, absErrSim };
    });

    setResults(analyzed);
    onAnalyzed?.(analyzed.length > 0);
  };

  const getAccuracyLabel = (err: number) => {
    if (err < 5) return { text: lang === 'ar' ? 'دقة عالية ✅' : 'High accuracy ✅', color: 'text-green-600 dark:text-green-400' };
    if (err < 15) return { text: lang === 'ar' ? 'مقبول ⚠️' : 'Acceptable ⚠️', color: 'text-yellow-600 dark:text-yellow-400' };
    return { text: lang === 'ar' ? 'منخفض ❌' : 'Low ❌', color: 'text-red-500' };
  };

  return (
    <div className="border-2 border-border/40 rounded-xl p-5 space-y-4 bg-card/50">
      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
        🧪 {lang === 'ar' ? 'القيم التجريبية' : 'Experimental Values'}
      </h3>
      <p className="text-xs text-muted-foreground">
        {lang === 'ar' ? 'أدخل القيم المقاسة تجريبياً لحساب نسبة الخطأ' : 'Enter measured values to calculate error percentage'}
      </p>

      <div className="grid grid-cols-1 xs:grid-cols-3 gap-3">
        {[
          { key: 'range' as const, label: lang === 'ar' ? 'المدى (م)' : 'Range (m)' },
          { key: 'maxHeight' as const, label: lang === 'ar' ? 'أقصى ارتفاع (م)' : 'Max Height (m)' },
          { key: 'flightTime' as const, label: lang === 'ar' ? 'زمن الطيران (ث)' : 'Flight Time (s)' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">{label}</label>
            <input
              type="number"
              step="any"
              value={values[key]}
              onChange={e => setValues(prev => ({ ...prev, [key]: e.target.value }))}
              placeholder="—"
              className="w-full !text-sm !py-2 rounded-lg border-border/50"
              dir="ltr"
            />
          </div>
        ))}
      </div>

      <button
        onClick={analyze}
        disabled={!values.range && !values.maxHeight && !values.flightTime}
        className="group w-full text-sm font-semibold py-3 px-4 rounded-xl bg-foreground text-background hover:bg-foreground/90 border border-foreground hover:shadow-lg transition-all duration-200 disabled:opacity-40 flex items-center justify-center gap-2"
      >
        <CheckCircle className="w-4 h-4" />
        {lang === 'ar' ? 'تحليل' : 'Analyze'}
      </button>

      {results && results.length > 0 && (
        <div className="space-y-3 animate-slideDown">
          {results.map((r, i) => {
            const accTheo = getAccuracyLabel(r.errVsTheo);
            const accSim = getAccuracyLabel(r.errVsSim);
            return (
              <div key={i} className="bg-secondary/50 rounded-lg p-4 space-y-3">
                <p className="text-sm font-bold text-foreground">{r.label}</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-background rounded-lg p-2.5 text-center border border-border/30">
                    <p className="text-[11px] text-muted-foreground mb-1">{lang === 'ar' ? 'نظري' : 'Theoretical'}</p>
                    <p className="text-sm font-mono font-bold text-foreground">{r.theoretical.toFixed(3)}</p>
                  </div>
                  <div className="bg-background rounded-lg p-2.5 text-center border border-border/30">
                    <p className="text-[11px] text-muted-foreground mb-1">{lang === 'ar' ? 'محاكاة' : 'Simulated'}</p>
                    <p className="text-sm font-mono font-bold text-foreground">{r.simulated.toFixed(3)}</p>
                  </div>
                  <div className="bg-background rounded-lg p-2.5 text-center border-2 border-primary/30">
                    <p className="text-[11px] text-muted-foreground mb-1">{lang === 'ar' ? 'تجريبي' : 'Experimental'}</p>
                    <p className="text-sm font-mono font-bold text-primary">{r.experimental.toFixed(3)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-background rounded-lg p-2.5 border border-border/30">
                    <p className="text-[11px] text-muted-foreground mb-1">{lang === 'ar' ? 'خطأ vs نظري' : 'Error vs Theory'}</p>
                    <p className="text-sm font-mono font-bold text-foreground">{r.errVsTheo.toFixed(2)}%</p>
                    <p className={`text-xs mt-0.5 ${accTheo.color}`}>{accTheo.text}</p>
                  </div>
                  <div className="bg-background rounded-lg p-2.5 border border-border/30">
                    <p className="text-[11px] text-muted-foreground mb-1">{lang === 'ar' ? 'خطأ vs محاكاة' : 'Error vs Simulation'}</p>
                    <p className="text-sm font-mono font-bold text-foreground">{r.errVsSim.toFixed(2)}%</p>
                    <p className={`text-xs mt-0.5 ${accSim.color}`}>{accSim.text}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground border-t border-border/30 pt-2">
                  {lang === 'ar' ? 'الخطأ المطلق:' : 'Absolute error:'} |Δ| = {r.absErrTheo.toFixed(4)} ({lang === 'ar' ? 'نظري' : 'theo'}), {r.absErrSim.toFixed(4)} ({lang === 'ar' ? 'محاكاة' : 'sim'})
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
