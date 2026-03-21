let audioCtx: AudioContext | null = null;
let whizzNode: OscillatorNode | null = null;
let userHasInteracted = false;

// Listen for the first user gesture so we know it's safe to create/resume AudioContext
const markInteracted = () => {
  userHasInteracted = true;
  // Resume a previously-suspended context once a gesture arrives
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  for (const e of ['click', 'keydown', 'touchstart', 'pointerdown']) {
    window.removeEventListener(e, markInteracted, true);
  }
};
for (const e of ['click', 'keydown', 'touchstart', 'pointerdown']) {
  window.addEventListener(e, markInteracted, { capture: true, passive: true, once: true });
}

const getAudioCtx = () => {
  // Don't create AudioContext before a user gesture — browsers will warn/block
  if (!userHasInteracted) return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
};

export const vibrate = (ms = 30) => { try { window.navigator?.vibrate?.(ms); } catch { /* ignore */ } };

// Helper to create a short oscillator tone — eliminates duplicated boilerplate
const playTone = (
  type: OscillatorType,
  freqStart: number, freqEnd: number,
  gainStart: number,
  duration: number,
) => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g);
  g.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + duration * 0.85);
  g.gain.setValueAtTime(gainStart, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.start();
  osc.stop(ctx.currentTime + duration);
};

export const playClick = (muted: boolean) => {
  if (muted) return;
  try { playTone('sine', 880, 440, 0.08, 0.07); } catch { /* ignore */ }
};

export const playLaunch = (muted: boolean) => {
  if (muted) return;
  try { playTone('sawtooth', 80, 1800, 0.15, 0.3); } catch { /* ignore */ }
};

export const stopWhizz = () => {
  try { whizzNode?.stop(); whizzNode?.disconnect(); } catch { /* ignore */ }
  whizzNode = null;
};

export const startWhizz = (muted: boolean) => {
  if (muted) return;
  try {
    const ctx = getAudioCtx(); stopWhizz();
    if (!ctx) return;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.setValueAtTime(300, ctx.currentTime);
    g.gain.setValueAtTime(0.04, ctx.currentTime); osc.start();
    whizzNode = osc;
  } catch { /* ignore */ }
};

export const updateWhizz = (speed: number, muted: boolean) => {
  if (muted || !whizzNode) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    whizzNode.frequency.setTargetAtTime(Math.min(200 + speed * 4, 2000), ctx.currentTime, 0.1);
  } catch { /* ignore */ }
};

export const playImpact = (muted: boolean) => {
  if (muted) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const sr = ctx.sampleRate;
    const buf = ctx.createBuffer(1, sr * 0.6, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.08));
    const src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 120;
    src.buffer = buf; src.connect(f); f.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.9, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    src.start();
  } catch { /* ignore */ }
};

export const playBounce = (muted: boolean, intensity = 1) => {
  if (muted) return;
  try { playTone('sine', 200 * intensity + 80, 60, 0.12 * Math.min(intensity, 1), 0.15);   } catch { /* ignore */ }
};

export const playUIClick = (muted: boolean) => {
  if (muted) return;
  try { playTone('sine', 1200, 800, 0.05, 0.05);   } catch { /* ignore */ }
};

export const playToggle = (muted: boolean, on: boolean) => {
  if (muted) return;
  try { playTone('sine', on ? 600 : 800, on ? 900 : 500, 0.04, 0.07);   } catch { /* ignore */ }
};

export const playNav = (muted: boolean) => {
  if (muted) return;
  try { playTone('triangle', 500, 700, 0.035, 0.06);   } catch { /* ignore */ }
};

// Academic section toggle sound (soft, pleasant)
export const playSectionToggle = (muted: boolean) => {
  if (muted) return;
  try { playTone('sine', 440, 550, 0.025, 0.09);   } catch { /* ignore */ }
};

// Slider/parameter change sound (very soft)
export const playSliderChange = (muted: boolean) => {
  if (muted) return;
  try { playTone('sine', 350, 420, 0.015, 0.06);   } catch { /* ignore */ }
};

// Button press in tutorial/helper (academic)
export const playTutorialClick = (muted: boolean) => {
  if (muted) return;
  try { playTone('sine', 520, 650, 0.02, 0.07);   } catch { /* ignore */ }
};

