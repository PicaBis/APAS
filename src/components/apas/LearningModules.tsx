import React from 'react';

interface LearningModulesProps {
  lang: string;
  analysisHistory?: Array<{
    id: number;
    timestamp: Date;
    type: 'vision' | 'video' | 'subject' | 'voice';
    report: string;
    mediaSrc?: string;
    mediaType?: 'video' | 'image';
    params?: { velocity?: number; angle?: number; height?: number; mass?: number };
  }>;
}

import { useState, useMemo } from 'react';

// وحدات تعليمية ذكية
const baseModules = [
  {
    id: 1,
    key: 'angle',
    title: {
      ar: 'الزاوية المثالية للمدى',
      en: 'Optimal Angle for Range',
    },
    description: {
      ar: 'تعلم كيف تؤثر زاوية القذف على مدى المقذوف.',
      en: 'Learn how launch angle affects projectile range.',
    },
    question: {
      ar: 'ما هي الزاوية المثالية لتحقيق أكبر مدى؟',
      en: 'What is the optimal angle for maximum range?',
    },
    options: [
      { ar: '30 درجة', en: '30°', correct: false },
      { ar: '45 درجة', en: '45°', correct: true },
      { ar: '60 درجة', en: '60°', correct: false },
    ],
    explanation: {
      ar: 'الزاوية المثالية هي 45 درجة لأن مركبتي السرعة الأفقية والرأسية متساويتان.',
      en: 'The optimal angle is 45° because horizontal and vertical velocity components are balanced.',
    },
  },
  {
    id: 2,
    key: 'velocity',
    title: {
      ar: 'تأثير السرعة الابتدائية',
      en: 'Effect of Initial Velocity',
    },
    description: {
      ar: 'اكتشف كيف تؤثر السرعة الابتدائية على مدى المقذوف.',
      en: 'Discover how initial velocity affects projectile range.',
    },
    question: {
      ar: 'إذا ضاعفت السرعة الابتدائية، ماذا يحدث للمدى؟',
      en: 'If you double the initial velocity, what happens to the range?',
    },
    options: [
      { ar: 'يتضاعف', en: 'It doubles', correct: false },
      { ar: 'يزداد أربعة أضعاف', en: 'It quadruples', correct: true },
      { ar: 'يبقى كما هو', en: 'Stays the same', correct: false },
    ],
    explanation: {
      ar: 'المدى يتناسب مع مربع السرعة الابتدائية، لذا إذا ضاعفت السرعة يتضاعف المدى أربع مرات.',
      en: 'Range is proportional to the square of initial velocity, so doubling velocity quadruples the range.',
    },
  },
];


const LearningModules: React.FC<LearningModulesProps> = ({ lang, analysisHistory }) => {
  // تحليل سجل المستخدم لاكتشاف الأخطاء المتكررة
  const mostCommonAngle = useMemo(() => {
    if (!analysisHistory || !analysisHistory.length) return null;
    const counts: Record<string, number> = {};
    analysisHistory.forEach(e => {
      if (e.params?.angle !== undefined) {
        const key = e.params.angle.toFixed(1);
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    let max = 0, val = null;
    for (const k in counts) if (counts[k] > max) { max = counts[k]; val = k; }
    return val;
  }, [analysisHistory]);

  // منطق اقتراح الدروس: إذا كرر المستخدم زاوية خاطئة (ليست 45)
  const showAngleLesson = mostCommonAngle && Math.abs(Number(mostCommonAngle) - 45) > 5;

  // منطق اقتراح درس السرعة: إذا كرر المستخدم نفس السرعة ولم يحصل على مدى جيد
  const showVelocityLesson = useMemo(() => {
    if (!analysisHistory || !analysisHistory.length) return false;
    const counts: Record<string, number> = {};
    analysisHistory.forEach(e => {
      if (e.params?.velocity !== undefined) {
        const key = e.params.velocity.toFixed(1);
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    let max = 0, val = null;
    for (const k in counts) if (counts[k] > max) { max = counts[k]; val = k; }
    // إذا كرر نفس السرعة أكثر من 3 مرات
    return max > 3;
  }, [analysisHistory]);

  // عرض الدروس حسب الحاجة
  const modules = [
    ...(showAngleLesson ? [baseModules[0]] : []),
    ...(showVelocityLesson ? [baseModules[1]] : []),
    // إذا لم يوجد أي درس مخصص، أظهر الدرس الأول دائمًا
    ...((!showAngleLesson && !showVelocityLesson) ? [baseModules[0]] : []),
  ];

  // حالة الإجابات
  const [answers, setAnswers] = useState<Record<number, number | null>>({});
  const [feedback, setFeedback] = useState<Record<number, string>>({});

  const handleAnswer = (modId: number, optIdx: number, correct: boolean, explanation: string) => {
    setAnswers(a => ({ ...a, [modId]: optIdx }));
    setFeedback(f => ({ ...f, [modId]: correct
      ? (lang === 'ar' ? 'إجابة صحيحة! أحسنت 👏' : 'Correct! Well done 👏')
      : (lang === 'ar' ? `إجابة غير صحيحة. ${explanation}` : `Incorrect. ${explanation}`)
    }));
  };

  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-100/40 to-blue-100/30 border border-emerald-300/30 mb-4 animate-fade-in">
      <h3 className="text-lg font-bold mb-2">{lang === 'ar' ? 'وحدات تعليمية تفاعلية' : 'Interactive Learning Modules'}</h3>
      {modules.map((mod) => (
        <div key={mod.id} className="mb-4 p-3 bg-white/80 rounded-xl border border-emerald-200/40 shadow-sm">
          <div className="font-semibold mb-1">{mod.title[lang] || mod.title.en}</div>
          <div className="text-sm mb-2">{mod.description[lang] || mod.description.en}</div>
          <div className="font-bold mb-1">{mod.question[lang] || mod.question.en}</div>
          <div className="flex flex-col gap-1">
            {mod.options.map((opt, i) => (
              <button
                key={i}
                className={`px-3 py-1 rounded-lg border border-emerald-300/40 bg-emerald-50 hover:bg-emerald-200/60 transition-all text-right ${answers[mod.id] === i ? (opt.correct ? 'bg-green-200 font-bold' : 'bg-red-100') : ''}`}
                disabled={answers[mod.id] !== undefined}
                onClick={() => handleAnswer(mod.id, i, !!opt.correct, mod.explanation[lang] || mod.explanation.en)}
              >
                {opt[lang] || opt.en}
              </button>
            ))}
          </div>
          {feedback[mod.id] && (
            <div className={`mt-2 text-sm font-semibold ${feedback[mod.id].startsWith('إجابة صحيحة') || feedback[mod.id].startsWith('Correct') ? 'text-green-700' : 'text-red-600'}`}>{feedback[mod.id]}</div>
          )}
        </div>
      ))}
      <div className="text-xs text-muted-foreground mt-2">{lang === 'ar' ? 'يتم اقتراح الدروس حسب أخطائك وتجاربك تلقائيًا.' : 'Lessons are suggested automatically based on your mistakes and experiments.'}</div>
    </div>
  );
};

export default LearningModules;
