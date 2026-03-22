/**
 * Advanced Physics Module for APAS
 * Includes: Coriolis Effect, Centrifugal Force, Altitude-Dependent Air Density,
 * Magnus Effect, Gyroscopic Effects, Ballistic Stability, Buoyancy,
 * Hydrodynamic Drag, Fluid Pressure, Relativistic Corrections,
 * Environmental Physics Coupling
 */

// ═══════════════════════════════════════════════════════════════
// 1. ROTATIONAL AND NON-INERTIAL EFFECTS
// ═══════════════════════════════════════════════════════════════

// ── Coriolis Effect ──
export const calculateCoriolisAcceleration = (
  vx: number,
  vy: number,
  latitude: number
): { ax: number; ay: number } => {
  const OMEGA_EARTH = 7.2921e-5;
  const latRad = (latitude * Math.PI) / 180;
  const f = 2 * OMEGA_EARTH * Math.sin(latRad);
  return { ax: f * vy, ay: -f * vx };
};

// ── Centrifugal Force ──
export const calculateCentrifugalAcceleration = (
  latitude: number
): { ax: number; ay: number } => {
  const OMEGA_EARTH = 7.2921e-5;
  const EARTH_RADIUS = 6.371e6;
  const latRad = (latitude * Math.PI) / 180;
  const centrifugalMag = OMEGA_EARTH * OMEGA_EARTH * EARTH_RADIUS * Math.cos(latRad);
  return {
    ax: centrifugalMag * Math.cos(latRad),
    ay: centrifugalMag * Math.sin(latRad),
  };
};

// ── Relative Motion Effects (Moving Reference Frames) ──
export const calculateRelativeMotionEffects = (
  vx: number,
  vy: number,
  _frameVx: number,
  _frameVy: number,
  frameAx: number,
  frameAy: number,
  frameOmega: number
): { ax: number; ay: number } => {
  let ax = -frameAx;
  let ay = -frameAy;
  // Coriolis-like in rotating frame: -2omega x v
  ax += 2 * frameOmega * vy;
  ay += -2 * frameOmega * vx;
  return { ax, ay };
};


// ═══════════════════════════════════════════════════════════════
// 2. HYDRODYNAMIC EFFECTS (Underwater Physics)
// ═══════════════════════════════════════════════════════════════

// ── Buoyancy Force (Archimedes Principle) ──
export const calculateBuoyancyAcceleration = (
  mass: number,
  diameter: number,
  fluidDensity: number
): number => {
  if (mass <= 0 || diameter <= 0) return 0;
  const volume = (4 / 3) * Math.PI * Math.pow(diameter / 2, 3);
  const buoyancyForce = fluidDensity * 9.81 * volume;
  return buoyancyForce / mass;
};

// ── Fluid Pressure Effects ──
export const calculateFluidPressure = (
  depth: number,
  fluidDensity: number,
  surfacePressure: number = 101325
): number => {
  if (depth <= 0) return surfacePressure;
  return surfacePressure + fluidDensity * 9.81 * depth;
};

export const getPressureModifiedDragCoefficient = (
  depth: number,
  baseCd: number
): number => {
  if (depth <= 0) return baseCd;
  return baseCd * (1 + 0.001 * depth);
};

