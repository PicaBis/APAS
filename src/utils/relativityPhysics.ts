/**
 * Relativity & Reference Frames Physics Module for APAS
 * 
 * Implements:
 * - Galilean Relativity (v << c): v_p/S = v_p/S' + v_S'/S
 * - Special Relativity (v ~ c): Lorentz transformations + relativistic velocity addition
 * - Dual-frame trajectory computation
 * - Integration with existing advanced physics (drag, Coriolis, etc.)
 */

import { calculateTrajectory, type TrajectoryPoint } from './physics';
import type { AdvancedPhysicsParams } from './advancedPhysics';
import {
  lorentzFactor,
  relativisticVelocityAddition,
  timeDilationFactor,
} from './advancedPhysics';
import { SPEED_OF_LIGHT } from '@/constants/physics';

// Re-export for consumers that imported SPEED_OF_LIGHT from this module
export { SPEED_OF_LIGHT } from '@/constants/physics';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type RelativityMode = 'galilean' | 'lorentz';
export type ObserverFrame = 'S' | 'S_prime';

export interface RelativityParams {
  enabled: boolean;
  mode: RelativityMode;
  /** Velocity of frame S' relative to S (m/s), along the x-axis */
  frameVelocity: number;
  /** Which observer perspective is currently active for the main view */
  activeObserver: ObserverFrame;
  /** Whether to show both trajectories simultaneously */
  showDualTrajectories: boolean;
}

export interface DualFrameTrajectory {
  /** Trajectory as seen from Frame S (stationary observer) */
  frameS: TrajectoryPoint[];
  /** Trajectory as seen from Frame S' (moving observer) */
  frameSPrime: TrajectoryPoint[];
  /** Relativity metadata */
  meta: RelativityMeta;
}

export interface RelativityMeta {
  mode: RelativityMode;
  frameVelocity: number;
  gamma: number;
  timeDilation: number;
  lengthContraction: number;
  isRelativistic: boolean;
}

// ═══════════════════════════════════════════════════════════════
// 1. GALILEAN TRANSFORMATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Galilean velocity transformation: v_S = v_S' + V_frame
 * Valid for v << c
 */
export const galileanVelocityTransform = (
  vxPrime: number,
  vyPrime: number,
  frameVx: number,
  frameVy: number = 0
): { vx: number; vy: number } => ({
  vx: vxPrime + frameVx,
  vy: vyPrime + frameVy,
});

/**
 * Inverse Galilean velocity transformation: v_S' = v_S - V_frame
 */
export const galileanInverseVelocityTransform = (
  vx: number,
  vy: number,
  frameVx: number,
  frameVy: number = 0
): { vx: number; vy: number } => ({
  vx: vx - frameVx,
  vy: vy - frameVy,
});

/**
 * Galilean coordinate transformation: x_S = x_S' + V_frame * t
 */
export const galileanCoordinateTransform = (
  xPrime: number,
  yPrime: number,
  t: number,
  frameVx: number,
  frameVy: number = 0
): { x: number; y: number } => ({
  x: xPrime + frameVx * t,
  y: yPrime + frameVy * t,
});

/**
 * Inverse Galilean coordinate transformation: x_S' = x_S - V_frame * t
 */
export const galileanInverseCoordinateTransform = (
  x: number,
  y: number,
  t: number,
  frameVx: number,
  frameVy: number = 0
): { x: number; y: number } => ({
  x: x - frameVx * t,
  y: y - frameVy * t,
});

// ═══════════════════════════════════════════════════════════════
// 2. LORENTZ TRANSFORMATIONS (Special Relativity)
// ═══════════════════════════════════════════════════════════════

/**
 * Lorentz coordinate transformation from S' to S
 * x = gamma * (x' + v * t')
 * t = gamma * (t' + v * x' / c²)
 * y = y' (perpendicular direction unchanged)
 */
