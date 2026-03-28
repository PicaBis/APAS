import React, { useState } from 'react';
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
  airResistance, mass, showPathInfo, onTogglePathInfo, hasModelAnalysis = false,
}) => {
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // إعداد بيانات المحاكاة لإرسالها للذكاء الاصطناعي
  const simContext = {
    velocity,
    angle,
    height,
    gravity,
    airResistance,
    mass,
    range: prediction.range?.toFixed(2),
    maxHeight: prediction.maxHeight?.toFixed(2),
    flightTime: prediction.timeOfFlight?.toFixed(2),
  };

  // دالة إرسال البيانات للذكاء الاصطناعي
  const handleAIExplain = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiExplanation(null);
    try {
      const EDGE_TUTOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/physics-tutor`;
      const res = await fetch(EDGE_TUTOR_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'أنت مساعد فيزيائي ذكي. حلل نتائج المحاكاة التالية وفسرها للمستخدم بلغة بسيطة، واقترح عليه كيف يمكنه تحسين النتائج أو فهمها بشكل أفضل.' },
            { role: 'user', content: `نتائج المحاكاة: ${JSON.stringify(simContext)}` },
          ],
          lang,
        }),
      });
      if (!res.body) throw new Error('No response from AI');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let explanation = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        explanation += decoder.decode(value, { stream: true });
      }
      // محاولة استخراج النص من الاستجابة (قد تكون بصيغة SSE)
      const match = explanation.match(/"content"\s*:\s*"([^"]+)"/);
      setAiExplanation(match ? match[1] : explanation);
    } catch (err) {
      setAiError(lang === 'ar' ? 'حدث خطأ أثناء الاتصال بالذكاء الاصطناعي.' : 'AI request failed.');
    } finally {
      setAiLoading(false);
    }
  };
  const { isGuest, user } = useAuth();
  // Predictions are only shown after an actual AI analysis (Vision/Video/Subject/Voice)
  // Even logged-in users or developers see the locked state until they analyze something
  const predictionsLocked = !hasModelAnalysis;

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
              { label: T.range, value: prediction.range, unit: T.u_m_s, icon: '📏', color: 'from-blue-500/15 to-blue-600/5 border-blue-500/30 hover:border-blue-500/50', iconBg: 'bg-blue-500/15', textColor: 'text-blue-600 dark:text-blue-400' },
              { label: T.maxHeight, value: prediction.maxHeight, unit: T.u_m_s, icon: '📐', color: 'from-emerald-500/15 to-emerald-600/5 border-emerald-500/30 hover:border-emerald-500/50', iconBg: 'bg-emerald-500/15', textColor: 'text-emerald-600 dark:text-emerald-400' },
              { label: T.flightTime, value: prediction.timeOfFlight, unit: T.u_s, icon: '⏱️', color: 'from-amber-500/15 to-amber-600/5 border-amber-500/30 hover:border-amber-500/50', iconBg: 'bg-amber-500/15', textColor: 'text-amber-600 dark:text-amber-400' },
              { label: T.finalVel, value: prediction.finalVelocity, unit: T.u_ms, icon: '💨', color: 'from-purple-500/15 to-purple-600/5 border-purple-500/30 hover:border-purple-500/50', iconBg: 'bg-purple-500/15', textColor: 'text-purple-600 dark:text-purple-400' },
            ].map(({ label, value, unit, icon, color, iconBg, textColor }) => (
              <div key={label} className={`text-center p-3.5 bg-gradient-to-br ${color} rounded-xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group`}>
                <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center mx-auto mb-2 transition-transform duration-300 group-hover:scale-110`}>
                  <span className="text-lg">{icon}</span>
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">{label}</div>
                <AnimatedValue value={value} className={`text-xl font-bold font-mono ${textColor}`} />
                <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">{unit}</div>
              </div>
            ))}
          </div>

          {/* زر التحليل الذكي */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleAIExplain}
              disabled={aiLoading}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500/80 to-emerald-500/80 text-white font-bold shadow hover:from-blue-600 hover:to-emerald-600 transition-all disabled:opacity-60"
            >
              {aiLoading
                ? (lang === 'ar' ? 'جاري التحليل الذكي...' : lang === 'fr' ? 'Analyse intelligente...' : 'Smart Analysis...')
                : (lang === 'ar' ? 'تحليل ذكي للنتائج' : lang === 'fr' ? 'Analyse intelligente' : 'Smart Analysis')}
            </button>
          </div>
          {/* عرض تفسير الذكاء الاصطناعي */}
          {(aiExplanation || aiError) && (
            <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/30 text-primary-foreground animate-fade-in">
              {aiError ? (
                <span className="text-red-500 font-bold">{aiError}</span>
              ) : (
                <span style={{ whiteSpace: 'pre-line' }}>{aiExplanation}</span>
              )}
            </div>
          )}
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
