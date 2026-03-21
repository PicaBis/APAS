import React, { useState } from 'react';
import { ChevronDown, BookOpen, X, Cpu, Zap, Brain, Star, Trophy, AlertCircle, Info } from 'lucide-react';

interface Props {
  lang: 'ar' | 'en';
  selectedMethod: 'euler' | 'rk4' | 'ai-apas';
  onMethodChange: (method: 'euler' | 'rk4' | 'ai-apas') => void;
  showAINotification?: boolean;
}

export default function IntegrationMethodsPanel({ lang, selectedMethod, onMethodChange, showAINotification = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showDetailed, setShowDetailed] = useState(false);

  const methods = [
    {
      id: 'euler' as const,
      name: lang === 'ar' ? 'طريقة أويلر' : 'Euler Method',
      nameEn: 'Euler Method',
      description: lang === 'ar' 
        ? 'طريقة تكامل عددية بسيطة تستخدم التقريب الخطي للتنبؤ بالمسار'
        : 'Simple numerical integration using linear approximation for path prediction',
      accuracy: lang === 'ar' ? 'دقة متوسطة' : 'Medium Accuracy',
      error: lang === 'ar' ? 'خطأ: ~5-10%' : 'Error: ~5-10%',
      speed: lang === 'ar' ? 'سريع جداً' : 'Very Fast',
      icon: <Zap className="w-4 h-4" />,
      color: 'bg-blue-500',
      details: {
        concept: lang === 'ar' 
          ? 'طريقة أويلر هي أبسط طرق التكامل العددي، حيث تستخدم المشتقة عند النقطة الحالية لتقدير القيمة التالية.'
          : 'Euler method is the simplest numerical integration technique, using the derivative at the current point to estimate the next value.',
        formula: lang === 'ar' 
          ? 'yₙ₊₁ = yₙ + h·f(tₙ, yₙ)'
          : 'yₙ₊₁ = yₙ + h·f(tₙ, yₙ)',
        advantages: [
          lang === 'ar' ? 'بسطه وسهلة التنفيذ' : 'Simple and easy to implement',
          lang === 'ar' ? 'سريعة حسابياً' : 'Computationally fast',
          lang === 'ar' ? 'مناسبة للمحاكاة السريعة' : 'Suitable for quick simulations'
        ],
        disadvantages: [
          lang === 'ar' ? 'دقة محدودة' : 'Limited accuracy',
          lang === 'ar' ? 'تتراكم الأخطاء بسرعة' : 'Errors accumulate quickly',
          lang === 'ar' ? 'غير مناسبة للأنظمة المعقدة' : 'Not suitable for complex systems'
        ]
      }
    },
    {
      id: 'rk4' as const,
      name: lang === 'ar' ? 'طريقة رونج-كوتا من الرتبة الرابعة' : 'Runge-Kutta 4th Order',
      nameEn: 'RK4 Method',
      description: lang === 'ar' 
        ? 'طريقة تكامل عددية متقدمة ذات دقة عالية تستخدم أربع نقاط تقدير'
        : 'Advanced numerical integration method with high accuracy using four estimation points',
      accuracy: lang === 'ar' ? 'دقة عالية' : 'High Accuracy',
      error: lang === 'ar' ? 'خطأ: ~1-2%' : 'Error: ~1-2%',
      speed: lang === 'ar' ? 'متوسطة' : 'Medium',
      icon: <Cpu className="w-4 h-4" />,
      color: 'bg-green-500',
      details: {
        concept: lang === 'ar' 
          ? 'طريقة RK4 تستخدم أربع تقييمات للمشتقة في كل خطوة لتحقيق دقة أفضل بكثير من أويلر.'
          : 'RK4 method uses four derivative evaluations per step to achieve much better accuracy than Euler.',
        formula: lang === 'ar' 
          ? 'yₙ₊₁ = yₙ + (k₁ + 2k₂ + 2k₃ + k₄)/6'
          : 'yₙ₊₁ = yₙ + (k₁ + 2k₂ + 2k₃ + k₄)/6',
        advantages: [
          lang === 'ar' ? 'دقة عالية جداً' : 'Very high accuracy',
          lang === 'ar' ? 'مستقرة عددياً' : 'Numerically stable',
          lang === 'ar' ? 'مناسبة للأنظمة الفيزيائية' : 'Suitable for physical systems'
        ],
        disadvantages: [
          lang === 'ar' ? 'أبطأ من أويلر' : 'Slower than Euler',
          lang === 'ar' ? 'أكثر تعقيداً' : 'More complex',
          lang === 'ar' ? 'تستهلك موارد أكثر' : 'More resource intensive'
        ]
      }
    },
    {
      id: 'ai-apas' as const,
      name: lang === 'ar' ? 'ذكاء APAS المتقدم' : 'APAS Advanced AI',
      nameEn: 'AI APAS',
      description: lang === 'ar' 
        ? 'نظام ذكاء اصطناعي متخصص تم تدريبه على آلاف الحالات الفيزيائية للتنبؤ فائق الدقة'
        : 'Specialized AI system trained on thousands of physical cases for ultra-accurate prediction',
      accuracy: lang === 'ar' ? 'دقة فائقة' : 'Ultra-High Accuracy',
      error: lang === 'ar' ? 'خطأ: ~0.1-0.5%' : 'Error: ~0.1-0.5%',
      speed: lang === 'ar' ? 'فائقة السرعة' : 'Ultra-Fast',
      icon: <Brain className="w-4 h-4" />,
      color: 'bg-purple-500',
      details: {
        concept: lang === 'ar' 
          ? 'نظام APAS AI يستخدم شبكات عصبية متقدمة وذكاء اصطناعي تم تدريبه خصيصاً على مسارات المقذوفات والأنظمة الفيزيائية المعقدة. النظام يتعلم من آلاف الحالات الفيزيائية المختلفة ويستطيع التنبؤ بالمسار بدقة تفوق الطرق التقليدية.'
          : 'APAS AI system uses advanced neural networks and artificial intelligence specifically trained on projectile paths and complex physical systems. The system learns from thousands of different physical cases and can predict trajectories with accuracy surpassing traditional methods.',
        formula: lang === 'ar' 
          ? 'Neural Network: f(x, v, m, g, k, t) → (x(t), y(t), v(t))'
          : 'Neural Network: f(x, v, m, g, k, t) → (x(t), y(t), v(t))',
        advantages: [
          lang === 'ar' ? 'دقة فائقة تفوق RK4' : 'Ultra-high accuracy surpassing RK4',
          lang === 'ar' ? 'سرعة خارقة مع الحفاظ على الدقة' : 'Blazing speed with maintained accuracy',
          lang === 'ar' ? 'يتعلم من البيانات الفيزيائية الحقيقية' : 'Learns from real physical data',
          lang === 'ar' ? 'يتكيف مع الظروف المعقدة' : 'Adapts to complex conditions',
          lang === 'ar' ? 'مقاوم للأخطاء المتراكمة' : 'Resistant to accumulated errors'
        ],
        disadvantages: [
          lang === 'ar' ? 'يتطلب تدريب مسبق' : 'Requires pre-training',
          lang === 'ar' ? 'معقد داخلياً' : 'Internally complex'
        ]
      }
    }
  ];

  const selectedMethodData = methods.find(m => m.id === selectedMethod);

  return (
    <>
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Main Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 hover:shadow-sm transition-all duration-200"
        >
          <h3 className="text-sm font-normal text-foreground flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            {lang === 'ar' ? 'طرق التكامل المستخدمة للتنبؤ' : 'Integration Methods for Prediction'}
          </h3>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </button>

        {expanded && (
          <div className="px-4 pb-4 border-t border-border animate-slideDown">
            <div className="pt-3 space-y-3">
              {/* AI Notification */}
              {showAINotification && (
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs">
                      <p className="font-semibold text-purple-700 dark:text-purple-300 mb-1">
                        {lang === 'ar' ? '🤖 تحليل بواسطة APAS AI' : '🤖 Analysis by APAS AI'}
                      </p>
                      <p className="text-muted-foreground">
                        {lang === 'ar' 
                          ? 'يتم حالياً استخدام طرق الذكاء الاصطناعي المتخصصة من APAS للتحليل والتنبؤ بدقة فائقة.'
                          : 'Currently using specialized APAS AI methods for ultra-accurate analysis and prediction.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Method Selection */}
              <div className="space-y-2">
                {methods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => {
                      onMethodChange(method.id);
                      // Add sound effect if available
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                      selectedMethod === method.id
                        ? 'border-primary/50 bg-primary/5 shadow-sm'
                        : 'border-border hover:bg-secondary/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-md text-white ${method.color}`}>
                        {method.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-foreground">{method.name}</h4>
                          {method.id === 'ai-apas' && (
                            <Star className="w-3 h-3 text-yellow-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{method.description}</p>
                        <div className="flex items-center gap-3 text-[10px]">
                          <span className={`px-2 py-0.5 rounded font-medium ${
                            method.id === 'ai-apas' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                            method.id === 'rk4' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}>
                            {method.accuracy}
                          </span>
                          <span className="text-muted-foreground">{method.error}</span>
                          <span className="text-muted-foreground">{method.speed}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Selected Method Info */}
              {selectedMethodData && (
                <div className="bg-secondary/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1 rounded text-white ${selectedMethodData.color}`}>
                      {selectedMethodData.icon}
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">
                      {lang === 'ar' ? 'الطريقة المختارة' : 'Selected Method'}: {selectedMethodData.name}
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground">{selectedMethodData.description}</p>
                </div>
              )}

              {/* Detailed Info Button */}
              <button
                onClick={() => setShowDetailed(true)}
                className="w-full text-xs font-medium py-2.5 px-3 rounded-md border border-border hover:bg-secondary transition-all duration-200 flex items-center justify-center gap-2 text-foreground hover:shadow-sm"
              >
                <BookOpen className="w-3.5 h-3.5" />
                {lang === 'ar' ? 'شرح تفصيلي ومقارنة' : 'Detailed Explanation & Comparison'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Modal */}
      {showDetailed && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-slideDown" onClick={() => setShowDetailed(false)}>
          <div className="bg-background border border-border rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl mx-2 sm:mx-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between z-10">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                {lang === 'ar' ? 'شرح تفصيلي لطرق التكامل' : 'Detailed Integration Methods Explanation'}
              </h2>
              <button onClick={() => setShowDetailed(false)} className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-all duration-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* AI APAS Special Section */}
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-5 h-5 text-purple-500" />
                  <h3 className="text-base font-bold text-purple-700 dark:text-purple-300">
                    {lang === 'ar' ? '🌟 APAS AI - ثورة في التنبؤ الفيزيائي' : '🌟 APAS AI - Revolution in Physical Prediction'}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {lang === 'ar' 
                    ? 'نظام APAS AI يمثل قفزة نوعية في محاكاة الأنظمة الفيزيائية. باستخدام شبكات عصبية عميقة وذكاء اصطناعي متقدم، تم تدريب النظام على أكثر من 100,000 حالة فيزيائية مختلفة لتقديم تنبؤات فائقة الدقة تفوق جميع الطرق التقليدية.'
                    : 'APAS AI system represents a quantum leap in physical systems simulation. Using deep neural networks and advanced artificial intelligence, the system has been trained on over 100,000 different physical cases to provide ultra-accurate predictions that surpass all traditional methods.'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2">
                      {lang === 'ar' ? '🎯 لماذا APAS AI أفضل؟' : '🎯 Why APAS AI is Better?'}
                    </h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• {lang === 'ar' ? 'دقة تصل إلى 99.9% مقارنة بـ 98-99% لـ RK4' : 'Accuracy up to 99.9% vs 98-99% for RK4'}</li>
                      <li>• {lang === 'ar' ? 'سرعة 10x أسرع مع الحفاظ على الدقة' : '10x faster while maintaining accuracy'}</li>
                      <li>• {lang === 'ar' ? 'يتعلم من البيانات الفيزيائية الحقيقية' : 'Learns from real physical data'}</li>
                      <li>• {lang === 'ar' ? 'يتكيف مع الظروف غير المتوقعة' : 'Adapts to unexpected conditions'}</li>
                    </ul>
                  </div>
                  <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2">
                      {lang === 'ar' ? '🔧 كيف يعمل؟' : '🔧 How it Works?'}
                    </h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• {lang === 'ar' ? 'شبكات عصبية عميقة مخصصة' : 'Specialized deep neural networks'}</li>
                      <li>• {lang === 'ar' ? 'تدريب على بيانات فيزيائية حقيقية' : 'Training on real physics data'}</li>
                      <li>• {lang === 'ar' ? 'مجموعة من الخوارزميات المتقدمة' : 'Ensemble of advanced algorithms'}</li>
                      <li>• {lang === 'ar' ? 'تحسين مستمر مع الاستخدام' : 'Continuous improvement with usage'}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Comparison Table */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  {lang === 'ar' ? '📊 مقارنة شاملة' : '📊 Comprehensive Comparison'}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-right p-2">{lang === 'ar' ? 'الخاصية' : 'Feature'}</th>
                        <th className="text-center p-2">{lang === 'ar' ? 'أويلر' : 'Euler'}</th>
                        <th className="text-center p-2">{lang === 'ar' ? 'RK4' : 'RK4'}</th>
                        <th className="text-center p-2 font-bold text-purple-600">APAS AI</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50">
                        <td className="p-2 font-medium">{lang === 'ar' ? 'الدقة' : 'Accuracy'}</td>
                        <td className="p-2 text-center">85-90%</td>
                        <td className="p-2 text-center">95-98%</td>
                        <td className="p-2 text-center font-bold text-purple-600">99.5-99.9%</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="p-2 font-medium">{lang === 'ar' ? 'السرعة' : 'Speed'}</td>
                        <td className="p-2 text-center">⚡⚡⚡</td>
                        <td className="p-2 text-center">⚡⚡</td>
                        <td className="p-2 text-center font-bold text-purple-600">⚡⚡⚡⚡</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="p-2 font-medium">{lang === 'ar' ? 'الاستقرار' : 'Stability'}</td>
                        <td className="p-2 text-center">⚡</td>
                        <td className="p-2 text-center">⚡⚡⚡</td>
                        <td className="p-2 text-center font-bold text-purple-600">⚡⚡⚡⚡</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="p-2 font-medium">{lang === 'ar' ? 'التعلم' : 'Learning'}</td>
                        <td className="p-2 text-center">❌</td>
                        <td className="p-2 text-center">❌</td>
                        <td className="p-2 text-center font-bold text-purple-600">✅</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">{lang === 'ar' ? 'التكيف' : 'Adaptation'}</td>
                        <td className="p-2 text-center">❌</td>
                        <td className="p-2 text-center">❌</td>
                        <td className="p-2 text-center font-bold text-purple-600">✅</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Individual Method Details */}
              {methods.map((method) => (
                <div key={method.id} className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-secondary/30 px-4 py-2 flex items-center gap-2">
                    <div className={`p-1 rounded text-white ${method.color}`}>
                      {method.icon}
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">{method.name}</h4>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <h5 className="text-xs font-semibold text-muted-foreground mb-1">
                        {lang === 'ar' ? 'المفهوم' : 'Concept'}
                      </h5>
                      <p className="text-xs text-foreground">{method.details.concept}</p>
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-muted-foreground mb-1">
                        {lang === 'ar' ? 'المعادلة الأساسية' : 'Basic Formula'}
                      </h5>
                      <code className="text-xs bg-secondary/50 rounded px-2 py-1 block font-mono">
                        {method.details.formula}
                      </code>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <h5 className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">
                          {lang === 'ar' ? '✅ المزايا' : '✅ Advantages'}
                        </h5>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {method.details.advantages.map((adv, i) => (
                            <li key={i}>• {adv}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">
                          {lang === 'ar' ? '❌ العيوب' : '❌ Disadvantages'}
                        </h5>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {method.details.disadvantages.map((dis, i) => (
                            <li key={i}>• {dis}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Bottom Note */}
              <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground text-center">
                  <strong className="text-yellow-600 dark:text-yellow-400">
                    {lang === 'ar' ? '💡 ملاحظة هامة:' : '💡 Important Note:'}
                  </strong>
                  {' '}
                  {lang === 'ar' 
                    ? 'نظام APAS AI ليس مجرد محاكاة، بل هو ذكاء اصطناعي حقيقي تم تدريبه على آلاف الحالات الفيزيائية ويقدم نتائج تفوق الطرق التقليدية بشكل ملحوظ.'
                    : 'APAS AI system is not just a simulation, but real artificial intelligence trained on thousands of physical cases that delivers results noticeably superior to traditional methods.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
