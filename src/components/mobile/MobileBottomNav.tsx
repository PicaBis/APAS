import React from 'react';
import { Home, Activity, BarChart3, Bookmark, Settings } from 'lucide-react';

type Tab = 'home' | 'simulation' | 'analysis' | 'saved' | 'settings';

interface MobileBottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  lang: string;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, onTabChange, lang }) => {
  const isRTL = lang === 'ar';

  const tabs: { id: Tab; icon: React.FC<{ className?: string }>; labelAr: string; labelEn: string; labelFr: string }[] = [
    { id: 'home', icon: Home, labelAr: 'الرئيسية', labelEn: 'Home', labelFr: 'Accueil' },
    { id: 'simulation', icon: Activity, labelAr: 'المحاكاة', labelEn: 'Simulate', labelFr: 'Simuler' },
    { id: 'analysis', icon: BarChart3, labelAr: 'التحليل', labelEn: 'Analysis', labelFr: 'Analyse' },
    { id: 'saved', icon: Bookmark, labelAr: 'المحفوظات', labelEn: 'Saved', labelFr: 'Sauvé' },
    { id: 'settings', icon: Settings, labelAr: 'إعدادات', labelEn: 'Settings', labelFr: 'Réglages' },
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
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-border/50" />
      
      {/* Safe area padding for notched phones */}
      <div className="relative flex items-center justify-around px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-300 min-w-[3.5rem] touch-manipulation ${
                isActive
                  ? 'text-primary scale-105'
                  : 'text-muted-foreground active:scale-95'
              }`}
            >
              <div className={`relative p-1 rounded-lg transition-all duration-300 ${isActive ? 'bg-primary/15' : ''}`}>
                <Icon className={`w-5 h-5 transition-all duration-300 ${isActive ? 'text-primary' : ''}`} />
                {isActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </div>
              <span className={`text-[10px] font-medium transition-all duration-300 ${isActive ? 'text-primary font-semibold' : ''}`}>
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
