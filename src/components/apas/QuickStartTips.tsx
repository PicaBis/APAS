import React, { useState } from 'react';
import { Lightbulb, X, Keyboard, RotateCcw, ChevronRight } from 'lucide-react';

interface QuickStartTipsProps {
  lang: string;
  hasTrajectory: boolean;
  hasMediaAnalysis: boolean;
  onDismiss: () => void;
}

const QuickStartTips: React.FC<QuickStartTipsProps> = ({
  lang, hasTrajectory, hasMediaAnalysis, onDismiss,
}) => {
  const [currentTip, setCurrentTip] = useState(0);
  const isRTL = lang === 'ar';

  const tips = lang === 'ar' ? [
    { icon: '🎯', title: 'تلميح: زوايا المشاهدة', text: 'استخدم أزرار التكبير والتصغير أعلى اللوحة لضبط زاوية الرؤية. جرّب الوضع ثلاثي الأبعاد لمنظور مختلف.' },
    { icon: '⌨️', title: 'اختصارات لوحة المفاتيح', text: 'مسافة = تشغيل/إيقاف • R = إعادة تعيين • +/- = تكبير/تصغير • M = كتم الصوت • F = ملء الشاشة • G = الشبكة' },
    { icon: '📊', title: 'لوحة التحليلات', text: 'تابع الرسوم البيانية الديناميكية أسفل اللوحة لرؤية السرعة والطاقة والمسار في الوقت الحقيقي.' },
    { icon: '🔬', title: 'مقارنة المسارات', text: 'بعد تحليل فيديو، استخدم زر "المقارنة النظرية" لمقارنة المسار المثالي بالمسار الواقعي.' },
    { icon: '🤖', title: 'مساعد APAS', text: 'اسأل مساعد APAS عن أي مفهوم فيزيائي. يظهر بجانب اللوحة دون حجب المحاكاة.' },
  ] : lang === 'fr' ? [
    { icon: '🎯', title: 'Astuce: Angles de Vue', text: 'Utilisez les boutons de zoom au-dessus du canevas pour ajuster la vue. Essayez le mode 3D pour une perspective diff\u00e9rente.' },
    { icon: '⌨️', title: 'Raccourcis Clavier', text: 'Espace = Lecture/Pause \u2022 R = R\u00e9initialiser \u2022 +/- = Zoom \u2022 M = Muet \u2022 F = Plein \u00e9cran \u2022 G = Grille' },
    { icon: '📊', title: 'Tableau de Bord', text: 'Suivez les graphiques dynamiques sous le canevas pour voir la vitesse, l\'\u00e9nergie et la trajectoire en temps r\u00e9el.' },
    { icon: '🔬', title: 'Comparaison de Trajectoires', text: 'Apr\u00e8s l\'analyse vid\u00e9o, utilisez le bouton de comparaison pour confronter le chemin th\u00e9orique au chemin r\u00e9el.' },
    { icon: '🤖', title: 'Assistant APAS', text: 'Demandez \u00e0 l\'assistant APAS n\'importe quel concept physique. Il appara\u00eet \u00e0 c\u00f4t\u00e9 du canevas sans bloquer la simulation.' },
  ] : [
    { icon: '🎯', title: 'Tip: Viewing Angles', text: 'Use zoom buttons above the canvas to adjust your view. Try 3D mode for a different perspective on elements above and below.' },
    { icon: '⌨️', title: 'Keyboard Shortcuts', text: 'Space = Play/Pause \u2022 R = Reset \u2022 +/- = Zoom \u2022 M = Mute \u2022 F = Fullscreen \u2022 G = Grid' },
    { icon: '📊', title: 'Analytics Dashboard', text: 'Watch the dynamic charts below the canvas for real-time velocity, energy, and trajectory visualization.' },
    { icon: '🔬', title: 'Path Comparison', text: 'After analyzing a video, use the "Theoretical Comparison" button to compare ideal vs real-world paths.' },
    { icon: '🤖', title: 'APAS Assistant', text: 'Ask the APAS assistant about any physics concept. It appears beside the canvas without blocking the simulation.' },
  ];

  return (
    <div className="border border-amber-500/25 rounded-xl overflow-hidden bg-gradient-to-br from-amber-500/5 via-amber-500/3 to-orange-500/5 backdrop-blur-sm shadow-sm" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="px-3.5 py-2.5 flex items-center justify-between bg-amber-500/5 border-b border-amber-500/10">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-amber-500/15">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <span className="text-xs font-bold text-foreground tracking-wide">
            {lang === 'ar' ? 'نصائح سريعة' : lang === 'fr' ? 'Conseils Rapides' : 'Quick Tips'}
          </span>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold">
            {currentTip + 1}/{tips.length}
          </span>
        </div>
        <button onClick={onDismiss} className="p-1.5 rounded-lg hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all duration-200">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-3.5 pb-3.5 pt-2.5">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-background/60 border border-border/20 shadow-sm transition-all duration-300 hover:bg-background/80 hover:shadow-md">
          <span className="text-xl shrink-0 mt-0.5">{tips[currentTip].icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground mb-1">{tips[currentTip].title}</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{tips[currentTip].text}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-1.5">
            {tips.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentTip(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentTip ? 'bg-amber-500 w-5' : 'bg-border hover:bg-muted-foreground w-1.5'}`}
              />
            ))}
          </div>
          <button
            onClick={() => setCurrentTip((currentTip + 1) % tips.length)}
            className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-500 flex items-center gap-0.5 transition-colors px-2 py-1 rounded-lg hover:bg-amber-500/10"
          >
            {lang === 'ar' ? 'التالي' : 'Next'}
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickStartTips;
