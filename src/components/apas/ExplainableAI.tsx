import React, { useState, useCallback } from 'react';
import { Brain, AlertTriangle, Lightbulb, ChevronDown, Wind, Target, TrendingUp, Zap, Clock } from 'lucide-react';

interface ExplainableAIProps {
  lang: string;
  trajectoryData: Array<{ x: number; y: number; time: number; vx: number; vy: number; speed: number; ax: number; ay: number; acceleration: number }>;
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
  prediction: { range: number; maxHeight: number; timeOfFlight: number } | null;
  muted: boolean;
}

interface Anomaly {
  time: number;
  type: 'deviation' | 'acceleration_spike' | 'energy_loss' | 'drag_effect' | 'wind_effect';
  severity: 'info' | 'warning' | 'critical';
  description: string;
  suggestion: string;
  icon: React.ReactNode;
}

const T: Record<string, Record<string, string>> = {
  ar: {
    title: 'الذكاء الاصطناعي التفسيري',
    subtitle: 'تحليل "لماذا" حدث ذلك',
    analyze: 'تحليل المسار',
    analyzing: 'جاري التحليل...',
    noData: 'لا توجد بيانات مسار للتحليل',
    anomaliesFound: 'ملاحظات مكتشفة',
    noAnomalies: 'لم يتم اكتشاف أي شذوذ — المسار مثالي!',
    overallAssessment: 'التقييم العام',
    physicsInsights: 'رؤى فيزيائية',
    deviation: 'انحراف في المسار',
    accelerationSpike: 'قفزة في التسارع',
    energyLoss: 'فقدان طاقة',
    dragEffect: 'تأثير مقاومة الهواء',
    windEffect: 'تأثير الرياح',
    atSecond: 'عند الثانية',
    idealVsActual: 'المثالي مقابل الفعلي',
    efficiencyScore: 'نتيجة الكفاءة',
    excellent: 'ممتاز',
    good: 'جيد',
    acceptable: 'مقبول',
    needsReview: 'يحتاج مراجعة',
    airResistanceNote: 'ملاحظة: مقاومة الهواء مفعلة بمعامل',
    symmetryAnalysis: 'تحليل التماثل',
    symmetric: 'المسار متماثل بشكل جيد',
    asymmetric: 'المسار غير متماثل — قد يكون بسبب مقاومة الهواء أو الرياح',
    peakAnalysis: 'تحليل القمة',
    peakReached: 'القمة وصلت عند',
    expectedPeak: 'القمة المتوقعة نظرياً',
  },
  en: {
    title: 'Explainable AI',
    subtitle: 'Understand "why" it happened',
    analyze: 'Analyze Trajectory',
    analyzing: 'Analyzing...',
    noData: 'No trajectory data to analyze',
    anomaliesFound: 'Observations Found',
    noAnomalies: 'No anomalies detected — trajectory is ideal!',
    overallAssessment: 'Overall Assessment',
    physicsInsights: 'Physics Insights',
    deviation: 'Path Deviation',
    accelerationSpike: 'Acceleration Spike',
    energyLoss: 'Energy Loss',
    dragEffect: 'Air Resistance Effect',
    windEffect: 'Wind Effect',
    atSecond: 'At second',
    idealVsActual: 'Ideal vs Actual',
    efficiencyScore: 'Efficiency Score',
    excellent: 'Excellent',
    good: 'Good',
    acceptable: 'Acceptable',
    needsReview: 'Needs Review',
    airResistanceNote: 'Note: Air resistance enabled with coefficient',
    symmetryAnalysis: 'Symmetry Analysis',
    symmetric: 'Trajectory is well-symmetric',
    asymmetric: 'Trajectory is asymmetric — likely due to air resistance or wind',
    peakAnalysis: 'Peak Analysis',
    peakReached: 'Peak reached at',
    expectedPeak: 'Theoretically expected peak',
  },
  fr: {
    title: 'IA Explicative',
    subtitle: 'Comprendre "pourquoi" c\'est arrivé',
    analyze: 'Analyser la Trajectoire',
    analyzing: 'Analyse en cours...',
    noData: 'Pas de données de trajectoire à analyser',
    anomaliesFound: 'Observations Trouvées',
    noAnomalies: 'Aucune anomalie détectée — trajectoire idéale!',
    overallAssessment: 'Évaluation Globale',
    physicsInsights: 'Aperçus Physiques',
    deviation: 'Déviation du Chemin',
    accelerationSpike: 'Pic d\'Accélération',
    energyLoss: 'Perte d\'Énergie',
    dragEffect: 'Effet de Résistance de l\'Air',
    windEffect: 'Effet du Vent',
    atSecond: 'À la seconde',
    idealVsActual: 'Idéal vs Réel',
    efficiencyScore: 'Score d\'Efficacité',
    excellent: 'Excellent',
    good: 'Bon',
    acceptable: 'Acceptable',
    needsReview: 'À Revoir',
    airResistanceNote: 'Note: résistance de l\'air activée avec coefficient',
    symmetryAnalysis: 'Analyse de Symétrie',
    symmetric: 'La trajectoire est bien symétrique',
    asymmetric: 'La trajectoire est asymétrique — probablement à cause de la résistance de l\'air ou du vent',
    peakAnalysis: 'Analyse du Sommet',
    peakReached: 'Sommet atteint à',
    expectedPeak: 'Sommet théoriquement attendu',
  },
};

