import React from 'react';
import { Bot, Aperture, Video, BookOpen, Mic, Settings, Lock, Calculator } from 'lucide-react';
import ApasLogo from '@/components/apas/ApasLogo';

interface MobileTopBarProps {
  lang: string;
  onOpenAI: () => void;
  onOpenVision: () => void;
  onOpenVideo: () => void;
  onOpenSubject: () => void;
  onOpenVoice: () => void;
  onOpenCalculations?: () => void;
  onOpenSettings?: () => void;
  hasAnalyzedMedia?: boolean;
}

const MobileTopBar: React.FC<MobileTopBarProps> = ({ lang, onOpenAI, onOpenVision, onOpenVideo, onOpenSubject, onOpenVoice, onOpenCalculations, onOpenSettings, hasAnalyzedMedia }) => {
  const isCalcActive = !!hasAnalyzedMedia;

  return (
    <header className="mobile-top-bar fixed top-0 left-0 right-0 z-[55] md:hidden">
      {/* Glass background */}
      <div className="absolute inset-0 bg-background/85 backdrop-blur-xl border-b border-border/40" />
      
      {/* Safe area padding for notched phones */}
      <div className="relative flex items-center justify-between px-2 h-14 pt-[env(safe-area-inset-top)]" dir="ltr">
        {/* Logo */}
        <div className="flex items-center gap-1.5 shrink-0">
          <ApasLogo size={24} />
          <span className="text-sm font-bold tracking-wider bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
            APAS
          </span>
        </div>

        {/* APAS Calculations button - with green online indicator */}
        <button
          onClick={() => { if (isCalcActive && onOpenCalculations) onOpenCalculations(); }}
          disabled={!isCalcActive}
          className={`relative px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 group transition-all duration-300 touch-manipulation shrink-0 ${
            isCalcActive
              ? 'bg-gradient-to-r from-primary/15 via-primary/10 to-primary/15 border border-primary/30 text-primary hover:bg-primary/20 active:scale-95'
              : 'bg-secondary/40 border border-border/30 text-muted-foreground/50 cursor-not-allowed'
          }`}
          title={isCalcActive 
            ? (lang === 'ar' ? 'حسابات APAS' : 'APAS Calculations')
            : (lang === 'ar' ? 'حلّل صورة أو فيديو أولاً' : 'Analyze an image or video first')
          }
        >
          {isCalcActive ? (
            <Calculator className="w-3.5 h-3.5 group-hover:animate-spin" style={{ animationDuration: '2s' }} />
          ) : (
            <Lock className="w-3 h-3" />
          )}
          <span className="text-[9px] font-bold tracking-wide">
            {lang === 'ar' ? 'حسابات APAS' : lang === 'fr' ? 'Calculs APAS' : 'APAS Calc'}
          </span>
          {/* Green online indicator - only when active */}
          {isCalcActive && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
          )}
        </button>

        {/* Action buttons - Order (LTR): Settings, AI, Voice, Subject, Video, Vision */}
        <div className="flex items-center gap-0.5" dir="ltr">
          {/* Settings (Gear) - always first on the left */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg bg-secondary/50 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95 transition-all duration-200 touch-manipulation"
              title={lang === 'ar' ? 'الإعدادات' : 'Settings'}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}

          {/* AI Assistant */}
          <button
            onClick={onOpenAI}
            className="relative p-1.5 rounded-lg bg-gradient-to-br from-amber-500/15 to-primary/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 active:scale-95 transition-all duration-200 touch-manipulation"
            title={lang === 'ar' ? 'المساعد الذكي' : 'AI Assistant'}
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          </button>

          {/* Voice Recording */}
          <button
            onClick={onOpenVoice}
            className="p-1.5 rounded-lg bg-secondary/50 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95 transition-all duration-200 touch-manipulation"
            title={lang === 'ar' ? 'تسجيل الصوت' : 'Voice Recording'}
          >
            <Mic className="w-3.5 h-3.5" />
          </button>

          {/* Subject Reading */}
          <button
            onClick={onOpenSubject}
            className="p-1.5 rounded-lg bg-secondary/50 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95 transition-all duration-200 touch-manipulation"
            title={lang === 'ar' ? 'قراءة تمرين' : 'Read Exercise'}
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>

          {/* Video Recording */}
          <button
            onClick={onOpenVideo}
            className="p-1.5 rounded-lg bg-secondary/50 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95 transition-all duration-200 touch-manipulation"
            title={lang === 'ar' ? 'تسجيل الفيديو' : 'Video Recording'}
          >
            <Video className="w-3.5 h-3.5" />
          </button>

          {/* Image Capture (Vision) */}
          <button
            onClick={onOpenVision}
            className="p-1.5 rounded-lg bg-secondary/50 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95 transition-all duration-200 touch-manipulation"
            title={lang === 'ar' ? 'تسجيل الصورة' : 'Image Capture'}
          >
            <Aperture className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default MobileTopBar;
