import React, { useState } from 'react';
import { ChevronDown, Play, Loader2 } from 'lucide-react';
import { runMonteCarloSim } from '@/utils/physics';
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
}

interface MCResult {
  range: { mean: number; stdDev: number; ci95Low: number; ci95High: number };
  maxHeight: { mean: number; stdDev: number; ci95Low: number; ci95High: number };
  flightTime: { mean: number; stdDev: number; ci95Low: number; ci95High: number };
}

export default function MonteCarloPanel({ lang, muted, velocity, angle, height, gravity, airResistance, mass }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [iterations, setIterations] = useState(1000);
  const [uncertainty, setUncertainty] = useState(5);
  const [result, setResult] = useState<MCResult | null>(null);
  const [running, setRunning] = useState(false);
  const isAr = lang === 'ar';
  const isFr = lang === 'fr';

  const t = (ar: string, en: string, fr?: string) => isAr ? ar : isFr ? (fr || en) : en;

  const handleRun = () => {
    setRunning(true);
    playUIClick(muted);
    // Run async to avoid blocking UI
    setTimeout(() => {
      const res = runMonteCarloSim(velocity, angle, height, gravity, airResistance, mass, iterations, uncertainty / 100);
      setResult(res);
      setRunning(false);
    }, 50);
  };

  const StatRow = ({ label, stat }: { label: string; stat: { mean: number; stdDev: number; ci95Low: number; ci95High: number } }) => (
    <div className="bg-secondary/30 rounded-lg p-2.5 space-y-1">
      <p className="text-[10px] font-semibold text-foreground">{label}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px] font-mono text-muted-foreground">
        <span>{t('المتوسط', 'Mean', 'Moyenne')}: <strong className="text-foreground">{stat.mean.toFixed(3)}</strong></span>
        <span>σ: <strong className="text-foreground">{stat.stdDev.toFixed(3)}</strong></span>
        <span>CI 2.5%: <strong className="text-foreground">{stat.ci95Low.toFixed(3)}</strong></span>
        <span>CI 97.5%: <strong className="text-foreground">{stat.ci95High.toFixed(3)}</strong></span>
      </div>
      {/* Simple visual bar showing CI range */}
      <div className="relative h-2 bg-secondary rounded-full overflow-hidden mt-1">
        {(() => {
          const range = stat.ci95High - stat.ci95Low;
          const fullRange = stat.mean * 2 || 1;
          const left = Math.max(0, ((stat.ci95Low) / fullRange) * 100);
          const width = Math.min(100, (range / fullRange) * 100);
          return (
            <>
              <div className="absolute h-full bg-primary/30 rounded-full" style={{ left: `${left}%`, width: `${width}%` }} />
              <div className="absolute h-full w-0.5 bg-primary" style={{ left: `${(stat.mean / fullRange) * 100}%` }} />
            </>
          );
        })()}
      </div>
    </div>
  );

  return (
    <div className="border border-border/40 rounded-xl overflow-hidden bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-border/60">
      <button
        onClick={() => { setExpanded(!expanded); playSectionToggle(muted); }}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary/5 transition-all duration-300 group"
      >
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          🎲 {t('تحليل مونت كارلو', 'Monte Carlo Analysis', 'Analyse Monte Carlo')}
        </h3>
        <div className="flex items-center gap-2">
          {!expanded && (
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono animate-slideDown">
              <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                {iterations.toLocaleString()} {t('تكرار', 'runs', 'sim.')}
              </span>
              {result && (
                <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">
                  ±{uncertainty}%
                </span>
              )}
            </span>
          )}
          <div className="w-6 h-6 rounded-md bg-secondary/50 flex items-center justify-center group-hover:bg-primary/10 transition-all duration-300">
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-border space-y-2 pt-2 animate-slideDown">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {t(
              'تحليل تأثير عدم الدقة في القياسات على النتائج بتشغيل آلاف المحاكاة بقيم عشوائية ضمن نطاق الشك.',
              'Analyze how measurement uncertainty affects results by running thousands of simulations with randomized parameters.',
              'Analyser l\'impact de l\'incertitude sur les résultats via des milliers de simulations aléatoires.',
            )}
          </p>

          {/* Controls */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">
                {t('عدد التكرارات', 'Iterations', 'Itérations')}
              </label>
              <select
                value={iterations}
                onChange={(e) => setIterations(Number(e.target.value))}
                className="w-full text-xs px-2 py-1.5 rounded border border-border bg-secondary/30 text-foreground"
              >
                <option value={100}>100</option>
                <option value={500}>500</option>
                <option value={1000}>1,000</option>
                <option value={5000}>5,000</option>
                <option value={10000}>10,000</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">
                {t('نسبة الشك ±', 'Uncertainty ±', 'Incertitude ±')}
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={uncertainty}
                  onChange={(e) => setUncertainty(Math.max(1, Math.min(50, Number(e.target.value))))}
                  min={1} max={50} step={1}
                  className="flex-1 text-xs px-2 py-1.5 rounded border border-border bg-secondary/30 text-foreground"
                  dir="ltr"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={running}
            className="w-full py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {running ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t('جاري التحليل...', 'Running...', 'En cours...')}
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                {t('تشغيل التحليل', 'Run Analysis', 'Lancer l\'analyse')}
              </>
            )}
          </button>

          {/* Results */}
          {result && (
            <div className="space-y-1.5 animate-slideDown">
              <p className="text-[10px] font-semibold text-primary">
                {t(`النتائج (${iterations} تكرار, ±${uncertainty}%)`, `Results (${iterations} runs, ±${uncertainty}%)`, `Résultats (${iterations} sim., ±${uncertainty}%)`)}
              </p>
              <StatRow label={t('المدى (m)', 'Range (m)', 'Portée (m)')} stat={result.range} />
              <StatRow label={t('أقصى ارتفاع (m)', 'Max Height (m)', 'Hauteur max (m)')} stat={result.maxHeight} />
              <StatRow label={t('زمن الطيران (s)', 'Flight Time (s)', 'Temps de vol (s)')} stat={result.flightTime} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
