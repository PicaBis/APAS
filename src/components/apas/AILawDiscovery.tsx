import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Brain, Plus, Trash2, RotateCcw, Loader2, X, Lightbulb, Download } from 'lucide-react';
import { toast } from 'sonner';

interface DataPoint {
  x: number;
  y: number;
}

interface DiscoveredLaw {
  equation: string;
  type: string;
  r2: number;
  coefficients: number[];
  description: string;
  descriptionAr: string;
  predictedPoints: Array<{ x: number; y: number }>;
}

interface Props {
  lang: string;
  muted: boolean;
  trajectoryData?: Array<{ x: number; y: number; time: number }>;
}

// Candidate model functions for symbolic regression
function tryLinear(data: DataPoint[]): DiscoveredLaw | null {
  const n = data.length;
  if (n < 2) return null;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const { x, y } of data) { sumX += x; sumY += y; sumXY += x * y; sumXX += x * x; }
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return null;
  const a = (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - a * sumX) / n;
  const yMean = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (const { x, y } of data) { ssRes += (y - (a * x + b)) ** 2; ssTot += (y - yMean) ** 2; }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  const xMin = Math.min(...data.map(d => d.x));
  const xMax = Math.max(...data.map(d => d.x));
  const step = (xMax - xMin) / 100 || 0.01;
  const pts = [];
  for (let x = xMin; x <= xMax; x += step) pts.push({ x, y: a * x + b });
  return { equation: `y = ${a.toFixed(4)}x + ${b.toFixed(4)}`, type: 'Linear', r2, coefficients: [a, b], description: 'Linear relationship: y = ax + b', descriptionAr: 'علاقة خطية: y = ax + b', predictedPoints: pts };
}

function tryQuadratic(data: DataPoint[]): DiscoveredLaw | null {
  const n = data.length;
  if (n < 3) return null;
  const sums = { x: 0, x2: 0, x3: 0, x4: 0, y: 0, xy: 0, x2y: 0 };
  for (const { x, y } of data) {
    const x2 = x * x;
    sums.x += x; sums.x2 += x2; sums.x3 += x2 * x; sums.x4 += x2 * x2;
    sums.y += y; sums.xy += x * y; sums.x2y += x2 * y;
  }
  const A = [[sums.x4, sums.x3, sums.x2], [sums.x3, sums.x2, sums.x], [sums.x2, sums.x, n]];
  const b = [sums.x2y, sums.xy, sums.y];
  // Gaussian elimination
  const aug = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < 3; col++) {
    let maxRow = col;
    for (let row = col + 1; row < 3; row++) if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    if (Math.abs(aug[col][col]) < 1e-12) return null;
    for (let row = col + 1; row < 3; row++) {
      const f = aug[row][col] / aug[col][col];
      for (let j = col; j <= 3; j++) aug[row][j] -= f * aug[col][j];
    }
  }
  const x = [0, 0, 0];
  for (let i = 2; i >= 0; i--) { x[i] = aug[i][3]; for (let j = i + 1; j < 3; j++) x[i] -= aug[i][j] * x[j]; x[i] /= aug[i][i]; }
  const [a, bC, c] = x;

  const yMean = sums.y / n;
  let ssRes = 0, ssTot = 0;
  for (const d of data) { ssRes += (d.y - (a * d.x * d.x + bC * d.x + c)) ** 2; ssTot += (d.y - yMean) ** 2; }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  const xMin = Math.min(...data.map(d => d.x));
  const xMax = Math.max(...data.map(d => d.x));
  const step = (xMax - xMin) / 100 || 0.01;
  const pts = [];
  for (let xi = xMin; xi <= xMax; xi += step) pts.push({ x: xi, y: a * xi * xi + bC * xi + c });

  return { equation: `y = ${a.toFixed(4)}x² ${bC >= 0 ? '+' : ''}${bC.toFixed(4)}x ${c >= 0 ? '+' : ''}${c.toFixed(4)}`, type: 'Quadratic', r2, coefficients: [a, bC, c], description: 'Quadratic relationship: y = ax² + bx + c (parabolic motion)', descriptionAr: 'علاقة تربيعية: y = ax² + bx + c (حركة قطع مكافئ)', predictedPoints: pts };
}

