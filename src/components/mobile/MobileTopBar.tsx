import React from 'react';
import { Bot, Aperture, Video, BookOpen, Mic, Calculator } from 'lucide-react';
import ApasLogo from '@/components/apas/ApasLogo';

interface MobileTopBarProps {
  lang: string;
  onOpenAI: () => void;
  onOpenVision: () => void;
  onOpenVideo: () => void;
  onOpenSubject: () => void;
  onOpenVoice: () => void;
  onOpenCalculations?: () => void;
}

const MobileTopBar: React.FC<MobileTopBarProps> = ({ lang, onOpenAI, onOpenVision, onOpenVideo, onOpenSubject, onOpenVoice, onOpenCalculations }) => {
  return (
    <header className="mobile-top-bar fixed top-0 left-0 right-0 z-[55] md:hidden">
      {/* Glass background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-b border-border/50" />
      
      {/* Safe area padding for notched phones */}
      <div className="relative flex items-center justify-between px-4 h-14 pt-[env(safe-area-inset-top)]">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <ApasLogo size={28} />
          <span className="text-base font-bold tracking-wider bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
            APAS
          </span>
          <span className="text-[9px] font-mono text-muted-foreground/60 border border-border/40 rounded px-1 py-0.5">
            v1.1
          </span>
        </div>

        {/* Center - APAS Calculations button */}
        {onOpenCalculations && (
          <button
            onClick={onOpenCalculations}
            className="relative px-3 py-1.5 rounded-xl bg-gradient-to-r from-primary/15 via-primary/10 to-primary/15 border border-primary/30 text-primary hover:bg-primary/20 active:scale-95 transition-all duration-300 touch-manipulation flex items-center gap-1.5 group"
            title={lang === 'ar' ? 'حسابات APAS' : 'APAS Calculations'}
          >
            <Calculator className="w-3.5 h-3.5 group-hover:animate-spin" style={{ animationDuration: '2s' }} />
            <span className="text-[10px] font-bold tracking-wide">
              {lang === 'ar' ? 'حسابات APAS' : lang === 'fr' ? 'Calculs APAS' : 'APAS Calc'}
            </span>
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          </button>
        )}

        {/* Right actions - APAS buttons (icon-only) + AI bot (golden) */}
        <div className="flex items-center gap-1">
          {/* APAS Vision */}
          <button
            onClick={onOpenVision}
            className="p-2 rounded-lg bg-secondary/50 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95 transition-all duration-200 touch-manipulation"
            title="APAS Vision"
          >
            <Aperture className="w-4 h-4" />
          </button>

          {/* APAS Video */}
          <button
            onClick={onOpenVideo}
            className="p-2 rounded-lg bg-secondary/50 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95 transition-all duration-200 touch-manipulation"
            title="APAS Video"
          >
            <Video className="w-4 h-4" />
          </button>

          {/* APAS Subject */}
          <button
            onClick={onOpenSubject}
            className="p-2 rounded-lg bg-secondary/50 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95 transition-all duration-200 touch-manipulation"
            title="APAS Subject"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {/* APAS Voice/Sound */}
          <button
            onClick={onOpenVoice}
            className="p-2 rounded-lg bg-secondary/50 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95 transition-all duration-200 touch-manipulation"
            title="APAS Sound"
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* AI Assistant - Golden/Navy theme */}
          <button
            onClick={onOpenAI}
            className="relative p-2.5 rounded-xl bg-gradient-to-br from-amber-500/15 to-primary/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 active:scale-95 transition-all duration-200 touch-manipulation"
            title={lang === 'ar' ? 'مساعد الذكاء الاصطناعي' : 'AI Assistant'}
          >
            <Bot className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default MobileTopBar;