// ── Hydrodynamic Drag (realistic multi-directional) ──
// Combines form drag, skin friction, and added mass for realistic fluid resistance
export const calculateHydrodynamicDrag = (
  velocity: number,
  mass: number,
  diameter: number,
  fluidDensity: number,
  dragCoefficient: number
): number => {
  if (velocity < 0.001 || mass < 0.001) return 0;
  const radius = diameter / 2;
  const area = Math.PI * radius * radius;

  // Reynolds number for flow regime detection
  const kinematicViscosity = fluidDensity > 500 ? 1.0e-6 : 1.5e-5; // water vs air
  const Re = Math.max(1, (velocity * diameter) / kinematicViscosity);

  // Form drag (pressure drag) - dominant at higher Re
  const formDragForce = 0.5 * fluidDensity * velocity * velocity * dragCoefficient * area;

  // Skin friction drag (viscous drag) - significant at lower Re
  const Cf = Re < 5e5 ? 1.328 / Math.sqrt(Re) : 0.074 / Math.pow(Re, 0.2);
  const surfaceArea = 4 * Math.PI * radius * radius; // sphere surface
  const skinFrictionForce = 0.5 * fluidDensity * velocity * velocity * Cf * surfaceArea;

  // Total drag
  const totalDragForce = formDragForce + skinFrictionForce;
  return totalDragForce / mass;
};

// ── Added Mass Effect (fluid inertia resistance) ──
// When accelerating through fluid, some fluid must be accelerated too
export const calculateAddedMassAcceleration = (
  ax: number,
  ay: number,
  mass: number,
  diameter: number,
  fluidDensity: number
): { ax: number; ay: number } => {
  if (mass <= 0 || diameter <= 0) return { ax: 0, ay: 0 };
  const volume = (4 / 3) * Math.PI * Math.pow(diameter / 2, 3);
  // Added mass coefficient for sphere = 0.5
  const addedMass = 0.5 * fluidDensity * volume;
  const effectiveMassFactor = addedMass / (mass + addedMass);
  return {
    ax: -ax * effectiveMassFactor,
    ay: -ay * effectiveMassFactor,
  };
};


// ═══════════════════════════════════════════════════════════════
// 3. ROTATIONAL DYNAMICS OF PROJECTILES
// ═══════════════════════════════════════════════════════════════

// ── Magnus Effect ──
export const calculateMagnusAcceleration = (
  velocity: number,
  spinRate: number,
  diameter: number,
  density: number
): number => {
  if (velocity < 0.1 || spinRate === 0) return 0;
  const MAGNUS_COEFFICIENT = 0.25;
  const area = Math.PI * (diameter / 2) ** 2;
  const spinParameter = (spinRate * diameter) / velocity;
  const liftCoefficient = MAGNUS_COEFFICIENT * Math.min(1, spinParameter);
  return liftCoefficient * 0.5 * density * velocity * velocity * area;
};

// ── Gyroscopic Effects ──
export const calculateGyroscopicStability = (
  spinRate: number,
  mass: number,
  diameter: number
): number => {
  if (spinRate === 0 || mass <= 0 || diameter <= 0) return 0;
  const radius = diameter / 2;
  const momentOfInertia = (2 / 5) * mass * radius * radius;
  const omega = spinRate * 2 * Math.PI;
  const angularMomentum = momentOfInertia * omega;
  return Math.min(1, angularMomentum / (mass * 9.81 * radius));
};

export const calculateGyroscopicPrecession = (
  spinRate: number,
  mass: number,
  diameter: number,
  vx: number,
  vy: number,
  gravity: number
): { ax: number; ay: number } => {
  if (spinRate === 0) return { ax: 0, ay: 0 };
  const radius = diameter / 2;
  const momentOfInertia = (2 / 5) * mass * radius * radius;
  const omega = spinRate * 2 * Math.PI;
  const angularMomentum = momentOfInertia * omega;
  if (angularMomentum < 1e-12) return { ax: 0, ay: 0 };
  const torque = mass * gravity * radius * 0.1;
  const precessionRate = torque / angularMomentum;
  const speed = Math.sqrt(vx * vx + vy * vy);
  if (speed < 0.01) return { ax: 0, ay: 0 };
  return {
    ax: -precessionRate * vy * 0.01,
    ay: precessionRate * vx * 0.01,
  };
};

