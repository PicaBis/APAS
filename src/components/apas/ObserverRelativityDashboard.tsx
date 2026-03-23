import React, { useState } from 'react';
import { Eye, Move, User } from 'lucide-react';
import DynamicAnalyticsDashboard from './DynamicAnalyticsDashboard';
import type { TrajectoryPoint } from '@/utils/physics';

interface ObserverRelativityDashboardProps {
  lang: string;
  trajectoryData: TrajectoryPoint[];
  currentTime: number;
  mass: number;
  gravity: number;
  frameVelocity: number;
  relativityEnabled: boolean;
  muted: boolean;
}

const ObserverRelativityDashboard: React.FC<ObserverRelativityDashboardProps> = ({
  lang, trajectoryData, currentTime, mass, gravity,
  frameVelocity, relativityEnabled, muted,
}) => {
  const [observer, setObserver] = useState<'stationary' | 'moving'>('stationary');
  const isRTL = lang === 'ar';

  return (
    <div className="space-y-3" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Observer selector */}
      <div className="border border-border/50 rounded-xl overflow-hidden bg-card/70 backdrop-blur-sm shadow-lg">
        <div className="px-4 py-2.5 border-b border-border/30 bg-gradient-to-r from-violet-500/5 to-pink-500/5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Eye className="w-4 h-4 text-violet-500" />
            {lang === 'ar' ? 'الإطار المرجعي للمراقب' : lang === 'fr' ? 'R\u00e9f\u00e9rentiel de l\'Observateur' : 'Observer Reference Frame'}
          </h3>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setObserver('stationary')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-300 border ${
                observer === 'stationary'
                  ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                  : 'bg-secondary/50 text-foreground border-border/50 hover:border-primary/30 hover:bg-primary/5'
              }`}
            >
              <User className="w-4 h-4" />
              <div className="text-start">
                <div className="font-semibold">
                  {lang === 'ar' ? 'مراقب ثابت' : lang === 'fr' ? 'Observateur Fixe' : 'Stationary Observer'}
                </div>
                <div className={`text-[9px] mt-0.5 ${observer === 'stationary' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {lang === 'ar' ? 'S - الإطار المختبري' : 'S - Lab frame'}
                </div>
              </div>
            </button>
            <button
              onClick={() => setObserver('moving')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-300 border ${
                observer === 'moving'
                  ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                  : 'bg-secondary/50 text-foreground border-border/50 hover:border-primary/30 hover:bg-primary/5'
              }`}
            >
              <Move className="w-4 h-4" />
              <div className="text-start">
                <div className="font-semibold">
                  {lang === 'ar' ? 'مراقب متحرك' : lang === 'fr' ? 'Observateur Mobile' : 'Moving Observer'}
                </div>
                <div className={`text-[9px] mt-0.5 ${observer === 'moving' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {lang === 'ar' ? `S' - بسرعة ${frameVelocity.toFixed(1)} م/ث` : `S' - at ${frameVelocity.toFixed(1)} m/s`}
                </div>
              </div>
            </button>
          </div>

          {observer === 'moving' && (
            <div className="mt-3 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <p className="text-[10px] text-amber-700 dark:text-amber-400">
                {lang === 'ar'
                  ? `يتحرك المراقب بسرعة ${frameVelocity.toFixed(1)} م/ث أفقياً. الرسوم البيانية تُظهر ما يراه هذا المراقب فعلياً.`
                  : lang === 'fr'
                  ? `L'observateur se d\u00e9place \u00e0 ${frameVelocity.toFixed(1)} m/s horizontalement. Les graphiques montrent ce que cet observateur percevrait.`
                  : `Observer moves at ${frameVelocity.toFixed(1)} m/s horizontally. Charts show what this observer would actually perceive.`}
              </p>
            </div>
          )}

          {observer === 'stationary' && (
            <div className="mt-3 p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <p className="text-[10px] text-blue-700 dark:text-blue-400">
                {lang === 'ar'
                  ? 'المراقب ثابت في الإطار المختبري. الرسوم البيانية تُظهر الحركة كما تُقاس من الأرض.'
                  : lang === 'fr'
                  ? 'L\'observateur est fixe dans le r\u00e9f\u00e9rentiel du laboratoire. Les graphiques montrent le mouvement tel que mesur\u00e9 depuis le sol.'
                  : 'Observer is stationary in the lab frame. Charts show motion as measured from the ground.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Charts that respond to observer selection */}
      <DynamicAnalyticsDashboard
        lang={lang}
        trajectoryData={trajectoryData}
        currentTime={currentTime}
        mass={mass}
        gravity={gravity}
        observerType={observer}
        frameVelocity={observer === 'moving' ? frameVelocity : 0}
      />
    </div>
  );
};

export default ObserverRelativityDashboard;
