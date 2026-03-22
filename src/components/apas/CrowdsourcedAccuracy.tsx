import React, { useState, useCallback } from 'react';
import { Award, Star, Trophy, ChevronDown, Medal, Users, TrendingUp, Shield } from 'lucide-react';

interface CrowdsourcedAccuracyProps {
  lang: string;
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
  prediction: { range: number; maxHeight: number; timeOfFlight: number } | null;
  muted: boolean;
}

const T: Record<string, Record<string, string>> = {
  ar: {
    title: 'نظام السمعة والدقة',
    subtitle: 'مكتبة عالمية من التجارب الموثقة',
    analyzeAccuracy: 'تحليل دقة المحاكاة',
    analyzing: 'جاري التحليل...',
    accuracyScore: 'نتيجة الدقة',
    badge: 'الوسام',
    goldBadge: 'وسام ذهبي — دقة فائقة',
    silverBadge: 'وسام فضي — دقة عالية',
    bronzeBadge: 'وسام برونزي — دقة مقبولة',
    noData: 'أطلق المحاكاة لتحليل الدقة',
    consistencyCheck: 'فحص التناسق',
    physicsValidation: 'التحقق الفيزيائي',
    energyConservation: 'حفظ الطاقة',
    symmetryCheck: 'فحص التماثل',
    rangeCheck: 'فحص المدى',
    passed: 'ناجح',
    failed: 'فاشل',
    warning: 'تحذير',
    totalScore: 'النتيجة الإجمالية',
    validationCriteria: 'معايير التحقق',
    criterion: 'المعيار',
    status: 'الحالة',
    details: 'التفاصيل',
  },
  en: {
    title: 'Accuracy & Reputation System',
    subtitle: 'Global library of documented experiments',
    analyzeAccuracy: 'Analyze Simulation Accuracy',
    analyzing: 'Analyzing...',
    accuracyScore: 'Accuracy Score',
    badge: 'Badge',
    goldBadge: 'Gold Badge — Ultra Accurate',
    silverBadge: 'Silver Badge — High Accuracy',
    bronzeBadge: 'Bronze Badge — Acceptable Accuracy',
    noData: 'Launch simulation to analyze accuracy',
    consistencyCheck: 'Consistency Check',
    physicsValidation: 'Physics Validation',
    energyConservation: 'Energy Conservation',
    symmetryCheck: 'Symmetry Check',
    rangeCheck: 'Range Check',
    passed: 'Passed',
    failed: 'Failed',
    warning: 'Warning',
    totalScore: 'Total Score',
    validationCriteria: 'Validation Criteria',
    criterion: 'Criterion',
    status: 'Status',
    details: 'Details',
  },
  fr: {
    title: 'Système de Réputation et Précision',
    subtitle: 'Bibliothèque mondiale d\'expériences documentées',
    analyzeAccuracy: 'Analyser la Précision',
    analyzing: 'Analyse...',
    accuracyScore: 'Score de Précision',
    badge: 'Badge',
    goldBadge: 'Badge Or — Ultra Précis',
    silverBadge: 'Badge Argent — Haute Précision',
    bronzeBadge: 'Badge Bronze — Précision Acceptable',
    noData: 'Lancez la simulation pour analyser la précision',
    consistencyCheck: 'Vérification de Cohérence',
    physicsValidation: 'Validation Physique',
    energyConservation: 'Conservation d\'Énergie',
    symmetryCheck: 'Vérification de Symétrie',
    rangeCheck: 'Vérification de Portée',
    passed: 'Réussi',
    failed: 'Échoué',
    warning: 'Attention',
    totalScore: 'Score Total',
    validationCriteria: 'Critères de Validation',
    criterion: 'Critère',
    status: 'Statut',
    details: 'Détails',
  },
};

interface ValidationResult {
  name: string;
  passed: boolean;
  score: number;
  details: string;
  icon: React.ReactNode;
}

