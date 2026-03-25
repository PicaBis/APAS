import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { BookOpen, Lightbulb, X } from 'lucide-react';

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
    <Dialog open={open} onOpenChange={(v) => { if (!v) onSkip(); }}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden border-border bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-primary/10 to-transparent text-center">
          <button onClick={onSkip} className="absolute top-3 end-3 p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            {t('مرحبا بك في APAS', 'Welcome to APAS', 'Bienvenue dans APAS')}
          </h2>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {t(
              'هل تريد التعرف على التطبيق وكيفية استخدامه؟ يمكنك فتح الدليل الشامل أو البدء بالدليل السريع.',
              'Would you like to learn how the app works? You can open the comprehensive guide or start with quick tips.',
              'Voulez-vous apprendre comment fonctionne l\'application? Ouvrez le guide complet ou commencez avec les conseils rapides.'
            )}
          </p>
        </div>

        {/* Buttons */}
        <div className="px-6 pb-5 pt-2 space-y-2.5">
          <button
            onClick={onOpenGuide}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200 group"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <BookOpen className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="text-start flex-1">
              <p className="text-sm font-semibold text-foreground">{t('فتح الدليل الشامل', 'Open Comprehensive Guide', 'Ouvrir le Guide Complet')}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t('تعرف على كل أقسام التطبيق بالتفصيل', 'Learn about every section in detail', 'Apprenez chaque section en detail')}</p>
            </div>
          </button>

          <button
            onClick={onStartQuickTips}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50 transition-all duration-200 group"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
              <Lightbulb className="w-4.5 h-4.5 text-amber-500" />
            </div>
            <div className="text-start flex-1">
              <p className="text-sm font-semibold text-foreground">{t('الدليل السريع', 'Quick Guide', 'Guide Rapide')}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t('نصائح سريعة للبدء فورا', 'Quick tips to get started right away', 'Conseils rapides pour commencer immediatement')}</p>
            </div>
          </button>

          <button
            onClick={onSkip}
            className="w-full px-4 py-2.5 rounded-xl border border-border hover:bg-secondary hover:border-foreground/20 transition-all duration-200 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {t('تخطي', 'Skip', 'Passer')}
          </button>
        </div>

        {/* Note */}
        <div className="mx-6 mb-4 px-3.5 py-2.5 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-[11px] text-foreground/80 text-center leading-relaxed font-medium">
            {t(
              '💡 ملاحظة: إذا تخطيت، يمكنك إيجاد الدليل الشامل والدليل السريع في قسم المساعدة داخل الإعدادات في أي وقت.',
              '💡 Note: If you skip, you can find the comprehensive guide and quick tips in the Help section inside Settings anytime.',
              '💡 Note: Si vous passez, vous trouverez le guide complet et les conseils rapides dans la section Aide des Parametres a tout moment.'
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeDialog;
