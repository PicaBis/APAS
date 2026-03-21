import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TrendingUp, Plus, Trash2, RotateCcw, Download, X } from 'lucide-react';
import { toast } from 'sonner';

interface DataPoint {
  x: number;
  y: number;
}

interface RegressionResult {
  type: 'linear' | 'quadratic';
  coefficients: number[];
  r2: number;
  equation: string;
  predictedPoints: Array<{ x: number; y: number }>;
}

interface Props {
  lang: string;
  muted: boolean;
  trajectoryData?: Array<{ x: number; y: number; time: number }>;
}

// Solve linear system using Gaussian elimination
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  const aug = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    if (Math.abs(aug[col][col]) < 1e-12) continue;

    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) aug[row][j] -= factor * aug[col][j];
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = aug[i][n];
    for (let j = i + 1; j < n; j++) x[i] -= aug[i][j] * x[j];
    x[i] /= aug[i][i];
  }
  return x;
}

function linearRegression(data: DataPoint[]): RegressionResult {
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const { x, y } of data) {
    sumX += x; sumY += y; sumXY += x * y; sumXX += x * x;
  }
  const denom = n * sumXX - sumX * sumX;
  const a = (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - a * sumX) / n;

  const yMean = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (const { x, y } of data) {
    const yPred = a * x + b;
    ssRes += (y - yPred) ** 2;
    ssTot += (y - yMean) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  const xMin = Math.min(...data.map(d => d.x));
  const xMax = Math.max(...data.map(d => d.x));
  const step = (xMax - xMin) / 100;
  const predictedPoints = [];
  for (let x = xMin; x <= xMax; x += step) {
    predictedPoints.push({ x, y: a * x + b });
  }

  return {
    type: 'linear',
    coefficients: [a, b],
    r2,
    equation: `y = ${a.toFixed(4)}x ${b >= 0 ? '+' : ''}${b.toFixed(4)}`,
    predictedPoints,
  };
}