// Wind whistle sound that varies with projectile speed
export const playWindWhistle = (muted: boolean, speed: number) => {
  if (muted) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    // Create a filtered noise to simulate wind
    const sr = ctx.sampleRate;
    const duration = 0.15;
    const buf = ctx.createBuffer(1, sr * duration, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    // Frequency increases with speed (200Hz at low speed, up to 2000Hz at high speed)
    f.frequency.value = Math.min(200 + speed * 15, 2000);
    f.Q.value = 5;
    src.buffer = buf;
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    // Volume scales with speed
    const vol = Math.min(0.02 + speed * 0.001, 0.08);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    src.start();
    } catch { /* ignore */ }
};

// Enhanced launch sound with rumble
export const playEnhancedLaunch = (muted: boolean, velocity: number) => {
  if (muted) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    // Base launch swoosh
    playTone('sawtooth', 80, 1800, 0.15, 0.3);
    // Add rumble proportional to velocity
    const sr = ctx.sampleRate;
    const dur = 0.4;
    const buf = ctx.createBuffer(1, sr * dur, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.15));
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 80 + velocity * 2;
    src.buffer = buf;
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(Math.min(0.1 + velocity * 0.002, 0.25), ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    src.start();
    } catch { /* ignore */ }
};

// Enhanced impact with crunch based on impact velocity
export const playEnhancedImpact = (muted: boolean, impactVelocity: number) => {
  if (muted) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const sr = ctx.sampleRate;
    const dur = Math.min(0.3 + impactVelocity * 0.005, 0.8);
    const buf = ctx.createBuffer(1, Math.floor(sr * dur), sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.08));
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 80 + impactVelocity * 3;
    src.buffer = buf;
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    const vol = Math.min(0.3 + impactVelocity * 0.01, 0.9);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    src.start();
    // Add a thud tone
    playTone('sine', 60 + impactVelocity, 30, Math.min(0.15, vol * 0.3), dur * 0.7);
    } catch { /* ignore */ }
};

// Page navigation transition sound (whoosh + chime)
export const playPageTransition = (muted: boolean) => {
  if (muted) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    // Soft whoosh
    const sr = ctx.sampleRate;
    const dur = 0.25;
    const buf = ctx.createBuffer(1, Math.floor(sr * dur), sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(400, ctx.currentTime);
    f.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + dur * 0.7);
    f.Q.value = 2;
    src.buffer = buf;
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    src.start();
    // Rising chime
    playTone('sine', 500, 800, 0.03, 0.15);
    // Harmonic
    setTimeout(() => playTone('triangle', 1000, 1200, 0.02, 0.12), 60);
    } catch { /* ignore */ }
};

// Button hover/click sound for landing page navigation
export const playLandingNav = (muted: boolean) => {
  if (muted) return;
  try { playTone('sine', 600, 900, 0.03, 0.08);   } catch { /* ignore */ }
};

// Theme toggle sound (day/night switch)
export const playThemeToggle = (muted: boolean, toDark: boolean) => {
  if (muted) return;
  try {
    if (toDark) {
      playTone('sine', 800, 400, 0.03, 0.15);
      setTimeout(() => playTone('triangle', 600, 300, 0.02, 0.12), 50);
    } else {
      playTone('sine', 400, 800, 0.03, 0.15);
      setTimeout(() => playTone('triangle', 600, 1000, 0.02, 0.12), 50);
    }
    } catch { /* ignore */ }
};

// Language switch sound
export const playLangSwitch = (muted: boolean) => {
  if (muted) return;
  try { playTone('triangle', 700, 900, 0.025, 0.1);   } catch { /* ignore */ }
};

// Guided tour step transition sound (gentle chime)
export const playTourTransition = (muted: boolean) => {
  if (muted) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    // First note - soft chime
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.connect(g1); g1.connect(ctx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(660, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    g1.gain.setValueAtTime(0.04, ctx.currentTime);
    g1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.3);
    // Second note - harmonic
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.connect(g2); g2.connect(ctx.destination);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
    osc2.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.25);
    g2.gain.setValueAtTime(0, ctx.currentTime + 0.08);
    g2.gain.linearRampToValueAtTime(0.025, ctx.currentTime + 0.12);
    g2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc2.start(ctx.currentTime + 0.08);
    osc2.stop(ctx.currentTime + 0.35);
    } catch { /* ignore */ }
};