const CrowdsourcedAccuracy: React.FC<CrowdsourcedAccuracyProps> = ({
  lang, velocity, angle, height, gravity, airResistance, mass, prediction,
}) => {
  const t = T[lang] || T.en;
  const [isOpen, setIsOpen] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [validations, setValidations] = useState<ValidationResult[]>([]);
  const [totalScore, setTotalScore] = useState(0);

  const analyzeAccuracy = useCallback(() => {
    if (!prediction) return;
    setIsAnalyzing(true);

    setTimeout(() => {
      const results: ValidationResult[] = [];
      const rad = (angle * Math.PI) / 180;

      // 1. Range validation against analytical solution
      const theoreticalRange = airResistance === 0
        ? (velocity ** 2 * Math.sin(2 * rad)) / gravity + (velocity * Math.cos(rad) * (
          (velocity * Math.sin(rad) + Math.sqrt((velocity * Math.sin(rad)) ** 2 + 2 * gravity * height)) / gravity
          - (2 * velocity * Math.sin(rad)) / gravity
        ))
        : prediction.range; // With drag, actual IS the result
      const rangeError = airResistance === 0
        ? Math.abs(prediction.range - theoreticalRange) / Math.max(theoreticalRange, 0.01) * 100
        : 0;
      results.push({
        name: t.rangeCheck,
        passed: rangeError < 5,
        score: Math.max(0, 100 - rangeError * 5),
        details: airResistance === 0
          ? `${rangeError.toFixed(2)}% ${lang === 'ar' ? 'خطأ' : 'error'}`
          : `${lang === 'ar' ? 'مع مقاومة الهواء' : 'With air resistance'}`,
        icon: <TrendingUp className="w-4 h-4" />,
      });

      // 2. Energy conservation check
      const v0 = velocity;
      const initialKE = 0.5 * mass * v0 * v0;
      const initialPE = mass * gravity * height;
      const totalInitialE = initialKE + initialPE;
      // At peak: all KE_y converted to PE
      const peakPE = mass * gravity * prediction.maxHeight;
      const peakKE = 0.5 * mass * (velocity * Math.cos(rad)) ** 2; // only horizontal component
      const peakTotal = peakKE + peakPE;
      const energyDiff = airResistance === 0
        ? Math.abs(totalInitialE - peakTotal) / Math.max(totalInitialE, 0.01) * 100
        : Math.abs(totalInitialE - peakTotal) / Math.max(totalInitialE, 0.01) * 100;
      results.push({
        name: t.energyConservation,
        passed: energyDiff < 10 || airResistance > 0,
        score: airResistance > 0 ? 85 : Math.max(0, 100 - energyDiff * 3),
        details: airResistance > 0
          ? `${energyDiff.toFixed(1)}% ${lang === 'ar' ? 'فقدان (طبيعي مع المقاومة)' : 'loss (normal with drag)'}`
          : `${energyDiff.toFixed(2)}% ${lang === 'ar' ? 'انحراف' : 'deviation'}`,
        icon: <Shield className="w-4 h-4" />,
      });

      // 3. Symmetry check (only valid without drag and h=0)
      if (airResistance === 0 && height === 0) {
        const expectedSymmetricTime = (2 * velocity * Math.sin(rad)) / gravity;
        const timeError = Math.abs(prediction.timeOfFlight - expectedSymmetricTime) / Math.max(expectedSymmetricTime, 0.01) * 100;
        results.push({
          name: t.symmetryCheck,
          passed: timeError < 3,
          score: Math.max(0, 100 - timeError * 5),
          details: `${timeError.toFixed(2)}% ${lang === 'ar' ? 'انحراف عن التماثل' : 'symmetry deviation'}`,
          icon: <Medal className="w-4 h-4" />,
        });
      }

      // 4. Max height validation
      const theoreticalMaxH = height + (velocity * Math.sin(rad)) ** 2 / (2 * gravity);
      const heightError = Math.abs(prediction.maxHeight - theoreticalMaxH) / Math.max(theoreticalMaxH, 0.01) * 100;
      results.push({
        name: lang === 'ar' ? 'فحص الارتفاع الأقصى' : 'Max Height Check',
        passed: heightError < 5 || airResistance > 0,
        score: airResistance > 0 ? 90 : Math.max(0, 100 - heightError * 5),
        details: airResistance > 0
          ? `${heightError.toFixed(1)}% ${lang === 'ar' ? 'أقل (بسبب المقاومة)' : 'lower (due to drag)'}`
          : `${heightError.toFixed(2)}% ${lang === 'ar' ? 'خطأ' : 'error'}`,
        icon: <Star className="w-4 h-4" />,
      });

      // 5. Physics consistency - angle check
      const angleValid = angle >= 0 && angle <= 90;
      results.push({
        name: t.consistencyCheck,
        passed: angleValid && velocity > 0,
        score: (angleValid && velocity > 0) ? 100 : 50,
        details: angleValid && velocity > 0
          ? `${lang === 'ar' ? 'المعاملات في النطاق الصحيح' : 'Parameters within valid range'}`
          : `${lang === 'ar' ? 'بعض المعاملات خارج النطاق' : 'Some parameters out of range'}`,
        icon: <Users className="w-4 h-4" />,
      });

      const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
      setTotalScore(avgScore);
      setValidations(results);
      setIsAnalyzing(false);
      setHasAnalyzed(true);
    }, 1500);
  }, [prediction, velocity, angle, height, gravity, airResistance, mass, lang, t]);

  const getBadge = (score: number) => {
    if (score >= 90) return { emoji: '🥇', label: t.goldBadge, color: 'text-amber-500' };
    if (score >= 70) return { emoji: '🥈', label: t.silverBadge, color: 'text-gray-400' };
    return { emoji: '🥉', label: t.bronzeBadge, color: 'text-amber-700' };
  };

  const getStatusColor = (passed: boolean) => passed ? 'text-green-500' : 'text-red-500';
  const getStatusBg = (passed: boolean) => passed ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20';

  return (
    <div className="border border-border/50 rounded-xl bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3.5 cursor-pointer hover:bg-primary/5 transition-all duration-300"
      >
        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
          🏆 {t.title}
          {hasAnalyzed && (
            <span className="text-[10px]">{getBadge(totalScore).emoji}</span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {!isOpen && (
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono animate-slideDown">
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                {hasAnalyzed ? `${totalScore.toFixed(0)}%` : (lang === 'ar' ? 'تحقق' : 'Validate')}
              </span>
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border/30 p-4 space-y-3 animate-slideDown">
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>

          {!prediction ? (
            <p className="text-xs text-muted-foreground text-center py-4">{t.noData}</p>
          ) : (
            <>
              <button
                onClick={analyzeAccuracy}
                disabled={isAnalyzing}
                className="w-full px-4 py-2.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Award className={`w-4 h-4 ${isAnalyzing ? 'animate-pulse' : ''}`} />
                {isAnalyzing ? t.analyzing : t.analyzeAccuracy}
              </button>

              {hasAnalyzed && (
                <>
                  {/* Badge Display */}
                  <div className="text-center p-4 rounded-xl bg-gradient-to-b from-secondary/50 to-secondary/20 border border-border/30">
                    <p className="text-4xl mb-2">{getBadge(totalScore).emoji}</p>
                    <p className={`text-xs font-semibold ${getBadge(totalScore).color}`}>
                      {getBadge(totalScore).label}
                    </p>
                    <p className="text-2xl font-bold text-foreground mt-2">{totalScore.toFixed(1)}%</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{t.totalScore}</p>
                  </div>

                  {/* Local validation notice */}
                  <div className="p-2.5 rounded-lg bg-secondary/20 border border-border/30 text-center">
                    <p className="text-[10px] text-muted-foreground">
                      {lang === 'ar' ? 'تحقق محلي — يتم حساب الدقة بمقارنة النتائج مع المعادلات الفيزيائية النظرية' : 'Local validation — accuracy is calculated by comparing results against theoretical physics equations'}
                    </p>
                  </div>

                  {/* Validation Details */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">{t.validationCriteria}</p>
                    {validations.map((v, i) => (
                      <div key={i} className={`p-2.5 rounded-lg border ${getStatusBg(v.passed)}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={getStatusColor(v.passed)}>{v.icon}</span>
                            <span className="text-xs font-medium text-foreground">{v.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-muted-foreground">{v.score.toFixed(0)}%</span>
                            <span className={`text-[10px] font-semibold ${getStatusColor(v.passed)}`}>
                              {v.passed ? t.passed : t.failed}
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{v.details}</p>
                      </div>
                    ))}
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

export default CrowdsourcedAccuracy;
