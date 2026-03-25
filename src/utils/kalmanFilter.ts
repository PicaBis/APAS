/**
 * Kalman Filter for 2D Projectile Tracking
 *
 * Implements a linear Kalman filter with a constant-acceleration motion model.
 * State vector: [x, y, vx, vy, ax, ay]
 * Used to smooth noisy position measurements and predict trajectory
 * during occlusion (tracking loss).
 *
 * Reference: R. E. Kalman, "A New Approach to Linear Filtering and Prediction Problems" (1960)
 */

/** 6-element state vector: [x, y, vx, vy, ax, ay] */
export type KalmanState = [number, number, number, number, number, number];

/** 6x6 covariance matrix stored as flat array (row-major) */
export type CovMatrix = number[];

export interface KalmanFilterConfig {
  /** Process noise scalar (higher = trust measurements more) */
  processNoise: number;
  /** Measurement noise scalar (higher = trust predictions more) */
  measurementNoise: number;
  /** Initial position uncertainty */
  initialPositionUncertainty: number;
  /** Initial velocity uncertainty */
  initialVelocityUncertainty: number;
}

const DEFAULT_CONFIG: KalmanFilterConfig = {
  processNoise: 0.5,
  measurementNoise: 2.0,
  initialPositionUncertainty: 10,
  initialVelocityUncertainty: 50,
};

/** Simple 6x6 matrix operations (row-major flat arrays of length 36) */
const N = 6;

function matIdentity(): CovMatrix {
  const m = new Array(N * N).fill(0);
  for (let i = 0; i < N; i++) m[i * N + i] = 1;
  return m;
}

function matZeros(): CovMatrix {
  return new Array(N * N).fill(0);
}

function matMul(a: CovMatrix, b: CovMatrix): CovMatrix {
  const r = matZeros();
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      let s = 0;
      for (let k = 0; k < N; k++) s += a[i * N + k] * b[k * N + j];
      r[i * N + j] = s;
    }
  }
  return r;
}

function matAdd(a: CovMatrix, b: CovMatrix): CovMatrix {
  return a.map((v, i) => v + b[i]);
}

function matSub(a: CovMatrix, b: CovMatrix): CovMatrix {
  return a.map((v, i) => v - b[i]);
}

function matTranspose(a: CovMatrix): CovMatrix {
  const r = matZeros();
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++)
      r[j * N + i] = a[i * N + j];
  return r;
}

function matScale(a: CovMatrix, s: number): CovMatrix {
  return a.map(v => v * s);
}

/** Invert a 2x2 matrix given as [a,b,c,d] */
function inv2x2(m: number[]): number[] {
  const det = m[0] * m[3] - m[1] * m[2];
  if (Math.abs(det) < 1e-12) return [1, 0, 0, 1]; // fallback to identity
  const invDet = 1 / det;
  return [m[3] * invDet, -m[1] * invDet, -m[2] * invDet, m[0] * invDet];
}

/**
 * Build the state transition matrix F for time step dt.
 * Constant acceleration model:
 *   x'  = x + vx*dt + 0.5*ax*dt^2
 *   y'  = y + vy*dt + 0.5*ay*dt^2
 *   vx' = vx + ax*dt
 *   vy' = vy + ay*dt
 *   ax' = ax
 *   ay' = ay
 */
function buildF(dt: number): CovMatrix {
  const F = matIdentity();
  const dt2 = 0.5 * dt * dt;
  // x row
  F[0 * N + 2] = dt;   // vx contribution
  F[0 * N + 4] = dt2;  // ax contribution
  // y row
  F[1 * N + 3] = dt;   // vy contribution
  F[1 * N + 5] = dt2;  // ay contribution
  // vx row
  F[2 * N + 4] = dt;   // ax contribution
  // vy row
  F[3 * N + 5] = dt;   // ay contribution
  return F;
}

/**
 * Build the process noise matrix Q for time step dt.
 * Uses a simplified model where noise enters through acceleration.
 */