// ── Ballistic Stability ──
export const calculateBallisticStability = (
  spinRate: number,
  velocity: number,
  mass: number,
  diameter: number,
  density: number
): number => {
  if (spinRate === 0 || velocity < 0.1 || mass <= 0 || diameter <= 0) return 0;
  const radius = diameter / 2;
  const area = Math.PI * radius * radius;
  const Ix = (2 / 5) * mass * radius * radius;
  const omega = spinRate * 2 * Math.PI;
  const CM_alpha = 2.0;
  const overturningMoment = 0.5 * density * velocity * velocity * area * diameter * CM_alpha;
  if (overturningMoment < 1e-12) return 10;
  return (Ix * omega * omega) / overturningMoment;
};

export const getStabilityDragModifier = (
  stabilityCoeff: number,
  baseDragAccel: number
): number => {
  if (stabilityCoeff >= 1) return baseDragAccel;
  if (stabilityCoeff <= 0) return baseDragAccel * 2.5;
  return baseDragAccel * (1 + 1.5 * (1 - stabilityCoeff));
};


// ═══════════════════════════════════════════════════════════════
// 4. RELATIVISTIC MOTION (Special Relativity)
// ═══════════════════════════════════════════════════════════════

const SPEED_OF_LIGHT = 299792458;

export const lorentzFactor = (velocity: number): number => {
  const beta2 = (velocity * velocity) / (SPEED_OF_LIGHT * SPEED_OF_LIGHT);
  if (beta2 >= 1) return 1e10;
  return 1 / Math.sqrt(1 - beta2);
};

export const relativisticVelocityAddition = (v1: number, v2: number): number => {
  const c2 = SPEED_OF_LIGHT * SPEED_OF_LIGHT;
  return (v1 + v2) / (1 + (v1 * v2) / c2);
};

export const relativisticMass = (restMass: number, velocity: number): number => {
  return restMass * lorentzFactor(velocity);
};

export const timeDilationFactor = (velocity: number): number => {
  return 1 / lorentzFactor(velocity);
};

export const applyRelativisticCorrections = (
  ax: number,
  ay: number,
  vx: number,
  vy: number
): { ax: number; ay: number } => {
  const speed = Math.sqrt(vx * vx + vy * vy);
  const gamma = lorentzFactor(speed);
  if (gamma < 1.0001) return { ax, ay };
  const gamma3 = gamma * gamma * gamma;
  if (speed < 0.01) return { ax: ax / gamma3, ay: ay / gamma3 };
  const vHatX = vx / speed;
  const vHatY = vy / speed;
  const aLong = ax * vHatX + ay * vHatY;
  const aTransX = ax - aLong * vHatX;
  const aTransY = ay - aLong * vHatY;
  const correctedALong = aLong / gamma3;
  return {
    ax: correctedALong * vHatX + aTransX / gamma,
    ay: correctedALong * vHatY + aTransY / gamma,
  };
};


// ═══════════════════════════════════════════════════════════════
// 5. ENVIRONMENTAL PHYSICS COUPLING
// ═══════════════════════════════════════════════════════════════

export const calculateAirDensityFromEnvironment = (
  temperature: number,
  pressure: number,
  humidity: number
): number => {
  const R_dry = 287.058;
  const R_vapor = 461.495;
  const T_kelvin = temperature + 273.15;
  const e_sat = 611.21 * Math.exp((18.678 - temperature / 234.5) * (temperature / (257.14 + temperature)));
  const e_vapor = humidity * e_sat;
  const p_dry = pressure - e_vapor;
  return Math.max(0, p_dry / (R_dry * T_kelvin) + e_vapor / (R_vapor * T_kelvin));
};

export const calculateSpeedOfSound = (temperature: number): number => {
  return 331.3 * Math.sqrt((temperature + 273.15) / 273.15);
};

