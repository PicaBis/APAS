import React from 'react';
import { Home, Activity, BarChart3, Bookmark, Wrench } from 'lucide-react';
import { playNav } from '@/utils/sound';

type Tab = 'home' | 'simulation' | 'analysis' | 'saved' | 'settings';

interface MobileBottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  lang: string;
  isMuted?: boolean;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, onTabChange, lang, isMuted = false }) => {
  const isRTL = lang === 'ar';

  const tabs: { id: Tab; icon: React.FC<{ className?: string }>; labelAr: string; labelEn: string; labelFr: string }[] = [
    { id: 'home', icon: Home, labelAr: 'الرئيسية', labelEn: 'Home', labelFr: 'Accueil' },
    { id: 'simulation', icon: Activity, labelAr: 'المحاكاة', labelEn: 'Simulate', labelFr: 'Simuler' },
    { id: 'analysis', icon: BarChart3, labelAr: 'التحليل', labelEn: 'Analysis', labelFr: 'Analyse' },
    { id: 'saved', icon: Bookmark, labelAr: 'المحفوظات', labelEn: 'Saved', labelFr: 'Sauvé' },
    { id: 'settings', icon: Wrench, labelAr: 'الأدوات', labelEn: 'Tools', labelFr: 'Outils' },
  ];

  const getLabel = (tab: typeof tabs[0]) => {
    if (lang === 'ar') return tab.labelAr;
    if (lang === 'fr') return tab.labelFr;
    return tab.labelEn;
  };

  return (
    <nav
      className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-[60] md:hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Glass background */}
      <div className="absolute inset-0 bg-background/85 backdrop-blur-xl border-t border-border/40 shadow-[0_-2px_20px_rgba(0,0,0,0.08)]" />
      
      {/* Safe area padding for notched phones */}
      <div className="relative flex items-center justify-around px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                playNav(isMuted);
                onTabChange(tab.id);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-2.5 rounded-2xl transition-all duration-300 min-w-[3.5rem] touch-manipulation select-none ${
                isActive
                  ? 'text-primary scale-[1.08]'
                  : 'text-muted-foreground active:scale-90 hover:text-foreground/70'
              }`}
            >
              <div className={`relative p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-primary/15 shadow-sm shadow-primary/10' : ''}`}>
                <Icon className={`w-[18px] h-[18px] transition-all duration-300 ${isActive ? 'text-primary drop-shadow-sm' : ''}`} />
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-primary" />
                )}
              </div>
              <span className={`text-[9px] font-medium transition-all duration-300 leading-tight ${isActive ? 'text-primary font-bold' : ''}`}>
                {getLabel(tab)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
