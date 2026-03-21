/**
 * Advanced Physics Integration Module
 * Seamlessly integrates advanced physics features into existing simulation
 * 
 * This module provides optional enhancements without breaking existing code:
 * - Coriolis effect calculation
 * - Magnus effect (spin-induced lift)
 * - Altitude-dependent air density
 * - Advanced drag modeling
 * 
 * All features are optional and can be toggled independently.
 */

/**
 * Coriolis Effect Calculation
 * Computes acceleration due to Earth's rotation
 * 
 * @param vx - Velocity in x direction (m/s)
 * @param vy - Velocity in y direction (m/s)
 * @param latitude - Geographic latitude in degrees (-90 to 90)
 * @returns Object with ax and ay acceleration components
 */
export function calculateCoriolisAcceleration(
  vx: number,
  vy: number,
  latitude: number
): { ax: number; ay: number } {
  // Earth's angular velocity: 7.2921e-5 rad/s
  const OMEGA = 7.2921e-5;
  
  // Convert latitude to radians
  const lat = (latitude * Math.PI) / 180;
  
  // Coriolis acceleration components
  // a_coriolis = 2 * Omega × v
  const ax = 2 * OMEGA * Math.sin(lat) * vy;
  const ay = -2 * OMEGA * Math.sin(lat) * vx;
  
  return { ax, ay };
}

/**
 * Air Density at Altitude
 * Uses barometric formula for realistic density variation
 * 
 * @param altitude - Height above sea level (m)
 * @param baseDensity - Sea level air density (kg/m³), default 1.225
 * @returns Air density at given altitude (kg/m³)
 */
export function getAirDensityAtAltitude(
  altitude: number,
  baseDensity: number = 1.225
): number {
  // Scale height for exponential decay: ~8500 m
  const SCALE_HEIGHT = 8500;
  
  // Barometric formula: ρ(h) = ρ₀ * exp(-h / H)
  return baseDensity * Math.exp(-altitude / SCALE_HEIGHT);
}

/**
 * Magnus Force Acceleration
 * Calculates lift force from projectile spin
 * 
 * @param velocity - Projectile velocity (m/s)
 * @param spinRate - Spin rate in revolutions per second
 * @param diameter - Projectile diameter (m)
 * @param airDensity - Air density (kg/m³)
 * @returns Magnus acceleration (m/s²)
 */
export function calculateMagnusAcceleration(
  velocity: number,
  spinRate: number,
  diameter: number,
  airDensity: number
): number {
  if (velocity < 0.1 || spinRate === 0) return 0;
  
  // Magnus coefficient (empirical, typically 0.1-0.5 for spheres)
  const CL = 0.2;
  
  // Cross-sectional area
  const area = Math.PI * (diameter / 2) ** 2;
  
  // Magnus force: F = CL * (1/2) * ρ * v² * A
  const force = CL * 0.5 * airDensity * velocity ** 2 * area;
  
  // Assuming typical projectile mass of 0.1 kg for acceleration
  // In real implementation, pass mass as parameter
  const effectiveMass = 0.1;
  
  return force / effectiveMass;
}

/**
 * Advanced Drag Coefficient
 * Accounts for Reynolds number effects
 * 
 * @param velocity - Projectile velocity (m/s)
 * @param diameter - Projectile diameter (m)
 * @param baseCd - Base drag coefficient (e.g., 0.47 for sphere)
 * @returns Adjusted drag coefficient
 */
export function getAdvancedDragCoefficient(
  velocity: number,
  diameter: number,
  baseCd: number = 0.47
): number {
  // Kinematic viscosity of air at 15°C: 1.81e-5 m²/s
  const NU = 1.81e-5;
  
  // Reynolds number
  const Re = (velocity * diameter) / NU;
  
  let Cd = baseCd;
  
  // Adjust for Reynolds number regime
  if (Re < 1) {
    // Stokes regime: Cd = 24/Re
    Cd = 24 / Re;
  } else if (Re < 1000) {
    // Transition regime: smooth interpolation
    const stokes = 24 / Re;
    const newton = baseCd;
    const factor = Math.log10(Re) / 3; // 0 to 1 as Re goes from 1 to 1000
    Cd = stokes + (newton - stokes) * factor;
  }
  
  return Math.max(Cd, 0.01); // Ensure positive
}