export const lorentzCoordinateTransform = (
  xPrime: number,
  yPrime: number,
  tPrime: number,
  frameV: number
): { x: number; y: number; t: number } => {
  const absV = Math.abs(frameV);
  if (absV >= SPEED_OF_LIGHT) {
    console.warn(`Frame velocity (${absV} m/s) must be less than speed of light. Clamping to 0.9999c.`);
    frameV = Math.sign(frameV) * SPEED_OF_LIGHT * 0.9999;
  }
  const gamma = lorentzFactor(Math.abs(frameV));
  const c2 = SPEED_OF_LIGHT * SPEED_OF_LIGHT;
  return {
    x: gamma * (xPrime + frameV * tPrime),
    y: yPrime,
    t: gamma * (tPrime + (frameV * xPrime) / c2),
  };
};

/**
 * Inverse Lorentz coordinate transformation from S to S'
 * x' = gamma * (x - v * t)
 * t' = gamma * (t - v * x / c²)
 * y' = y
 */
export const lorentzInverseCoordinateTransform = (
  x: number,
  y: number,
  t: number,
  frameV: number
): { x: number; y: number; t: number } => {
  const absV = Math.abs(frameV);
  if (absV >= SPEED_OF_LIGHT) {
    console.warn(`Frame velocity (${absV} m/s) must be less than speed of light. Clamping to 0.9999c.`);
    frameV = Math.sign(frameV) * SPEED_OF_LIGHT * 0.9999;
  }
  const gamma = lorentzFactor(Math.abs(frameV));
  const c2 = SPEED_OF_LIGHT * SPEED_OF_LIGHT;
  return {
    x: gamma * (x - frameV * t),
    y: y,
    t: gamma * (t - (frameV * x) / c2),
  };
};

/**
 * Relativistic velocity addition (1D along x-axis)
 * u_x = (u'_x + v) / (1 + u'_x * v / c²)
 */
export const relativisticVelocityTransform = (
  uxPrime: number,
  uyPrime: number,
  frameV: number
): { vx: number; vy: number } => {
  if (Math.abs(frameV) >= SPEED_OF_LIGHT) {
    frameV = Math.sign(frameV) * SPEED_OF_LIGHT * 0.9999;
  }
  const c2 = SPEED_OF_LIGHT * SPEED_OF_LIGHT;
  const denominator = 1 + (uxPrime * frameV) / c2;
  const gamma = lorentzFactor(Math.abs(frameV));
  return {
    vx: (uxPrime + frameV) / denominator,
    vy: uyPrime / (gamma * denominator),
  };
};

/**
 * Inverse relativistic velocity transformation
 * u'_x = (u_x - v) / (1 - u_x * v / c²)
 */
export const relativisticInverseVelocityTransform = (
  ux: number,
  uy: number,
  frameV: number
): { vx: number; vy: number } => {
  if (Math.abs(frameV) >= SPEED_OF_LIGHT) {
    frameV = Math.sign(frameV) * SPEED_OF_LIGHT * 0.9999;
  }
  const c2 = SPEED_OF_LIGHT * SPEED_OF_LIGHT;
  const denominator = 1 - (ux * frameV) / c2;
  const gamma = lorentzFactor(Math.abs(frameV));
  return {
    vx: (ux - frameV) / denominator,
    vy: uy / (gamma * denominator),
  };
};

// ═══════════════════════════════════════════════════════════════
// 3. RELATIVITY METADATA CALCULATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Compute metadata about the relativistic effects at the given frame velocity
 */
export const computeRelativityMeta = (
  mode: RelativityMode,
  frameVelocity: number
): RelativityMeta => {
  const absV = Math.abs(frameVelocity);
  const beta = absV / SPEED_OF_LIGHT;
  const isRelativistic = beta > 0.01; // effects noticeable above 1% of c

  if (mode === 'galilean' || !isRelativistic) {
    return {
      mode,
      frameVelocity,
      gamma: 1,
      timeDilation: 1,
      lengthContraction: 1,
      isRelativistic: false,
    };
  }

  const gamma = lorentzFactor(absV);
  return {
    mode: 'lorentz',
    frameVelocity,
    gamma,
    timeDilation: timeDilationFactor(absV),
    lengthContraction: 1 / gamma,
    isRelativistic: true,
  };
};

