import React from 'react';
import { Lock } from 'lucide-react';
import AnimatedValue from '@/components/apas/AnimatedValue';
import CollapsibleSection from '@/components/apas/CollapsibleSection';
import type { PredictionResult } from '@/utils/physics';
import { useAuth } from '@/contexts/AuthContext';

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
  hasModelAnalysis?: boolean;
}

const ResultsSection: React.FC<ResultsSectionProps> = ({
  lang, T, prediction, velocity, angle, height, gravity,
  showPathInfo, onTogglePathInfo, hasModelAnalysis = false,
}) => {
  const { isGuest, user } = useAuth();
  // Predictions are only shown after an actual AI analysis (Vision/Video/Subject/Voice)
  // Even logged-in users or developers see the locked state until they analyze something
  const predictionsLocked = !hasModelAnalysis;

  const teacherTips = lang === 'ar' ? [
    "💡 هل تعلم؟ أقصى مدى أفقي يتحقق عند زاوية 45 درجة (في غياب مقاومة الهواء).",
    "💡 نصيحة: عند الذروة، تكون السرعة الرأسية دائماً صفراً، بينما تبقى السرعة الأفقية ثابتة.",
    "💡 تذكر: كتلة الجسم لا تؤثر على مساره في الفراغ، لكنها تصبح حاسمة عند وجود مقاومة الهواء."
  ] : lang === 'fr' ? [
    "💡 Le saviez-vous ? La portée maximale est atteinte à 45° (en l'absence de résistance de l'air).",
    "💡 Conseil : Au sommet, la vitesse verticale est nulle, tandis que la vitesse horizontale reste constante.",
    "💡 Rappel : La masse n'affecte pas la trajectoire dans le vide, mais elle est cruciale avec la résistance de l'air."
  ] : [
    "💡 Did you know? Maximum range is achieved at 45° (neglecting air resistance).",
    "💡 Tip: At the peak, vertical velocity is zero, while horizontal velocity remains constant.",
    "💡 Remember: Mass doesn't affect trajectory in a vacuum, but it's crucial with air resistance."
  ];

  const formulas = {
    range: "R = (v₀² sin 2θ) / g",
    maxHeight: "H = (v₀² sin² θ) / 2g",
    flightTime: "t = (2v₀ sin θ) / g",
    finalVel: "v_f = √(vₓ² + v_y²)"
  };

  if (predictionsLocked) {
    return (
      <div data-tour="below-canvas" className="relative rounded-xl p-[2px] overflow-visible backdrop-blur-sm">
        <div className="relative rounded-xl p-6 bg-gradient-to-br from-card/80 to-muted/20 shadow-lg border border-border/40 overflow-hidden backdrop-blur-sm">
          <div className="flex flex-col items-center justify-center gap-3 py-4">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
              <Lock className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-bold text-foreground">{T.aiPredictions}</h3>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              {lang === 'ar' ? 'قم بتحليل صورة أو فيديو أو تمرين أو أمر صوتي لتفعيل التوقعات' : lang === 'fr' ? 'Analysez une image, vidéo, exercice ou commande vocale pour activer les prédictions' : 'Analyze an image, video, exercise or voice command to activate predictions'}
            </p>
          </div>
        </div>
      </div>
    );
  }

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
            <div className="flex-1 h-px bg-gradient-to-r from-primary/30 to-transparent" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 stagger-children">
             {[
              { label: T.range, value: prediction?.range ?? 0, unit: T.u_m_s, icon: '📏', color: 'from-blue-500/15 to-blue-600/5 border-blue-500/30 hover:border-blue-500/50', iconBg: 'bg-blue-500/15', textColor: 'text-blue-600 dark:text-blue-400', formula: formulas.range },
              { label: T.maxHeight, value: prediction?.maxHeight ?? 0, unit: T.u_m_s, icon: '📐', color: 'from-emerald-500/15 to-emerald-600/5 border-emerald-500/30 hover:border-emerald-500/50', iconBg: 'bg-emerald-500/15', textColor: 'text-emerald-600 dark:text-emerald-400', formula: formulas.maxHeight },
              { label: T.flightTime, value: prediction?.timeOfFlight ?? 0, unit: T.u_s, icon: '⏱️', color: 'from-amber-500/15 to-amber-600/5 border-amber-500/30 hover:border-amber-500/50', iconBg: 'bg-amber-500/15', textColor: 'text-amber-600 dark:text-amber-400', formula: formulas.flightTime },
              { label: T.finalVel, value: prediction?.finalVelocity ?? 0, unit: T.u_ms, icon: '💨', color: 'from-purple-500/15 to-purple-600/5 border-purple-500/30 hover:border-purple-500/50', iconBg: 'bg-purple-500/15', textColor: 'text-purple-600 dark:text-purple-400', formula: formulas.finalVel },
            ].map(({ label, value, unit, icon, color, iconBg, textColor, formula }) => (
              <div key={label} className={`text-center p-3.5 bg-gradient-to-br ${color} rounded-xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group relative`}>
                <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center mx-auto mb-2 transition-transform duration-300 group-hover:scale-110`}>
                  <span className="text-lg">{icon}</span>
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">{label}</div>
                <AnimatedValue value={value} className={`text-xl font-bold font-mono ${textColor}`} />
                <div className="text-[10px] text-muted-foreground mt-0.5 font-medium mb-2">{unit}</div>
                <div className="text-[9px] font-mono opacity-60 group-hover:opacity-100 transition-opacity bg-background/40 py-0.5 px-1.5 rounded-md inline-block">
                  {formula}
                </div>
              </div>
            ))}
          </div>

          {/* Teacher Tip Bar */}
          <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10 flex items-center gap-3 animate-pulse-subtle">
            <span className="text-lg">👨‍🏫</span>
            <p className="text-[11px] font-medium text-primary/80 italic leading-relaxed">
              {teacherTips[Math.floor(Date.now() / 10000) % teacherTips.length]}
            </p>
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
                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">v₀={(velocity ?? 0).toFixed(0)}</span>
                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">θ={(angle ?? 0).toFixed(0)}°</span>
                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">R={(prediction?.range ?? 0).toFixed(1)}</span>
                </>
              }
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { label: lang === 'ar' ? 'السرعة الابتدائية' : lang === 'fr' ? 'Vitesse Initiale' : 'Initial Velocity', val: `${(velocity ?? 0).toFixed(2)} ${T.u_ms}`, icon: '🚀' },
                  { label: lang === 'ar' ? 'زاوية الإطلاق' : lang === 'fr' ? 'Angle de Tir' : 'Launch Angle', val: `${(angle ?? 0).toFixed(1)}°`, icon: '📐' },
                  { label: lang === 'ar' ? 'الارتفاع الابتدائي' : lang === 'fr' ? 'Hauteur Initiale' : 'Initial Height', val: `${(height ?? 0).toFixed(2)} ${T.u_m_s}`, icon: '📏' },
                  { label: lang === 'ar' ? 'الجاذبية' : lang === 'fr' ? 'Gravité' : 'Gravity', val: `${(gravity ?? 9.81).toFixed(2)} ${T.u_ms2}`, icon: '🌍' },
                  { label: lang === 'ar' ? 'نقطة السقوط' : lang === 'fr' ? 'Point d\'Impact' : 'Impact Point', val: `X={(prediction?.range ?? 0).toFixed(2)} ${T.u_m_s}`, icon: '🎯' },
                  { label: lang === 'ar' ? 'زاوية السقوط' : lang === 'fr' ? 'Angle d\'Impact' : 'Impact Angle', val: `${(prediction?.impactAngle ?? 0).toFixed(1)}°`, icon: '📉' },
                  { label: lang === 'ar' ? 'الإزاحة الكلية' : lang === 'fr' ? 'Déplacement Total' : 'Total Displacement', val: `${(prediction?.totalDisplacement ?? 0).toFixed(2)} ${T.u_m_s}`, icon: '↔️' },
                  { label: lang === 'ar' ? 'متوسط السرعة' : lang === 'fr' ? 'Vitesse Moyenne' : 'Avg Speed', val: `${(prediction?.averageSpeed ?? 0).toFixed(2)} ${T.u_ms}`, icon: '⚡' },
                  { label: lang === 'ar' ? 'الشغل المبذول' : lang === 'fr' ? 'Travail Effectué' : 'Work Done', val: `${(prediction?.workDone ?? 0).toFixed(2)} ${T.u_J}`, icon: '⚙️' },
                ].map(({ label, val, icon }) => (
                  <div key={label} className="bg-background/60 rounded-lg p-3 text-center border border-border/30">
                    <div className="text-sm mb-1">{icon}</div>
                    <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
                    <div className="text-sm font-bold font-mono text-foreground">{val}</div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </div>


      {/* Animated border styles */}
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
      `}</style>
    </div>
  );
};

export default React.memo(ResultsSection);