const ExplainableAI: React.FC<ExplainableAIProps> = ({
  lang, trajectoryData, velocity, angle, height, gravity, airResistance, mass, prediction,
}) => {
  const t = T[lang] || T.en;
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [efficiencyScore, setEfficiencyScore] = useState(0);

  const analyzeTrajectory = useCallback(() => {
    if (trajectoryData.length < 5) return;
    setIsAnalyzing(true);
    setHasAnalyzed(false);

    setTimeout(() => {
      const findings: Anomaly[] = [];
      const rad = (angle * Math.PI) / 180;
      const theoreticalMaxH = height + (velocity * Math.sin(rad)) ** 2 / (2 * gravity);
      const actualMaxH = Math.max(...trajectoryData.map(p => p.y));

      // 1. Check for trajectory deviation from ideal parabola
      if (airResistance > 0) {
        const idealRange = (velocity ** 2 * Math.sin(2 * rad)) / gravity;
        const actualRange = prediction?.range ?? trajectoryData[trajectoryData.length - 1].x;
        const rangeReduction = ((idealRange - actualRange) / idealRange) * 100;
        if (rangeReduction > 5) {
          findings.push({
            time: prediction?.timeOfFlight ? prediction.timeOfFlight * 0.5 : 0,
            type: 'drag_effect',
            severity: rangeReduction > 20 ? 'warning' : 'info',
            description: lang === 'ar'
              ? `مقاومة الهواء قللت المدى بنسبة ${rangeReduction.toFixed(1)}%`
              : `Air resistance reduced range by ${rangeReduction.toFixed(1)}%`,
            suggestion: lang === 'ar'
              ? 'هذا طبيعي في الواقع. قلل معامل المقاومة لرؤية المسار المثالي'
              : 'This is normal in reality. Reduce drag coefficient to see ideal path',
            icon: <Wind className="w-4 h-4" />,
          });
        }
      }

      // 2. Check height deviation
      const heightDiff = Math.abs(theoreticalMaxH - actualMaxH);
      if (heightDiff > theoreticalMaxH * 0.05 && theoreticalMaxH > 0.1) {
        findings.push({
          time: trajectoryData.find(p => p.y === actualMaxH)?.time ?? 0,
          type: 'deviation',
          severity: heightDiff > theoreticalMaxH * 0.15 ? 'warning' : 'info',
          description: lang === 'ar'
            ? `الارتفاع الأقصى الفعلي (${actualMaxH.toFixed(2)}م) يختلف عن النظري (${theoreticalMaxH.toFixed(2)}م)`
            : `Actual max height (${actualMaxH.toFixed(2)}m) differs from theoretical (${theoreticalMaxH.toFixed(2)}m)`,
          suggestion: lang === 'ar'
            ? 'الفرق ناتج عن مقاومة الهواء أو أخطاء التكامل العددي'
            : 'Difference due to air resistance or numerical integration errors',
          icon: <Target className="w-4 h-4" />,
        });
      }

      // 3. Check for acceleration anomalies
      for (let i = 2; i < trajectoryData.length - 2; i++) {
        const accMag = trajectoryData[i].acceleration;
        const prevAcc = trajectoryData[i - 1].acceleration;
        const nextAcc = trajectoryData[i + 1].acceleration;
        const avgNeighbor = (prevAcc + nextAcc) / 2;
        if (avgNeighbor > 0 && Math.abs(accMag - avgNeighbor) / avgNeighbor > 0.5) {
          findings.push({
            time: trajectoryData[i].time,
            type: 'acceleration_spike',
            severity: 'warning',
            description: lang === 'ar'
              ? `قفزة في التسارع عند الثانية ${trajectoryData[i].time.toFixed(2)} — قد يشير إلى اصطدام أو تيار هوائي`
              : `Acceleration spike at second ${trajectoryData[i].time.toFixed(2)} — may indicate collision or air current`,
            suggestion: lang === 'ar'
              ? 'تحقق من الفيديو عند هذه اللحظة بحثاً عن عوامل خارجية'
              : 'Check the video at this moment for external factors',
            icon: <Zap className="w-4 h-4" />,
          });
          break; // Only report first spike
        }
      }

      // 4. Energy conservation check
      if (trajectoryData.length > 10) {
        const startKE = 0.5 * mass * trajectoryData[0].speed ** 2;
        const startPE = mass * gravity * trajectoryData[0].y;
        const totalStart = startKE + startPE;
        const lastPt = trajectoryData[trajectoryData.length - 1];
        const endKE = 0.5 * mass * lastPt.speed ** 2;
        const endPE = mass * gravity * lastPt.y;
        const totalEnd = endKE + endPE;
        const energyLossPercent = totalStart > 0 ? ((totalStart - totalEnd) / totalStart) * 100 : 0;

        if (energyLossPercent > 1 && airResistance > 0) {
          findings.push({
            time: lastPt.time,
            type: 'energy_loss',
            severity: energyLossPercent > 30 ? 'critical' : energyLossPercent > 10 ? 'warning' : 'info',
            description: lang === 'ar'
              ? `فقدان طاقة بنسبة ${energyLossPercent.toFixed(1)}% بسبب مقاومة الهواء`
              : `${energyLossPercent.toFixed(1)}% energy loss due to air resistance`,
            suggestion: lang === 'ar'
              ? 'الطاقة المفقودة تحولت إلى حرارة بسبب الاحتكاك مع الهواء'
              : 'Lost energy was converted to heat due to air friction',
            icon: <TrendingUp className="w-4 h-4" />,
          });
        }
      }

      // 5. Symmetry analysis
      if (prediction && height === 0 && airResistance === 0) {
        const halfTime = prediction.timeOfFlight / 2;
        const peakTime = trajectoryData.find(p => p.y === actualMaxH)?.time ?? halfTime;
        const symmetryRatio = peakTime / halfTime;
        if (Math.abs(symmetryRatio - 1) > 0.05) {
          findings.push({
            time: peakTime,
            type: 'deviation',
            severity: 'info',
            description: lang === 'ar'
              ? `المسار غير متماثل — نسبة التماثل: ${(symmetryRatio * 100).toFixed(1)}%`
              : `Trajectory asymmetric — symmetry ratio: ${(symmetryRatio * 100).toFixed(1)}%`,
            suggestion: lang === 'ar'
              ? 'عدم التماثل طبيعي عند وجود ارتفاع ابتدائي أو مقاومة هواء'
              : 'Asymmetry is normal with initial height or air resistance',
            icon: <Clock className="w-4 h-4" />,
          });
        }
      }

      // Calculate efficiency score
      const score = Math.max(0, Math.min(100, 100 - findings.reduce((acc, f) => {
        if (f.severity === 'critical') return acc + 25;
        if (f.severity === 'warning') return acc + 10;
        return acc + 3;
      }, 0)));

      setEfficiencyScore(score);
      setAnomalies(findings);
      setIsAnalyzing(false);
      setHasAnalyzed(true);
    }, 1500);
  }, [trajectoryData, velocity, angle, height, gravity, airResistance, mass, prediction, lang]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-blue-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return t.excellent;
    if (score >= 70) return t.good;
    if (score >= 50) return t.acceptable;
    return t.needsReview;
  };

  const getSeverityColor = (severity: string) => {
    if (severity === 'critical') return 'border-red-500/30 bg-red-500/5';
    if (severity === 'warning') return 'border-amber-500/30 bg-amber-500/5';
    return 'border-blue-500/30 bg-blue-500/5';
  };

  return (
    <div className="border border-border/50 rounded-xl bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3.5 cursor-pointer hover:bg-primary/5 transition-all duration-300"
      >
        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
          🔮 {t.title}
          {hasAnalyzed && (
            <span className={`text-[10px] font-mono ${getScoreColor(efficiencyScore)}`}>
              {efficiencyScore.toFixed(0)}%
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {!isOpen && (
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono animate-slideDown">
              <span className={`px-1.5 py-0.5 rounded ${hasAnalyzed ? (efficiencyScore >= 80 ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400') : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'}`}>
                {hasAnalyzed ? `${efficiencyScore.toFixed(0)}%` : (lang === 'ar' ? 'تحليل' : 'Analyze')}
              </span>
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border/30 p-4 space-y-3 animate-slideDown">
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>

          {trajectoryData.length < 5 ? (
            <p className="text-xs text-muted-foreground text-center py-4">{t.noData}</p>
          ) : (
            <>
              <button
                onClick={analyzeTrajectory}
                disabled={isAnalyzing}
                className="w-full px-4 py-2.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-primary to-primary/80 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Brain className={`w-4 h-4 ${isAnalyzing ? 'animate-pulse' : ''}`} />
                {isAnalyzing ? t.analyzing : t.analyze}
              </button>

              {hasAnalyzed && (
                <>
                  {/* Efficiency Score */}
                  <div className="text-center p-4 rounded-xl bg-secondary/30 border border-border/30">
                    <p className="text-xs text-muted-foreground mb-1">{t.efficiencyScore}</p>
                    <p className={`text-3xl font-bold ${getScoreColor(efficiencyScore)}`}>
                      {efficiencyScore.toFixed(0)}%
                    </p>
                    <p className={`text-xs font-medium ${getScoreColor(efficiencyScore)}`}>
                      {getScoreLabel(efficiencyScore)}
                    </p>
                  </div>

                  {/* Air resistance note */}
                  {airResistance > 0 && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="text-[11px] text-amber-700 dark:text-amber-400">
                        {t.airResistanceNote} k={airResistance.toFixed(3)}
                      </span>
                    </div>
                  )}

                  {/* Anomalies */}
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">
                      {t.anomaliesFound}: {anomalies.length}
                    </p>
                    {anomalies.length === 0 ? (
                      <div className="text-center p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                        <Lightbulb className="w-5 h-5 text-green-500 mx-auto mb-1" />
                        <p className="text-xs text-green-600 dark:text-green-400">{t.noAnomalies}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {anomalies.map((anomaly, i) => (
                          <div key={i} className={`p-3 rounded-lg border ${getSeverityColor(anomaly.severity)}`}>
                            <div className="flex items-start gap-2">
                              <span className="mt-0.5 text-primary">{anomaly.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-foreground">{anomaly.description}</p>
                                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                                  <Lightbulb className="w-3 h-3 text-amber-500" />
                                  {anomaly.suggestion}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ExplainableAI;
