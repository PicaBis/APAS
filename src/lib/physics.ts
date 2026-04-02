// Projectile Motion Physics Engine
// Based on Newtonian mechanics (no air resistance by default)

export interface ProjectileParams {
  v0: number;        // Initial velocity (m/s)
  angle: number;     // Launch angle (degrees)
  h0: number;        // Initial height (m)
  g?: number;        // Gravitational acceleration (m/s²)
}

export interface TrajectoryPoint {
  t: number;   // Time (s)
  x: number;   // Horizontal position (m)
  y: number;   // Vertical position (m)
  vx: number;  // Horizontal velocity (m/s)
  vy: number;  // Vertical velocity (m/s)
  v: number;   // Speed magnitude (m/s)
}

export interface ProjectileResults {
  maxHeight: number;       // Maximum height (m)
  range: number;           // Horizontal range (m)
  timeOfFlight: number;    // Total time of flight (s)
  timeToMaxHeight: number; // Time to reach max height (s)
  impactSpeed: number;     // Speed at impact (m/s)
  impactAngle: number;     // Angle at impact (degrees)
  trajectory: TrajectoryPoint[];
}

const DEG_TO_RAD = Math.PI / 180;
const G_DEFAULT = 9.81;

export function computeProjectile(params: ProjectileParams): ProjectileResults {
  const { v0, angle, h0, g = G_DEFAULT } = params;
  const theta = angle * DEG_TO_RAD;

  const v0x = v0 * Math.cos(theta);
  const v0y = v0 * Math.sin(theta);

  // Time to max height: vy = v0y - g*t = 0
  const timeToMaxHeight = v0y / g;

  // Max height: y = h0 + v0y*t - 0.5*g*t²
  const maxHeight = h0 + (v0y * v0y) / (2 * g);

  // Time of flight: solve h0 + v0y*t - 0.5*g*t² = 0
  // Using quadratic formula: t = (v0y + sqrt(v0y² + 2*g*h0)) / g
  const discriminant = v0y * v0y + 2 * g * h0;
  const timeOfFlight = discriminant >= 0
    ? (v0y + Math.sqrt(discriminant)) / g
    : 0;

  // Range
  const range = v0x * timeOfFlight;

  // Impact velocity
  const vyImpact = v0y - g * timeOfFlight;
  const impactSpeed = Math.sqrt(v0x * v0x + vyImpact * vyImpact);
  const impactAngle = Math.abs(Math.atan2(vyImpact, v0x)) / DEG_TO_RAD;

  // Generate trajectory points
  const numPoints = 200;
  const dt = timeOfFlight / numPoints;
  const trajectory: TrajectoryPoint[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const t = i * dt;
    const x = v0x * t;
    const y = h0 + v0y * t - 0.5 * g * t * t;
    const vx = v0x;
    const vy = v0y - g * t;
    const v = Math.sqrt(vx * vx + vy * vy);

    if (y < 0 && i > 0) break;

    trajectory.push({ t, x, y: Math.max(0, y), vx, vy, v });
  }

  return {
    maxHeight,
    range,
    timeOfFlight,
    timeToMaxHeight,
    impactSpeed,
    impactAngle,
    trajectory,
  };
}

export function formatNumber(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}
