import React, { useState } from 'react';
import { ChevronDown, Camera, FileText, QrCode, FileDown, FileType } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import { playClick, playSectionToggle } from '@/utils/sound';
import type { TrajectoryPoint, PredictionResult } from '@/utils/physics';

interface Props {
  lang: string;
  trajectoryData: TrajectoryPoint[];
  prediction: PredictionResult | null;
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
  onExportPNG: () => void;
  muted: boolean;
  spinRate?: number;
  projectileRadius?: number;
  windSpeed?: number;
  integrationMethod?: string;
}

export default function ExportSection({
  lang, trajectoryData, prediction, velocity, angle, height, gravity, airResistance, mass, onExportPNG, muted,
  spinRate = 0, projectileRadius = 0.05, windSpeed = 0, integrationMethod = 'ai-apas',
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const isAr = lang === 'ar';

  const buildDataString = () => {
    const lines: string[] = [];
    lines.push('APAS — Projectile Simulation Data');
    lines.push('================================');
    lines.push(`Velocity: ${velocity} m/s`);
    lines.push(`Angle: ${angle}°`);
    lines.push(`Height: ${height} m`);
    lines.push(`Gravity: ${gravity} m/s²`);
    lines.push(`Air Resistance: ${airResistance}`);
    lines.push(`Mass: ${mass} kg`);
    if (prediction) {
      lines.push('');
      lines.push('--- Results ---');
      lines.push(`Range: ${prediction.range.toFixed(3)} m`);
      lines.push(`Max Height: ${prediction.maxHeight.toFixed(3)} m`);
      lines.push(`Flight Time: ${prediction.timeOfFlight.toFixed(3)} s`);
      lines.push(`Final Velocity: ${prediction.finalVelocity.toFixed(3)} m/s`);
    }
    return lines.join('\n');
  };

  const exportCSV = () => {
    if (!trajectoryData.length) return;
    const headers = 'time,x,y,vx,vy,speed,acceleration,kineticEnergy,potentialEnergy';
    const rows = trajectoryData.map(p =>
      `${p.time.toFixed(4)},${p.x.toFixed(4)},${p.y.toFixed(4)},${p.vx.toFixed(4)},${p.vy.toFixed(4)},${p.speed.toFixed(4)},${p.acceleration.toFixed(4)},${p.kineticEnergy.toFixed(4)},${p.potentialEnergy.toFixed(4)}`
    );
    const csv = [headers, ...rows].join('\n');
    downloadFile(csv, 'APAS_Data.csv', 'text/csv');
  };

  const exportTXT = () => {
    const txt = buildDataString();
    if (trajectoryData.length) {
      const table = '\n\n--- Trajectory Data ---\ntime\tx\ty\tvx\tvy\tspeed\n' +
        trajectoryData.map(p => `${p.time.toFixed(3)}\t${p.x.toFixed(3)}\t${p.y.toFixed(3)}\t${p.vx.toFixed(3)}\t${p.vy.toFixed(3)}\t${p.speed.toFixed(3)}`).join('\n');
      downloadFile(txt + table, 'APAS_Report.txt', 'text/plain');
    } else {
      downloadFile(txt, 'APAS_Report.txt', 'text/plain');
    }
  };

  const exportDOCX = () => {
    const htmlContent = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>APAS Report</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; padding: 20px; color: #1a1a1a; }
  h1 { color: #6d28d9; border-bottom: 2px solid #6d28d9; padding-bottom: 8px; }
  h2 { color: #374151; margin-top: 20px; }
  table { border-collapse: collapse; width: 100%; margin-top: 10px; }
  th, td { border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; font-size: 11px; }
  th { background: #f3f4f6; font-weight: bold; }
  .param { display: inline-block; margin: 4px 12px 4px 0; }
  .label { color: #6b7280; }
  .value { font-weight: bold; font-family: monospace; }
</style></head><body>
<h1>APAS &mdash; Projectile Analysis Report</h1>
<h2>Parameters</h2>
<p>
  <span class="param"><span class="label">Velocity:</span> <span class="value">${velocity} m/s</span></span>
  <span class="param"><span class="label">Angle:</span> <span class="value">${angle}&deg;</span></span>
  <span class="param"><span class="label">Height:</span> <span class="value">${height} m</span></span>
  <span class="param"><span class="label">Gravity:</span> <span class="value">${gravity} m/s&sup2;</span></span>
  <span class="param"><span class="label">Air Resistance:</span> <span class="value">${airResistance}</span></span>
  <span class="param"><span class="label">Mass:</span> <span class="value">${mass} kg</span></span>
</p>
${prediction ? `
<h2>Results</h2>
<p>
  <span class="param"><span class="label">Range:</span> <span class="value">${prediction.range.toFixed(3)} m</span></span>
  <span class="param"><span class="label">Max Height:</span> <span class="value">${prediction.maxHeight.toFixed(3)} m</span></span>
  <span class="param"><span class="label">Flight Time:</span> <span class="value">${prediction.timeOfFlight.toFixed(3)} s</span></span>
  <span class="param"><span class="label">Final Velocity:</span> <span class="value">${prediction.finalVelocity.toFixed(3)} m/s</span></span>
</p>` : ''}
${trajectoryData.length ? `
<h2>Trajectory Data (Sample)</h2>
<table>
  <tr><th>Time (s)</th><th>X (m)</th><th>Y (m)</th><th>Vx (m/s)</th><th>Vy (m/s)</th><th>Speed (m/s)</th></tr>
  ${trajectoryData.filter((_, i) => i % Math.max(1, Math.floor(trajectoryData.length / 30)) === 0).map(p =>
    `<tr><td>${p.time.toFixed(3)}</td><td>${p.x.toFixed(3)}</td><td>${p.y.toFixed(3)}</td><td>${p.vx.toFixed(3)}</td><td>${p.vy.toFixed(3)}</td><td>${p.speed.toFixed(3)}</td></tr>`
  ).join('')}
</table>` : ''}
<p style="margin-top:20px;color:#9ca3af;font-size:10px;">Generated by APAS &mdash; Advanced Projectile Analysis System</p>
</body></html>`;
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'APAS_Report.docx'; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('APAS — Projectile Analysis Report', 14, 20);
    doc.setFontSize(11);
    let y = 35;
    const params = [
      `Velocity: ${velocity} m/s`,
      `Angle: ${angle}°`,
      `Height: ${height} m`,
      `Gravity: ${gravity} m/s²`,
      `Air Resistance: ${airResistance}`,
      `Mass: ${mass} kg`,
    ];
    params.forEach(line => { doc.text(line, 14, y); y += 7; });

    if (prediction) {
      y += 5;
      doc.setFontSize(13);
      doc.text('Results', 14, y); y += 8;
      doc.setFontSize(11);
      doc.text(`Range: ${prediction.range.toFixed(3)} m`, 14, y); y += 7;
      doc.text(`Max Height: ${prediction.maxHeight.toFixed(3)} m`, 14, y); y += 7;
      doc.text(`Flight Time: ${prediction.timeOfFlight.toFixed(3)} s`, 14, y); y += 7;
      doc.text(`Final Velocity: ${prediction.finalVelocity.toFixed(3)} m/s`, 14, y); y += 7;
    }

    if (trajectoryData.length) {
      y += 5;
      doc.setFontSize(13);
      doc.text('Trajectory (sample)', 14, y); y += 8;
      doc.setFontSize(9);
      doc.text('time     x        y        vx       vy       speed', 14, y); y += 5;
      const step = Math.max(1, Math.floor(trajectoryData.length / 30));
      for (let i = 0; i < trajectoryData.length && y < 280; i += step) {
        const p = trajectoryData[i];
        doc.text(
          `${p.time.toFixed(3).padStart(7)}  ${p.x.toFixed(2).padStart(8)}  ${p.y.toFixed(2).padStart(8)}  ${p.vx.toFixed(2).padStart(8)}  ${p.vy.toFixed(2).padStart(8)}  ${p.speed.toFixed(2).padStart(8)}`,
          14, y
        );
        y += 4.5;
      }
    }

    doc.save('APAS_Report.pdf');
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportLabReport = () => {
    if (!trajectoryData.length || !prediction) return;

    // Statistical analysis
    const speeds = trajectoryData.map(p => p.speed);
    const accelerations = trajectoryData.map(p => p.acceleration);
    const meanSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const maxSpeed = Math.max(...speeds);
    const minSpeed = Math.min(...speeds);
    const stdSpeed = Math.sqrt(speeds.reduce((sum, s) => sum + (s - meanSpeed) ** 2, 0) / speeds.length);
    const meanAccel = accelerations.reduce((a, b) => a + b, 0) / accelerations.length;

    // Energy analysis
    const initialKE = trajectoryData[0].kineticEnergy;
    const initialPE = trajectoryData[0].potentialEnergy;
    const finalKE = trajectoryData[trajectoryData.length - 1].kineticEnergy;
    const finalPE = trajectoryData[trajectoryData.length - 1].potentialEnergy;
    const energyLoss = (initialKE + initialPE) - (finalKE + finalPE);

    const rad = angle * Math.PI / 180;
    const v0x = velocity * Math.cos(rad);
    const v0y = velocity * Math.sin(rad);

    const report = `
================================================================================
                    APAS - COMPREHENSIVE LAB REPORT
          Advanced Projectile Analysis System - Physics Laboratory
================================================================================
Date: ${new Date().toISOString().split('T')[0]}
Time: ${new Date().toLocaleTimeString()}

1. EXPERIMENTAL PARAMETERS
--------------------------------------------------------------------------------
  Initial Velocity (v0):      ${velocity} m/s
  Launch Angle (theta):       ${angle} deg
  Initial Height (h0):        ${height} m
  Gravitational Accel. (g):   ${gravity} m/s^2
  Air Resistance Coeff. (k):  ${airResistance}
  Projectile Mass (m):        ${mass} kg
  Projectile Radius (r):      ${projectileRadius} m
  Spin Rate (omega):          ${spinRate} rad/s
  Wind Speed:                 ${windSpeed} m/s
  Integration Method:         ${integrationMethod}

2. VELOCITY DECOMPOSITION
--------------------------------------------------------------------------------
  v0x = v0 * cos(theta) = ${v0x.toFixed(4)} m/s
  v0y = v0 * sin(theta) = ${v0y.toFixed(4)} m/s

3. RESULTS SUMMARY
--------------------------------------------------------------------------------
  Horizontal Range (R):       ${prediction.range.toFixed(4)} m
  Maximum Height (H):         ${prediction.maxHeight.toFixed(4)} m
  Time of Flight (T):         ${prediction.timeOfFlight.toFixed(4)} s
  Final Velocity (v_f):       ${prediction.finalVelocity.toFixed(4)} m/s

4. STATISTICAL ANALYSIS
--------------------------------------------------------------------------------
  Speed Statistics:
    Mean:                     ${meanSpeed.toFixed(4)} m/s
    Max:                      ${maxSpeed.toFixed(4)} m/s
    Min:                      ${minSpeed.toFixed(4)} m/s
    Std. Deviation:           ${stdSpeed.toFixed(4)} m/s

  Acceleration Statistics:
    Mean Acceleration:        ${meanAccel.toFixed(4)} m/s^2

5. ENERGY ANALYSIS
--------------------------------------------------------------------------------
  Initial State:
    Kinetic Energy:           ${initialKE.toFixed(4)} J
    Potential Energy:         ${initialPE.toFixed(4)} J
    Total Energy:             ${(initialKE + initialPE).toFixed(4)} J

  Final State:
    Kinetic Energy:           ${finalKE.toFixed(4)} J
    Potential Energy:         ${finalPE.toFixed(4)} J
    Total Energy:             ${(finalKE + finalPE).toFixed(4)} J

  Energy Loss (drag):         ${energyLoss.toFixed(4)} J (${((initialKE + initialPE) > 0 ? (energyLoss / (initialKE + initialPE) * 100) : 0).toFixed(2)}%)
  Energy Efficiency:          ${((initialKE + initialPE) > 0 ? ((finalKE + finalPE) / (initialKE + initialPE) * 100) : 100).toFixed(2)}%

6. TRAJECTORY DATA (sampled)
--------------------------------------------------------------------------------
  ${'Time(s)'.padEnd(10)} ${'X(m)'.padEnd(12)} ${'Y(m)'.padEnd(12)} ${'Vx(m/s)'.padEnd(12)} ${'Vy(m/s)'.padEnd(12)} ${'Speed(m/s)'.padEnd(12)} ${'KE(J)'.padEnd(12)} ${'PE(J)'.padEnd(12)}
  ${'-'.repeat(96)}
${trajectoryData
  .filter((_, i) => i % Math.max(1, Math.floor(trajectoryData.length / 40)) === 0 || i === trajectoryData.length - 1)
  .map(p =>
    `  ${p.time.toFixed(4).padEnd(10)} ${p.x.toFixed(4).padEnd(12)} ${p.y.toFixed(4).padEnd(12)} ${p.vx.toFixed(4).padEnd(12)} ${p.vy.toFixed(4).padEnd(12)} ${p.speed.toFixed(4).padEnd(12)} ${p.kineticEnergy.toFixed(4).padEnd(12)} ${p.potentialEnergy.toFixed(4).padEnd(12)}`
  ).join('\n')}

================================================================================
  Generated by APAS - Advanced Projectile Analysis System
  https://github.com/PicaBis/APAS
================================================================================
`.trim();

    downloadFile(report, 'APAS_Lab_Report.txt', 'text/plain');
  };

  const qrData = `APAS|V=${velocity}|\u03B8=${angle}|h=${height}|g=${gravity}|k=${airResistance}|m=${mass}` +
    (prediction ? `|R=${prediction.range.toFixed(2)}|H=${prediction.maxHeight.toFixed(2)}|T=${prediction.timeOfFlight.toFixed(2)}` : '');

  return (
    <div className="border-2 border-border/40 rounded-2xl overflow-hidden bg-card/70 backdrop-blur-sm shadow-xl shadow-black/[0.06] dark:shadow-black/20 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/[0.08] dark:border-border/30">
      <button
        onClick={() => { setExpanded(!expanded); playSectionToggle(muted); }}
        className="w-full px-4 sm:px-5 py-4 flex items-center justify-between hover:bg-primary/5 transition-all duration-300 group"
      >
        <h3 className="text-sm sm:text-base font-bold text-foreground uppercase tracking-tight flex items-center gap-2.5">
          <FileDown className="w-5 h-5 text-primary" />
          {isAr ? 'التصدير' : 'Export'}
        </h3>
        <div className="w-7 h-7 rounded-lg bg-secondary/60 flex items-center justify-center group-hover:bg-primary/10 transition-all duration-300">
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-border space-y-1.5 pt-2 animate-slideDown">
          <button onClick={() => { onExportPNG(); playClick(muted); }}
            className="group w-full text-xs font-medium py-2 px-3 rounded border border-border hover:border-foreground/30 hover:bg-secondary hover:shadow-md transition-all duration-200 flex items-center gap-2"
            style={{ color: '#2563eb' }}>
            <Camera className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" /> {isAr ? 'تصدير PNG' : 'Export PNG'}
          </button>
          <button onClick={() => { exportCSV(); playClick(muted); }}
            className="group w-full text-xs font-medium py-2 px-3 rounded border border-border hover:border-foreground/30 hover:bg-secondary hover:shadow-md transition-all duration-200 flex items-center gap-2"
            style={{ color: '#16a34a' }}>
            <FileText className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" /> {isAr ? 'CSV' : 'Export CSV'}
          </button>
          <button onClick={() => { exportTXT(); playClick(muted); }}
            className="group w-full text-xs font-medium py-2 px-3 rounded border border-border hover:border-foreground/30 hover:bg-secondary hover:shadow-md transition-all duration-200 flex items-center gap-2"
            style={{ color: '#9333ea' }}>
            <FileText className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" /> {isAr ? 'TXT' : 'Export TXT'}
          </button>
          <button onClick={() => { exportPDF(); playClick(muted); }}
            className="group w-full text-xs font-medium py-2 px-3 rounded border border-border hover:border-foreground/30 hover:bg-secondary hover:shadow-md transition-all duration-200 flex items-center gap-2"
            style={{ color: '#dc2626' }}>
            <FileDown className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" /> {isAr ? 'PDF' : 'Export PDF'}
          </button>
          <button onClick={() => { exportDOCX(); playClick(muted); }}
            className="group w-full text-xs font-medium py-2 px-3 rounded border border-border hover:border-foreground/30 hover:bg-secondary hover:shadow-md transition-all duration-200 flex items-center gap-2"
            style={{ color: '#2563eb' }}>
            <FileType className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" /> {isAr ? 'تصدير DOCX' : 'Export DOCX'}
          </button>
          <button onClick={() => { exportLabReport(); playClick(muted); }}
            className="group w-full text-xs font-medium py-2 px-3 rounded border border-border hover:border-foreground/30 hover:bg-secondary hover:shadow-md transition-all duration-200 flex items-center gap-2"
            style={{ color: '#059669' }}>
            <FileText className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" /> {isAr ? 'تقرير مختبر شامل' : 'Lab Report'}
          </button>
          <button onClick={() => { setShowQR(!showQR); playClick(muted); }}
            className="group w-full text-xs font-medium py-2 px-3 rounded border border-border hover:border-foreground/30 hover:bg-secondary hover:shadow-md transition-all duration-200 flex items-center gap-2"
            style={{ color: '#ea580c' }}>
            <QrCode className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" /> {isAr ? 'QR' : 'QR Code'}
          </button>

          {showQR && (
            <div className="flex justify-center p-3 bg-white dark:bg-slate-950 rounded-md">
              <QRCodeSVG value={qrData} size={140} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
