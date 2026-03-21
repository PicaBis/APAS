import React, { useState, useEffect, useCallback, useRef } from 'react';
import ApasLogo from './ApasLogo';
import { playTourTransition, playUIClick } from '@/utils/sound';
import type { Lang } from '@/constants/translations';

interface OnboardingTutorialProps {
  lang: Lang;
  open: boolean;
  onClose: () => void;
}

interface TourStep {
  target: string | null;
  title: string;
  content: string;
  icon: string;
  position: 'center' | 'bottom' | 'top' | 'left' | 'right';
}

const STEPS_AR: TourStep[] = [
  {
    target: null,
    title: 'مرحبا بك في APAS',
    content: 'نظام تحليل المقذوفات بالذكاء الاصطناعي\nتصميم: مجاهد عبدالهادي و موفق ابراهيم\nالمدرسة العليا للأساتذة بالأغواط',
    icon: '🎓',
    position: 'center',
  },
  {
    target: 'center-canvas',
    title: 'محاكاة المقذوف',
    content: 'هنا تشاهد حركة المقذوف مباشرة مع أدوات التكبير والتصوير والوضع ثلاثي الأبعاد وأزرار التشغيل والإيقاف وشريط الزمن',
    icon: '🚀',
    position: 'top',
  },
  {
    target: 'header',
    title: 'شريط التنقل العلوي',
    content: 'تغيير اللغة، كتم الصوت، الوضع الليلي، دليل التطبيق، والتوثيق',
    icon: '🧭',
    position: 'bottom',
  },
  {
    target: 'right-panel',
    title: 'اللوحة اليمنى',
    content: 'طريقة التكامل (Euler, RK4, AI)، الرؤية الذكية APAS Vision لتحليل الصور، والسيناريوهات الجاهزة',
    icon: '🔬',
    position: 'left',
  },
  {
    target: 'left-panel',
    title: 'اللوحة اليسرى',
    content: 'المعاملات الفيزيائية (السرعة، الزاوية، الجاذبية، الكتلة)، خيارات العرض، المقارنة، والتصدير',
    icon: '⚙️',
    position: 'right',
  },
  {
    target: 'below-canvas',
    title: 'نتائج وتحليلات',
    content: 'تنبؤات الذكاء الاصطناعي، المعادلات، التمثيل البياني، تحليل الطاقة، ونماذج التنبؤ',
    icon: '📊',
    position: 'top',
  },
];

const STEPS_EN: TourStep[] = [
  {
    target: null,
    title: 'Welcome to APAS',
    content: 'AI Projectile Analysis System\nDesigned by: Medjahed Abdelhadi & Mouffok Ibrahim\nENS Laghouat',
    icon: '🎓',
    position: 'center',
  },
  {
    target: 'center-canvas',
    title: 'Simulation Canvas',
    content: 'Watch projectile motion live with zoom, screenshot, 3D mode, play/pause controls and timeline scrubber',
    icon: '🚀',
    position: 'top',
  },
  {
    target: 'header',
    title: 'Top Navigation',
    content: 'Switch language, toggle sound, dark mode, app guide, and documentation',
    icon: '🧭',
    position: 'bottom',
  },
  {
    target: 'right-panel',
    title: 'Right Panel',
    content: 'Integration method (Euler, RK4, AI), APAS Vision for image analysis, and preset scenarios',
    icon: '🔬',
    position: 'left',
  },
  {
    target: 'left-panel',
    title: 'Left Panel',
    content: 'Physics parameters (velocity, angle, gravity, mass), display options, comparison, and export',
    icon: '⚙️',
    position: 'right',
  },
  {
    target: 'below-canvas',
    title: 'Results & Analysis',
    content: 'AI predictions, equations, graphical representation, energy analysis, and prediction models',
    icon: '📊',
    position: 'top',
  },
];

