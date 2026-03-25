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
    <div className="border border-amber-500/20 rounded-xl overflow-hidden bg-amber-500/5 backdrop-blur-sm" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-semibold text-foreground">
            {lang === 'ar' ? 'نصائح سريعة' : lang === 'fr' ? 'Conseils Rapides' : 'Quick Tips'}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
            {currentTip + 1}/{tips.length}
          </span>
        </div>
        <button onClick={onDismiss} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-3 pb-3">
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-background/50 border border-border/30">
          <span className="text-lg shrink-0">{tips[currentTip].icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">{tips[currentTip].title}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{tips[currentTip].text}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-1">
            {tips.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentTip(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentTip ? 'bg-amber-500 w-4' : 'bg-border hover:bg-muted-foreground'}`}
              />
            ))}
          </div>
          <button
            onClick={() => setCurrentTip((currentTip + 1) % tips.length)}
            className="text-[10px] text-amber-600 dark:text-amber-400 hover:text-amber-500 flex items-center gap-0.5 transition-colors"
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