function quadraticRegression(data: DataPoint[]): RegressionResult {
  const n = data.length;
  // Solve normal equations for ax² + bx + c
  const sums = { x: 0, x2: 0, x3: 0, x4: 0, y: 0, xy: 0, x2y: 0 };
  for (const { x, y } of data) {
    const x2 = x * x;
    sums.x += x; sums.x2 += x2; sums.x3 += x2 * x; sums.x4 += x2 * x2;
    sums.y += y; sums.xy += x * y; sums.x2y += x2 * y;
  }

  const A = [
    [sums.x4, sums.x3, sums.x2],
    [sums.x3, sums.x2, sums.x],
    [sums.x2, sums.x, n],
  ];
  const b = [sums.x2y, sums.xy, sums.y];
  const [a, bCoeff, c] = solveLinearSystem(A, b);

  const yMean = sums.y / n;
  let ssRes = 0, ssTot = 0;
  for (const { x, y } of data) {
    const yPred = a * x * x + bCoeff * x + c;
    ssRes += (y - yPred) ** 2;
    ssTot += (y - yMean) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  const xMin = Math.min(...data.map(d => d.x));
  const xMax = Math.max(...data.map(d => d.x));
  const step = (xMax - xMin) / 100;
  const predictedPoints = [];
  for (let x = xMin; x <= xMax; x += step) {
    predictedPoints.push({ x, y: a * x * x + bCoeff * x + c });
  }

  return {
    type: 'quadratic',
    coefficients: [a, bCoeff, c],
    r2,
    equation: `y = ${a.toFixed(4)}x² ${bCoeff >= 0 ? '+' : ''}${bCoeff.toFixed(4)}x ${c >= 0 ? '+' : ''}${c.toFixed(4)}`,
    predictedPoints,
  };
}

export default function RegressionTool({ lang, muted, trajectoryData }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [newX, setNewX] = useState('');
  const [newY, setNewY] = useState('');
  const [results, setResults] = useState<{ linear: RegressionResult | null; quadratic: RegressionResult | null }>({ linear: null, quadratic: null });
  const [selectedFit, setSelectedFit] = useState<'linear' | 'quadratic' | 'both'>('both');
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
    // Sample every 5th point to avoid too many
    const sampled = trajectoryData.filter((_, i) => i % 5 === 0).map(p => ({ x: p.x, y: p.y }));
    setDataPoints(sampled);
    toast.success(isAr ? `تم تحميل ${sampled.length} نقطة` : `Loaded ${sampled.length} points`);
  };

  const runRegression = useCallback(() => {
    if (dataPoints.length < 2) {
      toast.error(isAr ? 'أدخل نقطتين على الأقل' : 'Enter at least 2 points');
      return;
    }
    const linear = linearRegression(dataPoints);
    const quadratic = dataPoints.length >= 3 ? quadraticRegression(dataPoints) : null;
    setResults({ linear, quadratic });
  }, [dataPoints, isAr]);

  // Auto-run regression when data changes
  useEffect(() => {
    if (dataPoints.length >= 2) runRegression();
  }, [dataPoints, runRegression]);

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
    ctx.strokeStyle = 'rgba(128,128,128,0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const x = pad + (i / 5) * (W - 2 * pad);
      const y = pad + (i / 5) * (H - 2 * pad);
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, H - pad); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
    }

    // Axes labels
    ctx.fillStyle = 'rgba(128,128,128,0.6)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
      const xVal = xMin + (i / 5) * (xMax - xMin);
      const yVal = yMax - (i / 5) * (yMax - yMin);
      ctx.fillText(xVal.toFixed(1), pad + (i / 5) * (W - 2 * pad), H - pad + 15);
      ctx.fillText(yVal.toFixed(1), pad - 5, pad + (i / 5) * (H - 2 * pad) + 4);
    }

    // Draw regression lines
    if ((selectedFit === 'linear' || selectedFit === 'both') && results.linear) {
      ctx.beginPath();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      for (let i = 0; i < results.linear.predictedPoints.length; i++) {
        const p = results.linear.predictedPoints[i];
        const cx = toCanvasX(p.x);
        const cy = toCanvasY(p.y);
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    if ((selectedFit === 'quadratic' || selectedFit === 'both') && results.quadratic) {
      ctx.beginPath();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      for (let i = 0; i < results.quadratic.predictedPoints.length; i++) {
        const p = results.quadratic.predictedPoints[i];
        const cx = toCanvasX(p.x);
        const cy = toCanvasY(p.y);
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    // Draw data points
    for (const pt of dataPoints) {
      ctx.beginPath();
      ctx.arc(toCanvasX(pt.x), toCanvasY(pt.y), 5, 0, Math.PI * 2);
      ctx.fillStyle = 'hsl(var(--foreground))';
      ctx.fill();
      ctx.strokeStyle = 'hsl(var(--background))';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [dataPoints, results, selectedFit]);

  const exportCSV = () => {
    if (dataPoints.length === 0) return;
    const header = 'x,y\n';
    const rows = dataPoints.map(d => `${d.x},${d.y}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `regression_data_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`border border-border/50 rounded-xl overflow-hidden bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 ${isOpen ? '' : ''}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-primary/5 transition-all duration-300"
      >
        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          {isAr ? 'أداة الانحدار' : 'Regression Tool'}
        </span>
        <div className="flex items-center gap-2">
          {results.linear && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
              R²={results.linear.r2.toFixed(4)}
            </span>
          )}
          <svg className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 border-t border-border space-y-4 pt-3 animate-slideDown">
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
              <button onClick={addPoint} className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all" title={isAr ? 'إضافة نقطة' : 'Add point'}>
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex gap-1.5">
              {trajectoryData && trajectoryData.length > 0 && (
                <button onClick={loadFromTrajectory} className="text-[10px] px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-all">
                  {isAr ? 'تحميل من المسار' : 'Load from trajectory'}
                </button>
              )}
              {dataPoints.length > 0 && (
                <>
                  <button onClick={() => setDataPoints([])} className="text-[10px] px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-all">
                    <RotateCcw className="w-3 h-3 inline mr-0.5" />
                    {isAr ? 'مسح' : 'Clear'}
                  </button>
                  <button onClick={exportCSV} className="text-[10px] px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-all">
                    <Download className="w-3 h-3 inline mr-0.5" />
                    CSV
                  </button>
                </>
              )}
            </div>

            {/* Data points list */}
            {dataPoints.length > 0 && (
              <div className="max-h-[80px] overflow-y-auto flex flex-wrap gap-1">
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

          {/* Fit type selector */}
          <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg">
            {([
              { id: 'linear' as const, label: isAr ? 'خطي' : 'Linear', color: 'bg-blue-500' },
              { id: 'quadratic' as const, label: isAr ? 'تربيعي' : 'Quadratic', color: 'bg-red-500' },
              { id: 'both' as const, label: isAr ? 'الكل' : 'Both', color: 'bg-primary' },
            ]).map(fit => (
              <button
                key={fit.id}
                onClick={() => setSelectedFit(fit.id)}
                className={`flex-1 text-xs py-1.5 rounded-md transition-all duration-200 flex items-center justify-center gap-1 ${
                  selectedFit === fit.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'hover:bg-secondary text-muted-foreground'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${fit.color}`} />
                {fit.label}
              </button>
            ))}
          </div>

          {/* Chart */}
          {dataPoints.length >= 2 && (
            <div className="border border-border rounded-lg overflow-hidden bg-secondary/10">
              <canvas ref={chartCanvasRef} width={500} height={280} className="w-full h-[280px]" />
            </div>
          )}

          {/* Results */}
          {results.linear && (
            <div className="space-y-2">
              {(selectedFit === 'linear' || selectedFit === 'both') && results.linear && (
                <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-xs font-semibold text-foreground">{isAr ? 'الانحدار الخطي' : 'Linear Regression'}</span>
                  </div>
                  <p className="text-xs font-mono text-foreground bg-background/60 rounded px-2 py-1 mb-1">{results.linear.equation}</p>
                  <div className="flex gap-3 text-[10px]">
                    <span className="text-muted-foreground">R² = <span className={`font-mono font-semibold ${results.linear.r2 >= 0.95 ? 'text-green-600' : results.linear.r2 >= 0.85 ? 'text-yellow-600' : 'text-red-600'}`}>{results.linear.r2.toFixed(6)}</span></span>
                    <span className="text-muted-foreground">{isAr ? 'الميل' : 'Slope'} = <span className="font-mono font-semibold text-foreground">{results.linear.coefficients[0].toFixed(4)}</span></span>
                  </div>
                </div>
              )}

              {(selectedFit === 'quadratic' || selectedFit === 'both') && results.quadratic && (
                <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-xs font-semibold text-foreground">{isAr ? 'الانحدار التربيعي' : 'Quadratic Regression'}</span>
                  </div>
                  <p className="text-xs font-mono text-foreground bg-background/60 rounded px-2 py-1 mb-1">{results.quadratic.equation}</p>
                  <div className="flex gap-3 text-[10px]">
                    <span className="text-muted-foreground">R² = <span className={`font-mono font-semibold ${results.quadratic.r2 >= 0.95 ? 'text-green-600' : results.quadratic.r2 >= 0.85 ? 'text-yellow-600' : 'text-red-600'}`}>{results.quadratic.r2.toFixed(6)}</span></span>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-1.5 pt-1 border-t border-border">
                    {isAr ? 'يثبت أن:' : 'Proves that:'} y = ax² + bx + c
                  </p>
                </div>
              )}

              {/* Comparison */}
              {selectedFit === 'both' && results.quadratic && (
                <div className="p-2 rounded bg-secondary/30 text-center text-[10px] text-muted-foreground">
                  {results.quadratic.r2 > results.linear.r2
                    ? (isAr ? 'النموذج التربيعي أفضل ملاءمة' : 'Quadratic fit is better')
                    : (isAr ? 'النموذج الخطي أفضل ملاءمة' : 'Linear fit is better')
                  }
                  {' '} (ΔR² = {Math.abs(results.quadratic.r2 - results.linear.r2).toFixed(6)})
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