function tryPower(data: DataPoint[]): DiscoveredLaw | null {
  // y = a * x^b → log(y) = log(a) + b*log(x)
  const n = data.length;
  if (n < 2) return null;
  const logData = data.filter(d => d.x > 0 && d.y > 0).map(d => ({ x: Math.log(d.x), y: Math.log(d.y) }));
  if (logData.length < 2) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const { x, y } of logData) { sumX += x; sumY += y; sumXY += x * y; sumXX += x * x; }
  const denom = logData.length * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return null;
  const b = (logData.length * sumXY - sumX * sumY) / denom;
  const logA = (sumY - b * sumX) / logData.length;
  const a = Math.exp(logA);

  const yMean = data.reduce((s, d) => s + d.y, 0) / n;
  let ssRes = 0, ssTot = 0;
  for (const d of data) {
    const yPred = d.x > 0 ? a * Math.pow(d.x, b) : 0;
    ssRes += (d.y - yPred) ** 2;
    ssTot += (d.y - yMean) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  const xMin = Math.max(0.01, Math.min(...data.map(d => d.x)));
  const xMax = Math.max(...data.map(d => d.x));
  const step = (xMax - xMin) / 100 || 0.01;
  const pts = [];
  for (let xi = xMin; xi <= xMax; xi += step) pts.push({ x: xi, y: a * Math.pow(xi, b) });

  return { equation: `y = ${a.toFixed(4)} × x^${b.toFixed(4)}`, type: 'Power Law', r2, coefficients: [a, b], description: `Power law: y = a·x^b (exponent ≈ ${b.toFixed(2)})`, descriptionAr: `قانون القوة: y = a·x^b (الأس ≈ ${b.toFixed(2)})`, predictedPoints: pts };
}

function tryExponential(data: DataPoint[]): DiscoveredLaw | null {
  // y = a * e^(bx) → log(y) = log(a) + bx
  const n = data.length;
  if (n < 2) return null;
  const logData = data.filter(d => d.y > 0).map(d => ({ x: d.x, y: Math.log(d.y) }));
  if (logData.length < 2) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const { x, y } of logData) { sumX += x; sumY += y; sumXY += x * y; sumXX += x * x; }
  const denom = logData.length * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return null;
  const b = (logData.length * sumXY - sumX * sumY) / denom;
  const logA = (sumY - b * sumX) / logData.length;
  const a = Math.exp(logA);

  const yMean = data.reduce((s, d) => s + d.y, 0) / n;
  let ssRes = 0, ssTot = 0;
  for (const d of data) { ssRes += (d.y - a * Math.exp(b * d.x)) ** 2; ssTot += (d.y - yMean) ** 2; }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  const xMin = Math.min(...data.map(d => d.x));
  const xMax = Math.max(...data.map(d => d.x));
  const step = (xMax - xMin) / 100 || 0.01;
  const pts = [];
  for (let xi = xMin; xi <= xMax; xi += step) pts.push({ x: xi, y: a * Math.exp(b * xi) });

  return { equation: `y = ${a.toFixed(4)} × e^(${b.toFixed(4)}x)`, type: 'Exponential', r2, coefficients: [a, b], description: 'Exponential growth/decay: y = a·e^(bx)', descriptionAr: 'نمو/تناقص أسي: y = a·e^(bx)', predictedPoints: pts };
}

