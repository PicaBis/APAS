import React, { useState } from 'react';

interface Step {
  title: { ar: string; en: string };
  description: { ar: string; en: string };
  action?: () => void;
}

const steps: Step[] = [
  {
    title: { ar: 'ابدأ المحاكاة', en: 'Start the Simulation' },
    description: {
      ar: 'اضغط على زر "تشغيل" لبدء المحاكاة وشاهد حركة المقذوف.',
      en: 'Press the "Play" button to start the simulation and watch the projectile move.',
    },
  },
  {
    title: { ar: 'غيّر الزاوية أو السرعة', en: 'Change Angle or Velocity' },
    description: {
      ar: 'استخدم منزلق الزاوية أو السرعة ولاحظ كيف يتغير المسار.',
      en: 'Use the angle or velocity slider and see how the path changes.',
    },
  },
  {
    title: { ar: 'جرب التحليل الذكي', en: 'Try Smart Analysis' },
    description: {
      ar: 'اضغط على زر الذكاء الاصطناعي في النتائج لتحصل على شرح ذكي.',
      en: 'Click the AI button in the results to get a smart explanation.',
    },
  },
  {
    title: { ar: 'استخدم وحدات التعلم', en: 'Use Learning Modules' },
    description: {
      ar: 'جرب الوحدات التعليمية التفاعلية في الشريط الجانبي لتثبيت المفاهيم.',
      en: 'Try the interactive learning modules in the sidebar to reinforce concepts.',
    },
  },
  {
    title: { ar: 'فعّل المستشعرات', en: 'Activate Sensors' },
    description: {
      ar: 'استخدم مختبر المستشعرات لربط هاتفك بالمحاكاة مباشرة.',
      en: 'Use the Sensor Lab to connect your phone sensors directly to the simulation.',
    },
  },
];

const InteractiveGuide: React.FC<{ lang: string }> = ({ lang }) => {
  const [step, setStep] = useState(0);
  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-100/40 to-emerald-100/30 border border-blue-300/30 mb-4 animate-fade-in">
      <h3 className="text-lg font-bold mb-2">{lang === 'ar' ? 'دليل الاستخدام التفاعلي' : 'Interactive Usage Guide'}</h3>
      <div className="mb-2 font-semibold">{steps[step].title[lang] || steps[step].title.en}</div>
      <div className="mb-3 text-sm">{steps[step].description[lang] || steps[step].description.en}</div>
      <div className="flex gap-2">
        <button
          className="px-3 py-1 rounded-lg bg-primary/80 text-white font-bold shadow hover:bg-primary/90 transition-all disabled:opacity-60"
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
        >{lang === 'ar' ? 'السابق' : 'Previous'}</button>
        <button
          className="px-3 py-1 rounded-lg bg-primary/80 text-white font-bold shadow hover:bg-primary/90 transition-all disabled:opacity-60"
          onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))}
          disabled={step === steps.length - 1}
        >{lang === 'ar' ? 'التالي' : 'Next'}</button>
      </div>
      <div className="text-xs text-muted-foreground mt-2">{lang === 'ar' ? `الخطوة ${step + 1} من ${steps.length}` : `Step ${step + 1} of ${steps.length}`}</div>
    </div>
  );
};

export default InteractiveGuide;