// ═══════════════════════════════════════════════════════════════
// 4. DUAL-FRAME TRAJECTORY COMPUTATION
// ═══════════════════════════════════════════════════════════════

/**
 * Transform a trajectory from Frame S to Frame S' using the appropriate transformation
 */
export const transformTrajectoryToSPrime = (
  trajectoryS: TrajectoryPoint[],
  frameVelocity: number,
  mode: RelativityMode,
  mass: number = 1
): TrajectoryPoint[] => {
  if (trajectoryS.length === 0) return [];

  return trajectoryS.map((pt) => {
    let newX: number, newY: number, newTime: number;
    let newVx: number, newVy: number;

    if (mode === 'galilean') {
      // Galilean: x' = x - v*t, y' = y, t' = t
      const coords = galileanInverseCoordinateTransform(pt.x, pt.y, pt.time, frameVelocity);
      const vels = galileanInverseVelocityTransform(pt.vx, pt.vy, frameVelocity);
      newX = coords.x;
      newY = coords.y;
      newTime = pt.time;
      newVx = vels.vx;
      newVy = vels.vy;
    } else {
      // Lorentz transformation
      const coords = lorentzInverseCoordinateTransform(pt.x, pt.y, pt.time, frameVelocity);
      const vels = relativisticInverseVelocityTransform(pt.vx, pt.vy, frameVelocity);
      newX = coords.x;
      newY = coords.y;
      newTime = coords.t;
      newVx = vels.vx;
      newVy = vels.vy;
    }

    const newSpeed = Math.sqrt(newVx * newVx + newVy * newVy);
    return {
      x: newX,
      y: newY,
      time: newTime,
      vx: newVx,
      vy: newVy,
      speed: newSpeed,
      ax: pt.ax,
      ay: pt.ay,
      acceleration: pt.acceleration,
      kineticEnergy: 0.5 * mass * newSpeed * newSpeed,
      potentialEnergy: pt.potentialEnergy,
    };
  });
};

/**
 * Transform a trajectory from Frame S' to Frame S using the appropriate transformation
 */
export const transformTrajectoryToS = (
  trajectorySPrime: TrajectoryPoint[],
  frameVelocity: number,
  mode: RelativityMode,
  mass: number = 1
): TrajectoryPoint[] => {
  if (trajectorySPrime.length === 0) return [];

  return trajectorySPrime.map((pt) => {
    let newX: number, newY: number, newTime: number;
    let newVx: number, newVy: number;

    if (mode === 'galilean') {
      const coords = galileanCoordinateTransform(pt.x, pt.y, pt.time, frameVelocity);
      const vels = galileanVelocityTransform(pt.vx, pt.vy, frameVelocity);
      newX = coords.x;
      newY = coords.y;
      newTime = pt.time;
      newVx = vels.vx;
      newVy = vels.vy;
    } else {
      const coords = lorentzCoordinateTransform(pt.x, pt.y, pt.time, frameVelocity);
      const vels = relativisticVelocityTransform(pt.vx, pt.vy, frameVelocity);
      newX = coords.x;
      newY = coords.y;
      newTime = coords.t;
      newVx = vels.vx;
      newVy = vels.vy;
    }

    const newSpeed = Math.sqrt(newVx * newVx + newVy * newVy);
    return {
      x: newX,
      y: newY,
      time: newTime,
      vx: newVx,
      vy: newVy,
      speed: newSpeed,
      ax: pt.ax,
      ay: pt.ay,
      acceleration: pt.acceleration,
      kineticEnergy: 0.5 * mass * newSpeed * newSpeed,
      potentialEnergy: pt.potentialEnergy,
    };
  });
};

