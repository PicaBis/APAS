import { describe, it, expect } from 'vitest';
import { calculateTrajectory } from '../physics';
import {
  calculateCoriolisAcceleration,
  calculateCentrifugalAcceleration,
  lorentzFactor,
  relativisticVelocityAddition,
  calculateMagnusAcceleration,
  calculateBuoyancyAcceleration,
  getAirDensityAtAltitude,
  validatePhysicsParams,
} from '../advancedPhysics';
import {
  galileanVelocityTransform,
  galileanInverseVelocityTransform,
  lorentzCoordinateTransform,
  lorentzInverseCoordinateTransform,
} from '../relativityPhysics';
import {
  SPEED_OF_LIGHT,
  OMEGA_EARTH,
  EARTH_RADIUS,
} from '@/constants/physics';

// ═══════════════════════════════════════════════════════════════
// 1. TRAJECTORY CALCULATION TESTS
// ═══════════════════════════════════════════════════════════════

describe('calculateTrajectory', () => {
  it('should return at least two points for a basic launch', () => {
    const result = calculateTrajectory(50, 45, 0, 9.81, 0, 1);
    expect(result.points.length).toBeGreaterThan(1);
  });

  it('should start near the correct position and height', () => {
    const result = calculateTrajectory(50, 45, 10, 9.81, 0, 1);
    const first = result.points[0];
    // First recorded point may be after one integration step, so allow small offset
    expect(first.x).toBeLessThan(2);
    expect(Math.abs(first.y - 10)).toBeLessThan(1);
    expect(first.time).toBeLessThan(0.1);
  });

  it('should end near ground level (y ≈ 0) for ground launches', () => {
    const result = calculateTrajectory(50, 45, 0, 9.81, 0, 1);
    const last = result.points[result.points.length - 1];
    expect(last.y).toBeCloseTo(0, 0);
  });

  it('should produce a symmetric trajectory without air resistance', () => {
    const result = calculateTrajectory(50, 45, 0, 9.81, 0, 1, false, 0.6, 5, 0, 'rk4');
    const maxIdx = result.points.reduce(
      (best, pt, i) => (pt.y > result.points[best].y ? i : best),
      0
    );
    const apex = result.points[maxIdx];
    const last = result.points[result.points.length - 1];
    // Apex should be roughly at half the range
    expect(apex.x).toBeCloseTo(last.x / 2, -1);
  });

  it('should reduce range when air resistance is added', () => {
    const noAir = calculateTrajectory(50, 45, 0, 9.81, 0, 1);
    const withAir = calculateTrajectory(50, 45, 0, 9.81, 0.1, 1);
    const rangeNoAir = noAir.points[noAir.points.length - 1].x;
    const rangeWithAir = withAir.points[withAir.points.length - 1].x;
    expect(rangeWithAir).toBeLessThan(rangeNoAir);
  });

  it('should handle zero velocity gracefully', () => {
    const result = calculateTrajectory(0, 45, 10, 9.81, 0, 1);
    expect(result.points.length).toBeGreaterThan(0);
  });

  it('should handle zero gravity (straight-line trajectory)', () => {
    const result = calculateTrajectory(50, 0, 0, 0, 0, 1);
    expect(result.points.length).toBeGreaterThan(1);
    // Should move along x-axis
    const last = result.points[result.points.length - 1];
    expect(last.x).toBeGreaterThan(0);
  });

  it('should produce bounce events when bouncing is enabled', () => {
    const result = calculateTrajectory(50, 45, 0, 9.81, 0, 1, true, 0.6, 3);
    expect(result.bounceEvents.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. CORIOLIS AND CENTRIFUGAL TESTS
// ═══════════════════════════════════════════════════════════════

describe('calculateCoriolisAcceleration', () => {
  it('should return zero at the equator for north-south motion', () => {
    const result = calculateCoriolisAcceleration(0, 10, 0);
    // At equator, sin(0) = 0 → f = 0
    expect(result.ax).toBeCloseTo(0);
    expect(result.ay).toBeCloseTo(0);
  });

  it('should be non-zero at non-zero latitude', () => {
    const result = calculateCoriolisAcceleration(10, 0, 45);
    expect(Math.abs(result.ay)).toBeGreaterThan(0);
  });

  it('should scale with velocity', () => {
    const slow = calculateCoriolisAcceleration(1, 0, 45);
    const fast = calculateCoriolisAcceleration(10, 0, 45);
    expect(Math.abs(fast.ay)).toBeCloseTo(Math.abs(slow.ay) * 10, 5);
  });
});

describe('calculateCentrifugalAcceleration', () => {
  it('should return non-zero at non-polar latitude', () => {
    const result = calculateCentrifugalAcceleration(45);
    expect(Math.abs(result.ax) + Math.abs(result.ay)).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. RELATIVISTIC PHYSICS TESTS
// ═══════════════════════════════════════════════════════════════

describe('lorentzFactor', () => {
  it('should return 1 for zero velocity', () => {
    expect(lorentzFactor(0)).toBeCloseTo(1);
  });

  it('should return > 1 for non-zero velocity', () => {
    expect(lorentzFactor(SPEED_OF_LIGHT * 0.5)).toBeGreaterThan(1);
  });

  it('should return ≈ 1.155 at 0.5c', () => {
    const gamma = lorentzFactor(SPEED_OF_LIGHT * 0.5);
    expect(gamma).toBeCloseTo(1 / Math.sqrt(1 - 0.25), 2);
  });

  it('should handle near-light speeds without NaN', () => {
    const gamma = lorentzFactor(SPEED_OF_LIGHT * 0.9999);
    expect(isFinite(gamma)).toBe(true);
    expect(gamma).toBeGreaterThan(1);
  });
});

describe('relativisticVelocityAddition', () => {
  it('should give c when adding c to any velocity', () => {
    const result = relativisticVelocityAddition(SPEED_OF_LIGHT, 100);
    expect(result).toBeCloseTo(SPEED_OF_LIGHT, 0);
  });

  it('should reduce to classical addition for small velocities', () => {
    const v1 = 100;
    const v2 = 200;
    const result = relativisticVelocityAddition(v1, v2);
    expect(result).toBeCloseTo(v1 + v2, 0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. LORENTZ & GALILEAN TRANSFORMATIONS
// ═══════════════════════════════════════════════════════════════

describe('Galilean Transforms', () => {
  it('should transform and inverse-transform back to original', () => {
    const vx = 100, vy = 50, frameVx = 30, frameVy = 10;
    const transformed = galileanVelocityTransform(vx, vy, frameVx, frameVy);
    const back = galileanInverseVelocityTransform(transformed.vx, transformed.vy, frameVx, frameVy);
    expect(back.vx).toBeCloseTo(vx);
    expect(back.vy).toBeCloseTo(vy);
  });
});

describe('Lorentz Coordinate Transform', () => {
  it('should return original coordinates when frame velocity is zero', () => {
    const result = lorentzCoordinateTransform(100, 0, 5, 0);
    expect(result.x).toBeCloseTo(100);
    expect(result.t).toBeCloseTo(5);
  });

  it('should round-trip correctly', () => {
    const frameV = 1000;
    const original = { x: 100, y: 50, t: 5 };
    const transformed = lorentzCoordinateTransform(original.x, original.y, original.t, frameV);
    const back = lorentzInverseCoordinateTransform(transformed.x, transformed.y, transformed.t, frameV);
    expect(back.x).toBeCloseTo(original.x, 2);
    expect(back.t).toBeCloseTo(original.t, 2);
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. ATMOSPHERIC PHYSICS TESTS
// ═══════════════════════════════════════════════════════════════

describe('getAirDensityAtAltitude', () => {
  it('should return sea-level density at altitude 0', () => {
    expect(getAirDensityAtAltitude(0)).toBeCloseTo(1.225, 2);
  });

  it('should decrease with altitude', () => {
    const low = getAirDensityAtAltitude(0);
    const high = getAirDensityAtAltitude(5000);
    expect(high).toBeLessThan(low);
  });

  it('should never return negative', () => {
    expect(getAirDensityAtAltitude(100000)).toBeGreaterThanOrEqual(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. BUOYANCY & MAGNUS TESTS
// ═══════════════════════════════════════════════════════════════

describe('calculateBuoyancyAcceleration', () => {
  it('should return positive (upward) buoyancy for a light object in water', () => {
    const result = calculateBuoyancyAcceleration(1, 0.045, 1000);
    // For a ball with mass 1kg in water, buoyancy should act upward
    expect(result).toBeGreaterThan(0);
  });
});

describe('calculateMagnusAcceleration', () => {
  it('should return 0 when velocity is too low', () => {
    expect(calculateMagnusAcceleration(0.05, 100, 0.045, 1.225)).toBe(0);
  });

  it('should return 0 when spin rate is 0', () => {
    expect(calculateMagnusAcceleration(50, 0, 0.045, 1.225)).toBe(0);
  });

  it('should return a positive value for non-zero velocity and spin', () => {
    const result = calculateMagnusAcceleration(50, 100, 0.045, 1.225);
    expect(result).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. CONSTANTS VALIDATION
// ═══════════════════════════════════════════════════════════════

describe('Physics Constants', () => {
  it('SPEED_OF_LIGHT should be 299792458 m/s', () => {
    expect(SPEED_OF_LIGHT).toBe(299_792_458);
  });

  it('OMEGA_EARTH should be approximately 7.2921e-5 rad/s', () => {
    expect(OMEGA_EARTH).toBeCloseTo(7.2921e-5, 9);
  });

  it('EARTH_RADIUS should be approximately 6.371e6 m', () => {
    expect(EARTH_RADIUS).toBeCloseTo(6.371e6, 0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 8. VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════

describe('validatePhysicsParams', () => {
  it('should return no errors for valid params', () => {
    const errors = validatePhysicsParams({
      gravity: 9.81,
      mass: 1,
      diameter: 0.045,
      dragCoefficient: 0.47,
      airDensity: 1.225,
      windSpeed: 0,
      latitude: 0,
      spinRate: 0,
      enableCoriolis: false,
      enableMagnus: false,
      enableAltitudeDensity: false,
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
    expect(errors.errors).toHaveLength(0);
  });
});