function buildQ(dt: number, q: number): CovMatrix {
  const Q = matZeros();
  const dt2 = dt * dt;
  const dt3 = dt2 * dt;
  const dt4 = dt3 * dt;
  // Position variance
  Q[0 * N + 0] = dt4 / 4 * q;
  Q[1 * N + 1] = dt4 / 4 * q;
  // Position-velocity covariance
  Q[0 * N + 2] = dt3 / 2 * q;
  Q[2 * N + 0] = dt3 / 2 * q;
  Q[1 * N + 3] = dt3 / 2 * q;
  Q[3 * N + 1] = dt3 / 2 * q;
  // Velocity variance
  Q[2 * N + 2] = dt2 * q;
  Q[3 * N + 3] = dt2 * q;
  // Acceleration variance (smaller — changes slowly)
  Q[4 * N + 4] = dt * q * 0.1;
  Q[5 * N + 5] = dt * q * 0.1;
  return Q;
}

/** Measurement matrix H: we only observe [x, y] */
const H_FULL: CovMatrix = (() => {
  const h = matZeros();
  h[0 * N + 0] = 1; // x
  h[1 * N + 1] = 1; // y
  return h;
})();

export class KalmanFilter2D {
  private state: KalmanState;
  private P: CovMatrix;
  private config: KalmanFilterConfig;
  private initialized: boolean;
  private lastTimestamp: number;
  private predictionCount: number;

  constructor(config?: Partial<KalmanFilterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = [0, 0, 0, 0, 0, 0];
    this.P = matZeros();
    this.initialized = false;
    this.lastTimestamp = 0;
    this.predictionCount = 0;
  }

  /** Initialize the filter with a first measurement */
  initialize(x: number, y: number, timestamp: number): void {
    this.state = [x, y, 0, 0, 0, 9.8]; // assume downward gravity for ay
    this.P = matZeros();
    const pu = this.config.initialPositionUncertainty;
    const vu = this.config.initialVelocityUncertainty;
    this.P[0 * N + 0] = pu * pu;
    this.P[1 * N + 1] = pu * pu;
    this.P[2 * N + 2] = vu * vu;
    this.P[3 * N + 3] = vu * vu;
    this.P[4 * N + 4] = 100;
    this.P[5 * N + 5] = 100;
    this.initialized = true;
    this.lastTimestamp = timestamp;
    this.predictionCount = 0;
  }

  /** Check if the filter has been initialized */
  isInitialized(): boolean {
    return this.initialized;
  }

  /** Get the current state vector */
  getState(): KalmanState {
    return [...this.state] as KalmanState;
  }

  /** Get the current position estimate */
  getPosition(): { x: number; y: number } {
    return { x: this.state[0], y: this.state[1] };
  }

  /** Get the current velocity estimate */
  getVelocity(): { vx: number; vy: number } {
    return { vx: this.state[2], vy: this.state[3] };
  }

  /** Get the current acceleration estimate */
  getAcceleration(): { ax: number; ay: number } {
    return { ax: this.state[4], ay: this.state[5] };
  }

  /** Get the number of consecutive predictions without measurement updates */
  getPredictionCount(): number {
    return this.predictionCount;
  }

  /** Get position uncertainty (sqrt of diagonal P elements) */
  getPositionUncertainty(): { sx: number; sy: number } {
    return {
      sx: Math.sqrt(Math.max(0, this.P[0 * N + 0])),
      sy: Math.sqrt(Math.max(0, this.P[1 * N + 1])),
    };
  }

  /**
   * Predict the next state (no measurement available — occlusion).
   * Call this when tracking is lost to extrapolate position.
   */
  predict(timestamp: number): { x: number; y: number } {
    if (!this.initialized) return { x: 0, y: 0 };

    const dt = Math.max(0.001, timestamp - this.lastTimestamp);
    const F = buildF(dt);
    const Q = buildQ(dt, this.config.processNoise);

    // State prediction: x' = F * x
    const newState: KalmanState = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < N; i++) {
      let s = 0;
      for (let j = 0; j < N; j++) s += F[i * N + j] * this.state[j];
      newState[i] = s;
    }
    this.state = newState;

    // Covariance prediction: P' = F * P * F^T + Q
    const FP = matMul(F, this.P);
    const FT = matTranspose(F);
    this.P = matAdd(matMul(FP, FT), Q);

