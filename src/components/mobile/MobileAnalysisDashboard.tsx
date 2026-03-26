import React from 'react';
import { Ruler, ArrowUp, Clock, Gauge, Crosshair, Activity } from 'lucide-react';

interface Prediction {
  range: number;
  maxHeight: number;
  timeOfFlight: number;
  finalVelocity: number;
  impactAngle: number;
  rangeError: number;
  maxHeightError: number;
  timeError: number;
}

interface MobileAnalysisDashboardProps {
  prediction: Prediction | null;
  velocity: number;
  angle: number;
  lang: string;
}

const MobileAnalysisDashboard: React.FC<MobileAnalysisDashboardProps> = ({
  prediction,
  velocity,
  angle,
  lang,
}) => {
  if (!prediction) return null;

  const vx = velocity * Math.cos(angle * Math.PI / 180);
  const vy = velocity * Math.sin(angle * Math.PI / 180);

  const cards = [
    {
      icon: <Ruler className="w-4 h-4" />,
      label: lang === 'ar' ? 'المدى' : lang === 'fr' ? 'Portée' : 'Range',
      value: prediction.range.toFixed(2),
      unit: 'm',
      color: 'text-blue-500',
      bg: 'from-blue-500/15 to-blue-500/5',
      border: 'border-blue-500/20',
    },
    {
      icon: <ArrowUp className="w-4 h-4" />,
      label: lang === 'ar' ? 'أقصى ارتفاع' : lang === 'fr' ? 'Hauteur Max' : 'Max Height',
      value: prediction.maxHeight.toFixed(2),
      unit: 'm',
      color: 'text-green-500',
      bg: 'from-green-500/15 to-green-500/5',
      border: 'border-green-500/20',
    },
    {
      icon: <Clock className="w-4 h-4" />,
      label: lang === 'ar' ? 'زمن الطيران' : lang === 'fr' ? 'Temps de Vol' : 'Flight Time',
      value: prediction.timeOfFlight.toFixed(2),
      unit: 's',
      color: 'text-amber-500',
      bg: 'from-amber-500/15 to-amber-500/5',
      border: 'border-amber-500/20',
    },
    {
      icon: <Gauge className="w-4 h-4" />,
      label: lang === 'ar' ? 'السرعة النهائية' : lang === 'fr' ? 'Vitesse Finale' : 'Final Velocity',
      value: prediction.finalVelocity.toFixed(2),
      unit: 'm/s',
      color: 'text-purple-500',
      bg: 'from-purple-500/15 to-purple-500/5',
      border: 'border-purple-500/20',
    },
    {
      icon: <Crosshair className="w-4 h-4" />,
      label: lang === 'ar' ? 'زاوية السقوط' : lang === 'fr' ? 'Angle Impact' : 'Impact Angle',
      value: prediction.impactAngle.toFixed(1),
      unit: '°',
      color: 'text-red-500',
      bg: 'from-red-500/15 to-red-500/5',
      border: 'border-red-500/20',
    },
    {
      icon: <Activity className="w-4 h-4" />,
      label: lang === 'ar' ? 'مكونات السرعة' : lang === 'fr' ? 'Composantes' : 'Velocity Components',
      value: `${vx.toFixed(1)} / ${vy.toFixed(1)}`,
      unit: 'Vx/Vy',
      color: 'text-indigo-500',
      bg: 'from-indigo-500/15 to-indigo-500/5',
      border: 'border-indigo-500/20',
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2 px-1">
        <Activity className="w-4 h-4 text-primary" />
        {lang === 'ar' ? 'لوحة التحليل' : lang === 'fr' ? 'Tableau d\'Analyse' : 'Analysis Dashboard'}
      </h3>
      <div className="grid grid-cols-2 gap-2.5">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`bg-gradient-to-br ${card.bg} rounded-xl p-3 border ${card.border} transition-all duration-300 hover:shadow-md active:scale-[0.98]`}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className={card.color}>{card.icon}</span>
              <span className="text-[10px] font-medium text-muted-foreground">{card.label}</span>
            </div>
            <p className={`text-lg font-bold font-mono ${card.color} leading-tight`}>{card.value}</p>
            <p className="text-[9px] font-mono text-muted-foreground mt-0.5">{card.unit}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileAnalysisDashboard;
