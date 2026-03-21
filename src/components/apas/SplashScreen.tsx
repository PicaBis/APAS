import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Lang } from '@/constants/translations';

interface SplashScreenProps {
  lang: Lang;
  onComplete: () => void;
}

const playEntrySound = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Resume context for Brave and other browsers that suspend by default
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.3, ctx.currentTime);
    masterGain.connect(ctx.destination);
    const t = ctx.currentTime;
    const chimeNotes = [523.25, 659.25, 783.99];
    chimeNotes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.12);
      g.gain.setValueAtTime(0, t + i * 0.12);
      g.gain.linearRampToValueAtTime(0.12, t + i * 0.12 + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.5);
      osc.connect(g); g.connect(masterGain);
      osc.start(t + i * 0.12); osc.stop(t + i * 0.12 + 0.6);
    });
    const padOsc = ctx.createOscillator();
    const padGain = ctx.createGain();
    padOsc.type = 'triangle';
    padOsc.frequency.setValueAtTime(261.63, t);
    padGain.gain.setValueAtTime(0, t);
    padGain.gain.linearRampToValueAtTime(0.04, t + 0.3);
    padGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    padOsc.connect(padGain); padGain.connect(masterGain);
    padOsc.start(t); padOsc.stop(t + 1.3);
    const resolveOsc = ctx.createOscillator();
    const resolveGain = ctx.createGain();
    resolveOsc.type = 'sine';
    resolveOsc.frequency.setValueAtTime(1046.5, t + 0.4);
    resolveGain.gain.setValueAtTime(0, t + 0.4);
    resolveGain.gain.linearRampToValueAtTime(0.06, t + 0.45);
    resolveGain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
    resolveOsc.connect(resolveGain); resolveGain.connect(masterGain);
    resolveOsc.start(t + 0.4); resolveOsc.stop(t + 1.1);
    setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 2000);
  } catch { /* silent */ }
};

let welcomeVoicePlayed = false;
const playWelcomeVoice = (lang: string = 'ar') => {
  if (welcomeVoicePlayed) return;
  welcomeVoicePlayed = true;
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const selectFemaleVoice = (speechLang: string): SpeechSynthesisVoice | null => {
      const voices = window.speechSynthesis.getVoices();
      const femalePatterns = /female|woman|girl|féminin|zira|hazel|samantha|karen|moira|tessa|fiona|veena|victoria|susan|kathy|allison|ava|nicky|satu|maryam|laila|hala|zahra|samira|amira|fatima|noura|lina/i;
      const femaleVoice = voices.find(v =>
        v.lang.startsWith(speechLang) && femalePatterns.test(v.name)
      );
      if (femaleVoice) return femaleVoice;
      const googleVoice = voices.find(v => v.lang.startsWith(speechLang) && /google/i.test(v.name));
      if (googleVoice) return googleVoice;
      const anyVoice = voices.find(v => v.lang.startsWith(speechLang));
      return anyVoice || null;
    };
    const speak = () => {
      const welcomeText = lang === 'ar'
        ? 'مرحباً بك في نظام تحليل المقذوفات بالذكاء الاصطناعي'
        : lang === 'fr'
          ? 'Bienvenue dans le système d\'analyse des projectiles par intelligence artificielle'
          : 'Welcome to the AI-powered projectile analysis system';
      const speechLang = lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en';
      const utterance = new SpeechSynthesisUtterance(welcomeText);
      utterance.lang = speechLang === 'ar' ? 'ar-SA' : speechLang === 'fr' ? 'fr-FR' : 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1.2;
      utterance.volume = 0.9;
      utterance.voice = selectFemaleVoice(speechLang);
      window.speechSynthesis.speak(utterance);
    };
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) { speak(); }
    else {
      let spoken = false;
      const speakOnce = () => { if (!spoken) { spoken = true; speak(); } };
      window.speechSynthesis.addEventListener('voiceschanged', speakOnce, { once: true });
      setTimeout(speakOnce, 1500);
    }
  } catch { /* silent */ }
};


