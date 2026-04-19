import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { BookOpen, Lightbulb, X, Sparkles, ArrowRight, AlertCircle } from 'lucide-react';

interface WelcomeDialogProps {
  open: boolean;
  lang: string;
  onOpenGuide: () => void;
  onStartQuickTips: () => void;
  onSkip: () => void;
}

const WelcomeDialog: React.FC<WelcomeDialogProps> = ({ open, lang, onOpenGuide, onStartQuickTips, onSkip }) => {
  const isRTL = lang === 'ar';
  const t = (ar: string, en: string, fr: string) => lang === 'ar' ? ar : lang === 'fr' ? fr : en;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => { if (!v) onSkip(); }}>
      <DialogPrimitive.Portal>
        {/* Strong darken + heavy blur — user must clearly see the dialog */}
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-[14px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />

        <DialogPrimitive.Content
          dir={isRTL ? 'rtl' : 'ltr'}
          aria-describedby={undefined}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          className="fixed left-[50%] top-[50%] z-[61] w-[min(92vw,460px)] translate-x-[-50%] translate-y-[-50%] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {/* Outer animated glow */}
          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute -inset-[6px] rounded-[28px] opacity-80 blur-xl pointer-events-none"
              style={{
                background:
                  'conic-gradient(from 0deg, #6366f1, #a855f7, #ec4899, #f59e0b, #22d3ee, #6366f1)',
                animation: 'apasWelcomeSpin 6s linear infinite',
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-[24px] ring-1 ring-white/10 pointer-events-none"
            />

            <div className="relative rounded-[24px] overflow-hidden border border-white/10 bg-background shadow-[0_30px_80px_-10px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)]">
              <DialogPrimitive.Title className="sr-only">
                {t('مرحبا بك في APAS', 'Welcome to APAS', 'Bienvenue dans APAS')}
              </DialogPrimitive.Title>

              {/* Header with gradient + attention badge */}
              <div className="relative px-6 pt-6 pb-5 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent text-center">
                {/* soft glowing orbs */}
                <div aria-hidden="true" className="absolute -top-10 -start-10 w-40 h-40 rounded-full bg-primary/20 blur-3xl" />
                <div aria-hidden="true" className="absolute -top-6 -end-8 w-32 h-32 rounded-full bg-amber-500/20 blur-3xl" />

                <button
                  onClick={onSkip}
                  aria-label={t('تخطي', 'Skip', 'Passer')}
                  className="absolute top-3 end-3 p-1.5 rounded-lg bg-background/60 backdrop-blur hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors z-10"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Pulsing hero icon */}
                <div className="relative mx-auto mb-3 w-16 h-16 flex items-center justify-center">
                  <span aria-hidden="true" className="absolute inset-0 rounded-2xl bg-primary/30 animate-ping" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/30">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                </div>

                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[11px] font-semibold text-amber-700 dark:text-amber-300 mb-2">
                  <AlertCircle className="w-3 h-3" />
                  {t('خطوة مهمة قبل البدء', 'Important — read before starting', 'Important — à lire avant de commencer')}
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                  {t('مرحبا بك في APAS', 'Welcome to APAS', 'Bienvenue dans APAS')}
                </h2>
                <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed px-2">
                  {t(
                    'التطبيق متكامل وبه ميزات كثيرة لن تجدها بمجرد النظر. اختر أحد الدليلَين أدناه لتفهم التطبيق خلال دقائق — لا تتخطَّ هذه الخطوة.',
                    'APAS has many hidden features you won\'t discover by just clicking around. Pick a guide below to understand the app in minutes — don\'t skip this.',
                    'APAS possède de nombreuses fonctionnalités cachées. Choisissez un guide ci-dessous pour comprendre l\'application en quelques minutes — ne passez pas.'
                  )}
                </p>
              </div>

              {/* Buttons */}
              <div className="px-5 pb-4 pt-1 space-y-2.5">
                <button
                  onClick={onOpenGuide}
                  className="relative w-full overflow-hidden flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-indigo-500/10 hover:from-primary/20 hover:via-primary/10 hover:to-indigo-500/20 hover:border-primary/60 transition-all duration-200 group shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-start flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-foreground">
                        {t('فتح الدليل الشامل', 'Open Comprehensive Guide', 'Ouvrir le Guide Complet')}
                      </p>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                        {t('مُستحسن', 'Recommended', 'Recommandé')}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {t(
                        'تعرف على كل أقسام التطبيق بالتفصيل (5 دقائق)',
                        'Learn about every section in detail (5 min)',
                        'Apprenez chaque section en détail (5 min)'
                      )}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-primary shrink-0 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:rotate-180 transition-transform" />
                </button>

                <button
                  onClick={onStartQuickTips}
                  className="relative w-full overflow-hidden flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-orange-500/10 hover:from-amber-500/20 hover:via-amber-500/10 hover:to-orange-500/20 hover:border-amber-500/60 transition-all duration-200 group shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                    <Lightbulb className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-start flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">
                      {t('الدليل السريع', 'Quick Guide', 'Guide Rapide')}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {t(
                        'نصائح سريعة للبدء فوراً (دقيقة واحدة)',
                        'Quick tips to get started right away (1 min)',
                        'Conseils rapides pour commencer (1 min)'
                      )}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-amber-500 shrink-0 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:rotate-180 transition-transform" />
                </button>

                <button
                  onClick={onSkip}
                  className="w-full px-4 py-2 rounded-xl hover:bg-secondary transition-all duration-200 text-xs font-medium text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100"
                >
                  {t('تخطي (غير مُستحسن)', 'Skip (not recommended)', 'Passer (non recommandé)')}
                </button>
              </div>

              {/* Note */}
              <div className="mx-5 mb-5 px-3.5 py-2.5 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-[11px] text-foreground/80 text-center leading-relaxed font-medium">
                  {t(
                    '💡 ملاحظة: إذا تخطيت، يمكنك إيجاد الدليل الشامل والدليل السريع في قسم المساعدة داخل الإعدادات في أي وقت.',
                    '💡 Note: If you skip, you can find the comprehensive guide and quick tips in the Help section inside Settings anytime.',
                    '💡 Note: Si vous passez, vous trouverez le guide complet et les conseils rapides dans la section Aide des Paramètres à tout moment.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <style>{`
            @keyframes apasWelcomeSpin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default WelcomeDialog;