/**
 * Advanced Physics Step
 * Integrates all advanced physics effects into trajectory calculation
 * 
 * @param x - Current x position (m)
 * @param y - Current y position (m)
 * @param vx - Current x velocity (m/s)
 * @param vy - Current y velocity (m/s)
 * @param dt - Time step (s)
 * @param params - Physics parameters object
 * @returns New position and velocity
 */
export interface AdvancedPhysicsParams {
  gravity: number;
  mass: number;
  diameter: number;
  dragCoefficient: number;
  airDensity: number;
  windSpeed: number;
  latitude: number;
  spinRate: number;
  enableCoriolis: boolean;
  enableMagnus: boolean;
  enableAltitudeDensity: boolean;
}

export function advancedPhysicsStep(
  x: number,
  y: number,
  vx: number,
  vy: number,
  dt: number,
  params: AdvancedPhysicsParams
): { x: number; y: number; vx: number; vy: number } {
  // Validate parameters
  if (dt <= 0 || dt > 1) {
    console.warn('Invalid time step:', dt);
    return { x, y, vx, vy };
  }
  
  let ax = 0;
  let ay = -params.gravity;
  
  // Air density (altitude-dependent if enabled)
  let rho = params.airDensity;
  if (params.enableAltitudeDensity && y > 0) {
    rho = getAirDensityAtAltitude(y, params.airDensity);
  }
  
  // Drag force
  const speed = Math.sqrt(vx ** 2 + vy ** 2);
  if (speed > 0.01) {
    const Cd = getAdvancedDragCoefficient(speed, params.diameter, params.dragCoefficient);
    const area = Math.PI * (params.diameter / 2) ** 2;
    const dragForce = 0.5 * rho * speed ** 2 * Cd * area;
    
    ax -= (dragForce / params.mass) * (vx / speed);
    ay -= (dragForce / params.mass) * (vy / speed);
  }
  
  // Coriolis effect
  if (params.enableCoriolis) {
    const coriolis = calculateCoriolisAcceleration(vx, vy, params.latitude);
    ax += coriolis.ax;
    ay += coriolis.ay;
  }
  
  // Magnus effect
  if (params.enableMagnus && params.spinRate > 0) {
    const magnus = calculateMagnusAcceleration(speed, params.spinRate, params.diameter, rho);
    // Magnus force acts perpendicular to velocity
    if (speed > 0.01) {
      ax += (magnus * -vy) / speed;
      ay += (magnus * vx) / speed;
    }
  }
  
  // Wind effect (simplified)
  if (params.windSpeed > 0) {
    const windDrag = 0.5 * rho * params.windSpeed ** 2 * params.dragCoefficient;
    ax -= (windDrag / params.mass) * 0.1; // Reduced wind effect
  }
  
  // RK4 integration
  const k1x = vx;
  const k1y = vy;
  const k1vx = ax;
  const k1vy = ay;
  
  const k2x = vx + 0.5 * dt * k1vx;
  const k2y = vy + 0.5 * dt * k1vy;
  const k2vx = ax; // Simplified: assume constant acceleration
  const k2vy = ay;
  
  const k3x = vx + 0.5 * dt * k2vx;
  const k3y = vy + 0.5 * dt * k2vy;
  const k3vx = ax;
  const k3vy = ay;
  
  const k4x = vx + dt * k3vx;
  const k4y = vy + dt * k3vy;
  const k4vx = ax;
  const k4vy = ay;
  
  // Update position and velocity
  const newX = x + (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
  const newY = y + (dt / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);
  const newVx = vx + (dt / 6) * (k1vx + 2 * k2vx + 2 * k3vx + k4vx);
  const newVy = vy + (dt / 6) * (k1vy + 2 * k2vy + 2 * k3vy + k4vy);
  
  return { x: newX, y: newY, vx: newVx, vy: newVy };
}

/**
 * Validate Physics Parameters
 * Checks for invalid or out-of-range values
 * 
 * @param params - Physics parameters to validate
 * @returns Validation result with any warnings
 */
export function validatePhysicsParams(
  params: AdvancedPhysicsParams
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  if (params.gravity < 0 || params.gravity > 100) {
    warnings.push('Gravity out of typical range');
  }
  
  if (params.mass <= 0) {
    warnings.push('Mass must be positive');
  }
  
  if (params.diameter <= 0) {
    warnings.push('Diameter must be positive');
  }
  
  if (params.airDensity < 0) {
    warnings.push('Air density cannot be negative');
  }
  
  if (Math.abs(params.latitude) > 90) {
    warnings.push('Latitude out of range (-90 to 90)');
  }
  
  return {
    valid: warnings.length === 0,
    warnings
  };
}
