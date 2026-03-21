import React from 'react';
import AnimatedValue from '@/components/apas/AnimatedValue';
import CollapsibleSection from '@/components/apas/CollapsibleSection';
import type { PredictionResult } from '@/utils/physics';

interface ResultsSectionProps {
  lang: string;
  T: Record<string, string>;
  prediction: PredictionResult;
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
  showPathInfo: boolean;
  onTogglePathInfo: () => void;
}

const ResultsSection: React.FC<ResultsSectionProps> = ({
  lang, T, prediction, velocity, angle, height, gravity,
  showPathInfo, onTogglePathInfo,
}) => {
  return (
    <div data-tour="below-canvas" className="relative rounded-xl p-[2px] overflow-visible backdrop-blur-sm animate-smooth-reveal ai-predictions-border">
      <div className="relative rounded-xl p-4 bg-gradient-to-br from-card/80 to-primary/5 shadow-lg shadow-primary/5 overflow-hidden backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/3 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            {/* Live online dot replacing arrow icon */}
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <h3 className="text-sm font-bold text-foreground tracking-wide">{T.aiPredictions}</h3>
            <span className="text-[10px] font-mono font-semibold text-green-500 animate-pulse">online</span>
            <div className="flex-1 h-px bg-gradient-to-r from-primary/30 to-transparent" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 stagger-children">
            {[
              { label: T.range, value: prediction.range, unit: T.u_m_s, icon: '📏' },
              { label: T.maxHeight, value: prediction.maxHeight, unit: T.u_m_s, icon: '📐' },
              { label: T.flightTime, value: prediction.timeOfFlight, unit: T.u_s, icon: '⏱️' },
              { label: T.finalVel, value: prediction.finalVelocity, unit: T.u_ms, icon: '💨' },
            ].map(({ label, value, unit, icon }) => (
              <div key={label} className="text-center p-3 bg-card/60 rounded-xl border border-border/30 transition-all duration-300 hover:bg-card/80 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 group">
                <div className="text-base mb-1 transition-transform duration-300 group-hover:scale-110">{icon}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-medium">{label}</div>
                <AnimatedValue value={value} className="text-lg font-bold font-mono text-primary" />
                <div className="text-[9px] text-muted-foreground mt-0.5">{unit}</div>
              </div>
            ))}
          </div>

          {/* Advanced Path Information section with spacing adjusted downward */}
          <div className="mt-4">
            <CollapsibleSection
              title={lang === 'ar' ? '📋 معلومات المسار المتقدمة — Advanced' : lang === 'fr' ? '📋 Informations de Trajectoire Avancées — Advanced' : '📋 Advanced Path Information'}
              icon="📋"
              open={showPathInfo}
              toggle={onTogglePathInfo}
              miniPreview={
                <>
                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">v₀={velocity.toFixed(0)}</span>
                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">θ={angle.toFixed(0)}°</span>
                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">R={prediction.range.toFixed(1)}</span>
                </>
              }
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { label: lang === 'ar' ? 'السرعة الابتدائية' : lang === 'fr' ? 'Vitesse Initiale' : 'Initial Velocity', val: `${velocity.toFixed(2)} ${T.u_ms}`, icon: '🚀' },
                  { label: lang === 'ar' ? 'زاوية الإطلاق' : lang === 'fr' ? 'Angle de Tir' : 'Launch Angle', val: `${angle.toFixed(1)}°`, icon: '📐' },
                  { label: lang === 'ar' ? 'الارتفاع الابتدائي' : lang === 'fr' ? 'Hauteur Initiale' : 'Initial Height', val: `${height.toFixed(2)} ${T.u_m_s}`, icon: '📏' },
                  { label: lang === 'ar' ? 'الجاذبية' : lang === 'fr' ? 'Gravité' : 'Gravity', val: `${gravity.toFixed(2)} ${T.u_ms2}`, icon: '🌍' },
                  { label: lang === 'ar' ? 'نقطة السقوط' : lang === 'fr' ? 'Point d\'Impact' : 'Impact Point', val: `X=${prediction.range.toFixed(2)} ${T.u_m_s}`, icon: '🎯' },
                  { label: lang === 'ar' ? 'زاوية السقوط' : lang === 'fr' ? 'Angle d\'Impact' : 'Impact Angle', val: `${prediction.impactAngle.toFixed(1)}°`, icon: '📉' },
                  { label: lang === 'ar' ? 'الإزاحة الكلية' : lang === 'fr' ? 'Déplacement Total' : 'Total Displacement', val: `${prediction.totalDisplacement.toFixed(2)} ${T.u_m_s}`, icon: '↔️' },
                  { label: lang === 'ar' ? 'متوسط السرعة' : lang === 'fr' ? 'Vitesse Moyenne' : 'Avg Speed', val: `${prediction.averageSpeed.toFixed(2)} ${T.u_ms}`, icon: '⚡' },
                  { label: lang === 'ar' ? 'الشغل المبذول' : lang === 'fr' ? 'Travail Effectué' : 'Work Done', val: `${prediction.workDone.toFixed(2)} ${T.u_J}`, icon: '⚙️' },
                ].map(({ label, val, icon }) => (
                  <div key={label} className="bg-background/60 rounded-md p-2 text-center border border-border/30">
                    <div className="text-xs mb-0.5">{icon}</div>
                    <div className="text-[9px] text-muted-foreground mb-0.5">{label}</div>
                    <div className="text-xs font-semibold font-mono text-foreground">{val}</div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </div>

      {/* Online indicator badge next to animated border */}
      <div className="absolute -top-2 right-4 flex items-center gap-1.5 bg-background/95 backdrop-blur-sm rounded-full px-2.5 py-0.5 border border-green-500/30 shadow-sm z-20">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <span className="text-[10px] font-mono font-semibold text-green-500 online-text-pulse">online</span>
      </div>

      {/* Animated border and online text styles */}
      <style>{`
        .ai-predictions-border {
          position: relative;
          background: transparent;
        }
        .ai-predictions-border::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 0.75rem;
          padding: 2px;
          background: conic-gradient(
            from var(--ai-border-angle, 0deg),
            transparent 0%,
            hsl(var(--primary)) 10%,
            hsl(142 76% 46%) 20%,
            hsl(var(--primary)) 30%,
            transparent 40%,
            transparent 100%
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: ai-border-rotate 3s linear infinite;
          pointer-events: none;
          z-index: 10;
        }
        @keyframes ai-border-rotate {
          0% { --ai-border-angle: 0deg; }
          100% { --ai-border-angle: 360deg; }
        }
        @property --ai-border-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        .online-text-pulse {
          animation: onlineTextPulse 2s ease-in-out infinite;
        }
        @keyframes onlineTextPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default React.memo(ResultsSection);