export const getMachDragCoefficient = (
  velocity: number,
  temperature: number,
  baseCd: number
): number => {
  const speedOfSound = calculateSpeedOfSound(temperature);
  const mach = velocity / speedOfSound;
  if (mach < 0.6) return baseCd;
  if (mach < 0.8) return baseCd * (1 + 0.3 * ((mach - 0.6) / 0.2));
  if (mach < 1.2) return baseCd * (1.3 + 0.7 * Math.sin(Math.PI * (mach - 0.8) / 0.4));
  if (mach < 2.0) return baseCd * (2.0 - 0.5 * (mach - 1.2) / 0.8);
  return baseCd * 1.5;
};

// ── Altitude-Dependent Air Density ──
export const getAirDensityAtAltitude = (
  altitude: number,
  seaLevelDensity: number = 1.225
): number => {
  const SCALE_HEIGHT = 8500;
  return Math.max(0, seaLevelDensity * Math.exp(-altitude / SCALE_HEIGHT));
};


// ═══════════════════════════════════════════════════════════════
// ADVANCED DRAG MODEL
// ═══════════════════════════════════════════════════════════════

export const calculateAdvancedDrag = (
  velocity: number,
  mass: number,
  diameter: number,
  density: number,
  dragCoefficient: number
): number => {
  if (velocity < 0.01 || mass < 0.001) return 0;
  const area = Math.PI * (diameter / 2) ** 2;
  const dragForce = 0.5 * density * velocity * velocity * dragCoefficient * area;
  const dragAccel = dragForce / mass;
  const kinematicViscosity = 1.81e-5;
  const reynoldsNumber = (velocity * diameter) / kinematicViscosity;
  let correctionFactor = 1.0;
  if (reynoldsNumber < 1) {
    correctionFactor = 1.0 / Math.max(0.1, reynoldsNumber / 24);
  } else if (reynoldsNumber < 1000) {
    correctionFactor = 1.0 + 0.15 * Math.pow(reynoldsNumber, 0.681) / 1000;
  }
  return dragAccel * correctionFactor;
};


// ═══════════════════════════════════════════════════════════════
// INTEGRATED ADVANCED PHYSICS STEP
// ═══════════════════════════════════════════════════════════════

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
  // Centrifugal & Relative Motion
  enableCentrifugal: boolean;
  enableRelativeMotion: boolean;
  frameVx: number;
  frameVy: number;
  frameAx: number;
  frameAy: number;
  frameOmega: number;
  // Hydrodynamic
  enableBuoyancy: boolean;
  enableHydrodynamicDrag: boolean;
  enableFluidPressure: boolean;
  isUnderwater: boolean;
  fluidDensity: number;
  // Rotational dynamics
  enableGyroscopic: boolean;
  enableBallisticStability: boolean;
  // Relativistic
  enableRelativistic: boolean;
  // Environmental coupling
  enableEnvironmentalCoupling: boolean;
  environmentTemperature: number;
  environmentPressure: number;
  environmentHumidity: number;
}

export const getDefaultAdvancedParams = (): Partial<AdvancedPhysicsParams> => ({
  enableCentrifugal: false,
  enableRelativeMotion: false,
  frameVx: 0,
  frameVy: 0,
  frameAx: 0,
  frameAy: 0,
  frameOmega: 0,
  enableBuoyancy: false,
  enableHydrodynamicDrag: false,
  enableFluidPressure: false,
  isUnderwater: false,
  fluidDensity: 1000,
  enableGyroscopic: false,
  enableBallisticStability: false,
  enableRelativistic: false,
  enableEnvironmentalCoupling: false,
  environmentTemperature: 15,
  environmentPressure: 101325,
  environmentHumidity: 0.5,
});

