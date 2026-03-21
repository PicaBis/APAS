import React, { useState, useCallback, useEffect } from 'react';
import { Target, Trophy, ChevronDown, RotateCcw, Star, Zap } from 'lucide-react';
import { playUIClick, playClick, playSectionToggle, playBounce, playLaunch } from '@/utils/sound';

interface Props {
  lang: string;
  muted: boolean;
  prediction: { range: number; maxHeight: number; timeOfFlight: number } | null;
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  onSetVelocity: (v: number) => void;
  onSetAngle: (a: number) => void;
  onSetHeight: (h: number) => void;
  onStartAnimation: () => void;
}

interface Level {
  id: number;
  targetX: number;
  tolerance: number; // meters tolerance for hit
  label: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  points: number;
}

const DIFFICULTY_COLORS = {
  easy: 'text-green-500',
  medium: 'text-yellow-500',
  hard: 'text-orange-500',
  expert: 'text-red-500',
};

const DIFFICULTY_LABELS: Record<string, Record<string, string>> = {
  easy: { ar: 'سهل', en: 'Easy', fr: 'Facile' },
  medium: { ar: 'متوسط', en: 'Medium', fr: 'Moyen' },
  hard: { ar: 'صعب', en: 'Hard', fr: 'Difficile' },
  expert: { ar: 'خبير', en: 'Expert', fr: 'Expert' },
};