    this.lastTimestamp = timestamp;
    this.predictionCount++;

    return { x: this.state[0], y: this.state[1] };
  }

  /**
   * Update the filter with a new measurement.
   * This is the full predict + update Kalman cycle.
   */
  update(measX: number, measY: number, timestamp: number): { x: number; y: number } {
    if (!this.initialized) {
      this.initialize(measX, measY, timestamp);
      return { x: measX, y: measY };
    }

    const dt = Math.max(0.001, timestamp - this.lastTimestamp);
    const F = buildF(dt);
    const Q = buildQ(dt, this.config.processNoise);
    const R = this.config.measurementNoise;

    // ── Predict ──
    const predState: KalmanState = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < N; i++) {
      let s = 0;
      for (let j = 0; j < N; j++) s += F[i * N + j] * this.state[j];
      predState[i] = s;
    }

    const FP = matMul(F, this.P);
    const FT = matTranspose(F);
    const predP = matAdd(matMul(FP, FT), Q);

    // ── Update ──
    // Innovation: y = z - H * x_pred (only x,y are measured)
    const innovX = measX - predState[0];
    const innovY = measY - predState[1];

    // Innovation covariance: S = H * P * H^T + R (2x2 matrix)
    // Since H only selects rows 0,1: S = [[P[0,0]+R, P[0,1]], [P[1,0], P[1,1]+R]]
    const S = [
      predP[0 * N + 0] + R * R,
      predP[0 * N + 1],
      predP[1 * N + 0],
      predP[1 * N + 1] + R * R,
    ];
    const Sinv = inv2x2(S);

    // Kalman gain: K = P * H^T * S^-1 (6x2 matrix, stored as 6 pairs)
    // H^T selects columns 0,1 of P
    const K: number[][] = [];
    for (let i = 0; i < N; i++) {
      const ph0 = predP[i * N + 0]; // P[i,0]
      const ph1 = predP[i * N + 1]; // P[i,1]
      K.push([
        ph0 * Sinv[0] + ph1 * Sinv[2],
        ph0 * Sinv[1] + ph1 * Sinv[3],
      ]);
    }

    // State update: x = x_pred + K * innovation
    for (let i = 0; i < N; i++) {
      predState[i] += K[i][0] * innovX + K[i][1] * innovY;
    }
    this.state = predState;

    // Covariance update: P = (I - K*H) * P_pred
    // K*H is 6x6 where (K*H)[i][j] = K[i][0]*H[0][j] + K[i][1]*H[1][j]
    // H[0][0]=1, H[1][1]=1, rest=0, so (K*H)[i][j] = K[i][0] if j=0, K[i][1] if j=1, else 0
    const IKH = matIdentity();
    for (let i = 0; i < N; i++) {
      IKH[i * N + 0] -= K[i][0];
      IKH[i * N + 1] -= K[i][1];
    }
    this.P = matMul(IKH, predP);

    this.lastTimestamp = timestamp;
    this.predictionCount = 0;

    return { x: this.state[0], y: this.state[1] };
  }

  /**
   * Get the Mahalanobis distance for a measurement — used
   * to determine if a detected position is plausible given
   * the current prediction (gating).
   */
  mahalanobisDistance(measX: number, measY: number): number {
    if (!this.initialized) return 0;
    const innovX = measX - this.state[0];
    const innovY = measY - this.state[1];
    const R = this.config.measurementNoise;
    const S00 = this.P[0 * N + 0] + R * R;
    const S01 = this.P[0 * N + 1];
    const S11 = this.P[1 * N + 1] + R * R;
    const det = S00 * S11 - S01 * S01;
    if (Math.abs(det) < 1e-12) return Infinity;
    const invDet = 1 / det;
    return Math.sqrt(
      (S11 * innovX * innovX - 2 * S01 * innovX * innovY + S00 * innovY * innovY) * invDet
    );
  }

  /** Reset the filter */
  reset(): void {
    this.state = [0, 0, 0, 0, 0, 0];
    this.P = matZeros();
    this.initialized = false;
    this.lastTimestamp = 0;
    this.predictionCount = 0;
  }
}

// Suppress unused import warnings for internal helpers
void matScale;
void H_FULL;