const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ lang, open, onClose }) => {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({});
  const [spotlightRect, setSpotlightRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const steps = lang === 'ar' ? STEPS_AR : STEPS_EN;
  const currentStep = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;
  const isRTL = lang === 'ar';

  const positionCard = useCallback(() => {
    const s = steps[step];
    if (!s) return;

    if (!s.target) {
      setSpotlightRect(null);
      setCardStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 100002,
      });
      return;
    }

    const el = document.querySelector(`[data-tour="${s.target}"]`);
    if (!el) {
      setSpotlightRect(null);
      setCardStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 100002,
      });
      return;
    }

    const rect = el.getBoundingClientRect();
    const padding = 8;

    // Clamp spotlight to visible viewport area
    const clampedTop = Math.max(0, rect.top - padding);
    const clampedLeft = Math.max(0, rect.left - padding);
    const clampedRight = Math.min(window.innerWidth, rect.right + padding);
    const clampedBottom = Math.min(window.innerHeight, rect.bottom + padding);

    setSpotlightRect({
      top: clampedTop,
      left: clampedLeft,
      width: clampedRight - clampedLeft,
      height: clampedBottom - clampedTop,
    });

    const cardWidth = 320;
    const cardGap = 16;
    const style: React.CSSProperties = {
      position: 'fixed',
      zIndex: 100002,
      maxWidth: cardWidth,
      width: cardWidth,
    };

    switch (s.position) {
      case 'bottom':
        style.top = rect.bottom + padding + cardGap;
        style.left = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, rect.left + rect.width / 2 - cardWidth / 2));
        break;
      case 'top': {
        // Place card above the element; if not enough space above, place below
        const spaceAbove = rect.top - padding;
        if (spaceAbove > 200) {
          style.top = rect.top - padding - cardGap - 180;
          style.top = Math.max(16, style.top);
        } else {
          style.top = rect.bottom + padding + cardGap;
        }
        style.left = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, rect.left + rect.width / 2 - cardWidth / 2));
        break;
      }
      case 'left': {
        style.top = Math.max(16, Math.min(window.innerHeight - 200, rect.top + rect.height / 2 - 80));
        const leftPos = rect.left - padding - cardGap - cardWidth;
        if (leftPos >= 16) {
          style.left = leftPos;
        } else {
          // Not enough space on the left, place flush to viewport left edge
          style.left = 16;
        }
        break;
      }
      case 'right': {
        style.top = Math.max(16, Math.min(window.innerHeight - 200, rect.top + rect.height / 2 - 80));
        const rightPos = rect.right + padding + cardGap;
        if (rightPos + cardWidth <= window.innerWidth - 16) {
          style.left = rightPos;
        } else {
          // Not enough space on the right, place flush to viewport right edge
          style.left = window.innerWidth - cardWidth - 16;
        }
        break;
      }
    }

    if (style.left !== undefined && typeof style.left === 'number') {
      style.left = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, style.left));
    }
    if (style.top !== undefined && typeof style.top === 'number') {
      style.top = Math.max(16, Math.min(window.innerHeight - 220, style.top));
    }

    setCardStyle(style);
  }, [step, steps]);

  const scrollToTarget = useCallback((target: string | null) => {
    if (!target) return;
    const el = document.querySelector(`[data-tour="${target}"]`);
    if (!el) return;
    // For side panels use 'nearest' to avoid over-scrolling; for others center them
    const block: ScrollLogicalPosition = (target === 'left-panel' || target === 'right-panel') ? 'start' : (target === 'center-canvas' ? 'start' : 'center');
    el.scrollIntoView({ behavior: 'smooth', block, inline: 'nearest' });
  }, []);

  useEffect(() => {
    if (!open) return;
    const s = steps[step];
    if (!s) return;
    scrollToTarget(s.target);
    const timer = setTimeout(() => {
      positionCard();
      setVisible(true);
      setTransitioning(false);
    }, s.target ? 700 : 100);
    return () => clearTimeout(timer);
  }, [step, open, positionCard, scrollToTarget, steps]);

  useEffect(() => {
    if (!open) return;
    const handleResize = () => positionCard();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open, positionCard]);

  useEffect(() => {
    if (open) {
      setStep(0);
      setVisible(false);
      setTransitioning(false);
      setTimeout(() => setVisible(true), 200);
    }
  }, [open]);

  const goToStep = (newStep: number) => {
    if (transitioning) return;
    setTransitioning(true);
    setVisible(false);
    playTourTransition(false);
    setTimeout(() => { setStep(newStep); }, 300);
  };

  const handleNext = () => {
    playUIClick(false);
    if (isLast) {
      setVisible(false);
      setTimeout(() => { onClose(); setStep(0); }, 300);
    } else {
      goToStep(step + 1);
    }
  };

  const handlePrev = () => {
    playUIClick(false);
    if (!isFirst) goToStep(step - 1);
  };

  const handleSkip = () => {
    playUIClick(false);
    setVisible(false);
    setTimeout(() => { onClose(); setStep(0); }, 300);
  };

  if (!open) return null;

  const buildClipPath = () => {
    if (!spotlightRect) return 'none';
    const { top, left, width, height } = spotlightRect;
    const r = 12;
    return `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${left}px ${top + r}px, ${left + r}px ${top}px, ${left + width - r}px ${top}px, ${left + width}px ${top + r}px, ${left + width}px ${top + height - r}px, ${left + width - r}px ${top + height}px, ${left + r}px ${top + height}px, ${left}px ${top + height - r}px, ${left}px ${top + r}px)`;
  };

  return (
    <>
      {/* Dark overlay with cutout */}
      <div
        className="fixed inset-0 transition-opacity duration-500"
        style={{
          zIndex: 100000,
          backgroundColor: spotlightRect ? 'transparent' : 'rgba(0, 0, 0, 0.55)',
          opacity: visible ? 1 : 0,
          pointerEvents: 'auto',
        }}
        onClick={handleSkip}
      >
        {spotlightRect && (
          <div
            className="absolute inset-0 transition-all duration-500 ease-out"
            style={{
              background: 'rgba(0, 0, 0, 0.55)',
              clipPath: buildClipPath(),
            }}
          />
        )}
      </div>

      {/* Spotlight border glow */}
      {spotlightRect && visible && (
        <div
          className="fixed pointer-events-none transition-all duration-500 ease-out"
          style={{
            zIndex: 100001,
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
            borderRadius: 12,
            border: '2px solid hsl(var(--primary) / 0.5)',
            boxShadow: '0 0 20px 4px hsl(var(--primary) / 0.15)',
            opacity: visible ? 1 : 0,
          }}
        />
      )}

      {/* Tour Card */}
      <div
        ref={cardRef}
        className="transition-all duration-500 ease-out pointer-events-auto"
        style={{
          ...cardStyle,
          opacity: visible ? 1 : 0,
          transform: visible
            ? (cardStyle.transform || 'translateY(0)')
            : (currentStep.target
              ? 'translateY(12px)'
              : 'translate(-50%, -50%) scale(0.95)'),
        }}
        dir={isRTL ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">
          {/* Progress bar */}
          <div className="flex gap-1 px-4 pt-3">
            {steps.map((_, i) => (
              <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-border/40 transition-all duration-300">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: i <= step ? '100%' : '0%',
                    background: i <= step ? 'hsl(var(--primary))' : 'transparent',
                    opacity: i === step ? 1 : 0.4,
                  }}
                />
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="px-5 pt-4 pb-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">
                {currentStep.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground leading-tight">{currentStep.title}</h3>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {step + 1} / {steps.length}
                </span>
              </div>
              {isFirst && <ApasLogo size={28} />}
            </div>

            <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">
              {currentStep.content}
            </p>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleSkip}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-all duration-200 px-2.5 py-1.5 rounded-lg hover:bg-secondary"
              >
                {isRTL ? 'تخطي' : 'Skip'}
              </button>

              <div className="flex items-center gap-2">
                {!isFirst && (
                  <button
                    onClick={handlePrev}
                    className="text-[11px] font-medium text-foreground px-3 py-2 rounded-lg border border-border hover:bg-secondary transition-all duration-200 active:scale-95"
                  >
                    {isRTL ? 'السابق' : 'Previous'}
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="text-[11px] font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg transition-all duration-200 hover:opacity-90 active:scale-95 shadow-sm"
                  style={{ boxShadow: '0 2px 8px hsl(var(--primary) / 0.25)' }}
                >
                  {isLast
                    ? (isRTL ? 'ابدأ الآن' : 'Get Started')
                    : (isRTL ? 'التالي' : 'Next')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OnboardingTutorial;
