import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import type { TrajectoryPoint, PredictionResult, ModelData } from '@/utils/physics';
import { TRANSLATIONS } from '@/constants/translations';
import type { StroboscopicMark } from '@/components/apas/StroboscopicModal';

// ── Dynamic Environment Background Renderer ──
function drawEnvironmentBackground(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  envId: string, nightMode: boolean
) {
  switch (envId) {
    case 'moon': {
      // Dark sky with stars and craters
      const grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, '#0a0a1a');
      grd.addColorStop(0.6, '#141428');
      grd.addColorStop(1, '#2a2a3a');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
      // Stars
      ctx.fillStyle = '#ffffff';
      const seed = 42;
      for (let i = 0; i < 120; i++) {
        const sx = ((seed * (i + 1) * 7919) % W);
        const sy = ((seed * (i + 1) * 6271) % (H * 0.7));
        const sr = 0.5 + ((i * 3) % 3) * 0.5;
        ctx.globalAlpha = 0.3 + ((i * 7) % 10) * 0.07;
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Lunar surface hint
      const groundGrd = ctx.createLinearGradient(0, H * 0.85, 0, H);
      groundGrd.addColorStop(0, 'rgba(80,80,90,0)');
      groundGrd.addColorStop(1, 'rgba(80,80,90,0.15)');
      ctx.fillStyle = groundGrd;
      ctx.fillRect(0, H * 0.85, W, H * 0.15);
      break;
    }
    case 'mars': {
      // Reddish-orange sky
      const grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, '#4a1a0a');
      grd.addColorStop(0.3, '#7a3020');
      grd.addColorStop(0.7, '#b05535');
      grd.addColorStop(1, '#c47050');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
      // Dust particles
      ctx.fillStyle = 'rgba(200,150,100,0.08)';
      for (let i = 0; i < 40; i++) {
        const dx = ((i * 8761) % W);
        const dy = ((i * 5443) % H);
        const dr = 2 + (i % 5) * 2;
        ctx.beginPath(); ctx.arc(dx, dy, dr, 0, Math.PI * 2); ctx.fill();
      }
      // Mars ground
      const marsGround = ctx.createLinearGradient(0, H * 0.82, 0, H);
      marsGround.addColorStop(0, 'rgba(160,80,40,0)');
      marsGround.addColorStop(1, 'rgba(160,80,40,0.2)');
      ctx.fillStyle = marsGround;
      ctx.fillRect(0, H * 0.82, W, H * 0.18);
      break;
    }
    case 'underwater': {
      // Deep blue water effect
      const grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, '#0a3d6b');
      grd.addColorStop(0.4, '#0d5280');
      grd.addColorStop(0.8, '#083050');
      grd.addColorStop(1, '#051e35');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
      // Light rays from surface
      ctx.save();
      for (let i = 0; i < 5; i++) {
        const rx = W * 0.15 + (i * W * 0.18);
        const rayGrd = ctx.createLinearGradient(rx, 0, rx + 40, H * 0.6);
        rayGrd.addColorStop(0, 'rgba(100,200,255,0.08)');
        rayGrd.addColorStop(1, 'rgba(100,200,255,0)');
        ctx.fillStyle = rayGrd;
        ctx.beginPath();
        ctx.moveTo(rx - 15, 0);
        ctx.lineTo(rx + 25, 0);
        ctx.lineTo(rx + 60, H * 0.6);
        ctx.lineTo(rx - 50, H * 0.6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      // Bubbles
      ctx.strokeStyle = 'rgba(150,220,255,0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 25; i++) {
        const bx2 = ((i * 6737) % W);
        const by2 = ((i * 4513) % H);
        const br = 3 + (i % 6) * 2;
        ctx.beginPath(); ctx.arc(bx2, by2, br, 0, Math.PI * 2); ctx.stroke();
      }
      break;
    }
    case 'sun': {
      // Intense fiery background
      const grd = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
      grd.addColorStop(0, '#fff5e0');
      grd.addColorStop(0.3, '#ffa500');
      grd.addColorStop(0.7, '#cc4400');
      grd.addColorStop(1, '#440000');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
      // Solar flares
      ctx.fillStyle = 'rgba(255,200,50,0.06)';
      for (let i = 0; i < 15; i++) {
        const fx = ((i * 9241) % W);
        const fy = ((i * 7123) % H);
        const fr = 20 + (i % 8) * 10;
        ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'jupiter': {
      // Brown/orange banded atmosphere
      const grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, '#3a2510');
      grd.addColorStop(0.15, '#6b3e1a');
      grd.addColorStop(0.3, '#8b5e2a');
      grd.addColorStop(0.45, '#5a3015');
      grd.addColorStop(0.6, '#9a6830');
      grd.addColorStop(0.75, '#7a4e20');
      grd.addColorStop(0.9, '#4a2a10');
      grd.addColorStop(1, '#2a1808');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
      // Atmospheric bands
      ctx.globalAlpha = 0.08;
      for (let i = 0; i < 12; i++) {
        const by = (i / 12) * H;
        ctx.fillStyle = i % 2 === 0 ? '#c88040' : '#6a3820';
        ctx.fillRect(0, by, W, H / 14);
      }
      ctx.globalAlpha = 1;
      // Great Red Spot hint
      ctx.fillStyle = 'rgba(180,60,30,0.12)';
      ctx.beginPath();
      ctx.ellipse(W * 0.65, H * 0.55, W * 0.08, H * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'saturn': {
      // Pale gold/tan atmosphere
      const grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, '#2a2518');
      grd.addColorStop(0.2, '#5a4830');
      grd.addColorStop(0.5, '#8a7850');
      grd.addColorStop(0.8, '#6a5838');
      grd.addColorStop(1, '#3a3020');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
      // Subtle atmospheric bands
      ctx.globalAlpha = 0.06;
      for (let i = 0; i < 10; i++) {
        const by = (i / 10) * H;
        ctx.fillStyle = i % 2 === 0 ? '#d4b878' : '#8a7050';
        ctx.fillRect(0, by, W, H / 12);
      }
      ctx.globalAlpha = 1;
      // Ring silhouette hint
      ctx.strokeStyle = 'rgba(200,180,140,0.1)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(W * 0.5, H * 0.15, W * 0.35, H * 0.03, -0.1, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'vacuum': {
      // Clean lab-like background
      const grd = ctx.createLinearGradient(0, 0, 0, H);
      if (nightMode) {
        grd.addColorStop(0, '#12141e');
        grd.addColorStop(1, '#1a1d2e');
      } else {
        grd.addColorStop(0, '#f0f4f8');
        grd.addColorStop(1, '#e8ecf0');
      }
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
      break;
    }
    default: {
      // Earth — standard background with subtle sky gradient
      if (nightMode) {
        const grd = ctx.createLinearGradient(0, 0, 0, H);
        grd.addColorStop(0, '#1a1f2e');
        grd.addColorStop(1, '#1e2333');
        ctx.fillStyle = grd;
      } else {
        const grd = ctx.createLinearGradient(0, 0, 0, H);
        grd.addColorStop(0, '#f0f8ff');
        grd.addColorStop(0.5, '#fafcff');
        grd.addColorStop(1, '#ffffff');
        ctx.fillStyle = grd;
      }
      ctx.fillRect(0, 0, W, H);
      break;
    }
  }
}

interface SimulationCanvasProps {
  trajectoryData: TrajectoryPoint[];
  theoreticalData: Array<{x: number;y: number;time: number;}>;
  prediction: PredictionResult | null;
  currentTime: number;
  height: number;
  showCriticalPoints: boolean;
  showExternalForces: boolean;
  vectorVisibility: { V: boolean; Vx: boolean; Vy: boolean; Fg: boolean; Fd: boolean; Fw: boolean; Fnet: boolean; acc: boolean };
  showAIComparison: boolean;
  aiModels: Record<string, ModelData> | null;
  customColors: {trajectory: string;projectile: string;velocity: string;};
  comparisonMode: boolean;
  savedTrajectory: TrajectoryPoint[] | null;
  multiTrajectoryMode: boolean;
  multiTrajectories: Array<{angle: number;points: TrajectoryPoint[];color: string;}>;
  mass: number;
  gravity: number;
  airResistance: number;
  windSpeed: number;
  T: Record<string, string>;
  lang: string;
  countdown: number | string | null;
  nightMode: boolean;
  zoom: number;
  isAnimating: boolean;
  isFullscreen?: boolean;
  showLiveData?: boolean;
  stroboscopicMarks?: StroboscopicMark[];
  showStroboscopicProjections?: boolean;
  environmentId?: string;
  activePresetEmoji?: string;
  equationTrajectory?: Array<{x: number; y: number; t: number}> | null;
  showGrid?: boolean;
  secondBody?: { enabled: boolean; x: number; y: number; radius: number; mass: number } | null;
  collisionPoint?: { x: number; y: number; time: number } | null;
  fluidFrictionRay?: boolean;
  isUnderwater?: boolean;
  fluidDensity?: number;
  calibrationScale?: number | null;
  relativityTrajectory?: TrajectoryPoint[] | null;
  relativityEnabled?: boolean;
  relativityMode?: 'galilean' | 'lorentz';
  relativityActiveObserver?: 'S' | 'S_prime';
  relativityShowDual?: boolean;
  relativityFrameVelocity?: number;
}

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  trajectoryData, theoreticalData, prediction, currentTime, height,
  showCriticalPoints, showExternalForces, vectorVisibility, showAIComparison, aiModels,
  customColors, comparisonMode, savedTrajectory,
  multiTrajectoryMode, multiTrajectories,
  mass, gravity, airResistance, windSpeed, T, lang, countdown, nightMode, zoom, isAnimating, isFullscreen, showLiveData = true,
  stroboscopicMarks = [], showStroboscopicProjections = false,
  environmentId = 'earth', activePresetEmoji,
  equationTrajectory = null,
  showGrid = true,
  secondBody = null,
  collisionPoint = null,
  fluidFrictionRay = false,
  isUnderwater = false,
  fluidDensity = 1.225,
  calibrationScale = null,
  relativityTrajectory = null,
  relativityEnabled = false,
  relativityMode = 'galilean',
  relativityActiveObserver = 'S',
  relativityShowDual = false,
  relativityFrameVelocity = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverInfo, setHoverInfo] = useState<TrajectoryPoint | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ w: 1200, h: 700 });
  
  // Pan state
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  // Responsive canvas — use container WIDTH only, fixed aspect ratio
  // This prevents the canvas from expanding/stretching vertically on load
  const initializedRef = useRef(false);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height: cHeight } = entries[0].contentRect;
      const w = Math.max(600, Math.floor(width * 2));
      // In fullscreen, use actual container height; otherwise use fixed aspect ratio
      const isFullscreenMode = cHeight > 500 && container.closest('.fixed.inset-0');
      const h = isFullscreenMode ? Math.max(400, Math.floor(cHeight * 2)) : Math.floor(w * 0.58);
      setCanvasSize({ w, h });
      initializedRef.current = true;
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Reset pan when zoom resets
  useEffect(() => {
    if (zoom === 1) setPanOffset({ x: 0, y: 0 });
  }, [zoom]);

  // Theme colors — memoized to avoid re-creating on every render
    const colors = useMemo(() => nightMode ? {
      bg: '#151535', grid: '#1e2144', gridMinor: '#1a1a3e', axis: '#8890b0', axisLabel: '#8890b0',
      ground: '#8890b0', trajectory: '#e0e4f0', projectile: '#e0e4f0',
      projectileStroke: '#151535', dot: '#8a9cc5', dotLabel: '#c9cfe0',
      infoBox: 'rgba(26,26,62,0.95)', infoBorder: '#2d3a6e', infoHeader: '#1e2144',
      infoText: '#c9cfe0', infoTextDim: '#8890b0', theoLine: '#3a4a8a',
      compLine: '#6b7db5', countdownBg: 'rgba(26,26,62,0.88)', countdownText: '#e0e4f0',
      legendBg: 'rgba(26,26,62,0.95)', legendBorder: '#2d3a6e', legendText: '#c9cfe0',
      velocity: '#8890b0', velocityArrow: '#8890b0',
      originDot: '#8890b0',
    } : {
    bg: '#ffffff', grid: '#f0f0f0', gridMinor: '#f8f8f8', axis: '#333', axisLabel: '#666',
    ground: '#333', trajectory: '#222', projectile: '#111',
    projectileStroke: '#fff', dot: '#444', dotLabel: '#333',
    infoBox: 'rgba(255,255,255,0.95)', infoBorder: '#ddd', infoHeader: '#f5f5f5',
    infoText: '#333', infoTextDim: '#555', theoLine: '#ccc',
    compLine: '#aaa', countdownBg: 'rgba(255,255,255,0.85)', countdownText: '#111',
    legendBg: 'rgba(255,255,255,0.95)', legendBorder: '#ddd', legendText: '#333',
    velocity: '#666', velocityArrow: '#666',
    originDot: '#333',
  }, [nightMode]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || trajectoryData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Margins that scale with zoom so labels stay visible
    const baseML = 70, baseMR = 30, baseMT = 35, baseMB = 50;
    // For zoom > 1, scale margins inversely (canvas transform scales them back up);
    // for zoom <= 1, use base margins since no canvas transform is applied
    const effectiveZoom = zoom > 1 ? zoom : 1;
    const ML = Math.round(baseML / effectiveZoom), MR = Math.round(baseMR / effectiveZoom);
    const MT = Math.round(baseMT / effectiveZoom), MB = Math.round(baseMB / effectiveZoom);

    // Apply zoom + pan only when zoomed in (zoom > 1)
    // When zoomed out (zoom < 1), we expand the domain instead of shrinking the canvas
    ctx.save();
    const cxC = W / 2, cyC = H / 2;
    if (zoom > 1) {
      ctx.translate(cxC + panOffset.x, cyC + panOffset.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-cxC, -cyC);
    }

    const plotW = W - ML - MR, plotH = H - MT - MB;

    // ── Compute domain covering all data (supports negative x values) ──
    // Use loop-based min/max to avoid stack overflow with large arrays via spread operator
    let rawMinX = 0, rawMaxX = 0, rawMinY = 0, rawMaxY = height + 1;

    for (let i = 0; i < trajectoryData.length; i++) {
      const px = trajectoryData[i].x, py = trajectoryData[i].y;
      if (px < rawMinX) rawMinX = px;
      if (px > rawMaxX) rawMaxX = px;
      if (py < rawMinY) rawMinY = py;
      if (py > rawMaxY) rawMaxY = py;
    }

    // Also consider theoretical data, comparison, and multi-trajectories
    if (theoreticalData.length > 0) {
      for (let i = 0; i < theoreticalData.length; i++) {
        const px = theoreticalData[i].x, py = theoreticalData[i].y;
        if (px < rawMinX) rawMinX = px;
        if (px > rawMaxX) rawMaxX = px;
        if (py < rawMinY) rawMinY = py;
        if (py > rawMaxY) rawMaxY = py;
      }
    }
    if (comparisonMode && savedTrajectory) {
      for (let i = 0; i < savedTrajectory.length; i++) {
        const px = savedTrajectory[i].x, py = savedTrajectory[i].y;
        if (px < rawMinX) rawMinX = px;
        if (px > rawMaxX) rawMaxX = px;
        if (py < rawMinY) rawMinY = py;
        if (py > rawMaxY) rawMaxY = py;
      }
    }
    if (multiTrajectoryMode && multiTrajectories.length > 0) {
      multiTrajectories.forEach(mt => {
        for (let i = 0; i < mt.points.length; i++) {
          const px = mt.points[i].x, py = mt.points[i].y;
          if (px < rawMinX) rawMinX = px;
          if (px > rawMaxX) rawMaxX = px;
          if (py < rawMinY) rawMinY = py;
          if (py > rawMaxY) rawMaxY = py;
        }
      });
    }
    // Also consider equation engine trajectory
    if (equationTrajectory && equationTrajectory.length > 0) {
      for (let i = 0; i < equationTrajectory.length; i++) {
        const px = equationTrajectory[i].x, py = equationTrajectory[i].y;
        if (px < rawMinX) rawMinX = px;
        if (px > rawMaxX) rawMaxX = px;
        if (py < rawMinY) rawMinY = py;
        if (py > rawMaxY) rawMaxY = py;
      }
    }
    // Also consider relativity S' trajectory
    if (relativityEnabled && relativityShowDual && relativityTrajectory && relativityTrajectory.length > 0) {
      for (let i = 0; i < relativityTrajectory.length; i++) {
        const px = relativityTrajectory[i].x, py = relativityTrajectory[i].y;
        if (px < rawMinX) rawMinX = px;
        if (px > rawMaxX) rawMaxX = px;
        if (py < rawMinY) rawMinY = py;
        if (py > rawMaxY) rawMaxY = py;
      }
    }
    // Also consider second body position
    if (secondBody && secondBody.enabled) {
      const bx = secondBody.x, by = secondBody.y, br = secondBody.radius;
      if (bx - br < rawMinX) rawMinX = bx - br;
      if (bx + br > rawMaxX) rawMaxX = bx + br;
      if (by - br < rawMinY) rawMinY = by - br;
      if (by + br > rawMaxY) rawMaxY = by + br;
    }

    // Add padding: 10% on each side
    const xRange = rawMaxX - rawMinX || 10;
    const yRange = rawMaxY - rawMinY || 10;
    const padX = xRange * 0.1;
    const padY = yRange * 0.12;

    // Support negative Y regions when trajectory goes below ground
    let domMinX = rawMinX - padX;
    let domMaxX = rawMaxX + padX;
    
    // IF height is negative, we MUST show the negative Y region
    // Otherwise we show a bit of padding below ground
    let domMinY = Math.min(rawMinY, height) < -0.1 ? Math.min(rawMinY, height) - padY : -padY * 0.3;
    let domMaxY = rawMaxY + padY;

    // When zooming out (zoom < 1), expand the domain to reveal more axes/values
    // The canvas stays full size but shows a wider coordinate range
    if (zoom < 1) {
      const expandFactor = 1 / zoom;
      const centerX = (domMinX + domMaxX) / 2;
      const centerY = (domMinY + domMaxY) / 2;
      const halfW = (domMaxX - domMinX) / 2 * expandFactor;
      const halfH = (domMaxY - domMinY) / 2 * expandFactor;
      domMinX = centerX - halfW;
      domMaxX = centerX + halfW;
      domMinY = centerY - halfH;
      domMaxY = centerY + halfH;
    }

    const domW = domMaxX - domMinX;
    const domH = domMaxY - domMinY;

    // Scale: pixels per unit
    const sX = plotW / domW;
    const sY = plotH / domH;

    // transform from physics coords to canvas coords
    const toX = (x: number) => ML + (x - domMinX) * sX;
    const toY = (y: number) => MT + plotH - (y - domMinY) * sY;
    const groundY = toY(0);
    const originX = toX(0);

    // ── GROUND DEPTH FILL (Enhanced) ──
    // If the ground is visible, fill the area below it with a subtle texture/color
    if (groundY < MT + plotH && groundY > MT) {
      ctx.save();
      const groundDepthGrad = ctx.createLinearGradient(0, groundY, 0, MT + plotH);
      if (nightMode) {
        groundDepthGrad.addColorStop(0, 'rgba(30, 41, 59, 0.6)');
        groundDepthGrad.addColorStop(1, 'rgba(15, 23, 42, 0.2)');
      } else {
        groundDepthGrad.addColorStop(0, 'rgba(203, 213, 225, 0.6)');
        groundDepthGrad.addColorStop(1, 'rgba(241, 245, 249, 0.2)');
      }
      ctx.fillStyle = groundDepthGrad;
      ctx.fillRect(ML, groundY, plotW, MT + plotH - groundY);
      
      // Add a "depth" pattern (subtle dashed lines)
      ctx.strokeStyle = nightMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 8; i++) {
        const py = groundY + (i * (MT + plotH - groundY) / 8);
        ctx.beginPath();
        ctx.setLineDash([5, 15]);
        ctx.moveTo(ML, py);
        ctx.lineTo(ML + plotW, py);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
    }

    // ── FADED BOUNDARIES (Vignette) ──
    ctx.save();
    const vignetteGrd = ctx.createRadialGradient(W / 2, H / 2, plotW * 0.4, W / 2, H / 2, plotW * 0.6);
    vignetteGrd.addColorStop(0, 'rgba(0,0,0,0)');
    vignetteGrd.addColorStop(1, nightMode ? 'rgba(10,10,25,0.3)' : 'rgba(255,255,255,0.3)');
    ctx.fillStyle = vignetteGrd;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Background — dynamic environment
    drawEnvironmentBackground(ctx, W, H, environmentId, nightMode);

    // ── PROJECTILE ORIGIN LINE (When height is negative) ──
    if (height < 0) {
      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = nightMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      const hY = toY(height);
      ctx.beginPath();
      ctx.moveTo(ML, hY);
      ctx.lineTo(ML + plotW, hY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // ── Wind particles overlay (when air resistance is enabled) ──
    // Subtle animated streaks to suggest air movement — skipped for underwater/vacuum/moon
    if (airResistance > 0 && environmentId !== 'underwater' && environmentId !== 'vacuum' && environmentId !== 'moon') {
      const windTime = Date.now() * 0.001;
      const particleCount = 18;
      const windDir = windSpeed >= 0 ? 1 : -1;
      const windIntensity = Math.min(1, airResistance * 2 + Math.abs(windSpeed) * 0.1);

      ctx.save();
      for (let i = 0; i < particleCount; i++) {
        const seed = i * 7919 + 137;
        // Deterministic base position that drifts over time
        const baseX = ((seed * 3) % W);
        const baseY = ((seed * 5) % H);
        const speed = 0.3 + (i % 5) * 0.15;
        const xPos = (baseX + windDir * windTime * speed * W * 0.08) % (W * 1.3) - W * 0.15;
        const yPos = baseY + Math.sin(windTime * 0.5 + i * 0.8) * H * 0.02;
        const streakLen = (12 + (i % 4) * 8) * windIntensity;

        ctx.beginPath();
        ctx.strokeStyle = nightMode
          ? `rgba(200,210,230,${0.08 + windIntensity * 0.06})`
          : `rgba(100,120,140,${0.06 + windIntensity * 0.05})`;
        ctx.lineWidth = 0.8 + (i % 3) * 0.3;
        ctx.moveTo(xPos, yPos);
        ctx.lineTo(xPos + windDir * streakLen, yPos - streakLen * 0.15);
        ctx.stroke();

        // Tiny dot at head of streak
        ctx.beginPath();
        ctx.fillStyle = nightMode
          ? `rgba(200,210,230,${0.10 + windIntensity * 0.08})`
          : `rgba(100,120,140,${0.08 + windIntensity * 0.06})`;
        ctx.arc(xPos + windDir * streakLen, yPos - streakLen * 0.15, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // ── Nice grid lines ──
    const sf = Math.max(1, W / 1200);
    const labelScale = zoom > 1 ? 1 / zoom : 1;
    const isNonEarth = environmentId !== 'earth';
    // Vacuum has a light background — use default dark axes like earth
    const useWhiteAxes = isNonEarth && environmentId !== 'vacuum';

    // Calculate nice tick spacing
    const niceNum = (range: number, round: boolean): number => {
      if (range <= 0) return 1;
      const exp = Math.floor(Math.log10(range));
      const frac = range / Math.pow(10, exp);
      let nice: number;
      if (round) {
        if (frac < 1.5) nice = 1;
        else if (frac < 3) nice = 2;
        else if (frac < 7) nice = 5;
        else nice = 10;
      } else {
        if (frac <= 1) nice = 1;
        else if (frac <= 2) nice = 2;
        else if (frac <= 5) nice = 5;
        else nice = 10;
      }
      return nice * Math.pow(10, exp);
    };

    const getTickSpacing = (range: number, maxTicks: number) => {
      if (range <= 0) return 1;
      const roughSpacing = range / maxTicks;
      return niceNum(roughSpacing, true);
    };

    const tickSpaceX = getTickSpacing(domW, 12);
    const tickSpaceY = getTickSpacing(domH, 8);

    // Grid lines — only draw when showGrid is enabled
    if (showGrid) {
      // Determine grid color based on environment:
      // Earth and Vacuum (الأرض والغرفة المفرعة) -> BLACK grids for high visibility
      // All other environments -> WHITE grids
      const isBlackGridEnv = environmentId === 'earth' || environmentId === 'vacuum';
      const gridMajorColor = isBlackGridEnv
        ? (nightMode ? '#ffffff' : '#000000')
        : '#ffffff';
      const gridMinorColor = isBlackGridEnv
        ? (nightMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)')
        : 'rgba(255,255,255,0.25)';

      // Minor grid
      ctx.strokeStyle = gridMinorColor;
      ctx.lineWidth = 0.5;
      const minorX = tickSpaceX / 2;
      if (minorX > 0) {
        for (let v = Math.ceil(domMinX / minorX) * minorX; v <= domMaxX; v += minorX) {
          const gx = toX(v);
          if (gx >= ML && gx <= ML + plotW) {
            ctx.beginPath(); ctx.moveTo(gx, MT); ctx.lineTo(gx, MT + plotH); ctx.stroke();
          }
        }
      }
      const minorY = tickSpaceY / 2;
      if (minorY > 0) {
        for (let v = Math.ceil(domMinY / minorY) * minorY; v <= domMaxY; v += minorY) {
          const gy = toY(v);
          if (gy >= MT && gy <= MT + plotH) {
            ctx.beginPath(); ctx.moveTo(ML, gy); ctx.lineTo(ML + plotW, gy); ctx.stroke();
          }
        }
      }

      // Major grid
      ctx.strokeStyle = gridMajorColor;
      ctx.lineWidth = isBlackGridEnv ? 1.5 : 1;
      ctx.globalAlpha = isBlackGridEnv ? (nightMode ? 0.4 : 0.35) : 0.3;
      if (tickSpaceX > 0) {
        for (let v = Math.ceil(domMinX / tickSpaceX) * tickSpaceX; v <= domMaxX; v += tickSpaceX) {
          const gx = toX(v);
          if (gx >= ML && gx <= ML + plotW) {
            ctx.beginPath(); ctx.moveTo(gx, MT); ctx.lineTo(gx, MT + plotH); ctx.stroke();
          }
        }
      }
      if (tickSpaceY > 0) {
        for (let v = Math.ceil(domMinY / tickSpaceY) * tickSpaceY; v <= domMaxY; v += tickSpaceY) {
          const gy = toY(v);
          if (gy >= MT && gy <= MT + plotH) {
            ctx.beginPath(); ctx.moveTo(ML, gy); ctx.lineTo(ML + plotW, gy); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    // ── Axes ── (white for dark-background environments, default for vacuum/earth)
    const axisColor = useWhiteAxes ? '#ffffff' : colors.axis;
    const groundColor = useWhiteAxes ? '#ffffff' : colors.ground;
    const axisLabelColor = useWhiteAxes ? '#ffffff' : colors.axisLabel;
    const originDotColor = useWhiteAxes ? '#ffffff' : colors.originDot;

    // Ground line (y=0) — thicker, prominent
    if (groundY >= MT && groundY <= MT + plotH) {
      ctx.strokeStyle = groundColor;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ML, groundY); ctx.lineTo(ML + plotW, groundY); ctx.stroke();
    }

    // Vertical axis (x=0) — if visible
    if (originX >= ML && originX <= ML + plotW) {
      ctx.strokeStyle = axisColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(originX, MT); ctx.lineTo(originX, MT + plotH); ctx.stroke();
    }

    // Left edge axis if origin not visible
    if (originX < ML) {
      ctx.strokeStyle = axisColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(ML, MT); ctx.lineTo(ML, MT + plotH); ctx.stroke();
    }

    // Origin dot
    if (originX >= ML && originX <= ML + plotW && groundY >= MT && groundY <= MT + plotH) {
      ctx.fillStyle = originDotColor;
      ctx.beginPath();
      ctx.arc(originX, groundY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Tick labels ──
    const tickFontSize = Math.round(12 * sf * labelScale);

    ctx.fillStyle = axisLabelColor;
    ctx.font = `bold ${Math.max(9, tickFontSize)}px IBM Plex Mono, monospace`;

    // X-axis tick labels
    ctx.textAlign = 'center';
    if (tickSpaceX > 0) {
      for (let v = Math.ceil(domMinX / tickSpaceX) * tickSpaceX; v <= domMaxX; v += tickSpaceX) {
        const gx = toX(v);
        if (gx >= ML - 5 && gx <= ML + plotW + 5) {
          const labelY = Math.min(groundY + 18 * sf * labelScale, MT + plotH + 16 * sf * labelScale);
          const displayVal = Math.abs(v) < 1e-9 ? '0' : v.toFixed(Math.abs(v) >= 100 || Math.abs(v) <= 0.01 ? 0 : 1);
          ctx.fillText(displayVal, gx, labelY);
        }
      }
    }

    // Y-axis tick labels
    ctx.textAlign = 'right';
    if (tickSpaceY > 0) {
      for (let v = Math.ceil(domMinY / tickSpaceY) * tickSpaceY; v <= domMaxY; v += tickSpaceY) {
        const gy = toY(v);
        if (gy >= MT - 5 && gy <= MT + plotH + 5) {
          const labelX = Math.max(originX - 8 * labelScale, ML - 8 * labelScale);
          const displayVal = Math.abs(v) < 1e-9 ? '0' : v.toFixed(Math.abs(v) >= 100 || Math.abs(v) <= 0.01 ? 0 : 1);
          ctx.fillText(displayVal, labelX, gy + 4);
        }
      }
    }

    // Axis direction labels only (no "X (m)" / "Y (m)" unit labels)

    // Negative / positive axis direction labels
    const smallFont = Math.max(8, Math.round(10 * sf * labelScale));
    ctx.font = `${smallFont}px IBM Plex Mono, monospace`;
    ctx.fillStyle = useWhiteAxes ? 'rgba(255,255,255,0.6)' : colors.axisLabel + '80';
    if (domMinX < -0.1 && originX > ML + 30) {
      ctx.textAlign = 'left';
      ctx.fillText('−X', ML + 4, groundY - 6);
    }
    if (domMaxX > 0.1) {
      ctx.textAlign = 'right';
      ctx.fillText('+X', ML + plotW - 4, groundY - 6);
    }
    if (domMaxY > 0.1 && originX >= ML && originX <= ML + plotW) {
      ctx.textAlign = 'left';
      ctx.fillText('+Y', originX + 6, MT + 12);
    }
    if (domMinY < -0.1 && originX >= ML && originX <= ML + plotW) {
      ctx.textAlign = 'left';
      ctx.fillText('-Y', originX + 6, MT + plotH - 6);
    }

    // Equation Engine trajectory is now rendered as the main trajectory directly
    // (no separate overlay — the equation sets the trajectory data on the canvas)

    // ── Compute current animation point early (needed by relativity comparison box) ──
    const animIdx = trajectoryData.findIndex((p) => p.time >= currentTime);
    const curPt = animIdx >= 0 ? trajectoryData[animIdx] : trajectoryData[trajectoryData.length - 1];

    // ── Relativity: S' frame trajectory + enhanced visuals ──
    if (relativityEnabled && relativityShowDual && relativityTrajectory && relativityTrajectory.length > 1) {
      const sPrimeColor = relativityMode === 'lorentz' ? '#a855f7' : '#f97316';
      const sColor = nightMode ? '#22c55e' : '#16a34a';
      const isObserverSPrime = relativityActiveObserver === 'S_prime';

      // ── Determine primary / secondary based on active observer ──
      const primaryTraj = isObserverSPrime ? relativityTrajectory : trajectoryData;
      const secondaryTraj = isObserverSPrime ? trajectoryData : relativityTrajectory;
      const primaryColor = isObserverSPrime ? sPrimeColor : sColor;
      const secondaryColor = isObserverSPrime ? sColor : sPrimeColor;
      const primaryLabel = isObserverSPrime ? "S'" : 'S';
      const secondaryLabel = isObserverSPrime ? 'S' : "S'";

      // ── Draw secondary trajectory as dashed line ──
      ctx.beginPath();
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 5]);
      const secAnimIdx = secondaryTraj.findIndex((p) => p.time >= currentTime);
      const visibleSec = secAnimIdx >= 0 ? secondaryTraj.slice(0, secAnimIdx + 1) : secondaryTraj;
      visibleSec.forEach((p, i) => i === 0 ? ctx.moveTo(toX(p.x), toY(p.y)) : ctx.lineTo(toX(p.x), toY(p.y)));
      ctx.stroke();
      ctx.setLineDash([]);

      // ── Animated secondary projectile dot (ring style) ──
      const curSecPt = secAnimIdx >= 0 ? secondaryTraj[secAnimIdx] : secondaryTraj[secondaryTraj.length - 1];
      if (curSecPt) {
        const spx = toX(curSecPt.x), spy = toY(curSecPt.y);
        const spPulseR = 7;
        ctx.beginPath();
        ctx.arc(spx, spy, spPulseR, 0, Math.PI * 2);
        ctx.strokeStyle = secondaryColor;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(spx, spy, spPulseR - 2, 0, Math.PI * 2);
        ctx.fillStyle = secondaryColor + '40';
        ctx.fill();
        ctx.fillStyle = secondaryColor;
        ctx.font = `bold ${Math.round(10 * sf)}px IBM Plex Mono, monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(secondaryLabel, spx, spy - spPulseR - 8);
      }

      // ── Moving frame axes ──
      // When observer=S: S' axes move at +V. When observer=S': S axes move at -V.
      const movingAxisOffset = isObserverSPrime
        ? -relativityFrameVelocity * currentTime  // S moves backward from S' perspective
        : relativityFrameVelocity * currentTime;   // S' moves forward from S perspective
      const movingOX = toX(movingAxisOffset);
      const movingOY = groundY;
      if (movingOX > ML - 20 && movingOX < ML + plotW + 20) {
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.strokeStyle = secondaryColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        const xAxisLen = Math.min(plotW * 0.25, 120);
        ctx.moveTo(movingOX, movingOY);
        ctx.lineTo(movingOX + xAxisLen, movingOY);
        ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = secondaryColor;
        ctx.moveTo(movingOX + xAxisLen, movingOY);
        ctx.lineTo(movingOX + xAxisLen - 8, movingOY - 4);
        ctx.lineTo(movingOX + xAxisLen - 8, movingOY + 4);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.setLineDash([6, 3]);
        const yAxisLen = Math.min(plotH * 0.25, 100);
        ctx.moveTo(movingOX, movingOY);
        ctx.lineTo(movingOX, movingOY - yAxisLen);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(movingOX, movingOY - yAxisLen);
        ctx.lineTo(movingOX - 4, movingOY - yAxisLen + 8);
        ctx.lineTo(movingOX + 4, movingOY - yAxisLen + 8);
        ctx.closePath();
        ctx.fill();
        ctx.font = `bold ${Math.round(12 * sf)}px IBM Plex Mono, monospace`;
        ctx.fillStyle = secondaryColor;
        ctx.textAlign = 'left';
        const secAxisLabel = isObserverSPrime ? 'x' : "x'";
        const secAxisLabelY = isObserverSPrime ? 'y' : "y'";
        const secOriginLabel = isObserverSPrime ? 'O' : "O'";
        ctx.fillText(secAxisLabel, movingOX + xAxisLen - 4, movingOY - 10);
        ctx.fillText(secAxisLabelY, movingOX + 8, movingOY - yAxisLen + 4);
        ctx.font = `bold ${Math.round(10 * sf)}px IBM Plex Mono, monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(secOriginLabel, movingOX, movingOY + 16);
        ctx.restore();
      }

      // ── Stationary frame axes labels (observer's own axes) ──
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.font = `bold ${Math.round(12 * sf)}px IBM Plex Mono, monospace`;
      ctx.fillStyle = primaryColor;
      const priAxisX = isObserverSPrime ? "x'" : 'x';
      const priAxisY = isObserverSPrime ? "y'" : 'y';
      const priOrigin = isObserverSPrime ? "O'" : 'O';
      if (domMaxX > 0.1) {
        ctx.textAlign = 'right';
        ctx.fillText(priAxisX, ML + plotW - 8, groundY - 10);
      }
      if (domMaxY > 0.1 && originX >= ML && originX <= ML + plotW) {
        ctx.textAlign = 'left';
        ctx.fillText(priAxisY, originX + 10, MT + 16);
      }
      ctx.font = `bold ${Math.round(10 * sf)}px IBM Plex Mono, monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(priOrigin, originX, groundY + 16);
      ctx.restore();

      // ── Velocity vector indicator ──
      if (relativityFrameVelocity !== 0) {
        const vIndicatorLen = Math.min(plotW * 0.12, Math.abs(relativityFrameVelocity) * 0.5);
        const vDir = isObserverSPrime ? -1 : (relativityFrameVelocity > 0 ? 1 : -1);
        const viX = ML + plotW * 0.85;
        const viY = MT + 25;
        ctx.save();
        ctx.strokeStyle = secondaryColor;
        ctx.fillStyle = secondaryColor;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(viX, viY);
        ctx.lineTo(viX + vDir * vIndicatorLen, viY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(viX + vDir * vIndicatorLen, viY);
        ctx.lineTo(viX + vDir * vIndicatorLen - vDir * 8, viY - 4);
        ctx.lineTo(viX + vDir * vIndicatorLen - vDir * 8, viY + 4);
        ctx.closePath();
        ctx.fill();
        ctx.font = `bold ${Math.round(10 * sf)}px IBM Plex Mono, monospace`;
        ctx.textAlign = 'center';
        const vLabel = isObserverSPrime ? 'V_S' : "V_S'";
        ctx.fillText(vLabel, viX + vDir * vIndicatorLen * 0.5, viY - 10);
        ctx.restore();
      }

      // ── Draw ground objects at the STATIONARY frame position ──
      // When observer=S: objects at origin (S is stationary)
      // When observer=S': objects move backward (S moves from S' perspective)
      const groundObjX = isObserverSPrime ? toX(-relativityFrameVelocity * currentTime) : toX(0);
      const groundObjY = groundY;
      ctx.save();
      // Building
      const bldgX = groundObjX - 30;
      ctx.fillStyle = nightMode ? '#475569' : '#94a3b8';
      ctx.fillRect(bldgX, groundObjY - 35, 16, 35);
      ctx.fillStyle = nightMode ? '#fbbf24' : '#fcd34d';
      for (let wr = 0; wr < 3; wr++) {
        ctx.fillRect(bldgX + 3, groundObjY - 32 + wr * 11, 4, 4);
        ctx.fillRect(bldgX + 9, groundObjY - 32 + wr * 11, 4, 4);
      }
      // Flag
      const flagX = groundObjX + 5;
      ctx.fillStyle = nightMode ? '#64748b' : '#6b7280';
      ctx.fillRect(flagX, groundObjY - 40, 2, 40);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(flagX + 2, groundObjY - 40);
      ctx.lineTo(flagX + 18, groundObjY - 34);
      ctx.lineTo(flagX + 2, groundObjY - 28);
      ctx.closePath();
      ctx.fill();
      // Person / Observer
      const personX = groundObjX + 28;
      ctx.fillStyle = nightMode ? '#e2e8f0' : '#374151';
      ctx.beginPath();
      ctx.arc(personX, groundObjY - 24, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(personX, groundObjY - 20);
      ctx.lineTo(personX, groundObjY - 8);
      ctx.strokeStyle = nightMode ? '#e2e8f0' : '#374151';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(personX - 6, groundObjY - 16);
      ctx.lineTo(personX + 6, groundObjY - 16);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(personX, groundObjY - 8);
      ctx.lineTo(personX - 5, groundObjY);
      ctx.moveTo(personX, groundObjY - 8);
      ctx.lineTo(personX + 5, groundObjY);
      ctx.stroke();
      ctx.fillStyle = sColor;
      ctx.font = `bold ${Math.round(11 * sf)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('S', groundObjX, groundObjY - 44);
      ctx.restore();

      // ── Moving frame vehicle ──
      // When observer=S: vehicle moves at +V (S' moves forward)
      // When observer=S': vehicle stays at origin (S' is stationary)
      const vehicleX = isObserverSPrime ? toX(0) : movingOX;
      const vehicleY = groundY;
      ctx.save();
      if (relativityMode === 'lorentz') {
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.moveTo(vehicleX + 18, vehicleY - 12);
        ctx.lineTo(vehicleX - 8, vehicleY - 18);
        ctx.lineTo(vehicleX - 14, vehicleY - 12);
        ctx.lineTo(vehicleX - 8, vehicleY - 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(vehicleX - 14, vehicleY - 14);
        ctx.lineTo(vehicleX - 22, vehicleY - 12);
        ctx.lineTo(vehicleX - 14, vehicleY - 10);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = sPrimeColor;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(vehicleX - 18, vehicleY - 14, 36, 10, 3);
        } else {
          ctx.rect(vehicleX - 18, vehicleY - 14, 36, 10);
        }
        ctx.fill();
        ctx.fillStyle = sPrimeColor + 'cc';
        ctx.beginPath();
        ctx.moveTo(vehicleX - 6, vehicleY - 14);
        ctx.lineTo(vehicleX - 2, vehicleY - 22);
        ctx.lineTo(vehicleX + 12, vehicleY - 22);
        ctx.lineTo(vehicleX + 16, vehicleY - 14);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = nightMode ? '#93c5fd' : '#bfdbfe';
        ctx.beginPath();
        ctx.moveTo(vehicleX, vehicleY - 15);
        ctx.lineTo(vehicleX + 2, vehicleY - 20);
        ctx.lineTo(vehicleX + 10, vehicleY - 20);
        ctx.lineTo(vehicleX + 12, vehicleY - 15);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = nightMode ? '#1e293b' : '#1f2937';
        ctx.beginPath();
        ctx.arc(vehicleX - 10, vehicleY - 3, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(vehicleX + 10, vehicleY - 3, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = sPrimeColor;
      ctx.font = `bold ${Math.round(11 * sf)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText("S'", vehicleX, vehicleY - 26);
      ctx.restore();

      // ── Observer indicator — highlight who is "you" ──
      const youX = isObserverSPrime ? vehicleX : groundObjX + 28;
      const youY = groundY - 52;
      ctx.save();
      ctx.fillStyle = primaryColor;
      ctx.font = `bold ${Math.round(10 * sf)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(lang === 'ar' ? '👁 أنت هنا' : lang === 'fr' ? '👁 Vous' : '👁 You', youX, youY);
      ctx.restore();

      // ── Live comparison info box ──
      const curSPrimePt = secAnimIdx >= 0 ? relativityTrajectory[secAnimIdx >= 0 ? secAnimIdx : relativityTrajectory.length - 1] : relativityTrajectory[relativityTrajectory.length - 1];
      // Get the correct S point from the right trajectory
      const curSFramePt = isObserverSPrime
        ? (secAnimIdx >= 0 ? trajectoryData[secAnimIdx] : trajectoryData[trajectoryData.length - 1])
        : curPt;
      const curSPrimeFramePt = isObserverSPrime
        ? (secAnimIdx >= 0 ? relativityTrajectory[Math.min(secAnimIdx, relativityTrajectory.length - 1)] : relativityTrajectory[relativityTrajectory.length - 1])
        : curSPrimePt;

      if (curSFramePt && curSPrimeFramePt) {
        const cmpW = Math.round(200 * sf);
        const cmpH = Math.round(110 * sf);
        const cmpX = ML + 8;
        const cmpY = MT + 8;
        ctx.save();
        ctx.fillStyle = colors.legendBg;
        ctx.strokeStyle = colors.legendBorder;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.92;
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cmpX, cmpY, cmpW, cmpH, 6); ctx.fill(); ctx.stroke(); }
        else { ctx.fillRect(cmpX, cmpY, cmpW, cmpH); ctx.strokeRect(cmpX, cmpY, cmpW, cmpH); }
        ctx.globalAlpha = 1;
        const cmpHeaderH = Math.round(20 * sf);
        ctx.fillStyle = colors.infoHeader;
        ctx.fillRect(cmpX + 1, cmpY + 1, cmpW - 2, cmpHeaderH);
        ctx.fillStyle = colors.infoText;
        ctx.font = `bold ${Math.round(10 * sf)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(lang === 'ar' ? 'مقارنة الإطارين' : lang === 'fr' ? 'Comparaison' : 'Frame Comparison', cmpX + cmpW / 2, cmpY + cmpHeaderH - 5);
        ctx.font = `bold ${Math.round(9 * sf)}px IBM Plex Mono, monospace`;
        ctx.textAlign = 'left';
        const rowH = Math.round(14 * sf);
        const col1X = cmpX + 6;
        const col2X = cmpX + cmpW * 0.52;
        let rowY = cmpY + cmpHeaderH + rowH;
        // Column headers - highlight active observer
        ctx.fillStyle = sColor;
        ctx.fillText(isObserverSPrime ? 'S' : 'S 👁', col1X, rowY);
        ctx.fillStyle = sPrimeColor;
        ctx.fillText(isObserverSPrime ? "S' 👁" : "S'", col2X, rowY);
        rowY += rowH;
        ctx.fillStyle = colors.infoText;
        ctx.fillText(`x=${curSFramePt.x.toFixed(1)}`, col1X, rowY);
        ctx.fillText(`x'=${curSPrimeFramePt.x.toFixed(1)}`, col2X, rowY);
        rowY += rowH;
        ctx.fillText(`y=${curSFramePt.y.toFixed(1)}`, col1X, rowY);
        ctx.fillText(`y'=${curSPrimeFramePt.y.toFixed(1)}`, col2X, rowY);
        rowY += rowH;
        ctx.fillStyle = colors.infoTextDim;
        ctx.fillText(`Vx=${curSFramePt.vx.toFixed(1)}`, col1X, rowY);
        ctx.fillText(`Vx'=${curSPrimeFramePt.vx.toFixed(1)}`, col2X, rowY);
        rowY += rowH;
        ctx.fillText(`Vy=${curSFramePt.vy.toFixed(1)}`, col1X, rowY);
        ctx.fillText(`Vy'=${curSPrimeFramePt.vy.toFixed(1)}`, col2X, rowY);
        rowY += rowH;
        ctx.fillStyle = colors.infoText;
        ctx.fillText(`V=${curSFramePt.speed.toFixed(1)}`, col1X, rowY);
        ctx.fillText(`V'=${curSPrimeFramePt.speed.toFixed(1)}`, col2X, rowY);
        ctx.restore();
      }

      // ── Enhanced Relativity Legend ──
      const relLegX = ML + 8;
      const relLegY = MT + plotH - 70;
      ctx.save();
      ctx.fillStyle = colors.legendBg;
      ctx.strokeStyle = colors.legendBorder;
      ctx.lineWidth = 1;
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(relLegX, relLegY, 200, 62, 4); ctx.fill(); ctx.stroke(); }
      else { ctx.fillRect(relLegX, relLegY, 200, 62); ctx.strokeRect(relLegX, relLegY, 200, 62); }
      // Primary (solid) — the observer's frame
      ctx.beginPath(); ctx.strokeStyle = primaryColor; ctx.lineWidth = 3; ctx.setLineDash([]);
      ctx.moveTo(relLegX + 6, relLegY + 14); ctx.lineTo(relLegX + 30, relLegY + 14); ctx.stroke();
      ctx.beginPath(); ctx.fillStyle = primaryColor; ctx.arc(relLegX + 18, relLegY + 14, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = colors.legendText; ctx.font = 'bold 10px Inter, sans-serif'; ctx.textAlign = 'left';
      const priLegendLabel = isObserverSPrime
        ? (lang === 'ar' ? "S' (x', y') 👁 أنت" : lang === 'fr' ? "S' (x', y') 👁 Vous" : "S' (x', y') 👁 You")
        : (lang === 'ar' ? 'S (x, y) 👁 أنت' : lang === 'fr' ? 'S (x, y) 👁 Vous' : 'S (x, y) 👁 You');
      ctx.fillText(priLegendLabel, relLegX + 36, relLegY + 18);
      // Secondary (dashed) — the other frame
      ctx.beginPath(); ctx.strokeStyle = secondaryColor; ctx.lineWidth = 2.5; ctx.setLineDash([8, 5]);
      ctx.moveTo(relLegX + 6, relLegY + 34); ctx.lineTo(relLegX + 30, relLegY + 34); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.strokeStyle = secondaryColor; ctx.lineWidth = 2; ctx.arc(relLegX + 18, relLegY + 34, 4, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = colors.legendText;
      const secLegendLabel = isObserverSPrime
        ? (lang === 'ar' ? 'S (x, y) ثابت' : lang === 'fr' ? 'S (x, y) fixe' : 'S (x, y) stationary')
        : (lang === 'ar' ? "S' (x', y') متحرك" : lang === 'fr' ? "S' (x', y') mobile" : "S' (x', y') moving");
      ctx.fillText(secLegendLabel, relLegX + 36, relLegY + 38);
      // Active observer indicator
      ctx.fillStyle = primaryColor;
      ctx.font = `bold ${Math.round(9 * sf)}px Inter, sans-serif`;
      const obsLabel = isObserverSPrime
        ? (lang === 'ar' ? 'المنظور: من داخل المركبة' : lang === 'fr' ? 'Vue: depuis le véhicule' : 'View: from inside vehicle')
        : (lang === 'ar' ? 'المنظور: من الأرض' : lang === 'fr' ? 'Vue: depuis le sol' : 'View: from the ground');
      ctx.fillText(obsLabel, relLegX + 6, relLegY + 56);
      ctx.restore();
    }

    // Multi trajectories
    if (multiTrajectoryMode && multiTrajectories.length > 0) {
      multiTrajectories.forEach((mt) => {
        ctx.beginPath(); ctx.strokeStyle = mt.color + '60'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
        mt.points.forEach((p, i) => i === 0 ? ctx.moveTo(toX(p.x), toY(p.y)) : ctx.lineTo(toX(p.x), toY(p.y)));
        ctx.stroke(); ctx.setLineDash([]);
      });
    }

    // Comparison trajectory
    if (comparisonMode && savedTrajectory) {
      ctx.beginPath(); ctx.strokeStyle = colors.compLine; ctx.lineWidth = 2.5; ctx.setLineDash([8, 5]);
      savedTrajectory.forEach((p, i) => i === 0 ? ctx.moveTo(toX(p.x), toY(p.y)) : ctx.lineTo(toX(p.x), toY(p.y)));
      ctx.stroke(); ctx.setLineDash([]);
    }

    // Theoretical trajectory
    if (theoreticalData.length > 0) {
      ctx.beginPath(); ctx.strokeStyle = colors.theoLine; ctx.lineWidth = 2; ctx.setLineDash([8, 5]);
      theoreticalData.forEach((p, i) => i === 0 ? ctx.moveTo(toX(p.x), toY(p.y)) : ctx.lineTo(toX(p.x), toY(p.y)));
      ctx.stroke(); ctx.setLineDash([]);
    }

    // AI model trajectories
    if (showAIComparison && aiModels) {
      const modelEntries = Object.values(aiModels);
      // Draw each model with thicker, more visible lines
      modelEntries.forEach((m) => {
        ctx.beginPath(); ctx.strokeStyle = m.color; ctx.lineWidth = 2.5;
        ctx.setLineDash(m.dash);
        m.pts.forEach((p, i) => i === 0 ? ctx.moveTo(toX(p.x), toY(p.yPred)) : ctx.lineTo(toX(p.x), toY(p.yPred)));
        ctx.stroke(); ctx.setLineDash([]);
      });
      // Legend box
      const legendLX = ML + 8, legendLY = MT + 8;
      const lh = modelEntries.length * 20 + 14;
      ctx.fillStyle = colors.legendBg;
      ctx.strokeStyle = colors.legendBorder;
      ctx.lineWidth = 1;
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(legendLX, legendLY, 180, lh, 4); ctx.fill(); ctx.stroke(); }
      else { ctx.fillRect(legendLX, legendLY, 180, lh); ctx.strokeRect(legendLX, legendLY, 180, lh); }
      ctx.font = 'bold 11px Inter, sans-serif'; ctx.textAlign = 'left';
      modelEntries.forEach((m, i) => {
        const ly = legendLY + 10 + i * 20;
        // Draw colored line sample with dash pattern
        ctx.beginPath(); ctx.strokeStyle = m.color; ctx.lineWidth = 2.5; ctx.setLineDash(m.dash);
        ctx.moveTo(legendLX + 6, ly + 4); ctx.lineTo(legendLX + 26, ly + 4);
        ctx.stroke(); ctx.setLineDash([]);
        // Dot at center
        ctx.beginPath(); ctx.fillStyle = m.color; ctx.arc(legendLX + 16, ly + 4, 2.5, 0, Math.PI * 2); ctx.fill();
        // Label
        ctx.fillStyle = colors.legendText;
        ctx.fillText(m.name, legendLX + 32, ly + 8);
      });
    }

    // Main trajectory — use active observer's trajectory when relativity is enabled
    const isRelObserverSPrime = relativityEnabled && relativityActiveObserver === 'S_prime' && relativityTrajectory && relativityTrajectory.length > 1;
    const mainTrajData = isRelObserverSPrime ? relativityTrajectory! : trajectoryData;
    const mainAnimIdx = mainTrajData.findIndex((p) => p.time >= currentTime);
    const mainCurPt = mainAnimIdx >= 0 ? mainTrajData[mainAnimIdx] : mainTrajData[mainTrajData.length - 1];
    const visiblePts = mainAnimIdx >= 0 ? mainTrajData.slice(0, mainAnimIdx + 1) : mainTrajData;

    if (visiblePts.length > 1) {
      ctx.beginPath();
      // Use observer-specific color when relativity is active
      if (relativityEnabled && relativityShowDual) {
        const relColor = isRelObserverSPrime
          ? (relativityMode === 'lorentz' ? '#a855f7' : '#f97316')
          : (nightMode ? '#22c55e' : '#16a34a');
        ctx.strokeStyle = relColor;
      } else {
        ctx.strokeStyle = colors.trajectory;
      }
      ctx.lineWidth = 3;
      visiblePts.forEach((p, i) => i === 0 ? ctx.moveTo(toX(p.x), toY(p.y)) : ctx.lineTo(toX(p.x), toY(p.y)));
      ctx.stroke();
    }

    // Projectile dot — follows active observer's trajectory
    const activePt = (relativityEnabled && isRelObserverSPrime) ? mainCurPt : curPt;
    if (activePt) {
      const bx = toX(activePt.x), by = toY(activePt.y);

      // Determine projectile dot state:
      // - animating → solid color (no animation)
      // - finished (timeline complete) → red
      // - stopped/paused → default (black/white depending on theme)
      const lastPt = trajectoryData[trajectoryData.length - 1];
      const isFinished = !isAnimating && lastPt && currentTime >= lastPt.time - 0.001;
      const dotColor = isAnimating ? '#22c55e' : isFinished ? '#ef4444' : colors.projectile;
      const pulseRadius = 7;

      // Draw projectile — use emoji icon if a preset is active
      if (activePresetEmoji === '🏹') {
        // Arrow scenario: draw a small arrow shape tangent to velocity vector
        const moveAngle = Math.atan2(-activePt.vy * sY, activePt.vx * sX);
        const arrowLen = 22;
        const arrowHeadLen = 8;
        const arrowHeadWidth = 5;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(moveAngle);
        // Arrow shaft
        ctx.beginPath();
        ctx.strokeStyle = nightMode ? '#e2e8f0' : '#1a1a1a';
        ctx.lineWidth = 2.5;
        ctx.moveTo(-arrowLen / 2, 0);
        ctx.lineTo(arrowLen / 2 - arrowHeadLen, 0);
        ctx.stroke();
        // Arrow head
        ctx.beginPath();
        ctx.fillStyle = nightMode ? '#e2e8f0' : '#1a1a1a';
        ctx.moveTo(arrowLen / 2, 0);
        ctx.lineTo(arrowLen / 2 - arrowHeadLen, -arrowHeadWidth);
        ctx.lineTo(arrowLen / 2 - arrowHeadLen, arrowHeadWidth);
        ctx.closePath();
        ctx.fill();
        // Arrow tail fletching
        ctx.beginPath();
        ctx.strokeStyle = nightMode ? '#94a3b8' : '#666';
        ctx.lineWidth = 1.5;
        ctx.moveTo(-arrowLen / 2, 0);
        ctx.lineTo(-arrowLen / 2 - 3, -4);
        ctx.moveTo(-arrowLen / 2, 0);
        ctx.lineTo(-arrowLen / 2 - 3, 4);
        ctx.stroke();
        ctx.restore();
      } else if (activePresetEmoji) {
        const moveAngle = Math.atan2(-activePt.vy * sY, activePt.vx * sX);
        // Adjust rotation for emoji base orientation:
        // 🚀 points upper-right (~315° or -45°)
        // 🎾 (tennis ball) is symmetric
        let emojiBaseAngle = 0;
        if (activePresetEmoji === '🚀') {
          emojiBaseAngle = -Math.PI / 4;
        }
        
        // Use a default dot if the emoji is a placeholder or unknown (e.g., '🎾' if font doesn't support)
        // For simplicity, we just render the emoji, but if it's '🎾' (tennis) we ensure it looks good
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(moveAngle - emojiBaseAngle);
        const emojiSize = Math.round(7 * 3.5);
        ctx.font = `${emojiSize}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(activePresetEmoji, 0, 0);
        ctx.restore();
      } else {
        // Default projectile (e.g. for tennis ball or unknown objects)
        ctx.beginPath();
        ctx.fillStyle = dotColor;
        ctx.arc(bx, by, pulseRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = colors.projectileStroke;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Force & Velocity vectors
      if (showExternalForces) {
        const sf2 = Math.max(1, W / 1000);

        // Velocity scale: proportional to speed, capped for readability
        // Use a generous minimum so Vx/Vy are always clearly visible
        let maxSpeed = 1;
        for (let i = 0; i < trajectoryData.length; i++) {
          if (trajectoryData[i].speed > maxSpeed) maxSpeed = trajectoryData[i].speed;
        }
        const plotMin = Math.min(plotW, plotH);
        const velScale = plotMin * 0.12 / maxSpeed;
        const minVelArrowLen = plotMin * 0.025; // minimum arrow length so vectors are always visible

        // Force scale: proportional to force magnitude, normalized to weight
        const weightForce = mass * gravity;
        const forcePixelBase = plotMin * 0.10;
        const minForceArrowLen = plotMin * 0.018;

        // Acceleration scale: normalized to gravity
        const accPixelBase = plotMin * 0.10;
        const minAccArrowLen = plotMin * 0.018;

        const drawArrow = (fromX: number, fromY: number, toX2: number, toY2: number, color: string, label: string, showMag?: string) => {
          const dx = toX2 - fromX, dy = toY2 - fromY;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len < 2) return;

          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.5 * sf2;
          ctx.moveTo(fromX, fromY);
          ctx.lineTo(toX2, toY2);
          ctx.stroke();

          const angle2 = Math.atan2(dy, dx);
          const headLen = Math.max(8 * sf2, Math.min(14 * sf2, len * 0.35));
          ctx.beginPath();
          ctx.fillStyle = color;
          ctx.moveTo(toX2, toY2);
          ctx.lineTo(toX2 - headLen * Math.cos(angle2 - 0.35), toY2 - headLen * Math.sin(angle2 - 0.35));
          ctx.lineTo(toX2 - headLen * Math.cos(angle2 + 0.35), toY2 - headLen * Math.sin(angle2 + 0.35));
          ctx.closePath();
          ctx.fill();

          const displayLabel = showMag ? `${label} ${showMag}` : label;
          const lx = toX2 + 14 * sf2 * Math.cos(angle2 + Math.PI / 2);
          const ly = toY2 + 14 * sf2 * Math.sin(angle2 + Math.PI / 2);
          ctx.font = `bold ${Math.round(12 * sf2)}px IBM Plex Mono, monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = color;
          ctx.fillText(displayLabel, lx, ly);
          ctx.textBaseline = 'alphabetic';
        };

        // ── Velocity vector: perfectly tangent to the on-screen trajectory ──
        // The canvas uses non-uniform scaling (sX, sY) so a physics-space
        // velocity (vx, vy) must be mapped to screen-space to match the
        // drawn trajectory slope:
        //   screen_dx = vx * sX        (toX derivative)
        //   screen_dy = -vy * sY       (toY derivative, negative because canvas Y is inverted)
        // This screen-space vector is then normalized and scaled for display.
        const screenVx = activePt.vx * sX;
        const screenVy = -activePt.vy * sY;  // canvas Y is inverted
        const screenVMag = Math.sqrt(screenVx * screenVx + screenVy * screenVy);

        // Arrow length proportional to the physics velocity magnitude
        const vMag = Math.sqrt(activePt.vx * activePt.vx + activePt.vy * activePt.vy);
        const vArrowLen = Math.max(1, vMag) * velScale;

        // Normalized screen-space direction (tangent to the drawn curve)
        const vScreenUnitX = screenVMag > 1e-9 ? screenVx / screenVMag : 0;
        const vScreenUnitY = screenVMag > 1e-9 ? screenVy / screenVMag : 0;

        // Arrow tip: origin at projectile, extends in tangent direction
        const vTx = bx + vScreenUnitX * vArrowLen;
        const vTy = by + vScreenUnitY * vArrowLen;

        if (vectorVisibility.V && vMag > 0.01) {
          drawArrow(bx, by, vTx, vTy,
            nightMode ? '#e2e8f0' : '#000000', 'V');
        }
        if (vectorVisibility.Vx && Math.abs(activePt.vx) > 0.005) {
          const vxLen = Math.max(minVelArrowLen, Math.abs(activePt.vx) * velScale);
          const vxSign = activePt.vx >= 0 ? 1 : -1;
          drawArrow(bx, by, bx + vxSign * Math.max(vxLen, plotMin * 0.04), by, '#3b82f6', 'Vx');
        }
        if (vectorVisibility.Vy && Math.abs(activePt.vy) > 0.005) {
          const vyLen = Math.max(minVelArrowLen, Math.abs(activePt.vy) * velScale);
          const vySign = activePt.vy >= 0 ? 1 : -1;
          drawArrow(bx, by, bx, by - vySign * Math.max(vyLen, plotMin * 0.04), '#22c55e', 'Vy');
        }

        // ═══ FORCE VECTORS ═══
        // All forces computed consistently with the physics engine

        // Gravitational force: Fg = m*g, always pointing DOWN
        const fgY = -mass * gravity; // negative = downward in physics coords
        if (vectorVisibility.Fg && gravity > 0.001) {
          const fgLen = Math.max(minForceArrowLen, (Math.abs(fgY) / Math.max(weightForce, 0.01)) * forcePixelBase);
          drawArrow(bx, by, bx, by + fgLen, '#ef4444', 'Fg');
        }

        // Air drag force: Fd = k*v², opposite to velocity direction
        let fdX = 0, fdY = 0;
        if (airResistance > 0 && activePt.speed > 0.1) {
          const vrx = activePt.vx - windSpeed;
          const vry = activePt.vy;
          const speedRel = Math.sqrt(vrx * vrx + vry * vry);
          if (speedRel > 0.01) {
            const dragMag = airResistance * speedRel * speedRel;
            fdX = -dragMag * (vrx / speedRel);
            fdY = -dragMag * (vry / speedRel);
          }
        }
        if (vectorVisibility.Fd && (Math.abs(fdX) > 0.001 || Math.abs(fdY) > 0.001)) {
          const fdMag = Math.sqrt(fdX * fdX + fdY * fdY);
          const fdLen = Math.max(minForceArrowLen, (fdMag / Math.max(weightForce, 0.01)) * forcePixelBase);
          drawArrow(bx, by, bx + (fdX / fdMag) * fdLen, by - (fdY / fdMag) * fdLen, '#f59e0b', 'Fd');
        }

        // Wind force visualization: shows the wind effect direction
        // Wind creates an additional horizontal push on the projectile
        if (vectorVisibility.Fw && Math.abs(windSpeed) > 0.01 && activePt.speed > 0.05) {
          // Wind force component: difference between drag with wind and drag without wind
          const windFx = airResistance > 0 ? airResistance * windSpeed * Math.abs(windSpeed) * 0.5 : windSpeed * 0.1 * mass;
          const fwMag = Math.abs(windFx);
          if (fwMag > 0.001) {
            const fwLen = Math.max(minForceArrowLen, (fwMag / Math.max(weightForce, 0.01)) * forcePixelBase);
            const fwDir = windFx > 0 ? 1 : -1;
            drawArrow(bx, by, bx + fwDir * fwLen, by, '#0ea5e9', 'Fw');
          }
        }

        // ═══ FLUID FRICTION RAY ═══
        // Shows the fluid drag force direction with a distinctive dashed ray
        if (fluidFrictionRay && activePt.speed > 0.1) {
          const vrx = activePt.vx - windSpeed;
          const vry = activePt.vy;
          const speedRel = Math.sqrt(vrx * vrx + vry * vry);
          if (speedRel > 0.01) {
            // Fluid drag magnitude (proportional to v² and fluid density)
            const effectiveDensity = isUnderwater ? fluidDensity : 1.225;
            const dragScale = effectiveDensity / 1.225; // Scale relative to air
            const dragMag = (airResistance > 0 ? airResistance : 0.1 * mass) * speedRel * speedRel * dragScale;
            const frDirX = -vrx / speedRel;
            const frDirY = -vry / speedRel;
            const frMag = Math.sqrt(dragMag * dragMag);
            const frLen = Math.min((frMag / Math.max(weightForce, 0.01)) * forcePixelBase * 1.2, forcePixelBase * 2.5);

            // Draw main friction ray with dashed line
            const frEndX = bx + frDirX * frLen;
            const frEndY = by - frDirY * frLen;
            const frColor = isUnderwater ? '#6b7db5' : '#8a9cc5'; // indigo for water, light slate for air

            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = frColor;
            ctx.lineWidth = 3 * sf2;
            ctx.setLineDash([6, 4]);
            ctx.globalAlpha = 0.85;
            ctx.moveTo(bx, by);
            ctx.lineTo(frEndX, frEndY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Arrowhead
            const frAngle = Math.atan2(-(frDirY), frDirX);
            const headLen = Math.min(10 * sf2, frLen * 0.3);
            ctx.beginPath();
            ctx.fillStyle = frColor;
            ctx.globalAlpha = 0.9;
            ctx.moveTo(frEndX, frEndY);
            ctx.lineTo(frEndX - headLen * Math.cos(frAngle - 0.4), frEndY - headLen * Math.sin(frAngle - 0.4));
            ctx.lineTo(frEndX - headLen * Math.cos(frAngle + 0.4), frEndY - headLen * Math.sin(frAngle + 0.4));
            ctx.closePath();
            ctx.fill();

            // Perpendicular side friction indicators (show all-directional resistance)
            const perpX = frDirY;
            const perpY = frDirX;
            const sideLen = frLen * 0.25;
            const midX = bx + frDirX * frLen * 0.5;
            const midY = by - frDirY * frLen * 0.5;
            ctx.globalAlpha = 0.45;
            ctx.lineWidth = 1.5 * sf2;
            ctx.setLineDash([3, 3]);
            // Side ray 1
            ctx.beginPath();
            ctx.moveTo(midX, midY);
            ctx.lineTo(midX + perpX * sideLen, midY - perpY * sideLen);
            ctx.stroke();
            // Side ray 2
            ctx.beginPath();
            ctx.moveTo(midX, midY);
            ctx.lineTo(midX - perpX * sideLen, midY + perpY * sideLen);
            ctx.stroke();
            ctx.setLineDash([]);

            // Label
            ctx.globalAlpha = 0.9;
            ctx.font = `bold ${Math.round(11 * sf2)}px IBM Plex Mono, monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = frColor;
            const labelX = frEndX + 16 * sf2 * Math.cos(frAngle + Math.PI / 2);
            const labelY = frEndY + 16 * sf2 * Math.sin(frAngle + Math.PI / 2);
            ctx.fillText(isUnderwater ? 'F_fluid' : 'F_drag', labelX, labelY);
            ctx.restore();
          }
        }

        // ═══ NET FORCE VECTOR ═══
        // Fnet = sum of all forces (Newton's 2nd law: Fnet = m*a)
        // Use actual acceleration from physics engine for consistency
        if (vectorVisibility.Fnet) {
          const netFx = mass * activePt.ax;
          const netFy = mass * activePt.ay;
          const netMag = Math.sqrt(netFx * netFx + netFy * netFy);
          if (netMag > 0.005) {
            const fnetLen = Math.max(minForceArrowLen, (netMag / Math.max(weightForce, 0.01)) * forcePixelBase);
            drawArrow(bx, by, bx + (netFx / netMag) * fnetLen, by - (netFy / netMag) * fnetLen, '#8b5cf6', 'Fnet');
          }
        }

        // ═══ ACCELERATION VECTOR ═══
        // Use ax/ay directly from physics engine TrajectoryPoint data
        // This ensures perfect consistency with the simulation
        if (vectorVisibility.acc) {
          const accMag = activePt.acceleration;
          if (accMag > 0.005) {
            const accLen = Math.max(minAccArrowLen, (accMag / Math.max(gravity, 0.01)) * accPixelBase);
            drawArrow(bx, by, bx + (activePt.ax / accMag) * accLen, by - (activePt.ay / accMag) * accLen, '#6b7db5', 'a');
          }
        }

      }

      // ── Stroboscopic marks ──
      if (stroboscopicMarks.length > 0) {
        // Draw projection lines first (behind marks)
        if (showStroboscopicProjections && stroboscopicMarks.length >= 2) {
          stroboscopicMarks.forEach((mark) => {
            const mx = toX(mark.x);
            const my = toY(mark.y);

            // Green dashed line to X axis (vertical line down to ground)
            ctx.beginPath();
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 4]);
            ctx.moveTo(mx, my);
            ctx.lineTo(mx, groundY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Small green dot on X axis
            ctx.beginPath();
            ctx.fillStyle = '#22c55e';
            ctx.arc(mx, groundY, 3, 0, Math.PI * 2);
            ctx.fill();

            // Orange dashed line to Y axis (horizontal line to Y axis)
            ctx.beginPath();
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 4]);
            ctx.moveTo(mx, my);
            ctx.lineTo(originX, my);
            ctx.stroke();
            ctx.setLineDash([]);

            // Small orange dot on Y axis
            ctx.beginPath();
            ctx.fillStyle = '#f97316';
            ctx.arc(originX, my, 3, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        // Draw X marks
        stroboscopicMarks.forEach((mark) => {
          const mx = toX(mark.x);
          const my = toY(mark.y);
          const size = 5;

          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';

          // Draw X shape
          ctx.beginPath();
          ctx.moveTo(mx - size, my - size);
          ctx.lineTo(mx + size, my + size);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(mx + size, my - size);
          ctx.lineTo(mx - size, my + size);
          ctx.stroke();

          ctx.lineCap = 'butt';
        });
      }

      // ── Second body (collision target) ──
      if (secondBody && secondBody.enabled) {
        const bx = toX(secondBody.x);
        const by = toY(secondBody.y);
        const bPixelR = Math.max(6, secondBody.radius * sX);
        // Body circle
        ctx.beginPath();
        ctx.arc(bx, by, bPixelR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(239,68,68,0.25)';
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Cross-hair
        ctx.beginPath();
        ctx.moveTo(bx - bPixelR * 0.6, by);
        ctx.lineTo(bx + bPixelR * 0.6, by);
        ctx.moveTo(bx, by - bPixelR * 0.6);
        ctx.lineTo(bx, by + bPixelR * 0.6);
        ctx.strokeStyle = 'rgba(239,68,68,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Label
        ctx.fillStyle = '#ef4444';
        ctx.font = `bold ${Math.round(10 * sf)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`m₂=${secondBody.mass}kg`, bx, by - bPixelR - 6);
      }

      // ── Collision point marker ──
      if (collisionPoint) {
        const cx = toX(collisionPoint.x);
        const cy = toY(collisionPoint.y);
        // Pulsing ring
        ctx.beginPath();
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 3;
        ctx.stroke();
        // Inner dot
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#f97316';
        ctx.fill();
        // Label
        ctx.fillStyle = '#f97316';
        ctx.font = `bold ${Math.round(10 * sf)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`💥 t=${collisionPoint.time.toFixed(2)}s`, cx, cy - 18);
      }

      // Critical points
      if (showCriticalPoints && prediction) {
        const drawDot = (x: number, y: number, lbl: string, color: string = colors.dot) => {
          ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = colors.projectileStroke; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = colors.dotLabel; ctx.font = `bold 11px Inter, sans-serif`; ctx.textAlign = 'center';
          ctx.fillText(lbl, x, y - 12);
        };
        drawDot(toX(0), toY(height), T.c_launch, '#22c55e');
        if (prediction.maxHeightPoint) drawDot(toX(prediction.maxHeightPoint.x), toY(prediction.maxHeightPoint.y), T.c_maxH, '#3b82f6');
        const impX = toX(prediction.range);
        drawDot(impX, groundY, T.c_impact, '#ef4444');
      }

      // Impact marker
      if (prediction && !showCriticalPoints) {
        const impX = toX(prediction.range);
        ctx.fillStyle = colors.dot; ctx.beginPath(); ctx.arc(impX, groundY, 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = colors.projectileStroke; ctx.lineWidth = 1.5; ctx.stroke();
      }

      // Info box
      if (!showLiveData) { /* skip info box when hidden */ } else {
      const iW = Math.round(220 * sf), iH = Math.round(190 * sf);
      const iX = W - iW - 12 * sf, iY = MT + 8 * sf;
      ctx.fillStyle = colors.infoBox;
      ctx.strokeStyle = colors.infoBorder;
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(iX, iY, iW, iH, 6 * sf); else ctx.rect(iX, iY, iW, iH);
      ctx.fill(); ctx.stroke();

      const headerH = Math.round(28 * sf);
      ctx.fillStyle = colors.infoHeader; ctx.fillRect(iX + 1, iY + 1, iW - 2, headerH);
      ctx.fillStyle = colors.infoText; ctx.font = `bold ${Math.round(13 * sf)}px Inter, sans-serif`; ctx.textAlign = 'left';
      ctx.fillText(lang === 'ar' ? 'البيانات الحية' : 'Live Data', iX + 10 * sf, iY + 19 * sf);

      ctx.font = `bold ${Math.round(12 * sf)}px IBM Plex Mono, monospace`; ctx.textAlign = 'left';
      const ix2 = iX + 10 * sf, iy2 = iY + headerH + 16 * sf, ls = Math.round(17 * sf);
      // Compute angle relative to horizon and slope
      // Use active observer's point for info display when relativity is enabled
      const infoPt = activePt || curPt;
      const angleHorizon = Math.atan2(infoPt.vy, infoPt.vx) * 180 / Math.PI;
      const slopeValue = Math.abs(infoPt.vx) > 1e-6 ? infoPt.vy / infoPt.vx : (infoPt.vy >= 0 ? Infinity : -Infinity);
      const slopeStr = isFinite(slopeValue) ? slopeValue.toFixed(3) : (slopeValue >= 0 ? '\u221e' : '-\u221e');

      const infoItems: [string, string][] = [
        [`t: ${infoPt.time.toFixed(3)} ${T.c_t}`, colors.infoText],
        [`X: ${infoPt.x.toFixed(2)} ${T.c_xUnit}`, colors.infoText],
        [`Y: ${infoPt.y.toFixed(2)} ${T.c_yUnit}`, colors.infoText],
        [`V: ${infoPt.speed.toFixed(2)} ${T.u_ms}`, colors.infoText],
        [`Vx: ${infoPt.vx.toFixed(2)} ${T.u_ms}`, colors.infoTextDim],
        [`Vy: ${infoPt.vy.toFixed(2)} ${T.u_ms}`, colors.infoTextDim],
        [`a: ${infoPt.acceleration.toFixed(2)} ${T.u_ms2}`, colors.infoTextDim],
        [`\u03b8: ${angleHorizon.toFixed(1)}\u00b0`, colors.infoText],
        [`${lang === 'ar' ? '\u0627\u0644\u0645\u064a\u0644' : 'Slope'}: ${slopeStr}`, colors.infoTextDim],
      ];
      infoItems.forEach((item, idx) => {
        ctx.fillStyle = item[1];
        ctx.fillText(item[0], ix2, iy2 + idx * ls);
      });
      } // end showLiveData
    }

    // ── Calibration scale bar ──
    // When calibration is active, show a visual scale bar at the bottom-right
    if (calibrationScale && calibrationScale > 0) {
      const scaleBarMeters = tickSpaceX > 0 ? tickSpaceX : 1; // use same spacing as grid ticks
      const scaleBarPx = scaleBarMeters * sX; // convert to canvas pixels using current scale
      const sbX = ML + plotW - scaleBarPx - 20;
      const sbY = MT + plotH - 30;
      const sbColor = useWhiteAxes ? '#ffffff' : (nightMode ? '#cbd5e1' : '#333333');

      ctx.save();
      ctx.strokeStyle = sbColor;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.8;
      // Horizontal bar
      ctx.beginPath();
      ctx.moveTo(sbX, sbY);
      ctx.lineTo(sbX + scaleBarPx, sbY);
      ctx.stroke();
      // End caps
      ctx.beginPath();
      ctx.moveTo(sbX, sbY - 6); ctx.lineTo(sbX, sbY + 6); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sbX + scaleBarPx, sbY - 6); ctx.lineTo(sbX + scaleBarPx, sbY + 6); ctx.stroke();

      // Label: show real-world length
      const realLen = scaleBarMeters;
      let scaleLabel: string;
      if (realLen >= 1) {
        scaleLabel = `${realLen.toFixed(1)} m`;
      } else if (realLen >= 0.01) {
        scaleLabel = `${(realLen * 100).toFixed(1)} cm`;
      } else {
        scaleLabel = `${(realLen * 1000).toFixed(1)} mm`;
      }
      // Add px/m info
      scaleLabel += ` (${Math.round(calibrationScale)} px/m)`;

      ctx.fillStyle = sbColor;
      ctx.font = `bold ${Math.round(10 * sf)}px IBM Plex Mono, monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(scaleLabel, sbX + scaleBarPx / 2, sbY - 10);
      ctx.restore();
    }

    // Countdown overlay
    if (countdown !== null) {
      ctx.fillStyle = colors.countdownBg;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = colors.countdownText;
      ctx.font = 'bold 64px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(countdown), W / 2, H / 2);
      ctx.textBaseline = 'alphabetic';
    }

    ctx.restore();
  }, [trajectoryData, theoreticalData, prediction, currentTime, height,
    showCriticalPoints, showExternalForces, vectorVisibility, showAIComparison, aiModels,
    customColors, comparisonMode, savedTrajectory, multiTrajectoryMode,
    multiTrajectories, mass, gravity, airResistance, T, lang, countdown,
    nightMode, zoom, canvasSize, colors, panOffset, isAnimating, windSpeed, showLiveData,
    stroboscopicMarks, showStroboscopicProjections, environmentId, activePresetEmoji, equationTrajectory, showGrid, secondBody, collisionPoint,
    fluidFrictionRay, isUnderwater, fluidDensity, calibrationScale,
    relativityTrajectory, relativityEnabled, relativityMode, relativityActiveObserver, relativityShowDual, relativityFrameVelocity]);

  useEffect(() => { drawCanvas(); }, [drawCanvas]);

  // Continuous redraw for pulse animation
  useEffect(() => {
    if (!isAnimating) return;
    let raf: number;
    const loop = () => { drawCanvas(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isAnimating, drawCanvas]);

  // Mouse drag for panning
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...panOffset };
  }, [zoom, panOffset]);

  const handleMouseMoveCanvas = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      const canvas = canvasRef.current;
      const ratio = canvas ? canvas.width / canvas.clientWidth : 2;
      // Clamp pan so content cannot leave the canvas frame
      const W = canvas ? canvas.width : 1200;
      const H = canvas ? canvas.height : 700;
      const maxPanX = W * (zoom - 1) * 0.5;
      const maxPanY = H * (zoom - 1) * 0.5;
      const newX = Math.max(-maxPanX, Math.min(maxPanX, panStart.current.x + dx * ratio));
      const newY = Math.max(-maxPanY, Math.min(maxPanY, panStart.current.y + dy * ratio));
      setPanOffset({ x: newX, y: newY });
      return;
    }

    // Hover logic
    const canvas = canvasRef.current;
    if (!canvas || !trajectoryData.length) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / canvas.clientWidth;
    const scaleY = canvas.height / canvas.clientHeight;
    const rawMx = (e.clientX - rect.left) * scaleX;
    const rawMy = (e.clientY - rect.top) * scaleY;
    setMousePos({ x: e.clientX, y: e.clientY });

    // Invert zoom+pan transform to get coordinates in drawCanvas space
    const cxC = canvas.width / 2, cyC = canvas.height / 2;
    // Only invert canvas transform when zoom > 1 (zoom-in uses ctx.scale)
    const mx = zoom > 1 ? (rawMx - cxC - panOffset.x) / zoom + cxC : rawMx;
    const my = zoom > 1 ? (rawMy - cyC - panOffset.y) / zoom + cyC : rawMy;

    // Recalculate domain for hover (must match drawCanvas logic exactly)
    let rMinX = 0, rMaxX = 0, rMinY = 0, rMaxY = height + 1;
    for (let i = 0; i < trajectoryData.length; i++) {
      const px = trajectoryData[i].x, py = trajectoryData[i].y;
      if (px < rMinX) rMinX = px;
      if (px > rMaxX) rMaxX = px;
      if (py < rMinY) rMinY = py;
      if (py > rMaxY) rMaxY = py;
    }
    if (theoreticalData.length > 0) {
      for (let i = 0; i < theoreticalData.length; i++) {
        const px = theoreticalData[i].x, py = theoreticalData[i].y;
        if (px < rMinX) rMinX = px;
        if (px > rMaxX) rMaxX = px;
        if (py < rMinY) rMinY = py;
        if (py > rMaxY) rMaxY = py;
      }
    }
    if (comparisonMode && savedTrajectory) {
      for (let i = 0; i < savedTrajectory.length; i++) {
        const px = savedTrajectory[i].x, py = savedTrajectory[i].y;
        if (px < rMinX) rMinX = px;
        if (px > rMaxX) rMaxX = px;
        if (py < rMinY) rMinY = py;
        if (py > rMaxY) rMaxY = py;
      }
    }
    if (multiTrajectoryMode && multiTrajectories.length > 0) {
      multiTrajectories.forEach(mt => {
        for (let i = 0; i < mt.points.length; i++) {
          const px = mt.points[i].x, py = mt.points[i].y;
          if (px < rMinX) rMinX = px;
          if (px > rMaxX) rMaxX = px;
          if (py < rMinY) rMinY = py;
          if (py > rMaxY) rMaxY = py;
        }
      });
    }

    const xR = rMaxX - rMinX || 10;
    const yR = rMaxY - rMinY || 10;
    const pX = xR * 0.1;
    const pY = yR * 0.12;
    let dMinX = rMinX - pX;
    let dMaxX = rMaxX + pX;
    let dMinY = rMinY < -0.1 ? rMinY - pY : -pY * 0.3;
    let dMaxY = rMaxY + pY;

    // Expand domain when zoomed out (must match drawCanvas logic)
    if (zoom < 1) {
      const expandFactor = 1 / zoom;
      const centerX = (dMinX + dMaxX) / 2;
      const centerY = (dMinY + dMaxY) / 2;
      const halfW = (dMaxX - dMinX) / 2 * expandFactor;
      const halfH = (dMaxY - dMinY) / 2 * expandFactor;
      dMinX = centerX - halfW;
      dMaxX = centerX + halfW;
      dMinY = centerY - halfH;
      dMaxY = centerY + halfH;
    }

    const dW = dMaxX - dMinX;
    const dH = dMaxY - dMinY;

    // Use zoom-adjusted margins matching drawCanvas
    const hEffZoom = zoom > 1 ? zoom : 1;
    const hML = Math.round(70 / hEffZoom), hMR = Math.round(30 / hEffZoom);
    const hMT = Math.round(35 / hEffZoom), hMB = Math.round(50 / hEffZoom);
    const hPlotW = canvas.width - hML - hMR, hPlotH = canvas.height - hMT - hMB;
    const hSX = hPlotW / dW, hSY = hPlotH / dH;
    const physX = dMinX + (mx - hML) / hSX;
    const physY = dMinY + (hPlotH - (my - hMT)) / hSY;

    let closest: TrajectoryPoint | null = null, minD = Infinity;
    trajectoryData.forEach((p) => {
      const ddx = (p.x - physX) * hSX, ddy = (p.y - physY) * hSY;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);
      if (dist < minD && dist < 40) { minD = dist; closest = p; }
    });
    setHoverInfo(closest);
  }, [trajectoryData, theoreticalData, savedTrajectory, comparisonMode, multiTrajectoryMode, multiTrajectories, height, isDragging, panOffset, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full ${isFullscreen ? 'h-full' : ''}`}>
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        style={isFullscreen ? undefined : { aspectRatio: `${canvasSize.w} / ${canvasSize.h}` }}
        className={`w-full rounded border border-border ${isFullscreen ? 'h-full' : ''} ${zoom > 1 ? 'cursor-grab' : ''} ${isDragging ? '!cursor-grabbing' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMoveCanvas}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setHoverInfo(null); setIsDragging(false); }}
      />

      {hoverInfo && !isDragging &&
        <div className="fixed z-50 pointer-events-none bg-background border border-border rounded-md p-3 text-xs shadow-md"
          style={{ left: mousePos.x + 16, top: mousePos.y - 10, minWidth: 160 }}>
          <p className="font-semibold text-foreground mb-1">{lang === 'ar' ? 'تفاصيل النقطة' : 'Point Details'}</p>
          <p className="text-muted-foreground">t = {hoverInfo.time.toFixed(3)} {T.c_t}</p>
          <p className="text-muted-foreground">X = {hoverInfo.x.toFixed(2)} {T.c_xUnit}</p>
          <p className="text-muted-foreground">Y = {hoverInfo.y.toFixed(2)} {T.c_yUnit}</p>
          <p className="text-muted-foreground">V = {hoverInfo.speed.toFixed(2)} {T.u_ms}</p>
        </div>
      }
    </div>
  );
};

export default SimulationCanvas;