export const advancedPhysicsStep = (
  x: number,
  y: number,
  vx: number,
  vy: number,
  dt: number,
  params: AdvancedPhysicsParams
): { x: number; y: number; vx: number; vy: number; ax: number; ay: number } => {
  const vrx = vx - params.windSpeed;
  const vry = vy;
  const speedRel = Math.sqrt(vrx * vrx + vry * vry);
  const speed = Math.sqrt(vx * vx + vy * vy);

  let ax = 0;
  let ay = -params.gravity;

  // Altitude-dependent air density
  let density = params.airDensity;
  if (params.enableAltitudeDensity && y > 0) {
    density = getAirDensityAtAltitude(y, params.airDensity);
  }

  // Environmental Physics Coupling — temperature and pressure are informational only;
  // they do NOT modify the simulation density or drag coefficient.
  let effectiveCd = params.dragCoefficient;

  // Underwater / hydrodynamic effects — realistic multi-directional resistance
  const isInFluid = params.isUnderwater;
  const effectiveDensity = isInFluid ? params.fluidDensity : density;

  if (isInFluid) {
    // Buoyancy acts upward against gravity
    if (params.enableBuoyancy) {
      ay += calculateBuoyancyAcceleration(params.mass, params.diameter, params.fluidDensity);
    }
    // Pressure increases with depth, modifying drag
    if (params.enableFluidPressure) {
      const depth = Math.max(0, -y);
      effectiveCd = getPressureModifiedDragCoefficient(depth, effectiveCd);
    }
    // Multi-directional hydrodynamic drag (form + skin friction)
    if (params.enableHydrodynamicDrag && speedRel > 0.001) {
      const hydroDrag = calculateHydrodynamicDrag(
        speedRel, params.mass, params.diameter, params.fluidDensity, effectiveCd
      );
      // Apply drag opposing velocity in ALL directions
      ax -= (hydroDrag * vrx) / speedRel;
      ay -= (hydroDrag * vry) / speedRel;

      // Added mass effect — fluid inertia resists acceleration in all directions
      const addedMassEffect = calculateAddedMassAcceleration(
        ax, ay, params.mass, params.diameter, params.fluidDensity
      );
      ax += addedMassEffect.ax;
      ay += addedMassEffect.ay;
    }
  }

  // Standard drag (air) — also multi-directional
  if (!isInFluid && speedRel > 0.01) {
    let dragAccel = calculateAdvancedDrag(
      speedRel, params.mass, params.diameter, effectiveDensity, effectiveCd
    );
    if (params.enableBallisticStability && params.spinRate !== 0) {
      const stability = calculateBallisticStability(
        params.spinRate, speedRel, params.mass, params.diameter, effectiveDensity
      );
      dragAccel = getStabilityDragModifier(stability, dragAccel);
    }
    // Apply drag opposing velocity in ALL directions
    ax -= (dragAccel * vrx) / speedRel;
    ay -= (dragAccel * vry) / speedRel;
  }

  // Magnus effect (proper force application without arbitrary 0.1 scaling)
  if (params.enableMagnus && params.spinRate !== 0) {
    const magnusAccel = calculateMagnusAcceleration(
      speedRel, params.spinRate, params.diameter, effectiveDensity
    );
    if (speedRel > 0.01) {
      // Perpendicular to velocity: lift direction depends on spin direction
      const perpX = -vry / speedRel;
      const perpY = vrx / speedRel;
      // Apply full Magnus acceleration (no arbitrary scaling)
      ax += (magnusAccel * perpX) / params.mass;
      ay += (magnusAccel * perpY) / params.mass;
    }
  }

  // Gyroscopic effects
  if (params.enableGyroscopic && params.spinRate !== 0) {
    const gyroPrec = calculateGyroscopicPrecession(
      params.spinRate, params.mass, params.diameter, vx, vy, params.gravity
    );
    ax += gyroPrec.ax;
    ay += gyroPrec.ay;
  }

  // Coriolis effect
  if (params.enableCoriolis) {
    const coriolis = calculateCoriolisAcceleration(vx, vy, params.latitude);
    ax += coriolis.ax;
    ay += coriolis.ay;
  }

  // Centrifugal force
  if (params.enableCentrifugal) {
    const centrifugal = calculateCentrifugalAcceleration(params.latitude);
    ax += centrifugal.ax;
    ay += centrifugal.ay;
  }

  // Relative motion effects
  if (params.enableRelativeMotion) {
    const relMotion = calculateRelativeMotionEffects(
      vx, vy,
      params.frameVx, params.frameVy,
      params.frameAx, params.frameAy,
      params.frameOmega
    );
    ax += relMotion.ax;
    ay += relMotion.ay;
  }

  // Relativistic corrections
  if (params.enableRelativistic) {
    const relCorr = applyRelativisticCorrections(ax, ay, vx, vy);
    ax = relCorr.ax;
    ay = relCorr.ay;
  }

  // Full Velocity Verlet integration:
  // x(t+dt) = x(t) + v(t)*dt + 0.5*a(t)*dt^2
  // v(t+dt) = v(t) + 0.5*(a(t) + a(t+dt))*dt
  // Step 1: Update position using current velocity and acceleration
  const newX = x + vx * dt + 0.5 * ax * dt * dt;
  const newY = y + vy * dt + 0.5 * ay * dt * dt;
  // Step 2: Estimate new velocity with Euler (for computing a(t+dt))
  const halfVx = vx + ax * dt;
  const halfVy = vy + ay * dt;
  // Step 3: Recompute acceleration at new position with estimated velocity
  // We use gravity + basic drag as a lightweight re-evaluation
  const newVrx = halfVx - params.windSpeed;
  const newVry = halfVy;
  const newSpeedRel = Math.sqrt(newVrx * newVrx + newVry * newVry);
  let ax2 = 0;
  let ay2 = -params.gravity;
  if (!isInFluid && newSpeedRel > 0.01) {
    const newDragAccel = calculateAdvancedDrag(
      newSpeedRel, params.mass, params.diameter, effectiveDensity, effectiveCd
    );
    ax2 -= (newDragAccel * newVrx) / newSpeedRel;
    ay2 -= (newDragAccel * newVry) / newSpeedRel;
  }
  // Step 4: Final velocity using average of old and new accelerations
  const newVx = vx + 0.5 * (ax + ax2) * dt;
  const newVy = vy + 0.5 * (ay + ay2) * dt;

  return { x: newX, y: newY, vx: newVx, vy: newVy, ax, ay };
};


