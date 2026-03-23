import React, { useState, useMemo } from 'react';
import { Bot, X, Lightbulb, Target, AlertTriangle, BookOpen, TrendingUp, Zap } from 'lucide-react';

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

interface MobileAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  lang: string;
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
  prediction: Prediction | null;
  isAnimating: boolean;
  trajectoryLength: number;
}

const MobileAIAssistant: React.FC<MobileAIAssistantProps> = ({
  isOpen,
  onClose,
  lang,
  velocity,
  angle,
  height,
  gravity,
  airResistance,
  mass,
  prediction,
  isAnimating,
  trajectoryLength,
}) => {
  const [activeSection, setActiveSection] = useState<'analysis' | 'optimize' | 'errors' | 'explain'>('analysis');

  const t = useMemo(() => {
    if (lang === 'ar') return {
      title: 'مساعد APAS الذكي',
      analysis: 'تحليل التجربة',
      optimize: 'أفضل زاوية',
      errors: 'أخطاء المستخدم',
      explain: 'كيف تم الحساب؟',
      noData: 'ابدأ المحاكاة أولاً للحصول على التحليل',
      optimalAngle: 'الزاوية المثالية لأقصى مدى',
      currentAngle: 'الزاوية الحالية',
      suggestion: 'اقتراح',
      range: 'المدى',
      maxH: 'أقصى ارتفاع',
      time: 'زمن الطيران',
      speed: 'السرعة النهائية',
      accuracy: 'الدقة',
      step: 'الخطوة',
    };
    if (lang === 'fr') return {
      title: 'Assistant IA APAS',
      analysis: 'Analyse',
      optimize: 'Angle Optimal',
      errors: 'Erreurs',
      explain: 'Comment calculé?',
      noData: 'Lancez la simulation pour obtenir l\'analyse',
      optimalAngle: 'Angle optimal pour portée maximale',
      currentAngle: 'Angle actuel',
      suggestion: 'Suggestion',
      range: 'Portée',
      maxH: 'Hauteur Max',
      time: 'Temps de Vol',
      speed: 'Vitesse Finale',
      accuracy: 'Précision',
      step: 'Étape',
    };
    return {
      title: 'APAS AI Assistant',
      analysis: 'Analysis',
      optimize: 'Best Angle',
      errors: 'User Errors',
      explain: 'How calculated?',
      noData: 'Start simulation first to get analysis',
      optimalAngle: 'Optimal angle for maximum range',
      currentAngle: 'Current angle',
      suggestion: 'Suggestion',
      range: 'Range',
      maxH: 'Max Height',
      time: 'Flight Time',
      speed: 'Final Speed',
      accuracy: 'Accuracy',
      step: 'Step',
    };
  }, [lang]);

  // Physics calculations
  const optimalAngle = useMemo(() => {
    if (airResistance > 0) return 42; // With air resistance, optimal is ~42 degrees
    if (height > 0) {
      return Math.atan((velocity) / Math.sqrt(velocity * velocity + 2 * gravity * height)) * (180 / Math.PI);
    }
    return 45;
  }, [velocity, height, gravity, airResistance]);

  const userErrors = useMemo(() => {
    const errors: { icon: React.ReactNode; text: string; severity: 'warning' | 'info' }[] = [];
    if (velocity <= 0) {
      errors.push({
        icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
        text: lang === 'ar' ? 'السرعة يجب أن تكون أكبر من صفر' : 'Velocity should be greater than zero',
        severity: 'warning',
      });
    }
    if (angle > 80 || angle < 5) {
      errors.push({
        icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
        text: lang === 'ar' ? 'الزاوية المختارة غير مثالية للمدى' : 'Selected angle is not optimal for range',
        severity: 'info',
      });
    }
    if (mass < 0.1) {
      errors.push({
        icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
        text: lang === 'ar' ? 'الكتلة صغيرة جداً — تأثير مقاومة الهواء كبير' : 'Mass is very small — air resistance effect is significant',
        severity: 'info',
      });
    }
    if (errors.length === 0) {
      errors.push({
        icon: <Zap className="w-4 h-4 text-green-500" />,
        text: lang === 'ar' ? 'المعاملات ممتازة! لا توجد أخطاء واضحة' : 'Parameters look great! No obvious issues',
        severity: 'info',
      });
    }
    return errors;
  }, [velocity, angle, mass, lang]);

  const avgAccuracy = prediction
    ? Math.max(0, 100 - (prediction.rangeError + prediction.maxHeightError + prediction.timeError) / 3)
    : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] md:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] bg-background/95 backdrop-blur-xl border-t border-border/50 rounded-t-3xl shadow-2xl animate-slideUp overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-primary/20 border border-purple-500/20">
              <Bot className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{t.title}</h3>
              <p className="text-[10px] text-muted-foreground">
                {isAnimating
                  ? (lang === 'ar' ? 'جاري التحليل...' : 'Analyzing...')
                  : trajectoryLength > 0
                    ? (lang === 'ar' ? 'التحليل جاهز' : 'Analysis ready')
                    : (lang === 'ar' ? 'في انتظار المحاكاة' : 'Waiting for simulation')
                }
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary active:scale-90 transition-all touch-manipulation">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-1.5 px-4 py-3 overflow-x-auto scrollbar-none">
          {([
            { id: 'analysis' as const, icon: <TrendingUp className="w-3.5 h-3.5" />, label: t.analysis },
            { id: 'optimize' as const, icon: <Target className="w-3.5 h-3.5" />, label: t.optimize },
            { id: 'errors' as const, icon: <AlertTriangle className="w-3.5 h-3.5" />, label: t.errors },
            { id: 'explain' as const, icon: <BookOpen className="w-3.5 h-3.5" />, label: t.explain },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all touch-manipulation ${
                activeSection === tab.id
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'bg-secondary/50 text-muted-foreground border border-transparent hover:bg-secondary'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-4 pb-6 overflow-y-auto max-h-[50vh] overscroll-contain">
          {!prediction && trajectoryLength === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bot className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">{t.noData}</p>
            </div>
          ) : (
            <>
              {/* Analysis Tab */}
              {activeSection === 'analysis' && prediction && (
                <div className="space-y-3">
                  {/* Stats cards */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { label: t.range, value: prediction.range.toFixed(2), unit: 'm', color: 'text-blue-500', bg: 'bg-blue-500/10' },
                      { label: t.maxH, value: prediction.maxHeight.toFixed(2), unit: 'm', color: 'text-green-500', bg: 'bg-green-500/10' },
                      { label: t.time, value: prediction.timeOfFlight.toFixed(2), unit: 's', color: 'text-amber-500', bg: 'bg-amber-500/10' },
                      { label: t.speed, value: prediction.finalVelocity.toFixed(2), unit: 'm/s', color: 'text-purple-500', bg: 'bg-purple-500/10' },
                    ].map((stat) => (
                      <div key={stat.label} className={`${stat.bg} rounded-xl p-3 border border-border/30`}>
                        <p className="text-[10px] font-medium text-muted-foreground mb-1">{stat.label}</p>
                        <p className={`text-lg font-bold font-mono ${stat.color}`}>{stat.value}</p>
                        <p className="text-[9px] font-mono text-muted-foreground">{stat.unit}</p>
                      </div>
                    ))}
                  </div>
                  {/* Accuracy bar */}
                  <div className="p-3 rounded-xl bg-secondary/30 border border-border/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-foreground">{t.accuracy}</span>
                      <span className={`text-xs font-bold font-mono ${avgAccuracy >= 95 ? 'text-green-500' : avgAccuracy >= 85 ? 'text-amber-500' : 'text-red-500'}`}>
                        {avgAccuracy.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${avgAccuracy >= 95 ? 'bg-green-500' : avgAccuracy >= 85 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${avgAccuracy}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Optimize Tab */}
              {activeSection === 'optimize' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-5 h-5 text-primary" />
                      <span className="text-sm font-semibold text-foreground">{t.optimalAngle}</span>
                    </div>
                    <div className="text-3xl font-bold font-mono text-primary mb-2">
                      {optimalAngle.toFixed(1)}°
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{t.currentAngle}:</span>
                      <span className="font-mono font-semibold text-foreground">{angle.toFixed(1)}°</span>
                      {Math.abs(angle - optimalAngle) > 5 && (
                        <span className="text-amber-500">
                          ({lang === 'ar' ? 'فرق' : 'diff'}: {Math.abs(angle - optimalAngle).toFixed(1)}°)
                        </span>
                      )}
                    </div>
                  </div>
                  {Math.abs(angle - optimalAngle) > 5 && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-foreground">
                        {t.suggestion}: {lang === 'ar'
                          ? `جرّب الزاوية ${optimalAngle.toFixed(1)}° للحصول على أقصى مدى`
                          : `Try angle ${optimalAngle.toFixed(1)}° for maximum range`
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Errors Tab */}
              {activeSection === 'errors' && (
                <div className="space-y-2.5">
                  {userErrors.map((err, i) => (
                    <div key={i} className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                      err.severity === 'warning'
                        ? 'bg-amber-500/10 border-amber-500/20'
                        : 'bg-secondary/30 border-border/30'
                    }`}>
                      {err.icon}
                      <p className="text-xs text-foreground leading-relaxed">{err.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Explain Tab */}
              {activeSection === 'explain' && (
                <div className="space-y-3">
                  {[
                    {
                      step: 1,
                      title: lang === 'ar' ? 'تحليل المدخلات' : 'Input Analysis',
                      desc: lang === 'ar'
                        ? `السرعة = ${velocity} m/s, الزاوية = ${angle}°, الارتفاع = ${height} m`
                        : `Velocity = ${velocity} m/s, Angle = ${angle}°, Height = ${height} m`,
                    },
                    {
                      step: 2,
                      title: lang === 'ar' ? 'تحليل المكونات' : 'Component Decomposition',
                      desc: lang === 'ar'
                        ? `Vx = ${(velocity * Math.cos(angle * Math.PI / 180)).toFixed(2)} m/s, Vy = ${(velocity * Math.sin(angle * Math.PI / 180)).toFixed(2)} m/s`
                        : `Vx = ${(velocity * Math.cos(angle * Math.PI / 180)).toFixed(2)} m/s, Vy = ${(velocity * Math.sin(angle * Math.PI / 180)).toFixed(2)} m/s`,
                    },
                    {
                      step: 3,
                      title: lang === 'ar' ? 'التكامل العددي' : 'Numerical Integration',
                      desc: lang === 'ar'
                        ? 'حل المعادلات التفاضلية خطوة بخطوة باستخدام طريقة التكامل المختارة'
                        : 'Solve differential equations step-by-step using the selected integration method',
                    },
                    {
                      step: 4,
                      title: lang === 'ar' ? 'النتائج النهائية' : 'Final Results',
                      desc: prediction
                        ? lang === 'ar'
                          ? `المدى = ${prediction.range.toFixed(2)} m, أقصى ارتفاع = ${prediction.maxHeight.toFixed(2)} m`
                          : `Range = ${prediction.range.toFixed(2)} m, Max Height = ${prediction.maxHeight.toFixed(2)} m`
                        : lang === 'ar' ? 'ابدأ المحاكاة لرؤية النتائج' : 'Run simulation to see results',
                    },
                  ].map((item) => (
                    <div key={item.step} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
                          {item.step}
                        </div>
                        {item.step < 4 && <div className="w-px h-full bg-border/50 mt-1" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-xs font-semibold text-foreground mb-1">{t.step} {item.step}: {item.title}</p>
                        <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileAIAssistant;