function trySqrt(data: DataPoint[]): DiscoveredLaw | null {
  // y = a * sqrt(x) + b
  const n = data.length;
  if (n < 2) return null;
  const sqrtData = data.filter(d => d.x >= 0).map(d => ({ x: Math.sqrt(d.x), y: d.y }));
  if (sqrtData.length < 2) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const { x, y } of sqrtData) { sumX += x; sumY += y; sumXY += x * y; sumXX += x * x; }
  const denom = sqrtData.length * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return null;
  const a = (sqrtData.length * sumXY - sumX * sumY) / denom;
  const b = (sumY - a * sumX) / sqrtData.length;

  const yMean = data.reduce((s, d) => s + d.y, 0) / n;
  let ssRes = 0, ssTot = 0;
  for (const d of data) {
    const yPred = d.x >= 0 ? a * Math.sqrt(d.x) + b : b;
    ssRes += (d.y - yPred) ** 2; ssTot += (d.y - yMean) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  const xMin = Math.max(0, Math.min(...data.map(d => d.x)));
  const xMax = Math.max(...data.map(d => d.x));
  const step = (xMax - xMin) / 100 || 0.01;
  const pts = [];
  for (let xi = xMin; xi <= xMax; xi += step) pts.push({ x: xi, y: a * Math.sqrt(xi) + b });

  return { equation: `y = ${a.toFixed(4)}√x ${b >= 0 ? '+' : ''}${b.toFixed(4)}`, type: 'Square Root', r2, coefficients: [a, b], description: 'Square root relationship: y = a√x + b', descriptionAr: 'علاقة الجذر التربيعي: y = a√x + b', predictedPoints: pts };
}

function tryInverse(data: DataPoint[]): DiscoveredLaw | null {
  // y = a/x + b
  const n = data.length;
  if (n < 2) return null;
  const invData = data.filter(d => Math.abs(d.x) > 1e-8).map(d => ({ x: 1 / d.x, y: d.y }));
  if (invData.length < 2) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const { x, y } of invData) { sumX += x; sumY += y; sumXY += x * y; sumXX += x * x; }
  const denom = invData.length * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return null;
  const a = (invData.length * sumXY - sumX * sumY) / denom;
  const b = (sumY - a * sumX) / invData.length;

  const yMean = data.reduce((s, d) => s + d.y, 0) / n;
  let ssRes = 0, ssTot = 0;
  for (const d of data) {
    const yPred = Math.abs(d.x) > 1e-8 ? a / d.x + b : b;
    ssRes += (d.y - yPred) ** 2; ssTot += (d.y - yMean) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  const xMin = Math.max(0.01, Math.min(...data.map(d => d.x)));
  const xMax = Math.max(...data.map(d => d.x));
  const step = (xMax - xMin) / 100 || 0.01;
  const pts = [];
  for (let xi = xMin; xi <= xMax; xi += step) pts.push({ x: xi, y: a / xi + b });

  return { equation: `y = ${a.toFixed(4)}/x ${b >= 0 ? '+' : ''}${b.toFixed(4)}`, type: 'Inverse', r2, coefficients: [a, b], description: 'Inverse relationship: y = a/x + b', descriptionAr: 'علاقة عكسية: y = a/x + b', predictedPoints: pts };
}

const MODEL_COLORS: Record<string, string> = {
  'Linear': '#3b82f6',
  'Quadratic': '#ef4444',
  'Power Law': '#22c55e',
  'Exponential': '#f59e0b',
  'Square Root': '#8b5cf6',
  'Inverse': '#ec4899',
};

