/**
 * Global updateSimulationState utility
 *
 * This function provides a centralized way to inject analysis results
 * (from APAS Vision, Video, Subject, or Voice) into the simulation state.
 * It triggers parameter updates and auto-plays the simulation.
 *
 * Usage:
 *   updateSimulationState(data, { onUpdateParams, onAutoRun })
 */

export interface AnalysisResult {
  velocity?: number;
  angle?: number;
  height?: number;
  mass?: number;
  gravity?: number;
  objectType?: string;
  confidence?: number;
  source?: 'video' | 'image' | 'subject' | 'voice';
}

export interface SimulationCallbacks {
  onUpdateParams: (params: {
    velocity?: number;
    angle?: number;
    height?: number;
    mass?: number;
    objectType?: string;
  }) => void;
  onAutoRun?: () => void;
  onDetectedMedia?: (data: {
    source: 'video' | 'image';
    detectedAngle?: number;
    detectedVelocity?: number;
    detectedHeight?: number;
    confidence?: number;
    objectType?: string;
  }) => void;
  setGravity?: (g: number) => void;
}

const CONFIDENCE_THRESHOLD = 60;

/**
 * Inject analysis results into the simulation state.
 * Automatically updates parameters and triggers Reset & Play if confidence is sufficient.
 *
 * @param data - Analysis result from any APAS component
 * @param callbacks - Simulation control callbacks from useSimulation hook
 * @returns true if simulation was updated, false if confidence was too low
 */
export function updateSimulationState(
  data: AnalysisResult,
  callbacks: SimulationCallbacks,
): boolean {
  const confidence = data.confidence ?? 0;

  // Only auto-apply if confidence meets threshold
  if (confidence < CONFIDENCE_THRESHOLD) {
    console.log(
      `[updateSimulationState] Skipped: confidence ${confidence}% < threshold ${CONFIDENCE_THRESHOLD}%`,
    );
    return false;
  }

  // Update simulation parameters
  const params: {
    velocity?: number;
    angle?: number;
    height?: number;
    mass?: number;
    objectType?: string;
  } = {};

  if (data.velocity != null && data.velocity > 0) params.velocity = data.velocity;
  if (data.angle != null && data.angle > 0) params.angle = data.angle;
  if (data.height != null && data.height >= 0) params.height = data.height;
  if (data.mass != null && data.mass > 0) params.mass = data.mass;
  if (data.objectType) params.objectType = data.objectType;

  // Apply parameters
  callbacks.onUpdateParams(params);

  // Update gravity if provided and different from default
  if (data.gravity != null && data.gravity > 0 && callbacks.setGravity) {
    callbacks.setGravity(data.gravity);
  }

  // Propagate detected media data
  if (callbacks.onDetectedMedia && (data.source === 'video' || data.source === 'image')) {
    callbacks.onDetectedMedia({
      source: data.source,
      detectedAngle: data.angle,
      detectedVelocity: data.velocity,
      detectedHeight: data.height,
      confidence: data.confidence,
      objectType: data.objectType,
    });
  }

  // Auto-run simulation (Reset & Play)
  if (callbacks.onAutoRun) {
    setTimeout(() => callbacks.onAutoRun!(), 150);
  }

  console.log(
    `[updateSimulationState] Applied: v0=${params.velocity}, angle=${params.angle}, h=${params.height}, m=${params.mass}, source=${data.source}`,
  );

  return true;
}
