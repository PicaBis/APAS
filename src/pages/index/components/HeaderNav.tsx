import React, { Suspense, lazy, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Home, Filter, Shield, LogOut, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { playNav, playPageTransition } from '@/utils/sound';
import ApasLogo from '@/components/apas/ApasLogo';
import HeaderWave from '@/components/apas/HeaderWave';
import DevPrivilegesButton from '@/components/auth/DevPrivilegesButton';

const PhysicsTutor = lazy(() => import('@/components/apas/PhysicsTutor'));
const ApasRecommendations = lazy(() => import('@/components/apas/ApasRecommendations'));

interface HeaderNavProps {
  lang: string;
  T: Record<string, string>;
  isMuted: boolean;
  nightMode: boolean;
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
  prediction: { range?: number; maxHeight?: number; timeOfFlight?: number } | null;
  trajectoryData: unknown[];
  selectedIntegrationMethod: string;
  currentEnvId: string;
  isFinished: boolean;
  hasExperimentalData: boolean;
  onOpenSettings: () => void;
  onShowRestrictionOverlay: (name: string) => void;
}

const HeaderNav: React.FC<HeaderNavProps> = ({
  lang, T, isMuted, velocity, angle, height, gravity, airResistance, mass,
  prediction, trajectoryData, selectedIntegrationMethod, currentEnvId,
  isFinished, hasExperimentalData,
  onOpenSettings, onShowRestrictionOverlay,
}) => {
  const navigate = useNavigate();
  const { isGuest, isApproved, isAdmin, isRestricted, user, signOut } = useAuth();
  const canAccessRestrictedFeature = isAdmin || (user && isApproved && !isRestricted);

  return (
    <header data-tour="header" className="border-b border-border/60 bg-background/95 backdrop-blur-xl sticky top-0 z-40 shadow-md shadow-black/[0.06] dark:shadow-black/25 dark:bg-background/85 dark:border-border/40 relative">
      <HeaderWave />
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 md:px-6 h-12 sm:h-14 flex items-center justify-between gap-2" dir="ltr">
        {/* Left side: Settings for non-Arabic, Home for Arabic */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 relative flex-1">
          {lang !== 'ar' && (
            <button onClick={() => { onOpenSettings(); playNav(isMuted); }}
              className="group text-xs font-medium text-muted-foreground dark:text-foreground hover:text-primary px-2 sm:px-3 py-1.5 rounded-lg hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all duration-300 flex items-center gap-1.5"
              title="Settings">
              <Settings className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-45" />
              <span className="hidden xs:inline font-medium">
                {lang === 'fr' ? 'Paramètres' : 'Settings'}
              </span>
            </button>
          )}
          {lang === 'ar' && (
            <button onClick={() => { playPageTransition(isMuted); setTimeout(() => navigate('/home'), 120); }}
              className="group text-xs font-medium text-muted-foreground dark:text-foreground hover:text-primary px-2 sm:px-3 py-1.5 rounded-lg hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all duration-300 flex items-center gap-1.5 nav-btn-animate"
              title="الرئيسية">
              <Home className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
              <span className="hidden xs:inline font-medium">الرئيسية</span>
            </button>
          )}
        </div>

        {/* Center: APAS buttons + logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0" dir={T.dir}>
          {canAccessRestrictedFeature ? (
            <Suspense fallback={null}>
                <PhysicsTutor lang={lang} hasModel={trajectoryData.length > 0 && !!prediction} simulationContext={{
                  velocity, angle, height, gravity, airResistance, mass,
                  range: (prediction?.range ?? 0).toFixed(2),
                  maxHeight: (prediction?.maxHeight ?? 0).toFixed(2),
                  flightTime: (prediction?.timeOfFlight ?? 0).toFixed(2),
                }} />
            </Suspense>
          ) : (
            <button
              onClick={() => onShowRestrictionOverlay('Smart Assistant')}
              className="rounded-lg px-2.5 py-1.5 bg-secondary/50 text-muted-foreground cursor-not-allowed opacity-60 border border-border/50 flex items-center gap-1.5 text-[11px] font-bold"
            >
              <Filter className="w-4 h-4" />
              <span>{lang === 'ar' ? 'اسأل' : 'Ask'} APAS</span>
            </button>
          )}
          {canAccessRestrictedFeature ? (
            <Suspense fallback={null}>
              <ApasRecommendations
                lang={lang}
                muted={isMuted}
                isUnlocked={!!isFinished || hasExperimentalData}
                simulationContext={{
                  velocity, angle, height, gravity, airResistance, mass,
                  range: (prediction?.range ?? 0).toFixed(2),
                  maxHeight: (prediction?.maxHeight ?? 0).toFixed(2),
                  flightTime: (prediction?.timeOfFlight ?? 0).toFixed(2),
                  environmentId: currentEnvId,
                  integrationMethod: selectedIntegrationMethod,
                }}
              />
            </Suspense>
          ) : (
            <button
              onClick={() => onShowRestrictionOverlay('APAS Recommendations')}
              className="rounded-lg px-2.5 py-1.5 bg-secondary/50 text-muted-foreground cursor-not-allowed opacity-60 border border-border/50 flex items-center gap-1.5 text-[11px] font-bold"
            >
              <Filter className="w-4 h-4" />
              <span>{lang === 'ar' ? 'توصيات' : 'Tips'} APAS</span>
            </button>
          )}
          <span className="text-sm text-muted-foreground/80 hidden md:inline font-medium">{T.appTitleFull}</span>
          <span className="text-lg sm:text-xl font-bold tracking-wider bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent drop-shadow-sm">APAS</span>
          <ApasLogo size={28} />
        </div>

        {/* Right side: Home + Auth buttons */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 shrink-0 relative flex-1">
          <DevPrivilegesButton lang={lang} />
          {isAdmin && (
            <button onClick={() => navigate('/admin')}
              className="group text-xs font-medium text-muted-foreground dark:text-foreground hover:text-primary px-2 py-1.5 rounded-lg hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all duration-300 flex items-center gap-1.5"
              title="Admin">
              <Shield className="w-4 h-4" />
            </button>
          )}
          {user ? (
            <button onClick={async () => { await signOut(); navigate('/'); }}
              className="group text-xs font-medium text-muted-foreground dark:text-foreground hover:text-destructive px-2 py-1.5 rounded-lg hover:bg-destructive/10 transition-all duration-300 flex items-center gap-1.5"
              title="Sign Out">
              <LogOut className="w-4 h-4" />
            </button>
          ) : isGuest ? (
            <div className="flex items-center gap-1">
              <button onClick={() => navigate('/?mode=signup')}
                className="group text-xs font-medium text-primary px-2 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/15 border border-primary/20 transition-all duration-300 flex items-center gap-1"
                title={lang === 'ar' ? 'إنشاء حساب' : lang === 'fr' ? 'S\'inscrire' : 'Sign Up'}>
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-medium text-[11px]">
                  {lang === 'ar' ? 'إنشاء حساب' : lang === 'fr' ? 'S\'inscrire' : 'Sign Up'}
                </span>
              </button>
              <button onClick={() => navigate('/')}
                className="group text-xs font-medium text-muted-foreground dark:text-foreground hover:text-primary px-2 py-1.5 rounded-lg hover:bg-primary/10 transition-all duration-300 flex items-center gap-1"
                title={lang === 'ar' ? 'تسجيل الدخول' : lang === 'fr' ? 'Connexion' : 'Login'}>
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-medium text-[11px]">
                  {lang === 'ar' ? 'تسجيل الدخول' : lang === 'fr' ? 'Connexion' : 'Login'}
                </span>
              </button>
            </div>
          ) : null}
          {lang !== 'ar' && (
            <button onClick={() => { playPageTransition(isMuted); setTimeout(() => navigate('/home'), 120); }}
              className="group text-xs font-medium text-muted-foreground dark:text-foreground hover:text-primary px-2 sm:px-3 py-1.5 rounded-lg hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all duration-300 flex items-center gap-1.5 nav-btn-animate"
              title={lang === 'fr' ? 'Accueil' : 'Home'}>
              <Home className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
              <span className="hidden xs:inline font-medium">
                {lang === 'fr' ? 'Accueil' : 'Home'}
              </span>
            </button>
          )}
          {lang === 'ar' && (
            <button onClick={() => { onOpenSettings(); playNav(isMuted); }}
              className="group text-xs font-medium text-muted-foreground dark:text-foreground hover:text-primary px-2 sm:px-3 py-1.5 rounded-lg hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all duration-300 flex items-center gap-1.5"
              title="الإعدادات">
              <Settings className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-45" />
              <span className="hidden xs:inline font-medium">الإعدادات</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default HeaderNav;
