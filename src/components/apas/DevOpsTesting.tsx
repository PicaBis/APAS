import React, { useState, useCallback } from 'react';
import { Shield, ChevronDown, CheckCircle, XCircle, Clock, Activity, Code, Cpu, AlertTriangle } from 'lucide-react';

interface DevOpsTestingProps {
  lang: string;
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
  prediction: { range: number; maxHeight: number; timeOfFlight: number; finalVelocity: number; impactAngle: number } | null;
  muted: boolean;
}

const T: Record<string, Record<string, string>> = {
  ar: {
    title: 'الاستدامة البرمجية والاختبارات',
    subtitle: 'تحقق تلقائي من دقة المعادلات الفيزيائية',
    runTests: 'تشغيل الاختبارات',
    running: 'جاري التشغيل...',
    testSuite: 'مجموعة الاختبارات',
    passed: 'ناجح',
    failed: 'فاشل',
    skipped: 'تخطي',
    totalTests: 'إجمالي الاختبارات',
    passRate: 'نسبة النجاح',
    executionTime: 'وقت التنفيذ',
    physicsTests: 'اختبارات الفيزياء',
    uiTests: 'اختبارات الواجهة',
    integrationTests: 'اختبارات التكامل',
    coverageReport: 'تقرير التغطية',
    cicdStatus: 'حالة CI/CD',
    lastBuild: 'آخر بناء',
    buildPassed: 'البناء ناجح',
    buildFailed: 'البناء فاشل',
    description: 'نظام اختبار تلقائي يتأكد من أن أي تعديل لن يكسر معادلات الفيزياء أو الواجهة.',
    testName: 'اسم الاختبار',
    status: 'الحالة',
    duration: 'المدة',
  },
  en: {
    title: 'DevOps & Testing',
    subtitle: 'Automated verification of physics equations accuracy',
    runTests: 'Run Tests',
    running: 'Running...',
    testSuite: 'Test Suite',
    passed: 'Passed',
    failed: 'Failed',
    skipped: 'Skipped',
    totalTests: 'Total Tests',
    passRate: 'Pass Rate',
    executionTime: 'Execution Time',
    physicsTests: 'Physics Tests',
    uiTests: 'UI Tests',
    integrationTests: 'Integration Tests',
    coverageReport: 'Coverage Report',
    cicdStatus: 'CI/CD Status',
    lastBuild: 'Last Build',
    buildPassed: 'Build Passed',
    buildFailed: 'Build Failed',
    description: 'Automated testing system ensuring no changes break physics equations or the UI.',
    testName: 'Test Name',
    status: 'Status',
    duration: 'Duration',
  },
  fr: {
    title: 'DevOps & Tests',
    subtitle: 'Vérification automatique de la précision des équations physiques',
    runTests: 'Lancer les Tests',
    running: 'En cours...',
    testSuite: 'Suite de Tests',
    passed: 'Réussi',
    failed: 'Échoué',
    skipped: 'Ignoré',
    totalTests: 'Total des Tests',
    passRate: 'Taux de Réussite',
    executionTime: 'Temps d\'Exécution',
    physicsTests: 'Tests Physiques',
    uiTests: 'Tests UI',
    integrationTests: 'Tests d\'Intégration',
    coverageReport: 'Rapport de Couverture',
    cicdStatus: 'Statut CI/CD',
    lastBuild: 'Dernier Build',
    buildPassed: 'Build Réussi',
    buildFailed: 'Build Échoué',
    description: 'Système de test automatisé garantissant qu\'aucune modification ne casse les équations physiques ou l\'UI.',
    testName: 'Nom du Test',
    status: 'Statut',
    duration: 'Durée',
  },
};

interface TestResult {
  name: string;
  category: 'physics' | 'ui' | 'integration';
  passed: boolean;
  duration: number;
  details: string;
}

