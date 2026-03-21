import React, { useState, useEffect, useRef } from 'react';

const TIPS_EN = [
  "At 45°, a projectile achieves maximum range on flat ground.",
  "Air resistance converts kinetic energy into thermal energy.",
  "In vacuum, all objects fall at the same rate regardless of mass.",
  "The trajectory of a projectile is a parabola in ideal conditions.",
  "Galileo was the first to study projectile motion systematically.",
  "Terminal velocity occurs when drag force equals gravitational force.",
  "The Coriolis effect deflects projectiles on a rotating Earth.",
  "Kinetic energy is proportional to the square of velocity.",
  "Newton's 2nd law: F = ma governs all projectile motion.",
  "Energy is always conserved — it only changes form.",
  "The Magnus effect causes spinning balls to curve in flight.",
  "Bernoulli's principle explains lift on spinning projectiles.",
  "At the peak of trajectory, vertical velocity is exactly zero.",
  "Range doubles when launch height equals maximum height.",
  "Reynolds number determines if airflow is laminar or turbulent.",
];

const TIPS_AR = [
  "عند زاوية 45° يحقق المقذوف أقصى مدى على سطح مستوٍ.",
  "مقاومة الهواء تحوّل الطاقة الحركية إلى طاقة حرارية.",
  "في الفراغ، تسقط جميع الأجسام بنفس المعدل بغض النظر عن الكتلة.",
  "مسار المقذوف يكون قطعاً مكافئاً في الظروف المثالية.",
  "غاليليو كان أول من درس حركة المقذوفات بشكل منهجي.",
  "السرعة الحدية تحدث عندما تساوي قوة السحب قوة الجاذبية.",
  "تأثير كوريوليس يُحرف المقذوفات على الأرض الدوّارة.",
  "الطاقة الحركية تتناسب مع مربع السرعة.",
  "قانون نيوتن الثاني: F = ma يحكم كل حركة المقذوفات.",
  "الطاقة محفوظة دائماً — إنها تتغير شكلاً فقط.",
  "تأثير ماغنوس يجعل الكرات الدوّارة تنحني في الهواء.",
  "مبدأ بيرنولي يفسر الرفع على المقذوفات الدوّارة.",
  "عند قمة المسار، السرعة الرأسية تساوي صفراً تماماً.",
  "يتضاعف المدى عندما يساوي ارتفاع الإطلاق أقصى ارتفاع.",
  "عدد رينولدز يحدد ما إذا كان التدفق صفائحياً أو مضطرباً.",
];

interface Props {
  lang: string;
}

export default function IdlePhysicsTips({ lang }: Props) {
  const [visible, setVisible] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [fadeState, setFadeState] = useState<'in' | 'out' | 'hidden'>('hidden');
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleRef = useRef(false);
  const isAr = lang === 'ar';
  const tips = isAr ? TIPS_AR : TIPS_EN;

  const clearAllTimers = () => {
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null; }
    if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
    if (fadeTimerRef.current) { clearTimeout(fadeTimerRef.current); fadeTimerRef.current = null; }
  };

  const hideImmediately = () => {
    setFadeState('out');
    setVisible(false);
    setFadeState('hidden');
    visibleRef.current = false;
  };

  const showNextTip = () => {
    setTipIndex(prev => {
      let next = Math.floor(Math.random() * tips.length);
      while (next === prev && tips.length > 1) next = Math.floor(Math.random() * tips.length);
      return next;
    });
    setVisible(true);
    visibleRef.current = true;
    setFadeState('in');

    hideTimerRef.current = setTimeout(() => {
      setFadeState('out');
      fadeTimerRef.current = setTimeout(() => {
        setVisible(false);
        visibleRef.current = false;
        setFadeState('hidden');
        // Show another tip after a longer pause
        idleTimerRef.current = setTimeout(showNextTip, 8000);
      }, 400);
    }, 5000);
  };

  const resetIdleTimer = () => {
    clearAllTimers();

    // Immediately hide any visible tip
    if (visibleRef.current) {
      hideImmediately();
    }

    idleTimerRef.current = setTimeout(showNextTip, 10000);
  };

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      clearAllTimers();
      visibleRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  if (!visible) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-500 pointer-events-none ${
        fadeState === 'in' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
      style={{
        bottom: '100px',
        right: isAr ? 'auto' : '24px',
        left: isAr ? '24px' : 'auto',
        maxWidth: '340px',
      }}
    >
      {/* Speech bubble */}
      <div className="relative bg-background border-2 border-foreground/20 rounded-2xl px-4 py-3 shadow-2xl shadow-black/20 pointer-events-auto">
        {/* Bubble tail - pointing down to the button */}
        <div
          className="absolute top-full bg-background border-b-2 border-foreground/20 w-4 h-4 rotate-45 -translate-y-2"
          style={{
            right: isAr ? 'auto' : '32px',
            left: isAr ? '32px' : 'auto',
          }}
        />
        
        {/* Header */}
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <span className="text-xs">💡</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary whitespace-nowrap">
            {isAr ? 'هل تعلم؟' : 'Did you know?'}
          </span>
        </div>
        
        {/* Tip text */}
        <p className="text-xs text-foreground/80 leading-relaxed" dir={isAr ? 'rtl' : 'ltr'}>
          {tips[tipIndex]}
        </p>
      </div>
    </div>
  );
}
