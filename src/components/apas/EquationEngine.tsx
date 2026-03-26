import React, { useState, useCallback, useEffect } from 'react';
import { ChevronDown, Play, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { playClick, playSectionToggle } from '@/utils/sound';

export interface EquationTrajectoryPoint {
  x: number;
  y: number;
  t: number;
}

interface Props {
  lang: string;
  muted: boolean;
  onTrajectoryGenerated?: (points: EquationTrajectoryPoint[] | null) => void;
}

interface EvalResult {
  data: { t: number; x: number; y: number }[];
  error?: string;
}

// Safe math evaluation - supports basic math operations and common physics functions
const safeMathEval = (expr: string, vars: Record<string, number>): number => {
  let processed = expr
    .replace(/\^/g, '**')
    .replace(/sin\(/g, 'Math.sin(')
    .replace(/cos\(/g, 'Math.cos(')
    .replace(/tan\(/g, 'Math.tan(')
    .replace(/sqrt\(/g, 'Math.sqrt(')
    .replace(/abs\(/g, 'Math.abs(')
    .replace(/log\(/g, 'Math.log(')
    .replace(/exp\(/g, 'Math.exp(')
    .replace(/PI/g, 'Math.PI')
    .replace(/pi/g, 'Math.PI');

  for (const [key, val] of Object.entries(vars)) {
    processed = processed.replace(new RegExp('\\b' + key + '\\b', 'g'), String(val));
  }

  const fn = new Function('Math', `"use strict"; return (${processed});`);
  return fn(Math);
};

export default function EquationEngine({ lang, muted, onTrajectoryGenerated }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isAr = lang === 'ar';

  const [xEquation, setXEquation] = useState('v0 * cos(theta) * t');
  const [yEquation, setYEquation] = useState('v0 * sin(theta) * t - 0.5 * g * t^2');
  const [variables, setVariables] = useState<Record<string, number>>({
    v0: 50, theta: 0.785, g: 9.81,
  });
  const [tMax, setTMax] = useState(10);
  const [result, setResult] = useState<EvalResult | null>(null);

  const handleVarChange = (key: string, value: number) => {
    setVariables(prev => ({ ...prev, [key]: value }));
  };

  const addVariable = () => {
    const name = prompt(isAr ? 'اسم المتغير (بالإنجليزية):' : 'Variable name:');
    if (name && /^[a-zA-Z_]\w*$/.test(name) && !['t', 'Math', 'PI'].includes(name)) {
      setVariables(prev => ({ ...prev, [name]: 0 }));
    }
  };

  const removeVariable = (key: string) => {
    setVariables(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const evaluate = useCallback(() => {
    playClick(muted);
    try {
      const steps = 200;
      const dt = tMax / steps;
      const data: { t: number; x: number; y: number }[] = [];

      for (let i = 0; i <= steps; i++) {
        const t = i * dt;
        const allVars = { ...variables, t };
        const x = safeMathEval(xEquation, allVars);
        const y = safeMathEval(yEquation, allVars);
        if (!isFinite(x) || !isFinite(y)) {
          setResult({ data: [], error: isAr ? `قيمة غير محدودة عند t=${t.toFixed(2)}` : `Non-finite value at t=${t.toFixed(2)}` });
          onTrajectoryGenerated?.(null);
          return;
        }
        data.push({ t: Number(t.toFixed(4)), x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) });
        if (y < -100) break; // stop if projectile goes far below ground
      }

      setResult({ data });
      // Send trajectory to canvas for rendering
      onTrajectoryGenerated?.(data);
    } catch (e) {
      setResult({ data: [], error: isAr ? 'خطأ في المعادلة: ' + String(e) : 'Equation error: ' + String(e) });
      onTrajectoryGenerated?.(null);
    }
  }, [xEquation, yEquation, variables, tMax, muted, isAr, onTrajectoryGenerated]);

  const reset = () => {
    setXEquation('v0 * cos(theta) * t');
    setYEquation('v0 * sin(theta) * t - 0.5 * g * t^2');
    setVariables({ v0: 50, theta: 0.785, g: 9.81 });
    setTMax(10);
    setResult(null);
    onTrajectoryGenerated?.(null);
    playClick(muted);
  };

  // Clear trajectory when section is collapsed
  useEffect(() => {
    if (!expanded) {
      onTrajectoryGenerated?.(null);
    }
  }, [expanded, onTrajectoryGenerated]);

  return (
    <div className="border border-border/40 rounded-xl overflow-hidden bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-border/60">
      <button
        onClick={() => { setExpanded(!expanded); playSectionToggle(muted); }}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary/5 transition-all duration-300 group"
      >
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="text-base">🔬</span>
          {isAr ? 'محرك المعادلات العام' : lang === 'fr' ? 'Moteur d\'Équations' : 'Equation Engine'}
        </h3>
        <div className="flex items-center gap-2">
          {!expanded && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {isAr ? 'Physics Sandbox' : 'Physics Sandbox'}
            </span>
          )}
          <div className="w-6 h-6 rounded-md bg-secondary/50 flex items-center justify-center group-hover:bg-primary/10 transition-all duration-300">
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-border space-y-3 pt-3 animate-slideDown">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {isAr
              ? 'أدخل أي معادلة حركة مخصصة. استخدم t كمتغير الزمن. عند التنفيذ، سيتم تعيين المسار مباشرة على الكانفاس — اضغط تشغيل لإطلاق المقذوف.'
              : 'Enter any custom motion equation. Use t as time variable. On run, the trajectory path is set on canvas — press play to launch.'}
          </p>

          {/* X equation */}
          <div>
            <label className="text-[10px] font-medium text-muted-foreground block mb-1">
              x(t) =
            </label>
            <input
              type="text"
              value={xEquation}
              onChange={(e) => setXEquation(e.target.value)}
              className="w-full text-xs px-2 py-1.5 rounded border border-border bg-secondary/30 text-foreground font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
              dir="ltr"
              placeholder="v0 * cos(theta) * t"
            />
          </div>

          {/* Y equation */}
          <div>
            <label className="text-[10px] font-medium text-muted-foreground block mb-1">
              y(t) =
            </label>
            <input
              type="text"
              value={yEquation}
              onChange={(e) => setYEquation(e.target.value)}
              className="w-full text-xs px-2 py-1.5 rounded border border-border bg-secondary/30 text-foreground font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
              dir="ltr"
              placeholder="v0 * sin(theta) * t - 0.5 * g * t^2"
            />
          </div>

          {/* Time max */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
              t<sub>max</sub> =
            </label>
            <input
              type="number"
              value={tMax}
              onChange={(e) => setTMax(Number(e.target.value))}
              min={0.1} max={1000} step={0.5}
              className="w-20 text-xs px-2 py-1 rounded border border-border bg-secondary/30 text-foreground font-mono focus:outline-none focus:border-primary/50"
              dir="ltr"
            />
            <span className="text-[10px] text-muted-foreground">s</span>
          </div>

          {/* Variables */}
          <div className="border border-border/30 rounded-lg p-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                {isAr ? 'المتغيرات' : 'Variables'}
              </span>
              <button onClick={addVariable} className="text-[9px] px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                + {isAr ? 'إضافة' : 'Add'}
              </button>
            </div>
            {Object.entries(variables).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-foreground w-12 truncate">{key}</span>
                <span className="text-[10px] text-muted-foreground">=</span>
                <input
                  type="number"
                  value={val}
                  onChange={(e) => handleVarChange(key, Number(e.target.value))}
                  step={0.01}
                  className="flex-1 text-[10px] px-1.5 py-0.5 rounded border border-border bg-secondary/30 text-foreground font-mono focus:outline-none focus:border-primary/50"
                  dir="ltr"
                />
                <button onClick={() => removeVariable(key)} className="text-[9px] text-muted-foreground hover:text-destructive transition-colors px-1">
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-1.5">
            <button
              onClick={evaluate}
              className="flex-1 text-[10px] py-1.5 px-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-1 font-medium"
            >
              <Play className="w-3 h-3" /> {isAr ? 'تنفيذ' : 'Run'}
            </button>
            <button
              onClick={reset}
              className="text-[10px] py-1.5 px-2 rounded border border-border hover:bg-secondary transition-colors flex items-center justify-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3 h-3" /> {isAr ? 'إعادة' : 'Reset'}
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className={`rounded-lg p-2 border ${result.error ? 'border-destructive/30 bg-destructive/5' : 'border-primary/20 bg-primary/5'}`}>
              {result.error ? (
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
                  <p className="text-[10px] text-destructive break-all">{result.error}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-[10px] font-medium text-foreground">
                      {isAr ? `تم حساب ${result.data.length} نقطة — المسار جاهز، اضغط تشغيل` : `Computed ${result.data.length} points — path ready, press play`}
                    </span>
                  </div>
                  {result.data.length > 0 && (
                    <div className="max-h-[120px] overflow-y-auto mt-1">
                      <table className="w-full text-[9px] font-mono">
                        <thead>
                          <tr className="text-muted-foreground border-b border-border/30">
                            <th className="text-left py-0.5 px-1">t</th>
                            <th className="text-left py-0.5 px-1">x</th>
                            <th className="text-left py-0.5 px-1">y</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.data.filter((_, i) => i % Math.max(1, Math.floor(result.data.length / 15)) === 0 || i === result.data.length - 1).map((row, i) => (
                            <tr key={i} className="border-b border-border/10 text-foreground/80">
                              <td className="py-0.5 px-1">{row.t}</td>
                              <td className="py-0.5 px-1">{row.x}</td>
                              <td className="py-0.5 px-1">{row.y}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