export default function AILawDiscovery({ lang, muted, trajectoryData }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [newX, setNewX] = useState('');
  const [newY, setNewY] = useState('');
  const [discoveredLaws, setDiscoveredLaws] = useState<DiscoveredLaw[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [bestLaw, setBestLaw] = useState<DiscoveredLaw | null>(null);
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);

  const isAr = lang === 'ar';

  const addPoint = () => {
    const x = parseFloat(newX);
    const y = parseFloat(newY);
    if (isNaN(x) || isNaN(y)) return;
    setDataPoints(prev => [...prev, { x, y }]);
    setNewX('');
    setNewY('');
  };

  const loadFromTrajectory = () => {
    if (!trajectoryData || trajectoryData.length === 0) return;
    const sampled = trajectoryData.filter((_, i) => i % 5 === 0).map(p => ({ x: p.x, y: p.y }));
    setDataPoints(sampled);
    toast.success(isAr ? `تم تحميل ${sampled.length} نقطة` : `Loaded ${sampled.length} points`);
  };

  const discoverLaws = useCallback(async () => {
    if (dataPoints.length < 3) {
      toast.error(isAr ? 'أدخل 3 نقاط على الأقل' : 'Enter at least 3 data points');
      return;
    }

    setIsAnalyzing(true);
    setDiscoveredLaws([]);
    setBestLaw(null);

    // Simulate analysis time for UX
    await new Promise(r => setTimeout(r, 800));

    const candidates: (DiscoveredLaw | null)[] = [
      tryLinear(dataPoints),
      tryQuadratic(dataPoints),
      tryPower(dataPoints),
      tryExponential(dataPoints),
      trySqrt(dataPoints),
      tryInverse(dataPoints),
    ];

    const validLaws = candidates.filter((c): c is DiscoveredLaw => c !== null && isFinite(c.r2) && c.r2 > -10);
    validLaws.sort((a, b) => b.r2 - a.r2);

    setDiscoveredLaws(validLaws);
    if (validLaws.length > 0) {
      setBestLaw(validLaws[0]);
      toast.success(isAr ? `تم اكتشاف ${validLaws.length} قوانين محتملة` : `Discovered ${validLaws.length} candidate laws`);
    } else {
      toast.error(isAr ? 'لم يتم العثور على قوانين مناسبة' : 'No suitable laws found');
    }

    setIsAnalyzing(false);
  }, [dataPoints, isAr]);

  // Draw chart
  useEffect(() => {
    const canvas = chartCanvasRef.current;
    if (!canvas || dataPoints.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const pad = 40;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.02)';
    ctx.fillRect(0, 0, W, H);

    const allX = dataPoints.map(d => d.x);
    const allY = dataPoints.map(d => d.y);
    let xMin = Math.min(...allX), xMax = Math.max(...allX);
    let yMin = Math.min(...allY), yMax = Math.max(...allY);
    const xPad = Math.max((xMax - xMin) * 0.1, 0.1);
    const yPad = Math.max((yMax - yMin) * 0.1, 0.1);
    xMin -= xPad; xMax += xPad; yMin -= yPad; yMax += yPad;

    const toCanvasX = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad);
    const toCanvasY = (y: number) => H - pad - ((y - yMin) / (yMax - yMin)) * (H - 2 * pad);

    // Grid
    ctx.strokeStyle = 'rgba(128,128,128,0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const x = pad + (i / 5) * (W - 2 * pad);
      const y = pad + (i / 5) * (H - 2 * pad);
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, H - pad); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
    }

    // Draw discovered laws (best first = thicker)
    discoveredLaws.forEach((law, idx) => {
      const color = MODEL_COLORS[law.type] || '#888';
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = idx === 0 ? 3 : 1.5;
      ctx.globalAlpha = idx === 0 ? 1 : 0.4;
      for (let i = 0; i < law.predictedPoints.length; i++) {
        const p = law.predictedPoints[i];
        const cx = toCanvasX(p.x);
        const cy = toCanvasY(p.y);
        if (cy < pad - 10 || cy > H - pad + 10) continue;
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // Draw data points on top
    for (const pt of dataPoints) {
      ctx.beginPath();
      ctx.arc(toCanvasX(pt.x), toCanvasY(pt.y), 5, 0, Math.PI * 2);
      ctx.fillStyle = 'hsl(var(--foreground))';
      ctx.fill();
      ctx.strokeStyle = 'hsl(var(--background))';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [dataPoints, discoveredLaws]);

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-primary/5 transition-all duration-300"
      >
        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          {isAr ? 'اكتشاف القوانين بالذكاء الاصطناعي' : 'AI Law Discovery'}
        </span>
        <div className="flex items-center gap-2">
          {bestLaw && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">
              {bestLaw.type}
            </span>
          )}
          <svg className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 border-t border-border space-y-4 pt-3 animate-slideDown">
          {/* Description */}
          <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-purple-500/20">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {isAr
                  ? 'أدخل بياناتك وسيحاول النظام اكتشاف القانون الفيزيائي الأنسب تلقائياً (Symbolic Regression). يختبر عدة نماذج: خطي، تربيعي، أسي، قوة، جذر تربيعي، ومعكوس.'
                  : 'Enter your data and the system will automatically discover the best-fit physical law (Symbolic Regression). It tests multiple models: linear, quadratic, exponential, power, square root, and inverse.'}
              </p>
            </div>
          </div>

          {/* Data input */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex gap-1">
                <input
                  type="number"
                  placeholder="x"
                  value={newX}
                  onChange={e => setNewX(e.target.value)}
                  className="flex-1 text-xs font-mono px-2 py-1.5 rounded border border-border bg-background min-w-0"
                  dir="ltr"
                  onKeyDown={e => e.key === 'Enter' && addPoint()}
                />
                <input
                  type="number"
                  placeholder="y"
                  value={newY}
                  onChange={e => setNewY(e.target.value)}
                  className="flex-1 text-xs font-mono px-2 py-1.5 rounded border border-border bg-background min-w-0"
                  dir="ltr"
                  onKeyDown={e => e.key === 'Enter' && addPoint()}
                />
              </div>
              <button onClick={addPoint} className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {trajectoryData && trajectoryData.length > 0 && (
                <button onClick={loadFromTrajectory} className="text-[10px] px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-all">
                  {isAr ? 'تحميل من المسار' : 'Load from trajectory'}
                </button>
              )}
              {dataPoints.length > 0 && (
                <button onClick={() => { setDataPoints([]); setDiscoveredLaws([]); setBestLaw(null); }} className="text-[10px] px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-all">
                  <RotateCcw className="w-3 h-3 inline mr-0.5" />
                  {isAr ? 'مسح' : 'Clear'}
                </button>
              )}
            </div>

            {/* Data points chips */}
            {dataPoints.length > 0 && (
              <div className="max-h-[60px] overflow-y-auto flex flex-wrap gap-1">
                {dataPoints.map((pt, i) => (
                  <span key={i} className="inline-flex items-center gap-0.5 text-[9px] font-mono bg-secondary/50 rounded px-1.5 py-0.5 group">
                    ({pt.x}, {pt.y})
                    <button onClick={() => setDataPoints(prev => prev.filter((_, j) => j !== i))} className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-2.5 h-2.5 text-muted-foreground hover:text-red-500" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Discover button */}
          <button
            onClick={discoverLaws}
            disabled={isAnalyzing || dataPoints.length < 3}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-medium text-xs shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isAr ? 'جاري التحليل...' : 'Analyzing...'}
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                {isAr ? 'اكتشف القانون' : 'Discover Law'}
              </>
            )}
          </button>

          {/* Chart */}
          {dataPoints.length >= 2 && (
            <div className="border border-border rounded-lg overflow-hidden bg-secondary/10">
              <canvas ref={chartCanvasRef} width={500} height={260} className="w-full h-[260px]" />
              {/* Legend */}
              {discoveredLaws.length > 0 && (
                <div className="flex flex-wrap gap-2 px-3 py-2 border-t border-border text-[9px]">
                  {discoveredLaws.slice(0, 4).map(law => (
                    <span key={law.type} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: MODEL_COLORS[law.type] }} />
                      {law.type}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {discoveredLaws.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />
                {isAr ? 'القوانين المكتشفة (مرتبة بالدقة)' : 'Discovered Laws (ranked by fit)'}
              </p>

              {discoveredLaws.map((law, idx) => (
                <div
                  key={law.type}
                  className={`p-3 rounded-lg border transition-all duration-200 ${
                    idx === 0
                      ? 'border-green-500/40 bg-green-500/5 ring-1 ring-green-500/20'
                      : 'border-border bg-secondary/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: MODEL_COLORS[law.type] }} />
                    <span className="text-xs font-semibold text-foreground">{law.type}</span>
                    {idx === 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-600 font-medium">
                        {isAr ? 'الأفضل' : 'Best Fit'}
                      </span>
                    )}
                    <span className={`ml-auto text-[10px] font-mono ${law.r2 >= 0.95 ? 'text-green-600' : law.r2 >= 0.85 ? 'text-yellow-600' : 'text-red-600'}`}>
                      R²={law.r2.toFixed(6)}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-foreground bg-background/60 rounded px-2 py-1 mb-1">{law.equation}</p>
                  <p className="text-[10px] text-muted-foreground">{isAr ? law.descriptionAr : law.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