/**
 * Compute trajectories in both reference frames simultaneously.
 * The simulation is computed in Frame S, then transformed to S'.
 */
export const computeDualFrameTrajectory = (
  trajectoryS: TrajectoryPoint[],
  params: RelativityParams,
  mass: number = 1
): DualFrameTrajectory => {
  const meta = computeRelativityMeta(params.mode, params.frameVelocity);

  if (!params.enabled || params.frameVelocity === 0) {
    return {
      frameS: trajectoryS,
      frameSPrime: trajectoryS,
      meta,
    };
  }

  const frameSPrime = transformTrajectoryToSPrime(
    trajectoryS,
    params.frameVelocity,
    params.mode,
    mass
  );

  return {
    frameS: trajectoryS,
    frameSPrime,
    meta,
  };
};

// ═══════════════════════════════════════════════════════════════
// 5. EDUCATIONAL HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate educational description of the relativistic effects
 */
export const getRelativityExplanation = (
  meta: RelativityMeta,
  lang: string,
  isUnderwater: boolean = false,
  isAccelerating: boolean = false
): string[] => {
  const explanations: string[] = [];
  const beta = Math.abs(meta.frameVelocity) / SPEED_OF_LIGHT;

  if (lang === 'ar') {
    if (meta.mode === 'galilean') {
      explanations.push('التحويل الغاليلي: المسار يبدو مختلفاً لكل مراقب لأن سرعة الإطار المتحرك تُضاف إلى سرعة المقذوف.');
      explanations.push(`سرعة الإطار S' = ${Math.abs(meta.frameVelocity).toFixed(1)} م/ث`);
      explanations.push('مثال: كرة مُلقاة عمودياً في قطار متحرك تبدو كمسار قطع مكافئ للمراقب على الأرض.');
    } else {
      explanations.push('تحويل لورنتز: عند السرعات القريبة من سرعة الضوء، تظهر تأثيرات نسبية.');
      explanations.push(`عامل لورنتز γ = ${meta.gamma.toFixed(4)}`);
      explanations.push(`تمدد الزمن: الزمن في S' يمر بنسبة ${(meta.timeDilation * 100).toFixed(2)}% من الزمن في S`);
      explanations.push(`تقلص الطول: الأطوال في S' تنكمش بنسبة ${(meta.lengthContraction * 100).toFixed(2)}%`);
      if (beta > 0.1) {
        explanations.push('⚠️ التأثيرات النسبية ملحوظة بشكل كبير عند هذه السرعة!');
      }
    }
    if (isAccelerating) {
      explanations.push('مبدأ التكافؤ: التسارع في الإطار المتحرك يكافئ تأثير مجال جاذبية.');
    }
    if (isUnderwater) {
      explanations.push('التأثير المركب: مقاومة المائع تؤثر على المقذوف بالإضافة إلى التحويل بين الإطارات المرجعية.');
    }
  } else if (lang === 'fr') {
    if (meta.mode === 'galilean') {
      explanations.push('Transformation galiléenne : la trajectoire apparaît différente pour chaque observateur car la vitesse du référentiel mobile s\'ajoute à celle du projectile.');
      explanations.push(`Vitesse du référentiel S' = ${Math.abs(meta.frameVelocity).toFixed(1)} m/s`);
      explanations.push('Exemple : une balle lancée verticalement dans un train en mouvement apparaît comme une parabole pour un observateur au sol.');
    } else {
      explanations.push('Transformation de Lorentz : à des vitesses proches de celle de la lumière, des effets relativistes apparaissent.');
      explanations.push(`Facteur de Lorentz γ = ${meta.gamma.toFixed(4)}`);
      explanations.push(`Dilatation du temps : le temps dans S' s'écoule à ${(meta.timeDilation * 100).toFixed(2)}% du temps dans S`);
      explanations.push(`Contraction des longueurs : les longueurs dans S' sont contractées à ${(meta.lengthContraction * 100).toFixed(2)}%`);
    }
    if (isAccelerating) {
      explanations.push('Principe d\'équivalence : l\'accélération dans le référentiel mobile est équivalente à un champ gravitationnel.');
    }
    if (isUnderwater) {
      explanations.push('Effet combiné : la résistance du fluide agit sur le projectile en plus de la transformation entre référentiels.');
    }
  } else {
    // English (default)
    if (meta.mode === 'galilean') {
      explanations.push('Galilean Transformation: The trajectory looks different to each observer because the moving frame\'s velocity adds to the projectile\'s velocity.');
      explanations.push(`Frame S' velocity = ${Math.abs(meta.frameVelocity).toFixed(1)} m/s`);
      explanations.push('Example: A ball thrown vertically inside a moving train appears as a parabolic path to a ground observer.');
    } else {
      explanations.push('Lorentz Transformation: At speeds near the speed of light, relativistic effects become significant.');
      explanations.push(`Lorentz Factor γ = ${meta.gamma.toFixed(4)}`);
      explanations.push(`Time Dilation: Time in S' passes at ${(meta.timeDilation * 100).toFixed(2)}% of time in S`);
      explanations.push(`Length Contraction: Lengths in S' are contracted to ${(meta.lengthContraction * 100).toFixed(2)}%`);
      if (beta > 0.1) {
        explanations.push('Warning: Relativistic effects are highly significant at this speed!');
      }
    }
    if (isAccelerating) {
      explanations.push('Equivalence Principle: Acceleration in the moving frame is equivalent to the effect of a gravitational field.');
    }
    if (isUnderwater) {
      explanations.push('Combined Effect: Fluid resistance acts on the projectile in addition to the reference frame transformation.');
    }
  }

  return explanations;
};