const SplashScreen: React.FC<SplashScreenProps> = ({ lang, onComplete }) => {
  const [phase, setPhase] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [letterReveal, setLetterReveal] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const letterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const drawScene = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, prog: number) => {
    ctx.clearRect(0, 0, w, h);
    // White background with very subtle teal tint
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#ffffff');
    bgGrad.addColorStop(0.4, '#fafffe');
    bgGrad.addColorStop(0.7, '#f5fdfb');
    bgGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);
    const time = Date.now() * 0.001;
    const fade = Math.min(prog * 2, 1);

    // Subtle center radial glow
    const pulseScale = 1 + Math.sin(time * 0.6) * 0.05;
    const glowAlpha = (0.04 + Math.sin(time * 0.4) * 0.01) * fade;
    const centerGlow = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, w * 0.4 * pulseScale);
    centerGlow.addColorStop(0, 'rgba(20,184,166,' + glowAlpha + ')');
    centerGlow.addColorStop(0.5, 'rgba(20,184,166,' + (glowAlpha * 0.3) + ')');
    centerGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, w, h);

    // Very subtle grid dots
    if (fade > 0.3) {
      const gridAlpha = 0.02 * Math.min((fade - 0.3) * 2, 1);
      ctx.fillStyle = 'rgba(20,184,166,' + gridAlpha + ')';
      const spacing = 50;
      for (let gx = spacing; gx < w; gx += spacing) {
        for (let gy = spacing; gy < h; gy += spacing) {
          ctx.beginPath();
          ctx.arc(gx, gy, 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Soft floating particles
    for (let i = 0; i < 20; i++) {
      const px = w * (0.1 + 0.8 * ((Math.sin(time * 0.04 + i * 2.5) + 1) / 2));
      const py = h * (0.1 + 0.8 * ((Math.cos(time * 0.03 + i * 1.9) + 1) / 2));
      const pRadius = 1 + Math.sin(time * 0.3 + i * 0.7) * 0.5;
      const pAlpha = (0.04 + Math.sin(time * 0.5 + i) * 0.02) * fade;
      ctx.beginPath();
      ctx.arc(px, py, pRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(20,184,166,' + pAlpha + ')';
      ctx.fill();
    }

    // Gentle connecting lines
    const particles: [number, number][] = [];
    for (let i = 0; i < 8; i++) {
      particles.push([
        w * (0.2 + 0.6 * ((Math.sin(time * 0.03 + i * 3.5) + 1) / 2)),
        h * (0.25 + 0.5 * ((Math.cos(time * 0.025 + i * 2.7) + 1) / 2)),
      ]);
    }
    ctx.lineWidth = 0.3;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i][0] - particles[j][0];
        const dy = particles[i][1] - particles[j][1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = Math.min(w, h) * 0.2;
        if (dist < maxDist) {
          const lineAlpha = (1 - dist / maxDist) * 0.025 * fade;
          ctx.beginPath();
          ctx.moveTo(particles[i][0], particles[i][1]);
          ctx.lineTo(particles[j][0], particles[j][1]);
          ctx.strokeStyle = 'rgba(20,184,166,' + lineAlpha + ')';
          ctx.stroke();
        }
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);
    startTimeRef.current = Date.now();
    if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
    const animDuration = 3000;
    const frame = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const t = Math.min(elapsed / animDuration, 1);
      const easedT = 1 - Math.pow(1 - t, 3);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawScene(ctx, window.innerWidth, window.innerHeight, easedT);
      animFrameRef.current = requestAnimationFrame(frame);
    };
    animFrameRef.current = requestAnimationFrame(frame);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [drawScene]);

  // All timers in a single effect — no dependency on phase, runs once on mount
  useEffect(() => {
    // Phase progression
    const phaseTimer1 = setTimeout(() => setPhase(1), 300);
    const phaseTimer2 = setTimeout(() => setPhase(2), 1200);
    const phaseTimer3 = setTimeout(() => setPhase(3), 4500);

    // Letter reveal — starts at 600ms (after phase 1 at 300ms)
    let letterCount = 0;
    const letterTimer = setTimeout(() => {
      letterIntervalRef.current = setInterval(() => {
        letterCount++;
        setLetterReveal(letterCount);
        if (letterCount >= 4 && letterIntervalRef.current) {
          clearInterval(letterIntervalRef.current);
          letterIntervalRef.current = null;
        }
      }, 250);
    }, 600);

    // Loading progress — starts at 1500ms (after phase 2 at 1200ms), guaranteed to reach 100%
    let progress = 0;
    const loadingTimer = setTimeout(() => {
      loadingIntervalRef.current = setInterval(() => {
        const increment = Math.random() * 4 + 2;
        progress += increment;
        if (progress >= 100) {
          progress = 100;
          if (loadingIntervalRef.current) {
            clearInterval(loadingIntervalRef.current);
            loadingIntervalRef.current = null;
          }
        }
        setLoadingProgress(progress);
      }, 100);
    }, 1500);

    return () => {
      clearTimeout(phaseTimer1);
      clearTimeout(phaseTimer2);
      clearTimeout(phaseTimer3);
      clearTimeout(letterTimer);
      clearTimeout(loadingTimer);
      if (letterIntervalRef.current) clearInterval(letterIntervalRef.current);
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    };
  }, []);

  const handleEnterSystem = () => {
    playEntrySound();
    playWelcomeVoice(lang);
    setIsExiting(true);
    setTimeout(() => { onComplete(); }, 700);
  };

  const apasLetters = ['A', 'P', 'A', 'S'];

  return (
    <div
      className={'fixed inset-0 flex items-center justify-center z-[99999] transition-all duration-700 ' + (isExiting ? 'opacity-0 scale-105' : 'opacity-100 scale-100')}
      style={{ background: '#ffffff' }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="text-center flex flex-col items-center gap-0 relative z-10">

        {/* APAS Title — professional with animations */}
        <div style={{
          opacity: phase >= 1 ? 1 : 0,
          transform: 'translateY(' + (phase >= 1 ? 0 : 30) + 'px)',
          transition: 'all 1.2s cubic-bezier(0.25, 1, 0.5, 1)',
        }}>
          <div className="flex items-center justify-center gap-[3px] sm:gap-[6px]">
            {apasLetters.map((letter, i) => (
              <span key={i} className="text-5xl sm:text-6xl md:text-7xl font-black inline-block"
                style={{
                  color: '#111827',
                  opacity: letterReveal > i ? 1 : 0,
                  transform: letterReveal > i
                    ? 'translateY(0) scale(1)'
                    : 'translateY(30px) scale(0.8)',
                  transition: 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)',
                  letterSpacing: '0.15em',
                  textShadow: letterReveal > i ? '0 2px 20px rgba(20,184,166,0.15)' : 'none',
                  fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
                }}>{letter}</span>
            ))}
          </div>

          {/* Decorative line under APAS */}
          <div className="flex items-center justify-center mt-3 gap-2">
            <div style={{
              width: letterReveal >= 4 ? 60 : 0,
              height: 2,
              background: 'linear-gradient(90deg, transparent, rgba(20,184,166,0.6), rgba(20,184,166,0.8))',
              transition: 'width 1s cubic-bezier(0.25, 1, 0.5, 1) 0.4s',
              borderRadius: 2,
            }} />
            <div style={{
              width: letterReveal >= 4 ? 8 : 0,
              height: 8,
              background: 'rgba(20,184,166,0.5)',
              borderRadius: '50%',
              transition: 'all 0.6s ease 0.6s',
              opacity: letterReveal >= 4 ? 1 : 0,
              transform: letterReveal >= 4 ? 'scale(1)' : 'scale(0)',
            }} />
            <div style={{
              width: letterReveal >= 4 ? 60 : 0,
              height: 2,
              background: 'linear-gradient(90deg, rgba(20,184,166,0.8), rgba(20,184,166,0.6), transparent)',
              transition: 'width 1s cubic-bezier(0.25, 1, 0.5, 1) 0.4s',
              borderRadius: 2,
            }} />
          </div>

          {/* Arabic name */}
          <div className="flex items-center justify-center mt-3">
            <div className="text-lg sm:text-xl md:text-2xl font-semibold tracking-[0.4em]"
              style={{
                fontFamily: "'Noto Sans Arabic', 'Cairo', sans-serif",
                color: '#374151',
                opacity: letterReveal >= 4 ? 1 : 0,
                transform: letterReveal >= 4 ? 'translateY(0) scale(1)' : 'translateY(15px) scale(0.9)',
                transition: 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1) 0.5s',
              }}>أبـــاس</div>
          </div>
        </div>

        {/* App description */}
        <div style={{
          opacity: phase >= 2 ? 1 : 0,
          transform: 'translateY(' + (phase >= 2 ? 0 : 15) + 'px)',
          transition: 'all 0.8s ease 0.2s',
          marginTop: '24px',
        }}>
          <div className="text-sm sm:text-base font-medium tracking-wider" style={{ color: '#374151' }}>
            {lang === 'ar' ? 'نظام تحليل المقذوفات بالذكاء الاصطناعي'
              : lang === 'fr' ? "Système d'Analyse des Projectiles par IA"
                : 'AI Projectile Analysis System'}
          </div>
          <div className="text-[11px] sm:text-xs max-w-sm mx-auto mt-3 leading-relaxed" style={{ color: '#6B7280' }}>
            {lang === 'ar'
              ? 'محاكاة فيزيائية متقدمة لحركة المقذوفات مع تحليل بالذكاء الاصطناعي، رؤية حاسوبية، ونظام إدارة الفصل الدراسي'
              : lang === 'fr'
                ? 'Simulation physique avancée du mouvement des projectiles avec analyse IA, vision par ordinateur et gestion de classe'
                : 'Advanced physics simulation of projectile motion with AI analysis, computer vision, and classroom management'}
          </div>
          <div className="flex items-center justify-center gap-4 mt-3">
            {(lang === 'ar'
              ? ['محاكي ثنائي وثلاثي الأبعاد', 'تحليل ذكي', 'فصل دراسي']
              : lang === 'fr'
                ? ['Simulateur 2D/3D', 'Analyse IA', 'Classe']
                : ['2D/3D Simulator', 'AI Analysis', 'Classroom']
            ).map((tag, i) => (
              <span key={i} className="text-[9px] sm:text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  color: '#0d9488',
                  background: 'rgba(20,184,166,0.08)',
                  border: '1px solid rgba(20,184,166,0.15)',
                  opacity: phase >= 2 ? 1 : 0,
                  transform: phase >= 2 ? 'translateY(0)' : 'translateY(8px)',
                  transition: 'all 0.5s ease ' + (0.4 + i * 0.1) + 's',
                }}>
                {tag}
              </span>
            ))}
          </div>
          <div className="text-xs font-mono tracking-wider mt-3" style={{ color: '#9CA3AF' }}>
            v1.1
          </div>
        </div>

        {/* Loading bar */}
        <div style={{
          opacity: phase >= 2 ? 1 : 0,
          transform: 'translateY(' + (phase >= 2 ? 0 : 10) + 'px)',
          transition: 'all 0.7s ease 0.3s',
          marginTop: '32px',
        }}>
          <div className="w-64 sm:w-80 mx-auto relative">
            <div className="h-[3px] rounded-full overflow-hidden relative" style={{ background: 'rgba(0,0,0,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-200 ease-out"
                style={{
                  width: Math.min(loadingProgress, 100) + '%',
                  background: 'linear-gradient(90deg, rgba(20,184,166,0.5), rgba(13,148,136,0.9), rgba(20,184,166,0.7))',
                }} />
            </div>
            <div className="flex justify-between mt-3">
              <span className="text-[10px] font-mono tracking-[0.3em] uppercase font-semibold" style={{ color: '#6B7280' }}>
                {loadingProgress >= 100
                  ? (lang === 'ar' ? '▸ جاهز' : '▸ READY')
                  : (lang === 'ar' ? '▸ تحميل...' : '▸ LOADING...')}
              </span>
              <span className="text-[10px] font-mono tabular-nums font-semibold" style={{ color: '#6B7280' }}>
                {Math.min(Math.round(loadingProgress), 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Enter button */}
        <div style={{
          opacity: loadingProgress >= 100 && phase >= 3 ? 1 : 0,
          transform: loadingProgress >= 100 && phase >= 3 ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)',
          transition: 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
          marginTop: '36px',
          pointerEvents: loadingProgress >= 100 && phase >= 3 ? 'auto' : 'none',
        }}>
          <button onClick={handleEnterSystem}
            className="group relative px-12 py-3.5 font-mono tracking-[0.3em] text-xs uppercase overflow-hidden transition-all duration-300 hover:shadow-lg"
            style={{
              color: '#111827',
              background: 'transparent',
              border: '2px solid rgba(0,0,0,0.2)',
              borderRadius: '4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(20,184,166,0.6)';
              e.currentTarget.style.background = 'rgba(20,184,166,0.05)';
              e.currentTarget.style.color = '#0d9488';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)';
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#111827';
            }}
          >
            {lang === 'ar' ? '◆ دخول النظام ◆' : lang === 'fr' ? '◆ ENTRER ◆' : '◆ ENTER SYSTEM ◆'}
          </button>
          <div className="flex items-center justify-center gap-1.5 mt-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-1 h-1 rounded-full" style={{ background: 'rgba(0,0,0,0.3)', animation: 'splashDotPulse 1.5s ease-in-out ' + (i * 0.2) + 's infinite' }} />
            ))}
          </div>
        </div>

        {/* Designers / Credits */}
        <div className="mt-10" style={{
          opacity: phase >= 2 ? 1 : 0,
          transition: 'opacity 1.2s ease 0.6s',
        }}>
          <div className="text-[10px] font-mono tracking-wider font-medium" style={{ color: '#9CA3AF' }}>
            Medjahed Abdelhadi &middot; Moufook Ibrahim
          </div>
          <div className="text-[9px] font-mono mt-1" style={{ color: '#D1D5DB' }}>
            École Normale Supérieure de Laghouat
          </div>
        </div>
      </div>
      <style>{`
        @keyframes splashDotPulse { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.5); } }
        @keyframes splashLogoFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes splashGlowPulse { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
      `}</style>
    </div>
  );
};

export default SplashScreen;
