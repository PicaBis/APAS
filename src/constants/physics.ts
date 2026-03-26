/**
 * Centralized Physics Constants for APAS
 *
 * All physics constants used across the codebase are defined here
 * as a single source of truth. Import from this file instead of
 * defining constants inline.
 */

// ═══════════════════════════════════════════════════════════════
// FUNDAMENTAL CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Speed of light in vacuum (m/s) */
export const SPEED_OF_LIGHT = 299_792_458;

/** Earth's angular velocity (rad/s) */
export const OMEGA_EARTH = 7.2921e-5;

/** Mean radius of Earth (m) */
export const EARTH_RADIUS = 6.371e6;

/** Standard gravitational acceleration at sea level (m/s²) */
export const STANDARD_GRAVITY = 9.80665;

// ═══════════════════════════════════════════════════════════════
// ATMOSPHERIC / FLUID CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Sea-level air density (kg/m³) at ISA conditions */
export const SEA_LEVEL_AIR_DENSITY = 1.225;

/** Atmospheric scale height for exponential density model (m) */
export const ATMOSPHERIC_SCALE_HEIGHT = 8500;

/** Kinematic viscosity of air at ~20 °C (m²/s) */
export const AIR_KINEMATIC_VISCOSITY = 1.5e-5;

/** Dynamic viscosity of air at ~20 °C (Pa·s) — used in Reynolds number calculations */
export const AIR_DYNAMIC_VISCOSITY = 1.81e-5;

/** Standard atmospheric pressure at sea level (Pa) */
export const STANDARD_ATMOSPHERIC_PRESSURE = 101_325;

/** Density of fresh water at ~20 °C (kg/m³) */
export const WATER_DENSITY = 1000;

/** Kinematic viscosity of water at ~20 °C (m²/s) */
export const WATER_KINEMATIC_VISCOSITY = 1.0e-6;

// ═══════════════════════════════════════════════════════════════
// GAS CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Specific gas constant for dry air (J/(kg·K)) */
export const R_DRY_AIR = 287.058;

/** Specific gas constant for water vapour (J/(kg·K)) */
export const R_WATER_VAPOR = 461.495;

// ═══════════════════════════════════════════════════════════════
// SIMULATION DEFAULTS
// ═══════════════════════════════════════════════════════════════

/** Default simulation time step (s) */
export const DEFAULT_TIME_STEP = 0.02;

/** Maximum simulation time (s) */
export const MAX_SIMULATION_TIME = 100;

/** Default coefficient of restitution for bounces */
export const DEFAULT_BOUNCE_COR = 0.6;

/** Default projectile radius (m) */
export const DEFAULT_PROJECTILE_RADIUS = 0.05;

/** Default projectile diameter (m) */
export const DEFAULT_PROJECTILE_DIAMETER = 0.045;

/** Default drag coefficient (sphere) */
export const DEFAULT_DRAG_COEFFICIENT = 0.47;

/** Magnus effect lift coefficient */
export const MAGNUS_COEFFICIENT = 0.25;

/** Added mass coefficient for a sphere */
export const SPHERE_ADDED_MASS_COEFFICIENT = 0.5;

// ═══════════════════════════════════════════════════════════════
// NUMERICAL TOLERANCES
// ═══════════════════════════════════════════════════════════════

/** Floating-point epsilon for near-zero comparisons */
export const FLOAT_EPSILON = 1e-12;

/** Minimum speed threshold below which drag is ignored (m/s) */
export const MIN_SPEED_FOR_DRAG = 0.01;

/** Minimum bounce velocity to continue bouncing (m/s) */
export const MIN_BOUNCE_VELOCITY = 0.3;

/** Maximum number of simulation iterations (safety limit) */
export const MAX_SIMULATION_ITERATIONS = 10_000;
