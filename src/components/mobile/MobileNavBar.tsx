import React from 'react';
import { Home, Crosshair, Eye, Mic, Lightbulb } from 'lucide-react';

export type MobileTab = 'home' | 'simulator' | 'vision' | 'assistant' | 'recommendations';

interface Props {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  lang: string;
}

const TABS: { id: MobileTab; icon: React.FC<{ className?: string }>; labelAr: string; labelEn: string; labelFr: string }[] = [
  { id: 'home', icon: Home, labelAr: 'الرئيسية', labelEn: 'Home', labelFr: 'Accueil' },
  { id: 'simulator', icon: Crosshair, labelAr: 'المحاكاة', labelEn: 'Simulate', labelFr: 'Simuler' },
  { id: 'vision', icon: Eye, labelAr: 'الرؤية', labelEn: 'Vision', labelFr: 'Vision' },
  { id: 'assistant', icon: Mic, labelAr: 'المساعد', labelEn: 'Assistant', labelFr: 'Assistant' },
  { id: 'recommendations', icon: Lightbulb, labelAr: 'توصيات', labelEn: 'Tips', labelFr: 'Conseils' },
];

export default function MobileNavBar({ activeTab, onTabChange, lang }: Props) {
  const getLabel = (tab: typeof TABS[number]) => {
    if (lang === 'ar') return tab.labelAr;
    if (lang === 'fr') return tab.labelFr;
    return tab.labelEn;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/60 shadow-[0_-2px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-2px_20px_rgba(0,0,0,0.3)] safe-area-bottom">
      <div className="flex items-center justify-around px-1 h-16">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[56px] ${
                isActive
                  ? 'text-primary scale-105'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className={`relative p-1.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-primary/15' : ''}`}>
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                {isActive && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className={`text-[10px] font-medium leading-tight ${isActive ? 'text-primary' : ''}`}>
                {getLabel(tab)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