// ═══════════════════════════════════════════════════════════════
// ENERGY & PREDICTION
// ═══════════════════════════════════════════════════════════════

export const calculateTotalEnergy = (
  vx: number,
  vy: number,
  y: number,
  mass: number,
  gravity: number
): number => {
  const speed = Math.sqrt(vx * vx + vy * vy);
  return 0.5 * mass * speed * speed + mass * gravity * Math.max(0, y);
};

export const predictImpactWithAdvancedPhysics = (
  velocity: number,
  angle: number,
  height: number,
  params: AdvancedPhysicsParams
): number => {
  const angleRad = (angle * Math.PI) / 180;
  let vx = velocity * Math.cos(angleRad);
  let vy = velocity * Math.sin(angleRad);
  let x = 0;
  let y = height;
  const dt = 0.01;
  let t = 0;
  while (t < 100 && y >= 0) {
    const step = advancedPhysicsStep(x, y, vx, vy, dt, params);
    x = step.x; y = step.y; vx = step.vx; vy = step.vy;
    t += dt;
  }
  return Math.max(0, x);
};

export const validatePhysicsParams = (
  params: AdvancedPhysicsParams
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (params.mass <= 0) errors.push('Mass must be positive');
  if (params.gravity < 0) errors.push('Gravity cannot be negative');
  if (params.diameter <= 0) errors.push('Diameter must be positive');
  if (params.dragCoefficient < 0) errors.push('Drag coefficient cannot be negative');
  if (params.airDensity < 0) errors.push('Air density cannot be negative');
  if (params.latitude < -90 || params.latitude > 90) errors.push('Latitude must be between -90 and 90');
  if (params.fluidDensity < 0) errors.push('Fluid density cannot be negative');
  return { valid: errors.length === 0, errors };
};
