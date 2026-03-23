import React, { useState, useEffect, useCallback } from 'react';
import { Bookmark, Trash2, GitCompare, Clock, ChevronRight, X } from 'lucide-react';

export interface SavedExperiment {
  id: string;
  timestamp: number;
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
  range: number;
  maxHeight: number;
  flightTime: number;
  integrationMethod: string;
}

interface MobileSavedExperimentsProps {
  lang: string;
  currentParams?: {
    velocity: number;
    angle: number;
    height: number;
    gravity: number;
    airResistance: number;
    mass: number;
  };
  prediction?: {
    range: number;
    maxHeight: number;
    timeOfFlight: number;
  } | null;
  integrationMethod: string;
  onLoadExperiment?: (exp: SavedExperiment) => void;
}

const STORAGE_KEY = 'apas_saved_experiments';

const MobileSavedExperiments: React.FC<MobileSavedExperimentsProps> = ({
  lang,
  currentParams,
  prediction,
  integrationMethod,
  onLoadExperiment,
}) => {
  const [experiments, setExperiments] = useState<SavedExperiment[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setExperiments(JSON.parse(stored));
    } catch { /* silent */ }
  }, []);

  // Save to localStorage
  const saveToStorage = useCallback((exps: SavedExperiment[]) => {
    setExperiments(exps);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(exps)); } catch { /* silent */ }
  }, []);

  const handleSave = useCallback(() => {
    if (!currentParams || !prediction) return;
    const exp: SavedExperiment = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      velocity: currentParams.velocity,
      angle: currentParams.angle,
      height: currentParams.height,
      gravity: currentParams.gravity,
      airResistance: currentParams.airResistance,
      mass: currentParams.mass,
      range: prediction.range,
      maxHeight: prediction.maxHeight,
      flightTime: prediction.timeOfFlight,
      integrationMethod,
    };
    saveToStorage([exp, ...experiments].slice(0, 50)); // Max 50 experiments
  }, [currentParams, prediction, integrationMethod, experiments, saveToStorage]);

  const handleDelete = useCallback((id: string) => {
    saveToStorage(experiments.filter((e) => e.id !== id));
  }, [experiments, saveToStorage]);

  const handleClearAll = useCallback(() => {
    saveToStorage([]);
  }, [saveToStorage]);

  const t = {
    title: lang === 'ar' ? 'التجارب المحفوظة' : lang === 'fr' ? 'Expériences Sauvées' : 'Saved Experiments',
    save: lang === 'ar' ? 'حفظ التجربة الحالية' : lang === 'fr' ? 'Sauver' : 'Save Current',
    noData: lang === 'ar' ? 'لا توجد تجارب محفوظة' : lang === 'fr' ? 'Aucune expérience' : 'No saved experiments',
    compare: lang === 'ar' ? 'مقارنة' : lang === 'fr' ? 'Comparer' : 'Compare',
    clearAll: lang === 'ar' ? 'حذف الكل' : lang === 'fr' ? 'Tout supprimer' : 'Clear All',
    load: lang === 'ar' ? 'تحميل' : lang === 'fr' ? 'Charger' : 'Load',
    range: lang === 'ar' ? 'المدى' : lang === 'fr' ? 'Portée' : 'Range',
    maxH: lang === 'ar' ? 'أقصى ارتفاع' : lang === 'fr' ? 'H. Max' : 'Max H',
    time: lang === 'ar' ? 'الزمن' : lang === 'fr' ? 'Temps' : 'Time',
  };

  const selectedExps = experiments.filter((e) => selected.includes(e.id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-primary" />
          {t.title}
        </h3>
        <div className="flex items-center gap-1.5">
          {experiments.length > 1 && (
            <button
              onClick={() => { setCompareMode(!compareMode); setSelected([]); }}
              className={`text-[10px] font-medium px-2.5 py-1 rounded-lg transition-all touch-manipulation ${
                compareMode ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
              }`}
            >
              <GitCompare className="w-3 h-3 inline mr-1" />
              {t.compare}
            </button>
          )}
          {experiments.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-[10px] font-medium px-2 py-1 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all touch-manipulation"
            >
              {t.clearAll}
            </button>
          )}
        </div>
      </div>

      {/* Save button */}
      {currentParams && prediction && (
        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-semibold hover:bg-primary/20 active:scale-[0.98] transition-all touch-manipulation"
        >
          <Bookmark className="w-4 h-4" />
          {t.save}
        </button>
      )}

      {/* Experiments list */}
      {experiments.length === 0 ? (
        <div className="py-8 text-center">
          <Bookmark className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">{t.noData}</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[40vh] overflow-y-auto overscroll-contain">
          {experiments.map((exp) => (
            <div
              key={exp.id}
              className={`p-3 rounded-xl border transition-all duration-200 ${
                selected.includes(exp.id)
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-secondary/30 border-border/30 hover:border-border/60'
              }`}
              onClick={() => {
                if (compareMode) {
                  setSelected((prev) =>
                    prev.includes(exp.id)
                      ? prev.filter((id) => id !== exp.id)
                      : prev.length < 2
                        ? [...prev, exp.id]
                        : [prev[1], exp.id]
                  );
                }
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {new Date(exp.timestamp).toLocaleString(lang === 'ar' ? 'ar-SA' : lang === 'fr' ? 'fr-FR' : 'en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </div>
                <div className="flex items-center gap-1">
                  {!compareMode && onLoadExperiment && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onLoadExperiment(exp); }}
                      className="text-[9px] font-medium px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-all touch-manipulation"
                    >
                      {t.load}
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(exp.id); }}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all touch-manipulation"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div>
                  <span className="text-muted-foreground">{t.range}</span>
                  <p className="font-mono font-semibold text-foreground">{exp.range.toFixed(1)}m</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t.maxH}</span>
                  <p className="font-mono font-semibold text-foreground">{exp.maxHeight.toFixed(1)}m</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t.time}</span>
                  <p className="font-mono font-semibold text-foreground">{exp.flightTime.toFixed(2)}s</p>
                </div>
              </div>
              <div className="mt-1.5 text-[9px] text-muted-foreground">
                V={exp.velocity} | θ={exp.angle}° | g={exp.gravity} | {exp.integrationMethod.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compare panel */}
      {compareMode && selectedExps.length === 2 && (
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">{t.compare}</span>
            <button onClick={() => setSelected([])} className="p-1 rounded hover:bg-secondary touch-manipulation">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 text-[10px]">
            <div className="font-medium text-muted-foreground"></div>
            <div className="font-medium text-muted-foreground text-center">{t.range}</div>
            <div className="font-medium text-muted-foreground text-center">{t.maxH}</div>
            <div className="font-medium text-muted-foreground text-center">{t.time}</div>
            {selectedExps.map((exp, i) => (
              <React.Fragment key={exp.id}>
                <div className={`font-semibold ${i === 0 ? 'text-blue-500' : 'text-amber-500'}`}>#{i + 1}</div>
                <div className="font-mono text-center text-foreground">{exp.range.toFixed(1)}</div>
                <div className="font-mono text-center text-foreground">{exp.maxHeight.toFixed(1)}</div>
                <div className="font-mono text-center text-foreground">{exp.flightTime.toFixed(2)}</div>
              </React.Fragment>
            ))}
            {/* Diff row */}
            <div className="font-semibold text-primary">Δ</div>
            <div className="font-mono text-center text-primary">{Math.abs(selectedExps[0].range - selectedExps[1].range).toFixed(1)}</div>
            <div className="font-mono text-center text-primary">{Math.abs(selectedExps[0].maxHeight - selectedExps[1].maxHeight).toFixed(1)}</div>
            <div className="font-mono text-center text-primary">{Math.abs(selectedExps[0].flightTime - selectedExps[1].flightTime).toFixed(2)}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileSavedExperiments;
