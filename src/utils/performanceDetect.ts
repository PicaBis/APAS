/**
 * Performance detection utilities for APAS.
 *
 * Detects low-end devices (weak GPU, no WebGL, reduced-motion preference)
 * so the app can gracefully degrade animations and skip 3D rendering.
 */

/** Cached result so detection runs only once per session */
let _cached: PerformanceProfile | null = null;

export interface PerformanceProfile {
  /** Device prefers reduced motion (OS-level accessibility setting) */
  prefersReducedMotion: boolean;
  /** WebGL is available and a context can be created */
  webglAvailable: boolean;
  /** WebGL 2 specifically is available */
  webgl2Available: boolean;
  /** GPU is considered low-end (Intel HD 3000 / old integrated GPUs) */
  isLowEndGPU: boolean;
  /** Detected GPU renderer string (from WEBGL_debug_renderer_info) */
  gpuRenderer: string;
  /** Overall: should heavy animations be reduced? */
  shouldReduceAnimations: boolean;
  /** Overall: should 3D / WebGL be skipped entirely? */
  shouldSkip3D: boolean;
  /** Hardware concurrency (number of logical CPUs, 0 if unknown) */
  cpuCores: number;
  /** Device memory in GB (0 if unknown — only Chrome exposes this) */
  deviceMemoryGB: number;
}

const LOW_END_GPU_PATTERNS = [
  /HD Graphics 3000/i,
  /HD Graphics 2000/i,
  /HD Graphics 2500/i,
  /HD Graphics 4000/i,
  /GMA 3[01]50/i,
  /GMA 4500/i,
  /GMA 950/i,
  /GMA X3100/i,
  /Mali-4[05]0/i,
  /Mali-T6[0-3]/i,
  /Adreno 3[012]/i,
  /Adreno 2[02]/i,
  /PowerVR SGX/i,
  /Tegra 2/i,
  /Tegra 3/i,
  /GeForce 8[0-4]/i,
  /GeForce 9[0-3]/i,
  /Radeon HD [2-4]/i,
  /Direct3D9/i,
  /SwiftShader/i,
  /llvmpipe/i,
  /Software Rasterizer/i,
];

function testWebGL(version: 1 | 2): { available: boolean; renderer: string } {
  try {
    const canvas = document.createElement('canvas');
    const contextName = version === 2 ? 'webgl2' : 'webgl';
    const gl = canvas.getContext(contextName) as WebGLRenderingContext | null;
    if (!gl) {
      // Try experimental for WebGL 1
      if (version === 1) {
        const glExp = canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
        if (!glExp) return { available: false, renderer: '' };
        const ext = glExp.getExtension('WEBGL_debug_renderer_info');
        const renderer = ext ? glExp.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
        return { available: true, renderer: String(renderer) };
      }
      return { available: false, renderer: '' };
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
    return { available: true, renderer: String(renderer) };
  } catch {
    return { available: false, renderer: '' };
  }
}

function isLowEnd(renderer: string): boolean {
  if (!renderer) return false;
  return LOW_END_GPU_PATTERNS.some((pattern) => pattern.test(renderer));
}

/**
 * Detect the device's performance profile.
 * Result is cached after the first call.
 */
export function detectPerformance(): PerformanceProfile {
  if (_cached) return _cached;

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

  const webgl2 = testWebGL(2);
  const webgl1 = testWebGL(1);
  const webglAvailable = webgl2.available || webgl1.available;
  const gpuRenderer = webgl2.renderer || webgl1.renderer;
  const lowEndGPU = isLowEnd(gpuRenderer);

  const cpuCores =
    typeof navigator !== 'undefined' && navigator.hardwareConcurrency
      ? navigator.hardwareConcurrency
      : 0;

  const deviceMemoryGB =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof navigator !== 'undefined' && (navigator as any).deviceMemory
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (navigator as any).deviceMemory
      : 0;

  // Heuristic: low CPU or low RAM also means low-end
  const lowHardware = (cpuCores > 0 && cpuCores <= 2) || (deviceMemoryGB > 0 && deviceMemoryGB <= 2);

  const shouldReduceAnimations = prefersReducedMotion || lowEndGPU || lowHardware;
  const shouldSkip3D = !webglAvailable || lowEndGPU;

  _cached = {
    prefersReducedMotion,
    webglAvailable,
    webgl2Available: webgl2.available,
    isLowEndGPU: lowEndGPU,
    gpuRenderer,
    shouldReduceAnimations,
    shouldSkip3D,
    cpuCores,
    deviceMemoryGB,
  };

  return _cached;
}

/** Reset cache (mainly for testing) */
export function resetPerformanceCache(): void {
  _cached = null;
}
