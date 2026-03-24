import React from 'react';
import { Settings, Bot, Share2 } from 'lucide-react';
import ApasLogo from '@/components/apas/ApasLogo';

interface MobileTopBarProps {
  lang: string;
  onOpenSettings: () => void;
  onOpenAI: () => void;
}

const MobileTopBar: React.FC<MobileTopBarProps> = ({ lang, onOpenSettings, onOpenAI }) => {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'APAS',
          text: lang === 'ar' ? 'نظام تحليل المقذوفات بالذكاء الاصطناعي' : 'AI Projectile Analysis System',
          url: window.location.href,
        });
      } catch { /* user cancelled */ }
    }
  };

  return (
    <header className="mobile-top-bar fixed top-0 left-0 right-0 z-[55] md:hidden">
      {/* Glass background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-b border-border/40" />
      
      {/* Safe area padding for notched phones */}
      <div className="relative flex items-center justify-between px-3 h-12 pt-[env(safe-area-inset-top)]">
        {/* Logo */}
        <div className="flex items-center gap-1.5">
          <ApasLogo size={24} />
          <span className="text-sm font-bold tracking-wider bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
            APAS
          </span>
          <span className="text-[8px] font-mono text-muted-foreground/50 border border-border/30 rounded px-0.5 py-px">
            v2.0
          </span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleShare}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground active:scale-95 transition-all duration-150 touch-manipulation"
            title={lang === 'ar' ? 'مشاركة' : 'Share'}
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenAI}
            className="relative p-2 rounded-lg bg-gradient-to-br from-purple-500/10 to-primary/10 border border-purple-500/20 text-purple-500 active:scale-95 transition-all duration-150 touch-manipulation"
            title={lang === 'ar' ? 'مساعد الذكاء الاصطناعي' : 'AI Assistant'}
          >
            <Bot className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-secondary/40 border border-border/30 text-muted-foreground hover:text-foreground active:scale-95 transition-all duration-150 touch-manipulation"
            title={lang === 'ar' ? 'الإعدادات' : 'Settings'}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default MobileTopBar;