export default function TargetChallenge({
  lang, muted, prediction, velocity, angle, height, gravity,
  onSetVelocity, onSetAngle, onSetHeight, onStartAnimation,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    try { return Number(localStorage.getItem('apas_challenge_best') || '0'); } catch { return 0; }
  });
  const [lastResult, setLastResult] = useState<'hit' | 'miss' | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const isAr = lang === 'ar';
  const isFr = lang === 'fr';

  const t = (ar: string, en: string, fr?: string) => isAr ? ar : isFr ? (fr || en) : en;

  // Generate levels based on current gravity
  const generateLevels = useCallback((): Level[] => {
    const baseRange = (50 * 50 * Math.sin(2 * 45 * Math.PI / 180)) / gravity;
    return [
      { id: 1, targetX: Math.round(baseRange * 0.3), tolerance: baseRange * 0.08, label: '🎯 1', difficulty: 'easy', points: 10 },
      { id: 2, targetX: Math.round(baseRange * 0.5), tolerance: baseRange * 0.06, label: '🎯 2', difficulty: 'easy', points: 20 },
      { id: 3, targetX: Math.round(baseRange * 0.7), tolerance: baseRange * 0.05, label: '🎯 3', difficulty: 'medium', points: 30 },
      { id: 4, targetX: Math.round(baseRange * 0.9), tolerance: baseRange * 0.04, label: '🎯 4', difficulty: 'medium', points: 50 },
      { id: 5, targetX: Math.round(baseRange * 1.1), tolerance: baseRange * 0.035, label: '🎯 5', difficulty: 'hard', points: 75 },
      { id: 6, targetX: Math.round(baseRange * 0.4), tolerance: baseRange * 0.025, label: '🎯 6', difficulty: 'hard', points: 100 },
      { id: 7, targetX: Math.round(baseRange * 0.6), tolerance: baseRange * 0.02, label: '🎯 7', difficulty: 'expert', points: 150 },
      { id: 8, targetX: Math.round(baseRange * 0.8), tolerance: baseRange * 0.015, label: '🎯 8', difficulty: 'expert', points: 200 },
    ];
  }, [gravity]);

  useEffect(() => { setLevels(generateLevels()); }, [generateLevels]);

  const currentTarget = levels[currentLevel];

  const handleStart = () => {
    setActive(true);
    setScore(0);
    setAttempts(0);
    setCurrentLevel(0);
    setLastResult(null);
    setLevels(generateLevels());
    playUIClick(muted);
  };

  const handleFire = () => {
    onStartAnimation();
    setAttempts(prev => prev + 1);
    playLaunch(muted);

    // Check result after a short delay
    setTimeout(() => {
      if (!prediction || !currentTarget) return;
      const distance = Math.abs(prediction.range - currentTarget.targetX);
      if (distance <= currentTarget.tolerance) {
        // Hit!
        const bonus = Math.max(0, Math.round((1 - distance / currentTarget.tolerance) * currentTarget.points * 0.5));
        const earned = currentTarget.points + bonus;
        setScore(prev => prev + earned);
        setLastResult('hit');
        playBounce(muted, 1);

        // Advance level
        if (currentLevel < levels.length - 1) {
          setTimeout(() => {
            setCurrentLevel(prev => prev + 1);
            setLastResult(null);
          }, 1500);
        } else {
          // All levels complete!
          const finalScore = score + earned;
          if (finalScore > bestScore) {
            setBestScore(finalScore);
            try { localStorage.setItem('apas_challenge_best', String(finalScore)); } catch { /* storage unavailable */ }
          }
        }
      } else {
        setLastResult('miss');
        playClick(muted);
      }
    }, 300);
  };

  const handleReset = () => {
    handleStart();
  };

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
      <button
        onClick={() => { setExpanded(!expanded); playSectionToggle(muted); }}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary/5 transition-all duration-300"
      >
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-tight flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-primary" />
          {t('تحدي إصابة الهدف', 'Target Challenge', 'Défi de cible')}
        </h3>
        <div className="flex items-center gap-2">
          {!expanded && bestScore > 0 && (
            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
              <Trophy className="w-3 h-3 text-yellow-500" /> {bestScore}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-border space-y-2 pt-2 animate-slideDown">
          {!active ? (
            <>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {t(
                  'اضبط السرعة والزاوية لإصابة الهدف! كل مستوى أصعب من السابق.',
                  'Adjust velocity & angle to hit the target! Each level gets harder.',
                  'Ajustez vitesse & angle pour toucher la cible ! Chaque niveau est plus dur.',
                )}
              </p>
              {bestScore > 0 && (
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Trophy className="w-3 h-3 text-yellow-500" />
                  {t('أفضل نتيجة', 'Best Score', 'Meilleur score')}: <strong className="text-foreground">{bestScore}</strong>
                </div>
              )}
              <button
                onClick={handleStart}
                className="w-full py-2.5 text-xs font-bold bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                {t('ابدأ التحدي', 'Start Challenge', 'Commencer le défi')}
              </button>
            </>
          ) : (
            <>
              {/* Status bar */}
              <div className="flex items-center justify-between bg-secondary/30 rounded-lg p-2">
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="text-foreground"><Star className="w-3 h-3 inline text-yellow-500" /> {score}</span>
                  <span className="text-muted-foreground">{t('المحاولات', 'Attempts', 'Essais')}: {attempts}</span>
                  <span className="text-muted-foreground">{t('المستوى', 'Level', 'Niveau')}: {currentLevel + 1}/{levels.length}</span>
                </div>
                <button onClick={handleReset} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>

              {/* Current target */}
              {currentTarget && (
                <div className="bg-secondary/30 rounded-lg p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{currentTarget.label}</span>
                    <span className={`text-[10px] font-medium ${DIFFICULTY_COLORS[currentTarget.difficulty]}`}>
                      {DIFFICULTY_LABELS[currentTarget.difficulty][lang] || DIFFICULTY_LABELS[currentTarget.difficulty].en}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {t('الهدف على بُعد', 'Target at', 'Cible à')} <strong className="text-foreground">{currentTarget.targetX.toFixed(1)} m</strong>
                    {' '}{t('(هامش الخطأ ±', '(tolerance ±', '(tolérance ±')}{currentTarget.tolerance.toFixed(1)} m)
                  </p>
                  <p className="text-[10px] text-primary font-medium">
                    {t('النقاط', 'Points', 'Points')}: {currentTarget.points}
                  </p>

                  {prediction && (
                    <p className="text-[9px] text-muted-foreground font-mono">
                      {t('المدى الحالي', 'Current range', 'Portée actuelle')}: {prediction.range.toFixed(2)} m
                      ({Math.abs(prediction.range - currentTarget.targetX).toFixed(2)} m {t('بعيداً', 'away', 'de distance')})
                    </p>
                  )}
                </div>
              )}

              {/* Result feedback */}
              {lastResult && (
                <div className={`text-center py-2 rounded-lg text-xs font-bold animate-slideDown ${
                  lastResult === 'hit' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-400'
                }`}>
                  {lastResult === 'hit'
                    ? t('🎯 إصابة! أحسنت!', '🎯 Hit! Well done!', '🎯 Touché ! Bravo !')
                    : t('❌ أخطأت! حاول مجدداً', '❌ Miss! Try again', '❌ Raté ! Réessayez')
                  }
                </div>
              )}

              {/* Fire button */}
              {currentLevel < levels.length && (
                <button
                  onClick={handleFire}
                  className="w-full py-2 text-xs font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Target className="w-4 h-4" />
                  {t('أطلق!', 'Fire!', 'Tirer !')}
                </button>
              )}

              {/* All levels complete */}
              {currentLevel >= levels.length && (
                <div className="text-center py-3 space-y-2 animate-slideDown">
                  <p className="text-sm font-bold text-foreground">🏆 {t('أكملت كل المستويات!', 'All levels complete!', 'Tous les niveaux terminés !')}</p>
                  <p className="text-xs text-primary font-semibold">{t('النتيجة النهائية', 'Final Score', 'Score final')}: {score}</p>
                  <button onClick={handleReset} className="px-4 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                    {t('إعادة التحدي', 'Restart', 'Recommencer')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
