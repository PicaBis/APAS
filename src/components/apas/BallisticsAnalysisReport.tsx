/**
 * Ballistics Analysis Report — Professional output display for the
 * 4-Stage Ballistics Intelligence Engine results.
 *
 * Displays:
 * - Telemetry Table (Raw vs Smoothed)
 * - Velocity vs Time / Altitude vs Time data
 * - Energy Analysis
 * - Drag Analysis
 * - Uncertainty & Confidence Score
 */

import React, { useState, useMemo } from 'react';
import {
  Activity, Crosshair, Gauge, Zap, Shield, TrendingUp, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, BarChart3, Flame, Wind, Target, FileText, Copy, Check,
} from 'lucide-react';
import type { BallisticsAnalysisResult, CalibratedPoint } from '@/utils/ballisticsEngine';

interface Props {
  result: BallisticsAnalysisResult;
  lang: string;
}

/** Localization helper */
const tl = (lang: string, ar: string, en: string) => lang === 'ar' ? ar : en;

/** Format number with specified decimals */
const fmt = (n: number, decimals = 2) => {
  if (!isFinite(n)) return '—';
  return n.toFixed(decimals);
};

/** Confidence color */
const confidenceColor = (score: number) => {
  if (score >= 70) return 'text-green-500';
  if (score >= 40) return 'text-yellow-500';
  return 'text-red-500';
};

const confidenceBg = (score: number) => {
  if (score >= 70) return 'bg-green-500/10 border-green-500/30';
  if (score >= 40) return 'bg-yellow-500/10 border-yellow-500/30';
  return 'bg-red-500/10 border-red-500/30';
};

