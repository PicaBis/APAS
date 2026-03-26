import React, { useState } from 'react';
import { Bot, Aperture, Video, BookOpen, Mic, Settings, Lock, Calculator, Shield, Menu, X, Home, LogOut, LogIn, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ApasLogo from '@/components/apas/ApasLogo';
import DevPrivilegesButton from '@/components/auth/DevPrivilegesButton';
import { useAuth } from '@/contexts/AuthContext';

interface MobileTopBarProps {
  lang: string;
  onOpenAI: () => void;
  onOpenVision: () => void;
  onOpenVideo: () => void;
  onOpenSubject: () => void;
  onOpenVoice: () => void;
  onOpenCalculations?: () => void;
  onOpenSettings?: () => void;
  onOpenComprehensiveGuide?: () => void;
  hasAnalyzedMedia?: boolean;
}

const MobileTopBar: React.FC<MobileTopBarProps> = ({ lang, onOpenAI, onOpenVision, onOpenVideo, onOpenSubject, onOpenVoice, onOpenCalculations, onOpenSettings, onOpenComprehensiveGuide, hasAnalyzedMedia }) => {
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const navigate = useNavigate();
  const { isAdmin, isApproved, isRestricted, user, isGuest, signOut } = useAuth();
  const canAccessRestrictedFeature = isAdmin || (user && isApproved && !isRestricted);
  // Calculations are fully unlocked when media is analyzed; partially available with dev privileges
  const isCalcActive = !!hasAnalyzedMedia || isAdmin;

  return (
    <>
      <header className="mobile-top-bar fixed top-0 left-0 right-0 z-[55] md:hidden">
        {/* Glass background */}
        <div className="absolute inset-0 bg-background/90 backdrop-blur-xl border-b border-border/40" />
        
        {/* Safe area padding for notched phones */}
        <div className="relative flex items-center justify-between px-2 h-12 pt-[env(safe-area-inset-top)]" dir="ltr">
          {/* Logo */}
          <div className="flex items-center gap-1 shrink-0">
            <ApasLogo size={22} />
            <span className="text-xs font-bold tracking-wider bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
              APAS
            </span>
          </div>

          {/* Center: APAS Calculations button - compact */}
          <button
            onClick={() => { if (isCalcActive && onOpenCalculations) onOpenCalculations(); }}
            disabled={!isCalcActive}
            className={`relative px-2 py-1 rounded-lg flex items-center gap-1 group transition-all duration-300 touch-manipulation shrink-0 ${
              isCalcActive
                ? 'bg-gradient-to-r from-primary/15 via-primary/10 to-primary/15 border border-primary/30 text-primary active:scale-95'
                : 'bg-secondary/40 border border-border/30 text-muted-foreground/50 cursor-not-allowed'
            }`}
            title={isCalcActive 
              ? (lang === 'ar' ? 'حسابات APAS' : 'APAS Calculations')
              : (lang === 'ar' ? 'حلّل صورة أو فيديو أولاً أو فعّل صلاحيات المطور' : 'Analyze media or enable dev privileges')
            }
          >
            {isCalcActive ? (
              <Calculator className="w-3 h-3" />
            ) : (
              <Lock className="w-2.5 h-2.5" />
            )}
            <span className="text-[8px] font-bold tracking-wide">
              {lang === 'ar' ? 'حسابات' : 'Calc'}
            </span>
            {isCalcActive && (
              <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
              </span>
            )}
          </button>

          {/* Right: compact icon buttons row */}
          <div className="flex items-center gap-0.5" dir="ltr">
            {/* Dev Privileges - compact inline */}
            <DevPrivilegesButton lang={lang} />

            {/* Settings */}
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:scale-95 transition-all duration-200 touch-manipulation"
                title={lang === 'ar' ? 'الإعدادات' : 'Settings'}
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Home button */}
            <button
              onClick={() => navigate('/home')}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:scale-95 transition-all duration-200 touch-manipulation"
              title={lang === 'ar' ? 'الرئيسية' : 'Home'}
            >
              <Home className="w-3.5 h-3.5" />
            </button>

            {/* Tools menu toggle */}
            <button
              onClick={() => setShowToolsMenu(!showToolsMenu)}
              className={`p-1.5 rounded-lg active:scale-95 transition-all duration-200 touch-manipulation ${
                showToolsMenu ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              }`}
              title={lang === 'ar' ? 'الأدوات' : 'Tools'}
            >
              {showToolsMenu ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Expandable tools drawer */}
      {showToolsMenu && (
        <div className="fixed top-12 left-0 right-0 z-[54] md:hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="bg-background/95 backdrop-blur-xl border-b border-border/40 shadow-lg shadow-black/10 px-3 py-2.5 space-y-2">
            {/* AI Tools row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-wider w-full mb-0.5">
                {lang === 'ar' ? 'أدوات الذكاء الاصطناعي' : 'AI Tools'}
              </span>
              {/* AI Assistant */}
              {canAccessRestrictedFeature ? (
                <button
                  onClick={() => { onOpenAI(); setShowToolsMenu(false); }}
                  className="flex-1 min-w-[4.5rem] flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-gradient-to-br from-amber-500/15 to-primary/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 active:scale-95 transition-all touch-manipulation"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-semibold">{lang === 'ar' ? 'مساعد' : 'AI'}</span>
                </button>
              ) : (
                <button disabled className="flex-1 min-w-[4.5rem] flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-secondary/30 border border-border/30 text-muted-foreground/40 cursor-not-allowed">
                  <Lock className="w-3 h-3" />
                  <span className="text-[9px] font-semibold">{lang === 'ar' ? 'مساعد' : 'AI'}</span>
                </button>
              )}
              {/* Voice */}
              {canAccessRestrictedFeature ? (
                <button
                  onClick={() => { onOpenVoice(); setShowToolsMenu(false); }}
                  className="flex-1 min-w-[4.5rem] flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-secondary/50 border border-border/40 text-muted-foreground hover:text-foreground active:scale-95 transition-all touch-manipulation"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-semibold">{lang === 'ar' ? 'صوت' : 'Voice'}</span>
                </button>
              ) : (
                <button disabled className="flex-1 min-w-[4.5rem] flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-secondary/30 border border-border/30 text-muted-foreground/40 cursor-not-allowed">
                  <Lock className="w-3 h-3" />
                  <span className="text-[9px] font-semibold">{lang === 'ar' ? 'صوت' : 'Voice'}</span>
                </button>
              )}
              {/* Subject */}
              {canAccessRestrictedFeature ? (
                <button
                  onClick={() => { onOpenSubject(); setShowToolsMenu(false); }}
                  className="flex-1 min-w-[4.5rem] flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-secondary/50 border border-border/40 text-muted-foreground hover:text-foreground active:scale-95 transition-all touch-manipulation"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-semibold">{lang === 'ar' ? 'تمرين' : 'Exercise'}</span>
                </button>
              ) : (
                <button disabled className="flex-1 min-w-[4.5rem] flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-secondary/30 border border-border/30 text-muted-foreground/40 cursor-not-allowed">
                  <Lock className="w-3 h-3" />
                  <span className="text-[9px] font-semibold">{lang === 'ar' ? 'تمرين' : 'Exercise'}</span>
                </button>
              )}
              {/* Video */}
              {canAccessRestrictedFeature ? (
                <button
                  onClick={() => { onOpenVideo(); setShowToolsMenu(false); }}
                  className="flex-1 min-w-[4.5rem] flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-secondary/50 border border-border/40 text-muted-foreground hover:text-foreground active:scale-95 transition-all touch-manipulation"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-semibold">{lang === 'ar' ? 'فيديو' : 'Video'}</span>
                </button>
              ) : (
                <button disabled className="flex-1 min-w-[4.5rem] flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-secondary/30 border border-border/30 text-muted-foreground/40 cursor-not-allowed">
                  <Lock className="w-3 h-3" />
                  <span className="text-[9px] font-semibold">{lang === 'ar' ? 'فيديو' : 'Video'}</span>
                </button>
              )}
              {/* Vision */}
              {canAccessRestrictedFeature ? (
                <button
                  onClick={() => { onOpenVision(); setShowToolsMenu(false); }}
                  className="flex-1 min-w-[4.5rem] flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-secondary/50 border border-border/40 text-muted-foreground hover:text-foreground active:scale-95 transition-all touch-manipulation"
                >
                  <Aperture className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-semibold">{lang === 'ar' ? 'صورة' : 'Image'}</span>
                </button>
              ) : (
                <button disabled className="flex-1 min-w-[4.5rem] flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-secondary/30 border border-border/30 text-muted-foreground/40 cursor-not-allowed">
                  <Lock className="w-3 h-3" />
                  <span className="text-[9px] font-semibold">{lang === 'ar' ? 'صورة' : 'Image'}</span>
                </button>
              )}
            </div>

            {/* Auth row */}
            <div className="flex items-center gap-1.5">
              {user ? (
                <button
                  onClick={async () => { await signOut(); navigate('/'); setShowToolsMenu(false); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-95 transition-all touch-manipulation"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-semibold">{lang === 'ar' ? 'خروج' : 'Sign Out'}</span>
                </button>
              ) : isGuest ? (
                <>
                  <button
                    onClick={() => { navigate('/?mode=signup'); setShowToolsMenu(false); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 active:scale-95 transition-all touch-manipulation"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-semibold">{lang === 'ar' ? 'إنشاء حساب' : 'Sign Up'}</span>
                  </button>
                  <button
                    onClick={() => { navigate('/'); setShowToolsMenu(false); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:scale-95 transition-all touch-manipulation"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-semibold">{lang === 'ar' ? 'تسجيل دخول' : 'Login'}</span>
                  </button>
                </>
              ) : null}
            </div>
          </div>
          {/* Backdrop */}
          <div className="fixed inset-0 -z-10" onClick={() => setShowToolsMenu(false)} />
        </div>
      )}
    </>
  );
};

export default MobileTopBar;
