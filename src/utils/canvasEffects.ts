/**
 * Lightweight canvas visual effects for the APAS Simulator.
 * Pure canvas-based — no heavy libraries, maintains 60fps.
 */

// ── Particle system for impact & launch effects ──
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

let particles: Particle[] = [];

/** Spawn a burst of particles at a point (for impact/launch) */
export function spawnParticleBurst(
  x: number, y: number,
  count: number,
  color: string,
  speed: number = 3,
  lifetime: number = 40,
) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const spd = speed * (0.5 + Math.random() * 0.8);
    particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: lifetime + Math.random() * 15,
      maxLife: lifetime + 15,
      size: 1.5 + Math.random() * 2.5,
      color,
      alpha: 1,
    });
  }
}

/** Update and draw all active particles */
export function updateAndDrawParticles(ctx: CanvasRenderingContext2D) {
  const alive: Particle[] = [];
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08; // gravity
    p.vx *= 0.98; // friction
    p.life -= 1;
    p.alpha = Math.max(0, p.life / p.maxLife);

    if (p.life > 0) {
      ctx.save();
      ctx.globalAlpha = p.alpha * 0.8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      alive.push(p);
    }
  }
  particles = alive;
}

export function hasActiveParticles(): boolean {
  return particles.length > 0;
}

export function clearParticles() {
  particles = [];
}

// ── Impact ripple effect ──
export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

let ripples: Ripple[] = [];

/** Spawn a radial ripple at impact point */
export function spawnRipple(x: number, y: number, color: string, maxRadius: number = 40) {
  ripples.push({ x, y, radius: 2, maxRadius, alpha: 0.6, color });
}

/** Update and draw ripples */
export function updateAndDrawRipples(ctx: CanvasRenderingContext2D) {
  const alive: Ripple[] = [];
  for (const r of ripples) {
    r.radius += 2.5;
    r.alpha = Math.max(0, 0.6 * (1 - r.radius / r.maxRadius));

    if (r.radius < r.maxRadius) {
      ctx.save();
      ctx.globalAlpha = r.alpha;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      alive.push(r);
    }
  }
  ripples = alive;
}

export function hasActiveRipples(): boolean {
  return ripples.length > 0;
}

// ── Flash overlay effect ──
let flashAlpha = 0;
let flashColor = '#ffffff';

export function triggerFlash(color: string = '#ffffff') {
  flashAlpha = 0.12;
  flashColor = color;
}

export function updateAndDrawFlash(ctx: CanvasRenderingContext2D, W: number, H: number) {
  if (flashAlpha > 0.001) {
    ctx.save();
    ctx.globalAlpha = flashAlpha;
    ctx.fillStyle = flashColor;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    flashAlpha *= 0.85; // rapid decay
  }
}

export function hasActiveFlash(): boolean {
  return flashAlpha > 0.001;
}

// ── Trajectory trail (fading alpha trail) ──
export function drawGradientTrajectory(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  toX: (x: number) => number,
  toY: (y: number) => number,
  baseColor: string,
  lineWidth: number = 3,
  glowEnabled: boolean = true,
) {
  if (points.length < 2) return;

  // Draw glow layer first (subtle)
  if (glowEnabled) {
    ctx.save();
    ctx.shadowColor = baseColor;
    ctx.shadowBlur = 8;
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = lineWidth + 2;
    ctx.beginPath();
    const lastFew = points.slice(Math.max(0, points.length - 30));
    lastFew.forEach((p, i) => i === 0 ? ctx.moveTo(toX(p.x), toY(p.y)) : ctx.lineTo(toX(p.x), toY(p.y)));
    ctx.stroke();
    ctx.restore();
  }

  // Draw gradient trajectory — older segments fade
  const totalPts = points.length;
  for (let i = 1; i < totalPts; i++) {
    const progress = i / totalPts; // 0 = oldest, 1 = newest
    const alpha = 0.2 + progress * 0.8; // fade from 0.2 to 1.0

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = lineWidth * (0.6 + progress * 0.4); // thinner at start
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(toX(points[i - 1].x), toY(points[i - 1].y));
    ctx.lineTo(toX(points[i].x), toY(points[i].y));
    ctx.stroke();
    ctx.restore();
  }
}

// ── Enhanced projectile drawing ──
export function drawEnhancedProjectile(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  radius: number,
  color: string,
  strokeColor: string,
  isAnimating: boolean,
  speed: number = 0,
  angle: number = 0,
) {
  ctx.save();

  // Motion blur effect (subtle shadow in direction of motion)
  if (isAnimating && speed > 1) {
    const blurLen = Math.min(speed * 0.4, 15);
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = color;
    for (let i = 1; i <= 3; i++) {
      const t = i / 3;
      ctx.beginPath();
      ctx.arc(
        x - Math.cos(angle) * blurLen * t,
        y - Math.sin(angle) * blurLen * t,
        radius * (1 - t * 0.3),
        0, Math.PI * 2
      );
      ctx.fill();
    }
    ctx.restore();
  }

  // Gradient fill for projectile
  const gradient = ctx.createRadialGradient(
    x - radius * 0.3, y - radius * 0.3, 0,
    x, y, radius
  );
  gradient.addColorStop(0, lightenColor(color, 40));
  gradient.addColorStop(0.7, color);
  gradient.addColorStop(1, darkenColor(color, 30));

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Subtle border
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Highlight spot (top-left)
  ctx.beginPath();
  ctx.arc(x - radius * 0.25, y - radius * 0.25, radius * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fill();

  ctx.restore();
}

// ── Color utilities ──
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + percent);
  const g = Math.min(255, ((num >> 8) & 0xff) + percent);
  const b = Math.min(255, (num & 0xff) + percent);
  return `rgb(${r},${g},${b})`;
}

function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) - percent);
  const g = Math.max(0, ((num >> 8) & 0xff) - percent);
  const b = Math.max(0, (num & 0xff) - percent);
  return `rgb(${r},${g},${b})`;
}

// ── Launch scale animation state ──
let launchScale = 1;
let launchScaleTarget = 1;
let launchAnimating = false;

export function triggerLaunchAnimation() {
  launchScale = 0.8;
  launchScaleTarget = 1;
  launchAnimating = true;
}

export function getLaunchScale(): number {
  if (launchAnimating) {
    // Spring-like animation toward target
    launchScale += (launchScaleTarget - launchScale) * 0.15;
    if (launchScale > 1.08) {
      launchScaleTarget = 1;
    }
    if (Math.abs(launchScale - 1) < 0.005) {
      launchScale = 1;
      launchAnimating = false;
    }
    // Overshoot phase
    if (launchScale < 0.95) {
      launchScaleTarget = 1.1;
    }
  }
  return launchScale;
}

export function isLaunchAnimating(): boolean {
  return launchAnimating;
}

// ── Check if any effects are active (for continuous redraw) ──
export function hasActiveEffects(): boolean {
  return hasActiveParticles() || hasActiveRipples() || hasActiveFlash() || isLaunchAnimating();
}
