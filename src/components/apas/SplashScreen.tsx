import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Lang } from '@/constants/translations';
import { playLoadingSound } from '@/utils/sound';

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

const TIPS_EN = [
  "At 45°, a projectile achieves maximum range on flat ground.",
  "In vacuum, all objects fall at the same rate regardless of mass.",
  "The trajectory of a projectile is a parabola in ideal conditions.",
  "Kinetic energy is proportional to the square of velocity.",
  "At the peak of trajectory, vertical velocity is exactly zero.",
  "Projectile motion consists of two independent perpendicular motions.",
];

const TIPS_AR = [
  "عند زاوية 45° يحقق المقذوف أقصى مدى على سطح مستوٍ.",
  "في الفراغ، تسقط جميع الأجسام بنفس المعدل بغض النظر عن الكتلة.",
  "مسار المقذوف يكون قطعاً مكافئاً في الظروف المثالية.",
  "الطاقة الحركية تتناسب مع مربع السرعة.",
  "عند قمة المسار، السرعة الرأسية تساوي صفراً تماماً.",
  "حركة المقذوف تتكون من حركتين مستقلتين متعامدتين.",
];

const SplashScreen: React.FC<SplashScreenProps> = ({ lang, onComplete }) => {
  const [phase, setPhase] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [letterReveal, setLetterReveal] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const letterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tips = lang === 'ar' ? TIPS_AR : TIPS_EN;

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % tips.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [tips.length]);

  const drawScene = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, prog: number) => {
    ctx.clearRect(0, 0, w, h);
    // Clean white to very light gray gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#ffffff');
    bgGrad.addColorStop(0.5, '#f8fafc');
    bgGrad.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);
    const time = Date.now() * 0.001;
    const fade = Math.min(prog * 2, 1);

    // Subtle center radial glow - soft blue
    const pulseScale = 1 + Math.sin(time * 0.6) * 0.05;
    const glowAlpha = (0.04 + Math.sin(time * 0.4) * 0.02) * fade;
    const centerGlow = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, w * 0.4 * pulseScale);
    centerGlow.addColorStop(0, 'rgba(59,130,246,' + glowAlpha + ')');
    centerGlow.addColorStop(0.4, 'rgba(59,130,246,' + (glowAlpha * 0.1) + ')');
    centerGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, w, h);

    // Subtle grid dots - darker for light theme
    if (fade > 0.3) {
      const gridAlpha = 0.08 * Math.min((fade - 0.3) * 2, 1);
      ctx.fillStyle = 'rgba(59,130,246,' + gridAlpha + ')';
      const spacing = 60;
      for (let gx = spacing; gx < w; gx += spacing) {
        for (let gy = spacing; gy < h; gy += spacing) {
          ctx.beginPath();
          ctx.arc(gx, gy, 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Soft floating particles - blue only
    for (let i = 0; i < 15; i++) {
      const px = w * (0.1 + 0.8 * ((Math.sin(time * 0.04 + i * 2.5) + 1) / 2));
      const py = h * (0.1 + 0.8 * ((Math.cos(time * 0.03 + i * 1.9) + 1) / 2));
      const pRadius = 1.5 + Math.sin(time * 0.3 + i * 0.7) * 0.5;
      const pAlpha = (0.1 + Math.sin(time * 0.5 + i) * 0.05) * fade;
      ctx.beginPath();
      ctx.arc(px, py, pRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(59,130,246,' + pAlpha + ')';
      ctx.fill();
    }

    // Projectile path animations in background - blue only
    const drawProjectilePath = (startX: number, startY: number, v0: number, angle: number, color: string) => {
      const g = 9.8;
      const rad = angle * Math.PI / 180;
      const vx = v0 * Math.cos(rad);
      const vy = -v0 * Math.sin(rad);
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.moveTo(startX, startY);
      
      const duration = (2 * v0 * Math.sin(rad)) / g;
      const steps = 40;
      const currentStep = (time * 0.5) % 2; // Loop animation
      
      for (let s = 0; s <= steps; s++) {
        const t = (s / steps) * duration;
        if (t > currentStep * duration) break;
        const x = startX + vx * t;
        const y = startY + vy * t + 0.5 * g * t * t;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };

    if (fade > 0.5) {
      const pathAlpha = 0.1 * Math.min((fade - 0.5) * 2, 1);
      drawProjectilePath(w * 0.1, h * 0.8, w * 0.08, 45, `rgba(59,130,246,${pathAlpha})`);
      drawProjectilePath(w * 0.2, h * 0.9, w * 0.1, 30, `rgba(59,130,246,${pathAlpha})`);
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
      // Play a pleasant ambient loading sound
      playLoadingSound(false); 
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
      className={'fixed inset-0 flex items-center justify-center z-[99999] transition-all duration-700 overflow-hidden ' + (isExiting ? 'opacity-0 scale-105' : 'opacity-100 scale-100')}
      style={{ background: '#ffffff', width: '100vw', height: '100vh' }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
      <div className="text-center flex flex-col items-center gap-0 relative z-10 w-full max-w-4xl px-4">

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
                  color: '#1e293b',
                  opacity: letterReveal > i ? 1 : 0,
                  transform: letterReveal > i
                    ? 'translateY(0) scale(1)'
                    : 'translateY(30px) scale(0.8)',
                  transition: 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)',
                  letterSpacing: '0.15em',
                  textShadow: letterReveal > i ? '0 2px 10px rgba(59,130,246,0.1)' : 'none',
                  fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
                }}>{letter}</span>
            ))}
          </div>

          {/* Decorative line under APAS */}
          <div className="flex items-center justify-center mt-3 gap-2">
            <div style={{
              width: letterReveal >= 4 ? 60 : 0,
              height: 2,
              background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.4), rgba(59,130,246,0.8))',
              transition: 'width 1s cubic-bezier(0.25, 1, 0.5, 1) 0.4s',
              borderRadius: 2,
            }} />
            <div style={{
              width: letterReveal >= 4 ? 8 : 0,
              height: 8,
              background: 'rgba(59,130,246,0.7)',
              borderRadius: '50%',
              transition: 'all 0.6s ease 0.6s',
              opacity: letterReveal >= 4 ? 1 : 0,
              transform: letterReveal >= 4 ? 'scale(1)' : 'scale(0)',
            }} />
            <div style={{
              width: letterReveal >= 4 ? 60 : 0,
              height: 2,
              background: 'linear-gradient(90deg, rgba(59,130,246,0.8), rgba(59,130,246,0.4), transparent)',
              transition: 'width 1s cubic-bezier(0.25, 1, 0.5, 1) 0.4s',
              borderRadius: 2,
            }} />
          </div>

          {/* Arabic name */}
          <div className="flex items-center justify-center mt-3">
            <div className="text-lg sm:text-xl md:text-2xl font-semibold tracking-[0.4em]"
              style={{
                fontFamily: "'Noto Sans Arabic', 'Cairo', sans-serif",
                color: '#475569',
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
          <div className="text-sm sm:text-base font-medium tracking-wider" style={{ color: '#334155' }}>
            {lang === 'ar' ? 'نظام تحليل المقذوفات بالذكاء الاصطناعي'
              : lang === 'fr' ? "Système d'Analyse des Projectiles par IA"
                : 'AI Projectile Analysis System'}
          </div>
          <div className="text-[11px] sm:text-xs max-w-sm mx-auto mt-3 leading-relaxed" style={{ color: '#64748b' }}>
            {lang === 'ar'
              ? 'محاكاة فيزيائية متقدمة لحركة المقذوفات مع تحليل بالذكاء الاصطناعي، رؤية حاسوبية، ونظام إدارة الفصل الدراسي'
              : lang === 'fr'
                ? 'Simulation physique avancée du mouvement des projectiles avec analyse IA, vision par ordinateur et gestion de classe'
                : 'Advanced physics simulation of projectile motion with AI analysis, computer vision, and classroom management'}
          </div>

          {/* Physics Teacher Tips */}
          <div className="h-8 mt-4 overflow-hidden relative">
            {tips.map((tip, i) => (
              <div
                key={i}
                className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-medium italic transition-all duration-700"
                style={{
                  color: '#3b82f6',
                  opacity: tipIndex === i ? 1 : 0,
                  transform: tipIndex === i ? 'translateY(0)' : 'translateY(10px)',
                }}
              >
                {tip}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3 sm:gap-4 mt-4 flex-wrap">
            {(lang === 'ar'
              ? ['محاكي ثنائي وثلاثي الأبعاد', 'تحليل ذكي', 'فصل دراسي']
              : lang === 'fr'
                ? ['Simulateur 2D/3D', 'Analyse IA', 'Classe']
                : ['2D/3D Simulator', 'AI Analysis', 'Classroom']
            ).map((tag, i) => (
              <span key={i} className="text-[10px] sm:text-xs font-semibold tracking-wider px-3 sm:px-4 py-1 sm:py-1.5 rounded-full"
                style={{
                  color: '#2563eb',
                  background: 'rgba(59,130,246,0.1)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  backdropFilter: 'blur(4px)',
                  opacity: phase >= 2 ? 1 : 0,
                  transform: phase >= 2 ? 'translateY(0)' : 'translateY(8px)',
                  transition: 'all 0.5s ease ' + (0.4 + i * 0.1) + 's',
                }}>
                {tag}
              </span>
            ))}
          </div>
          <div className="text-xs sm:text-sm font-mono tracking-wider mt-3 font-medium" style={{ color: '#94a3b8' }}>
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
            <div className="h-[4px] rounded-full overflow-hidden relative" style={{ background: 'rgba(148,163,184,0.1)' }}>
              <div className="h-full rounded-full transition-all duration-200 ease-out"
                style={{
                  width: Math.min(loadingProgress, 100) + '%',
                  background: 'linear-gradient(90deg, #3b82f6, #60a5fa, #3b82f6)',
                  boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)',
                }} />
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs sm:text-sm font-bold tracking-[0.2em] uppercase" style={{ 
                color: loadingProgress >= 100 ? '#2563eb' : '#64748b',
                transition: 'all 0.5s ease',
              }}>
                {loadingProgress >= 100
                  ? (lang === 'ar' ? '✦ جاهز' : '✦ READY')
                  : (lang === 'ar' ? '⟳ تحميل...' : '⟳ LOADING...')}
              </span>
              <span className="text-xs sm:text-sm font-bold font-mono tabular-nums" style={{ 
                color: loadingProgress >= 100 ? '#2563eb' : '#64748b',
                transition: 'all 0.5s ease',
              }}>
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
            className="group relative px-14 sm:px-16 py-4 sm:py-5 font-bold tracking-[0.25em] text-sm sm:text-base uppercase overflow-hidden transition-all duration-400 hover:shadow-2xl"
            style={{
              color: '#1e293b',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.05))',
              border: '2px solid rgba(59,130,246,0.4)',
              borderRadius: '8px',
              boxShadow: '0 4px 15px rgba(59,130,246,0.1)',
              letterSpacing: '0.25em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(59,130,246,0.8)';
              e.currentTarget.style.background = 'rgba(59,130,246,0.15)';
              e.currentTarget.style.color = '#000';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(59,130,246,0.2)';
              e.currentTarget.style.transform = 'scale(1.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)';
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.05))';
              e.currentTarget.style.color = '#1e293b';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(59,130,246,0.1)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {'◆  ENTER  SYSTEM  ◆'}
          </button>
          <div className="flex items-center justify-center gap-1.5 mt-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-1 h-1 rounded-full" style={{ background: 'rgba(59,130,246,0.5)', animation: 'splashDotPulse 1.5s ease-in-out ' + (i * 0.2) + 's infinite' }} />
            ))}
          </div>
        </div>

        {/* Designers / Credits */}
        <div className="mt-12 w-full max-w-md" style={{
          opacity: phase >= 2 ? 1 : 0,
          transition: 'opacity 1.2s ease 0.6s',
        }}>
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center">
              <div className="text-[11px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: '#475569' }}>
                {lang === 'ar' ? 'تطوير وتصميم' : lang === 'fr' ? 'Développement & Design' : 'Development & Design'}
              </div>
              <div className="flex items-center justify-center gap-4 text-xs font-mono font-bold" style={{ color: '#1e293b' }}>
                <span>Medjahed Abdelhadi</span>
                <span className="w-1 h-1 rounded-full bg-blue-400" />
                <span>Moufook Ibrahim</span>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-3 py-2 px-4 rounded-xl bg-slate-50/50 border border-slate-100 shadow-sm">
              <img 
                src="/lovable-uploads/60600004-6000-4000-8000-000000000000.png" 
                alt="ENSL Logo" 
                className="w-8 h-8 object-contain opacity-80"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <div className="flex flex-col items-center">
                <div className="text-[10px] font-bold text-slate-600">
                  {lang === 'ar' ? 'المدرسة العليا للأساتذة بالأغواط' : 'École Normale Supérieure de Laghouat'}
                </div>
                <div className="text-[9px] font-medium text-slate-400">
                  ENS Laghouat &middot; 2025/2026
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes splashDotPulse { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.5); } }
        @keyframes splashLogoFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes splashGlowPulse { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
      `}
      </style>
    </div>
  );
};

export default SplashScreen;