// ═══ SUB-COMPONENTS ═══

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  badge?: string;
  badgeColor?: string;
  expanded: boolean;
  onToggle: () => void;
}> = ({ icon, title, badge, badgeColor, expanded, onToggle }) => (
  <button
    onClick={onToggle}
    className="w-full flex items-center justify-between p-3 hover:bg-secondary/30 transition-colors rounded-lg"
  >
    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
      {icon}
      {title}
      {badge && (
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${badgeColor || 'bg-primary/10 text-primary'}`}>
          {badge}
        </span>
      )}
    </div>
    {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
  </button>
);

const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  sublabel?: string;
}> = ({ icon, label, value, unit, sublabel }) => (
  <div className="p-2.5 rounded-lg border border-border/50 bg-card/50 hover:bg-card/80 transition-colors">
    <div className="flex items-center gap-1.5 mb-1">
      {icon}
      <span className="text-[9px] text-muted-foreground font-medium">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-lg font-bold text-foreground font-mono">{value}</span>
      <span className="text-[9px] text-muted-foreground">{unit}</span>
    </div>
    {sublabel && <span className="text-[8px] text-muted-foreground/70">{sublabel}</span>}
  </div>
);

/** Generate professional report text with Markdown & LaTeX formatting */
function generateProfessionalReport(result: BallisticsAnalysisResult, lang: string): string {
  const isAr = lang === 'ar';
  const g = 9.81;
  const v0 = result.initialVelocity;
  const theta = result.launchAngle;
  // Launch height: derive from first calibrated point's altitude relative to minimum
  const minY = result.calibratedPoints.length > 0
    ? Math.min(...result.calibratedPoints.map(p => p.yM))
    : 0;
  const h0 = result.calibratedPoints.length > 0
    ? result.calibratedPoints[0].yM - minY
    : 0;
  const yMax = result.maxAltitude;
  const xMax = result.range;
  const tFlight = result.timeOfFlight;
  const K = result.pixelsToMetersRatio;
  const conf = result.verification.confidenceScore;
  const calSrc = result.calibrationSource === 'user'
    ? (isAr ? 'مرجع المستخدم' : 'User Reference')
    : result.calibrationSource === 'auto'
    ? (isAr ? 'كشف تلقائي' : 'Auto-Detected')
    : (isAr ? 'تقدير افتراضي (8م)' : 'Default Estimate (8m FOV)');
  const calDetail = result.calibrationDetail || '';

  const lines = [
    `# ${isAr ? '\u{1F4CA} تقرير تحليل APAS AI' : '\u{1F4CA} APAS AI Analysis Report'}`,
    `**Engine v${result.engineVersion}** | ${result.processingTimeMs}ms | ${result.trackingResult.detectedFrames}/${result.trackingResult.totalFrames} ${isAr ? 'إطار' : 'frames'}`,
    '',
    `## ${isAr ? 'الحالة الابتدائية' : 'Initial State'}`,
    '',
    `| ${isAr ? 'المتغير' : 'Parameter'} | ${isAr ? 'القيمة' : 'Value'} |`,
    '|---|---|',
    `| $v_0$ | **${fmt(v0, 1)}** m/s |`,
    `| $\\theta$ | **${fmt(theta, 1)}**° |`,
    `| $h_0$ | **${fmt(h0, 1)}** m |`,
    `| $m$ | **${fmt(result.estimatedMass, 2)}** kg |`,
    '',
    `## ${isAr ? 'النمذجة الحركية' : 'Kinematic Modeling'}`,
    '',
    '$$x(t) = v_0 \\cos(\\theta) \\cdot t$$',
    '',
    '$$y(t) = h_0 + v_0 \\sin(\\theta) \\cdot t - \\frac{1}{2}g t^2$$',
    '',
    `$v_0 = ${fmt(v0, 1)}$ m/s, $\\theta = ${fmt(theta, 1)}°$, $g = ${fmt(g, 2)}$ m/s²`,
    '',
    `## ${isAr ? 'توقع المسار' : 'Flight Prediction'}`,
    '',
    `| ${isAr ? 'المقياس' : 'Metric'} | ${isAr ? 'القيمة' : 'Value'} |`,
    '|---|---|',
    `| ${isAr ? 'أقصى ارتفاع' : 'Peak Altitude'} ($y_{max}$) | **${fmt(yMax, 2)}** m |`,
    `| ${isAr ? 'المدى' : 'Range'} ($x_{max}$) | **${fmt(xMax, 2)}** m |`,
    `| ${isAr ? 'زمن الطيران' : 'Time of Flight'} | **${fmt(tFlight, 2)}** s |`,
    `| ${isAr ? 'سرعة الاصطدام' : 'Impact Velocity'} | **${fmt(result.impactVelocity, 1)}** m/s |`,
    '',
    `## ${isAr ? 'الثقة والمعايرة' : 'Confidence & Calibration'}`,
    '',
    `| ${isAr ? 'البند' : 'Item'} | ${isAr ? 'القيمة' : 'Value'} |`,
    '|---|---|',
    `| ${isAr ? 'نسبة المقياس' : 'Scale Ratio'} ($K$) | **${fmt(K * 1000, 2)}** mm/px |`,
    `| ${isAr ? 'مستوى الثقة' : 'Confidence Level'} | **${conf}%** |`,
    `| ${isAr ? 'مصدر المعايرة' : 'Calibration Source'} | ${calSrc} |`,
    calDetail ? `| ${isAr ? 'تفاصيل' : 'Detail'} | ${calDetail} |` : '',
    `| $R^2$ | ${fmt(result.polynomialFit.rSquared, 4)} |`,
    `| RMSE | ${fmt(result.polynomialFit.rmse, 3)} m |`,
  ];

  return lines.filter(l => l !== '').join('\n');
}

export default function BallisticsAnalysisReport({ result, lang }: Props) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    report: true,
    physics: true,
    telemetry: false,
    energy: false,
    drag: false,
    verification: true,
  });
  const [copied, setCopied] = useState(false);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isAr = lang === 'ar';

  const reportText = useMemo(() => generateProfessionalReport(result, lang), [result, lang]);

  const copyReport = () => {
    navigator.clipboard.writeText(reportText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  // Prepare telemetry data for display (show max 20 rows)
  const telemetryRows = useMemo(() => {
    const raw = result.rawTelemetry;
    const smoothed = result.smoothedTelemetry;
    const step = Math.max(1, Math.floor(raw.length / 20));
    const rows: Array<{
      frame: number;
      timestamp: number;
      rawX: number; rawY: number;
      smoothX: number; smoothY: number;
      velocity: number;
      acceleration: number;
      source: string;
      confidence: number;
    }> = [];

    for (let i = 0; i < raw.length; i += step) {
      const r = raw[i];
      const s = smoothed[i] || r;
      rows.push({
        frame: r.frame,
        timestamp: r.timestamp,
        rawX: r.x, rawY: r.y,
        smoothX: s.x, smoothY: s.y,
        velocity: s.velocityPxS,
        acceleration: s.accelerationPxS2,
        source: r.source,
        confidence: r.confidence,
      });
    }
    return rows;
  }, [result.rawTelemetry, result.smoothedTelemetry]);

  // Velocity timeline for chart data
  const velocityTimeline = useMemo(() => {
    return result.calibratedPoints
      .filter((_: CalibratedPoint, i: number) => i % Math.max(1, Math.floor(result.calibratedPoints.length / 30)) === 0)
      .map((p: CalibratedPoint) => ({
        t: p.timestamp,
        speed: p.speedMs,
        vx: p.vxMs,
        vy: p.vyMs,
      }));
  }, [result.calibratedPoints]);

  // Altitude timeline
  const altitudeTimeline = useMemo(() => {
    const minY = Math.min(...result.calibratedPoints.map((p: CalibratedPoint) => p.yM));
    return result.calibratedPoints
      .filter((_: CalibratedPoint, i: number) => i % Math.max(1, Math.floor(result.calibratedPoints.length / 30)) === 0)
      .map((p: CalibratedPoint) => ({
        t: p.timestamp,
        altitude: p.yM - minY,
      }));
  }, [result.calibratedPoints]);

  const { verification } = result;

  return (
    <div className="space-y-3" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ═══ HEADER: CONFIDENCE SCORE ═══ */}
      <div className={`p-3 rounded-xl border ${confidenceBg(verification.confidenceScore)} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Shield className={`w-5 h-5 ${confidenceColor(verification.confidenceScore)}`} />
          <div>
            <p className="text-xs font-bold text-foreground">
              {tl(lang, 'محرك التحليل الباليستي', 'Ballistics Intelligence Engine')}
              <span className="text-[9px] font-normal text-muted-foreground ml-2">v{result.engineVersion}</span>
            </p>
            <p className="text-[9px] text-muted-foreground">
              {tl(lang, `معالجة في ${result.processingTimeMs}ms | ${result.trackingResult.detectedFrames}/${result.trackingResult.totalFrames} إطار`, 
                  `Processed in ${result.processingTimeMs}ms | ${result.trackingResult.detectedFrames}/${result.trackingResult.totalFrames} frames tracked`)}
            </p>
          </div>
        </div>
        <div className="text-center">
          <p className={`text-2xl font-black font-mono ${confidenceColor(verification.confidenceScore)}`}>
            {verification.confidenceScore}%
          </p>
          <p className="text-[8px] text-muted-foreground">
            {tl(lang, 'درجة الثقة', 'Confidence')}
          </p>
        </div>
      </div>

      {/* ═══ PROFESSIONAL REPORT ═══ */}
      <div>
        <SectionHeader
          icon={<FileText className="w-4 h-4 text-indigo-500" />}
          title={tl(lang, 'التقرير المهني', 'Professional Report')}
          badge="MD + LaTeX"
          badgeColor="bg-indigo-500/10 text-indigo-600"
          expanded={expandedSections.report}
          onToggle={() => toggleSection('report')}
        />
        {expandedSections.report && (
          <div className="px-1 pb-2">
            <div className="relative rounded-lg border border-border/50 bg-card/30 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/30 border-b border-border/30">
                <span className="text-[9px] text-muted-foreground font-mono">report.md</span>
                <button
                  onClick={copyReport}
                  className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
                  title={isAr ? 'نسخ التقرير' : 'Copy Report'}
                >
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copied ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}
                </button>
              </div>
              <pre className="p-3 text-[9px] font-mono text-foreground/90 whitespace-pre-wrap overflow-x-auto max-h-[400px] overflow-y-auto leading-relaxed">
                {reportText}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* ═══ PHYSICS METRICS ═══ */}
      <div>
        <SectionHeader
          icon={<Target className="w-4 h-4 text-blue-500" />}
          title={tl(lang, 'القيم الفيزيائية المحسوبة', 'Computed Physics Values')}
          badge={`R²=${fmt(result.polynomialFit.rSquared, 3)}`}
          badgeColor={result.polynomialFit.rSquared > 0.9 ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}
          expanded={expandedSections.physics}
          onToggle={() => toggleSection('physics')}
        />
        {expandedSections.physics && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 px-1 pb-2">
            <MetricCard
              icon={<Crosshair className="w-3 h-3 text-blue-500" />}
              label={tl(lang, 'زاوية الإطلاق', 'Launch Angle')}
              value={fmt(result.launchAngle, 1)}
              unit="°"
            />
            <MetricCard
              icon={<Gauge className="w-3 h-3 text-green-500" />}
              label={tl(lang, 'السرعة الابتدائية', 'Initial Velocity')}
              value={fmt(result.initialVelocity, 1)}
              unit="m/s"
            />
            <MetricCard
              icon={<TrendingUp className="w-3 h-3 text-purple-500" />}
              label={tl(lang, 'أقصى ارتفاع', 'Max Altitude')}
              value={fmt(result.maxAltitude, 2)}
              unit="m"
            />
            <MetricCard
              icon={<Activity className="w-3 h-3 text-orange-500" />}
              label={tl(lang, 'المدى', 'Range')}
              value={fmt(result.range, 2)}
              unit="m"
            />
            <MetricCard
              icon={<Zap className="w-3 h-3 text-yellow-500" />}
              label={tl(lang, 'زمن الطيران', 'Time of Flight')}
              value={fmt(result.timeOfFlight, 2)}
              unit="s"
            />
            <MetricCard
              icon={<Flame className="w-3 h-3 text-red-500" />}
              label={tl(lang, 'سرعة الاصطدام', 'Impact Velocity')}
              value={fmt(result.impactVelocity, 1)}
              unit="m/s"
            />
          </div>
        )}
      </div>

      {/* ═══ TELEMETRY TABLE ═══ */}
      <div>
        <SectionHeader
          icon={<BarChart3 className="w-4 h-4 text-cyan-500" />}
          title={tl(lang, 'جدول القياس عن بعد', 'Telemetry Table')}
          badge={`${result.rawTelemetry.length} pts`}
          expanded={expandedSections.telemetry}
          onToggle={() => toggleSection('telemetry')}
        />
        {expandedSections.telemetry && (
          <div className="px-1 pb-2">
            <div className="overflow-x-auto rounded-lg border border-border/50">
              <table className="w-full text-[9px] font-mono">
                <thead>
                  <tr className="bg-secondary/30 text-muted-foreground">
                    <th className="px-2 py-1.5 text-start">#</th>
                    <th className="px-2 py-1.5 text-start">t(s)</th>
                    <th className="px-2 py-1.5 text-start">{tl(lang, 'خام X', 'Raw X')}</th>
                    <th className="px-2 py-1.5 text-start">{tl(lang, 'خام Y', 'Raw Y')}</th>
                    <th className="px-2 py-1.5 text-start">{tl(lang, 'منعم X', 'Smooth X')}</th>
                    <th className="px-2 py-1.5 text-start">{tl(lang, 'منعم Y', 'Smooth Y')}</th>
                    <th className="px-2 py-1.5 text-start">v(px/s)</th>
                    <th className="px-2 py-1.5 text-start">{tl(lang, 'المصدر', 'Src')}</th>
                    <th className="px-2 py-1.5 text-start">%</th>
                  </tr>
                </thead>
                <tbody>
                  {telemetryRows.map((row, i) => (
                    <tr key={i} className={`border-t border-border/20 ${row.source === 'predicted' ? 'bg-yellow-500/5' : ''}`}>
                      <td className="px-2 py-1 text-muted-foreground">{row.frame}</td>
                      <td className="px-2 py-1">{fmt(row.timestamp, 3)}</td>
                      <td className="px-2 py-1">{fmt(row.rawX, 1)}</td>
                      <td className="px-2 py-1">{fmt(row.rawY, 1)}</td>
                      <td className="px-2 py-1 text-blue-400">{fmt(row.smoothX, 1)}</td>
                      <td className="px-2 py-1 text-blue-400">{fmt(row.smoothY, 1)}</td>
                      <td className="px-2 py-1">{fmt(row.velocity, 0)}</td>
                      <td className="px-2 py-1">
                        <span className={`px-1 py-0.5 rounded text-[8px] ${
                          row.source === 'detected' ? 'bg-green-500/10 text-green-500' :
                          row.source === 'predicted' ? 'bg-yellow-500/10 text-yellow-500' :
                          'bg-blue-500/10 text-blue-500'
                        }`}>
                          {row.source === 'detected' ? (isAr ? 'مُكتشف' : 'Det') :
                           row.source === 'predicted' ? (isAr ? 'متوقع' : 'Pred') :
                           (isAr ? 'محرف' : 'Interp')}
                        </span>
                      </td>
                      <td className={`px-2 py-1 ${confidenceColor(row.confidence)}`}>{Math.round(row.confidence)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[8px] text-muted-foreground mt-1 px-1">
              {tl(lang,
                `عرض ${telemetryRows.length} من ${result.rawTelemetry.length} نقطة. الصفوف الصفراء = توقعات كالمان.`,
                `Showing ${telemetryRows.length} of ${result.rawTelemetry.length} points. Yellow rows = Kalman predictions.`
              )}
            </p>
          </div>
        )}
      </div>

      {/* ═══ VELOCITY & ALTITUDE TIMELINE ═══ */}
      <div>
        <SectionHeader
          icon={<TrendingUp className="w-4 h-4 text-green-500" />}
          title={tl(lang, 'السرعة والارتفاع عبر الزمن', 'Velocity & Altitude vs Time')}
          expanded={expandedSections.energy}
          onToggle={() => toggleSection('energy')}
        />
        {expandedSections.energy && (
          <div className="px-1 pb-2 space-y-3">
            {/* Velocity mini-chart (text-based sparkline) */}
            <div className="p-2.5 rounded-lg border border-border/50 bg-card/30">
              <p className="text-[9px] font-semibold text-foreground mb-2 flex items-center gap-1">
                <Gauge className="w-3 h-3 text-green-500" />
                {tl(lang, 'السرعة (م/ث)', 'Speed (m/s)')}
              </p>
              <div className="flex items-end gap-[2px] h-16">
                {velocityTimeline.map((v, i) => {
                  const maxSpeed = Math.max(...velocityTimeline.map(vt => vt.speed), 1);
                  const height = (v.speed / maxSpeed) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-green-500/60 to-green-400/40 rounded-t-sm hover:from-green-500 hover:to-green-400 transition-colors"
                      style={{ height: `${Math.max(2, height)}%` }}
                      title={`t=${fmt(v.t, 2)}s | v=${fmt(v.speed, 1)}m/s`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-[8px] text-muted-foreground mt-1">
                <span>{fmt(velocityTimeline[0]?.t ?? 0, 2)}s</span>
                <span>{fmt(velocityTimeline[velocityTimeline.length - 1]?.t ?? 0, 2)}s</span>
              </div>
            </div>

            {/* Altitude mini-chart */}
            <div className="p-2.5 rounded-lg border border-border/50 bg-card/30">
              <p className="text-[9px] font-semibold text-foreground mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-purple-500" />
                {tl(lang, 'الارتفاع (م)', 'Altitude (m)')}
              </p>
              <div className="flex items-end gap-[2px] h-16">
                {altitudeTimeline.map((a, i) => {
                  const maxAlt = Math.max(...altitudeTimeline.map(at => at.altitude), 0.1);
                  const height = (a.altitude / maxAlt) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-purple-500/60 to-purple-400/40 rounded-t-sm hover:from-purple-500 hover:to-purple-400 transition-colors"
                      style={{ height: `${Math.max(2, height)}%` }}
                      title={`t=${fmt(a.t, 2)}s | h=${fmt(a.altitude, 2)}m`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-[8px] text-muted-foreground mt-1">
                <span>{fmt(altitudeTimeline[0]?.t ?? 0, 2)}s</span>
                <span>{fmt(altitudeTimeline[altitudeTimeline.length - 1]?.t ?? 0, 2)}s</span>
              </div>
            </div>

            {/* Energy timeline */}
            <div className="p-2.5 rounded-lg border border-border/50 bg-card/30">
              <p className="text-[9px] font-semibold text-foreground mb-2 flex items-center gap-1">
                <Zap className="w-3 h-3 text-yellow-500" />
                {tl(lang, 'الطاقة (ج)', 'Energy (J)')}
              </p>
              <div className="grid grid-cols-2 gap-2 text-[9px]">
                <div>
                  <span className="text-muted-foreground">{tl(lang, 'أقصى طاقة حركية', 'Max KE')}: </span>
                  <span className="font-mono text-yellow-500">{fmt(result.energyAnalysis.maxKineticEnergy, 2)} J</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{tl(lang, 'أقصى طاقة وضع', 'Max PE')}: </span>
                  <span className="font-mono text-blue-500">{fmt(result.energyAnalysis.maxPotentialEnergy, 2)} J</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{tl(lang, 'خطأ الحفاظ', 'Conservation Err')}: </span>
                  <span className={`font-mono ${result.energyAnalysis.energyConservationError > 10 ? 'text-red-500' : 'text-green-500'}`}>
                    {fmt(result.energyAnalysis.energyConservationError, 1)}%
                  </span>
                </div>
                {result.energyAnalysis.energyGainFlags.length > 0 && (
                  <div className="flex items-center gap-1 text-yellow-500">
                    <AlertTriangle className="w-3 h-3" />
                    <span className="text-[8px]">
                      {tl(lang,
                        `${result.energyAnalysis.energyGainFlags.length} أخطاء قياس`,
                        `${result.energyAnalysis.energyGainFlags.length} measurement errors`
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ DRAG ANALYSIS ═══ */}
      <div>
        <SectionHeader
          icon={<Wind className="w-4 h-4 text-teal-500" />}
          title={tl(lang, 'تحليل مقاومة الهواء', 'Air Resistance Analysis')}
          badge={result.dragAnalysis.dragEffect}
          badgeColor={
            result.dragAnalysis.dragEffect === 'significant' ? 'bg-red-500/10 text-red-600' :
            result.dragAnalysis.dragEffect === 'slight' ? 'bg-yellow-500/10 text-yellow-600' :
            'bg-green-500/10 text-green-600'
          }
          expanded={expandedSections.drag}
          onToggle={() => toggleSection('drag')}
        />
        {expandedSections.drag && (
          <div className="px-1 pb-2 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <MetricCard
                icon={<Wind className="w-3 h-3 text-teal-500" />}
                label={tl(lang, 'معامل السحب المقدر', 'Estimated Cd')}
                value={fmt(result.dragAnalysis.estimatedCd, 3)}
                unit=""
              />
              <MetricCard
                icon={<Activity className="w-3 h-3 text-orange-500" />}
                label={tl(lang, 'متوسط قوة السحب', 'Avg Drag Force')}
                value={fmt(result.dragAnalysis.averageDragForce, 3)}
                unit="N"
              />
            </div>
            <div className="p-2.5 rounded-lg border border-border/30 bg-secondary/10 text-[9px] space-y-1">
              <p>
                <span className="text-muted-foreground">{tl(lang, 'الانحراف عن مسار الفراغ', 'Vacuum deviation')}: </span>
                <span className="font-mono text-foreground">{fmt(result.dragAnalysis.vacuumDeviation, 1)}%</span>
              </p>
              <p>
                <span className="text-muted-foreground">{tl(lang, 'فرق المدى', 'Range difference')}: </span>
                <span className="font-mono text-foreground">{fmt(result.dragAnalysis.rangeDifference, 2)} m</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ═══ VERIFICATION (STAGE 4) ═══ */}
      <div>
        <SectionHeader
          icon={verification.passed
            ? <CheckCircle className="w-4 h-4 text-green-500" />
            : <AlertTriangle className="w-4 h-4 text-yellow-500" />
          }
          title={tl(lang, 'التحقق الذاتي (المرحلة 4)', 'Self-Verification (Stage 4)')}
          badge={verification.passed
            ? tl(lang, 'تم التحقق', 'VERIFIED')
            : tl(lang, 'تحذير', 'WARNING')
          }
          badgeColor={verification.passed ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}
          expanded={expandedSections.verification}
          onToggle={() => toggleSection('verification')}
        />
        {expandedSections.verification && (
          <div className="px-1 pb-2 space-y-2">
            <div className="p-2.5 rounded-lg border border-border/30 bg-secondary/10 text-[9px] space-y-1.5">
              <p>
                <span className="text-muted-foreground">{tl(lang, 'زمن الطيران (قياس)', 'ToF (measured)')}: </span>
                <span className="font-mono text-foreground">{fmt(verification.tofTelemetry, 3)} s</span>
              </p>
              <p>
                <span className="text-muted-foreground">{tl(lang, 'زمن الطيران (محسوب من h_max)', 'ToF (from h_max)')}: </span>
                <span className="font-mono text-foreground">{fmt(verification.tofComputed, 3)} s</span>
              </p>
              <p>
                <span className="text-muted-foreground">{tl(lang, 'التناقض', 'Discrepancy')}: </span>
                <span className={`font-mono ${verification.discrepancy > 15 ? 'text-red-500' : verification.discrepancy > 5 ? 'text-yellow-500' : 'text-green-500'}`}>
                  {fmt(verification.discrepancy, 1)}%
                </span>
              </p>
              {verification.retryAttempts > 0 && (
                <p>
                  <span className="text-muted-foreground">{tl(lang, 'محاولات التصحيح', 'Correction retries')}: </span>
                  <span className="font-mono text-foreground">{verification.retryAttempts}</span>
                </p>
              )}
            </div>

            {/* Calibration info */}
            <div className="p-2 rounded-lg border border-border/20 bg-card/30 text-[8px] text-muted-foreground">
              <p>
                {tl(lang, 'معايرة', 'Calibration')}: {result.calibrationSource === 'user'
                  ? tl(lang, 'مرجع المستخدم', 'User reference')
                  : result.calibrationSource === 'auto'
                  ? tl(lang, 'كشف تلقائي', 'Auto-detected')
                  : tl(lang, 'تقدير افتراضي (8م)', 'Auto-estimated (8m FOV)')
                }
                {result.calibrationDetail && ` (${result.calibrationDetail})`}
                {' | '}K = {fmt(result.pixelsToMetersRatio * 1000, 2)} mm/px
              </p>
              <p>
                {tl(lang, 'الكتلة المقدرة', 'Est. mass')}: {fmt(result.estimatedMass, 2)} kg
                {' | '}
                {tl(lang, 'منحنى متعدد الحدود', 'Polynomial fit')}: R² = {fmt(result.polynomialFit.rSquared, 4)}, RMSE = {fmt(result.polynomialFit.rmse, 3)} m
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
