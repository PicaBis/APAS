import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Loader2, X, Download, Sparkles, Clock, Beaker, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
interface AnalysisEntry {
  id: number;
  timestamp: Date;
  type: 'vision' | 'video' | 'subject' | 'voice';
  report: string;
  mediaSrc?: string;
  mediaType?: 'video' | 'image';
  params?: { velocity?: number; angle?: number; height?: number; mass?: number };
}

interface Props {
  lang: string;
  analysisHistory: AnalysisEntry[];
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
}

export default function ApasReportGenerator({
  lang, analysisHistory, velocity, angle, height, gravity, airResistance, mass,
}: Props) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const isAr = lang === 'ar';

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const typeLabel = useCallback((type: AnalysisEntry['type']) => {
    switch (type) {
      case 'vision': return isAr ? '\u062a\u062d\u0644\u064a\u0644 \u0635\u0648\u0631\u0629' : 'Image Analysis';
      case 'video': return isAr ? '\u062a\u062d\u0644\u064a\u0644 \u0641\u064a\u062f\u064a\u0648' : 'Video Analysis';
      case 'subject': return isAr ? '\u0642\u0631\u0627\u0621\u0629 \u062a\u0645\u0631\u064a\u0646' : 'Exercise Reading';
      case 'voice': return isAr ? '\u0623\u0645\u0631 \u0635\u0648\u062a\u064a' : 'Voice Command';
    }
  }, [isAr]);

  // Physics calculations
  const computePhysics = useCallback(() => {
    const rad = (angle * Math.PI) / 180;
    const v0x = velocity * Math.cos(rad);
    const v0y = velocity * Math.sin(rad);
    const g = gravity;

    // Time of flight (solving quadratic: -0.5*g*t^2 + v0y*t + h = 0)
    const discriminant = v0y * v0y + 2 * g * height;
    const timeOfFlight = discriminant >= 0 ? (v0y + Math.sqrt(discriminant)) / g : 0;

    // Max height
    const maxHeight = height + (v0y * v0y) / (2 * g);

    // Range
    const range = v0x * timeOfFlight;

    // Impact velocity
    const vyFinal = v0y - g * timeOfFlight;
    const impactVelocity = Math.sqrt(v0x * v0x + vyFinal * vyFinal);

    // Energies
    const kineticEnergy = 0.5 * mass * velocity * velocity;
    const potentialEnergyMax = mass * g * maxHeight;

    return {
      v0x: v0x.toFixed(2),
      v0y: v0y.toFixed(2),
      timeOfFlight: timeOfFlight.toFixed(3),
      maxHeight: maxHeight.toFixed(2),
      range: range.toFixed(2),
      impactVelocity: impactVelocity.toFixed(2),
      kineticEnergy: kineticEnergy.toFixed(2),
      potentialEnergyMax: potentialEnergyMax.toFixed(2),
    };
  }, [velocity, angle, height, gravity, mass]);

  const generatePDF = useCallback(async () => {
    setGenerating(true);

    try {
      const doc = new jsPDF();
      const physics = computePhysics();
      const now = new Date();

      // Colors
      const primary = [109, 40, 217]; // purple
      const textDark = [26, 26, 26];
      const textMuted = [107, 114, 128];
      const bgLight = [243, 244, 246];

      // ── Header ──
      doc.setFillColor(primary[0], primary[1], primary[2]);
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('APAS', 14, 18);
      doc.setFontSize(10);
      doc.text('Advanced Projectile Analysis System', 14, 26);
      doc.setFontSize(8);
      doc.text(`Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 140, 26);

      // ── Experiment Parameters ──
      let y = 45;
      doc.setTextColor(primary[0], primary[1], primary[2]);
      doc.setFontSize(14);
      doc.text(isAr ? 'Experiment Parameters' : 'Experiment Parameters', 14, y);
      y += 3;
      doc.setDrawColor(primary[0], primary[1], primary[2]);
      doc.setLineWidth(0.5);
      doc.line(14, y, 196, y);
      y += 8;

      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.setFontSize(10);

      // Parameters in a grid layout
      const params = [
        ['Initial Velocity', `${velocity} m/s`],
        ['Launch Angle', `${angle}\u00B0`],
        ['Launch Height', `${height} m`],
        ['Gravity', `${gravity} m/s\u00B2`],
        ['Air Resistance', `${airResistance}`],
        ['Mass', `${mass} kg`],
      ];

      for (let i = 0; i < params.length; i += 2) {
        const left = params[i];
        const right = params[i + 1];

        // Left column
        doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
        doc.roundedRect(14, y - 4, 88, 12, 2, 2, 'F');
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.setFontSize(8);
        doc.text(left[0], 17, y + 1);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.setFontSize(10);
        doc.text(left[1], 70, y + 1);

        // Right column
        if (right) {
          doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
          doc.roundedRect(108, y - 4, 88, 12, 2, 2, 'F');
          doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
          doc.setFontSize(8);
          doc.text(right[0], 111, y + 1);
          doc.setTextColor(textDark[0], textDark[1], textDark[2]);
          doc.setFontSize(10);
          doc.text(right[1], 164, y + 1);
        }

        y += 15;
      }

      // ── Computed Results ──
      y += 5;
      doc.setTextColor(primary[0], primary[1], primary[2]);
      doc.setFontSize(14);
      doc.text('Computed Results', 14, y);
      y += 3;
      doc.setDrawColor(primary[0], primary[1], primary[2]);
      doc.line(14, y, 196, y);
      y += 8;

      const results = [
        ['Horizontal Velocity (v0x)', `${physics.v0x} m/s`],
        ['Vertical Velocity (v0y)', `${physics.v0y} m/s`],
        ['Time of Flight', `${physics.timeOfFlight} s`],
        ['Maximum Height', `${physics.maxHeight} m`],
        ['Horizontal Range', `${physics.range} m`],
        ['Impact Velocity', `${physics.impactVelocity} m/s`],
        ['Kinetic Energy (launch)', `${physics.kineticEnergy} J`],
        ['Potential Energy (max)', `${physics.potentialEnergyMax} J`],
      ];

      for (let i = 0; i < results.length; i += 2) {
        const left = results[i];
        const right = results[i + 1];

        doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
        doc.roundedRect(14, y - 4, 88, 12, 2, 2, 'F');
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.setFontSize(7);
        doc.text(left[0], 17, y + 1);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.setFontSize(10);
        doc.text(left[1], 70, y + 1);

        if (right) {
          doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
          doc.roundedRect(108, y - 4, 88, 12, 2, 2, 'F');
          doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
          doc.setFontSize(7);
          doc.text(right[0], 111, y + 1);
          doc.setTextColor(textDark[0], textDark[1], textDark[2]);
          doc.setFontSize(10);
          doc.text(right[1], 164, y + 1);
        }

        y += 15;
      }

      // ── Physics Equations ──
      y += 5;
      doc.setTextColor(primary[0], primary[1], primary[2]);
      doc.setFontSize(14);
      doc.text('Physics Equations', 14, y);
      y += 3;
      doc.setDrawColor(primary[0], primary[1], primary[2]);
      doc.line(14, y, 196, y);
      y += 8;

      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.setFontSize(9);
      const equations = [
        'x(t) = v0 * cos(\u03B8) * t',
        'y(t) = h0 + v0 * sin(\u03B8) * t - 0.5 * g * t\u00B2',
        'y = x * tan(\u03B8) - (g * x\u00B2) / (2 * v0\u00B2 * cos\u00B2(\u03B8))',
        'H_max = h0 + v0y\u00B2 / (2 * g)',
        'T = (v0y + \u221A(v0y\u00B2 + 2*g*h0)) / g',
        'R = v0x * T',
      ];

      for (const eq of equations) {
        doc.setFillColor(245, 243, 255);
        doc.roundedRect(14, y - 4, 182, 10, 2, 2, 'F');
        doc.text(eq, 20, y + 2);
        y += 12;
      }

      // ── Analysis History ──
      if (analysisHistory.length > 0) {
        // Check if we need a new page
        if (y > 220) {
          doc.addPage();
          y = 20;
        }

        y += 5;
        doc.setTextColor(primary[0], primary[1], primary[2]);
        doc.setFontSize(14);
        doc.text(`Analysis History (${analysisHistory.length} entries)`, 14, y);
        y += 3;
        doc.setDrawColor(primary[0], primary[1], primary[2]);
        doc.line(14, y, 196, y);
        y += 8;

        for (const entry of analysisHistory.slice(0, 5)) {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }

          doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
          doc.roundedRect(14, y - 4, 182, 20, 2, 2, 'F');

          doc.setTextColor(primary[0], primary[1], primary[2]);
          doc.setFontSize(9);
          doc.text(typeLabel(entry.type), 17, y + 1);

          doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
          doc.setFontSize(7);
          const timeStr = entry.timestamp.toLocaleString();
          doc.text(timeStr, 80, y + 1);

          if (entry.params) {
            doc.setTextColor(textDark[0], textDark[1], textDark[2]);
            doc.setFontSize(7);
            const paramsStr = [
              entry.params.velocity !== undefined ? `v=${entry.params.velocity}` : '',
              entry.params.angle !== undefined ? `\u03B8=${entry.params.angle}\u00B0` : '',
              entry.params.height !== undefined ? `h=${entry.params.height}` : '',
              entry.params.mass !== undefined ? `m=${entry.params.mass}` : '',
            ].filter(Boolean).join('  ');
            doc.text(paramsStr, 17, y + 10);
          }

          // Report excerpt
          const reportExcerpt = entry.report
            .replace(/```json[\s\S]*?```/g, '')
            .replace(/[#*`]/g, '')
            .trim()
            .slice(0, 100);
          doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
          doc.setFontSize(6);
          doc.text(reportExcerpt, 80, y + 10, { maxWidth: 110 });

          y += 25;
        }

        if (analysisHistory.length > 5) {
          doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
          doc.setFontSize(8);
          doc.text(`... and ${analysisHistory.length - 5} more entries`, 14, y);
          y += 10;
        }
      }

      // ── Footer ──
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.setFontSize(7);
        doc.text('Generated by APAS \u2014 Advanced Projectile Analysis System', 14, 290);
        doc.text(`Page ${i}/${pageCount}`, 180, 290);
      }

      doc.save(`APAS_Report_${now.toISOString().slice(0, 10)}.pdf`);
      toast.success(isAr ? '\u062a\u0645 \u062a\u0648\u0644\u064a\u062f \u0627\u0644\u062a\u0642\u0631\u064a\u0631 \u0628\u0646\u062c\u0627\u062d' : 'Report generated successfully');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error(isAr ? '\u062e\u0637\u0623 \u0641\u064a \u062a\u0648\u0644\u064a\u062f \u0627\u0644\u062a\u0642\u0631\u064a\u0631' : 'Error generating report');
    } finally {
      setGenerating(false);
    }
  }, [isAr, velocity, angle, height, gravity, airResistance, mass, analysisHistory, computePhysics, typeLabel]);

  const physics = computePhysics();

  const modal = open ? createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-500" />
            <h2 className="font-bold text-foreground">{isAr ? 'APAS \u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u062a\u062c\u0631\u0628\u0629' : 'APAS Experiment Report'}</h2>
          </div>
          <button onClick={close} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Report preview */}
          <div className="space-y-3">
            {/* Current Parameters */}
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 space-y-2">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                <Beaker className="w-3.5 h-3.5 text-emerald-500" />
                {isAr ? '\u0645\u0639\u0637\u064a\u0627\u062a \u0627\u0644\u062a\u062c\u0631\u0628\u0629' : 'Experiment Parameters'}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: isAr ? '\u0627\u0644\u0633\u0631\u0639\u0629' : 'Velocity', value: `${velocity} m/s` },
                  { label: isAr ? '\u0627\u0644\u0632\u0627\u0648\u064a\u0629' : 'Angle', value: `${angle}\u00B0` },
                  { label: isAr ? '\u0627\u0644\u0627\u0631\u062a\u0641\u0627\u0639' : 'Height', value: `${height} m` },
                  { label: isAr ? '\u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629' : 'Gravity', value: `${gravity} m/s\u00B2` },
                  { label: isAr ? '\u0627\u0644\u0643\u062a\u0644\u0629' : 'Mass', value: `${mass} kg` },
                  { label: isAr ? '\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0647\u0648\u0627\u0621' : 'Air Res.', value: `${airResistance}` },
                ].map((p, i) => (
                  <div key={i} className="bg-card rounded-lg p-2 border border-border/50 text-center">
                    <p className="text-[10px] text-muted-foreground">{p.label}</p>
                    <p className="text-xs font-bold font-mono text-foreground">{p.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Computed Results */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 space-y-2">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                {isAr ? '\u0627\u0644\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0645\u062d\u0633\u0648\u0628\u0629' : 'Computed Results'}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: isAr ? '\u0627\u0644\u0645\u062f\u0649' : 'Range', value: `${physics.range} m` },
                  { label: isAr ? '\u0623\u0642\u0635\u0649 \u0627\u0631\u062a\u0641\u0627\u0639' : 'Max Height', value: `${physics.maxHeight} m` },
                  { label: isAr ? '\u0632\u0645\u0646 \u0627\u0644\u0631\u062d\u0644\u0629' : 'Flight Time', value: `${physics.timeOfFlight} s` },
                  { label: isAr ? '\u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0635\u0637\u062f\u0627\u0645' : 'Impact Vel.', value: `${physics.impactVelocity} m/s` },
                ].map((r, i) => (
                  <div key={i} className="bg-card rounded-lg p-2 border border-border/50">
                    <p className="text-[10px] text-muted-foreground">{r.label}</p>
                    <p className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">{r.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Analysis History Summary */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 space-y-2">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                {isAr ? '\u0633\u062c\u0644 \u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a' : 'Analysis History'}
              </h3>
              {analysisHistory.length > 0 ? (
                <div className="space-y-1.5">
                  {analysisHistory.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex items-center gap-2 bg-card rounded-lg p-2 border border-border/50">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-primary/10 text-primary">
                        {typeLabel(entry.type)}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex-1 truncate">
                        {entry.report.replace(/```json[\s\S]*?```/g, '').replace(/[#*`]/g, '').trim().slice(0, 60)}...
                      </span>
                    </div>
                  ))}
                  {analysisHistory.length > 5 && (
                    <p className="text-[10px] text-muted-foreground text-center">
                      +{analysisHistory.length - 5} {isAr ? '\u062a\u062d\u0644\u064a\u0644\u0627\u062a \u0623\u062e\u0631\u0649' : 'more analyses'}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">
                  {isAr ? '\u0644\u0627 \u062a\u0648\u062c\u062f \u062a\u062d\u0644\u064a\u0644\u0627\u062a \u0633\u0627\u0628\u0642\u0629' : 'No previous analyses'}
                </p>
              )}
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={generatePDF}
            disabled={generating}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isAr ? '\u062c\u0627\u0631\u064a \u062a\u0648\u0644\u064a\u062f \u0627\u0644\u062a\u0642\u0631\u064a\u0631...' : 'Generating report...'}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                {isAr ? '\u062a\u062d\u0645\u064a\u0644 \u062a\u0642\u0631\u064a\u0631 PDF' : 'Download PDF Report'}
              </>
            )}
          </button>

          <p className="text-[10px] text-muted-foreground text-center">
            {isAr
              ? '\u0633\u064a\u062a\u0636\u0645\u0646 \u0627\u0644\u062a\u0642\u0631\u064a\u0631: \u0627\u0644\u0645\u0639\u0637\u064a\u0627\u062a\u060c \u0627\u0644\u0646\u062a\u0627\u0626\u062c\u060c \u0627\u0644\u0645\u0639\u0627\u062f\u0644\u0627\u062a\u060c \u0648\u0633\u062c\u0644 \u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a'
              : 'Report includes: parameters, results, equations, and analysis history'}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={generating}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-green-500/10 hover:from-emerald-500/20 hover:to-green-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-foreground font-medium text-sm transition-all duration-300 disabled:opacity-50"
      >
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        <span>{isAr ? 'APAS \u062a\u0642\u0631\u064a\u0631 PDF' : 'APAS Report'}</span>
        <Sparkles className="w-3 h-3 text-emerald-400" />
      </button>
      {modal}
    </>
  );
}
