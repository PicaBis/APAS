import React from 'react';
import { Settings, Bot } from 'lucide-react';
import ApasLogo from '@/components/apas/ApasLogo';

interface MobileTopBarProps {
  lang: string;
  onOpenSettings: () => void;
  onOpenAI: () => void;
}

const MobileTopBar: React.FC<MobileTopBarProps> = ({ lang, onOpenSettings, onOpenAI }) => {
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

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenAI}
            className="relative p-2.5 rounded-xl bg-gradient-to-br from-purple-500/10 to-primary/10 border border-purple-500/20 text-purple-500 hover:bg-purple-500/20 active:scale-95 transition-all duration-200 touch-manipulation"
            title={lang === 'ar' ? 'مساعد الذكاء الاصطناعي' : 'AI Assistant'}
          >
            <Bot className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-xl bg-secondary/50 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95 transition-all duration-200 touch-manipulation"
            title={lang === 'ar' ? 'الإعدادات' : 'Settings'}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default MobileTopBar;