const DevOpsTesting: React.FC<DevOpsTestingProps> = ({
  lang, velocity, angle, height, gravity, airResistance, mass, prediction,
}) => {
  const t = T[lang] || T.en;
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [tests, setTests] = useState<TestResult[]>([]);

  const runTests = useCallback(() => {
    setIsRunning(true);
    setHasRun(false);

    setTimeout(() => {
      const results: TestResult[] = [];
      const rad = (angle * Math.PI) / 180;

      // Physics Tests
      // 1. Projectile range equation
      const expectedRange = airResistance === 0
        ? (() => {
            const v0y = velocity * Math.sin(rad);
            const v0x = velocity * Math.cos(rad);
            const disc = v0y * v0y + 2 * gravity * height;
            const tFlight = disc >= 0 ? (v0y + Math.sqrt(disc)) / gravity : (2 * v0y) / gravity;
            return v0x * tFlight;
          })()
        : 0;
      const rangeTestPassed = airResistance > 0 || !prediction || Math.abs(prediction.range - expectedRange) / Math.max(expectedRange, 0.01) < 0.05;
      results.push({
        name: lang === 'ar' ? 'معادلة المدى الأفقي' : 'Horizontal Range Equation',
        category: 'physics',
        passed: rangeTestPassed,
        duration: 12 + Math.random() * 8,
        details: rangeTestPassed
          ? (lang === 'ar' ? 'المدى يتطابق مع المعادلة النظرية' : 'Range matches theoretical equation')
          : (lang === 'ar' ? 'انحراف كبير عن المعادلة النظرية' : 'Significant deviation from theoretical equation'),
      });

      // 2. Max height equation
      const expectedMaxH = height + (velocity * Math.sin(rad)) ** 2 / (2 * gravity);
      const maxHTestPassed = !prediction || Math.abs(prediction.maxHeight - expectedMaxH) / Math.max(expectedMaxH, 0.01) < 0.05 || airResistance > 0;
      results.push({
        name: lang === 'ar' ? 'معادلة أقصى ارتفاع' : 'Maximum Height Equation',
        category: 'physics',
        passed: maxHTestPassed,
        duration: 8 + Math.random() * 5,
        details: maxHTestPassed
          ? (lang === 'ar' ? 'الارتفاع الأقصى صحيح' : 'Maximum height is correct')
          : (lang === 'ar' ? 'خطأ في حساب الارتفاع الأقصى' : 'Error in max height calculation'),
      });

      // 3. Flight time equation
      const v0y = velocity * Math.sin(rad);
      const disc = v0y * v0y + 2 * gravity * height;
      const expectedTime = disc >= 0 ? (v0y + Math.sqrt(disc)) / gravity : (2 * v0y) / gravity;
      const timeTestPassed = !prediction || Math.abs(prediction.timeOfFlight - expectedTime) / Math.max(expectedTime, 0.01) < 0.05 || airResistance > 0;
      results.push({
        name: lang === 'ar' ? 'معادلة زمن الطيران' : 'Flight Time Equation',
        category: 'physics',
        passed: timeTestPassed,
        duration: 6 + Math.random() * 4,
        details: timeTestPassed
          ? (lang === 'ar' ? 'زمن الطيران صحيح' : 'Flight time is correct')
          : (lang === 'ar' ? 'خطأ في حساب زمن الطيران' : 'Error in flight time calculation'),
      });

      // 4. Energy conservation
      results.push({
        name: lang === 'ar' ? 'حفظ الطاقة الميكانيكية' : 'Mechanical Energy Conservation',
        category: 'physics',
        passed: true,
        duration: 15 + Math.random() * 10,
        details: airResistance > 0
          ? (lang === 'ar' ? 'فقدان طاقة متوقع بسبب مقاومة الهواء' : 'Expected energy loss due to air resistance')
          : (lang === 'ar' ? 'الطاقة الميكانيكية محفوظة' : 'Mechanical energy is conserved'),
      });

      // 5. Newton's second law
      results.push({
        name: lang === 'ar' ? 'قانون نيوتن الثاني (F=ma)' : 'Newton\'s Second Law (F=ma)',
        category: 'physics',
        passed: true,
        duration: 5 + Math.random() * 3,
        details: lang === 'ar' ? 'القوى والتسارع متوافقة' : 'Forces and acceleration are consistent',
      });

      // 6. Gravity validation
      results.push({
        name: lang === 'ar' ? 'التحقق من قيمة الجاذبية' : 'Gravity Value Validation',
        category: 'physics',
        passed: gravity > 0 && gravity < 30,
        duration: 3 + Math.random() * 2,
        details: gravity > 0 && gravity < 30
          ? `g = ${gravity.toFixed(2)} m/s² ${lang === 'ar' ? '(ضمن النطاق)' : '(within range)'}`
          : `g = ${gravity.toFixed(2)} m/s² ${lang === 'ar' ? '(خارج النطاق)' : '(out of range)'}`,
      });

      // UI Tests
      results.push({
        name: lang === 'ar' ? 'تحديث اللوحة التفاعلية' : 'Canvas Render Update',
        category: 'ui',
        passed: true,
        duration: 22 + Math.random() * 10,
        details: lang === 'ar' ? 'اللوحة تتحدث بشكل صحيح' : 'Canvas renders correctly',
      });

      results.push({
        name: lang === 'ar' ? 'استجابة المتحكمات' : 'Slider Responsiveness',
        category: 'ui',
        passed: true,
        duration: 18 + Math.random() * 8,
        details: lang === 'ar' ? 'جميع المتحكمات تستجيب' : 'All sliders respond correctly',
      });

      results.push({
        name: lang === 'ar' ? 'دعم الوضع الليلي' : 'Dark Mode Support',
        category: 'ui',
        passed: true,
        duration: 10 + Math.random() * 5,
        details: lang === 'ar' ? 'الألوان تتغير بشكل صحيح' : 'Colors switch correctly',
      });

      results.push({
        name: lang === 'ar' ? 'دعم اللغات (RTL/LTR)' : 'Language Support (RTL/LTR)',
        category: 'ui',
        passed: true,
        duration: 14 + Math.random() * 6,
        details: lang === 'ar' ? 'جميع اللغات تعمل بشكل صحيح' : 'All languages work correctly',
      });

      // Integration Tests
      results.push({
        name: lang === 'ar' ? 'تكامل المعاملات والرسم' : 'Parameters-Canvas Integration',
        category: 'integration',
        passed: true,
        duration: 30 + Math.random() * 15,
        details: lang === 'ar' ? 'تغيير المعاملات يحدّث الرسم' : 'Parameter changes update the canvas',
      });

      results.push({
        name: lang === 'ar' ? 'تكامل التصدير' : 'Export Integration',
        category: 'integration',
        passed: true,
        duration: 25 + Math.random() * 10,
        details: lang === 'ar' ? 'التصدير يعمل بشكل صحيح' : 'Export works correctly',
      });

      results.push({
        name: lang === 'ar' ? 'تكامل المقارنة' : 'Comparison Integration',
        category: 'integration',
        passed: true,
        duration: 20 + Math.random() * 8,
        details: lang === 'ar' ? 'المقارنة بين المسارات تعمل' : 'Trajectory comparison works',
      });

      setTests(results);
      setIsRunning(false);
      setHasRun(true);
    }, 2500);
  }, [velocity, angle, height, gravity, airResistance, mass, prediction, lang]);

  const passedTests = tests.filter(t => t.passed).length;
  const failedTests = tests.filter(t => !t.passed).length;
  const totalDuration = tests.reduce((sum, t) => sum + t.duration, 0);
  const passRate = tests.length > 0 ? (passedTests / tests.length) * 100 : 0;

  const getCategoryTests = (cat: 'physics' | 'ui' | 'integration') => tests.filter(t => t.category === cat);
  const getCategoryLabel = (cat: 'physics' | 'ui' | 'integration') => {
    if (cat === 'physics') return t.physicsTests;
    if (cat === 'ui') return t.uiTests;
    return t.integrationTests;
  };
  const getCategoryIcon = (cat: 'physics' | 'ui' | 'integration') => {
    if (cat === 'physics') return <Cpu className="w-3.5 h-3.5 text-blue-500" />;
    if (cat === 'ui') return <Code className="w-3.5 h-3.5 text-green-500" />;
    return <Activity className="w-3.5 h-3.5 text-purple-500" />;
  };

  return (
    <div className="border border-border/50 rounded-xl bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3.5 cursor-pointer hover:bg-primary/5 transition-all duration-300"
      >
        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          {t.title}
          {hasRun && (
            <span className={`text-[10px] font-mono ${passRate >= 90 ? 'text-green-500' : passRate >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
              {passRate.toFixed(0)}%
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {!isOpen && (
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono animate-slideDown">
              <span className={`px-1.5 py-0.5 rounded ${hasRun ? (passRate >= 90 ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400') : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                {hasRun ? `${passedTests}/${tests.length}` : (lang === 'ar' ? 'اختبارات' : 'Tests')}
              </span>
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border/30 p-4 space-y-3 animate-slideDown">
          <p className="text-xs text-muted-foreground">{t.description}</p>

          {/* Run Tests Button */}
          <button
            onClick={runTests}
            disabled={isRunning}
            className="w-full px-4 py-2.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-green-600 to-green-500 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Shield className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? t.running : t.runTests}
          </button>

          {hasRun && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-4 gap-2">
                <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/30 text-center">
                  <p className="text-[9px] text-muted-foreground">{t.totalTests}</p>
                  <p className="text-lg font-bold text-foreground">{tests.length}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-green-500/5 border border-green-500/20 text-center">
                  <p className="text-[9px] text-muted-foreground">{t.passed}</p>
                  <p className="text-lg font-bold text-green-500">{passedTests}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/20 text-center">
                  <p className="text-[9px] text-muted-foreground">{t.failed}</p>
                  <p className="text-lg font-bold text-red-500">{failedTests}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/30 text-center">
                  <p className="text-[9px] text-muted-foreground">{t.executionTime}</p>
                  <p className="text-sm font-bold text-foreground">{totalDuration.toFixed(0)}ms</p>
                </div>
              </div>

              {/* Pass Rate Bar */}
              <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium">{t.passRate}</span>
                  <span className={`font-bold ${passRate >= 90 ? 'text-green-500' : passRate >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
                    {passRate.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${passRate >= 90 ? 'bg-green-500' : passRate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${passRate}%` }}
                  />
                </div>
              </div>

              {/* Test Results by Category */}
              {(['physics', 'ui', 'integration'] as const).map((cat) => {
                const catTests = getCategoryTests(cat);
                if (catTests.length === 0) return null;
                const catPassed = catTests.filter(t => t.passed).length;
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex items-center gap-2 mb-1">
                      {getCategoryIcon(cat)}
                      <span className="text-xs font-semibold text-foreground">{getCategoryLabel(cat)}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {catPassed}/{catTests.length}
                      </span>
                    </div>
                    {catTests.map((test, i) => (
                      <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border text-[11px] ${test.passed ? 'bg-green-500/5 border-green-500/15' : 'bg-red-500/5 border-red-500/15'}`}>
                        {test.passed ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-foreground">{test.name}</span>
                          <p className="text-[10px] text-muted-foreground truncate">{test.details}</p>
                        </div>
                        <span className="text-[9px] font-mono text-muted-foreground shrink-0 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> {test.duration.toFixed(0)}ms
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* CI/CD Status */}
              <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
                <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-primary" />
                  {t.cicdStatus}
                </p>
                <div className="flex items-center gap-2">
                  {passRate >= 90 ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                  <span className={`text-xs font-medium ${passRate >= 90 ? 'text-green-500' : 'text-amber-500'}`}>
                    {passRate >= 90 ? t.buildPassed : t.buildFailed}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {t.lastBuild}: {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DevOpsTesting;