/**
 * Get a speed description relative to c for educational display
 */
export const getSpeedDescription = (velocity: number, lang: string): string => {
  const beta = Math.abs(velocity) / SPEED_OF_LIGHT;
  
  if (lang === 'ar') {
    if (beta < 0.001) return 'سرعة كلاسيكية (v ≪ c)';
    if (beta < 0.01) return `${(beta * 100).toFixed(3)}% من سرعة الضوء`;
    if (beta < 0.1) return `${(beta * 100).toFixed(2)}% من سرعة الضوء — تأثيرات نسبية خفيفة`;
    if (beta < 0.5) return `${(beta * 100).toFixed(1)}% من سرعة الضوء — تأثيرات نسبية ملحوظة`;
    if (beta < 0.9) return `${(beta * 100).toFixed(1)}% من سرعة الضوء — تأثيرات نسبية قوية`;
    return `${(beta * 100).toFixed(2)}% من سرعة الضوء — نسبية فائقة!`;
  } else if (lang === 'fr') {
    if (beta < 0.001) return 'Vitesse classique (v ≪ c)';
    if (beta < 0.01) return `${(beta * 100).toFixed(3)}% de la vitesse de la lumière`;
    if (beta < 0.1) return `${(beta * 100).toFixed(2)}% de c — effets relativistes légers`;
    if (beta < 0.5) return `${(beta * 100).toFixed(1)}% de c — effets relativistes notables`;
    if (beta < 0.9) return `${(beta * 100).toFixed(1)}% de c — effets relativistes forts`;
    return `${(beta * 100).toFixed(2)}% de c — ultra-relativiste !`;
  } else {
    if (beta < 0.001) return 'Classical speed (v ≪ c)';
    if (beta < 0.01) return `${(beta * 100).toFixed(3)}% of the speed of light`;
    if (beta < 0.1) return `${(beta * 100).toFixed(2)}% of c — mild relativistic effects`;
    if (beta < 0.5) return `${(beta * 100).toFixed(1)}% of c — notable relativistic effects`;
    if (beta < 0.9) return `${(beta * 100).toFixed(1)}% of c — strong relativistic effects`;
    return `${(beta * 100).toFixed(2)}% of c — ultra-relativistic!`;
  }
};
