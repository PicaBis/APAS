import React, { useState } from 'react';
import { X, Lock, Unlock, Clock, Layers, Info, RotateCcw } from 'lucide-react';

export interface StroboscopicSettings {
  enabled: boolean;
  deltaT: number;
  showProjections: boolean;
  showDetails: boolean;
}

export interface StroboscopicMark {
  x: number;
  y: number;
  time: number;
  vx: number;
  vy: number;
  speed: number;
}

interface StroboscopicModalProps {
  open: boolean;
  onClose: () => void;
  lang: string;
  settings: StroboscopicSettings;
  onSettingsChange: (settings: StroboscopicSettings) => void;
  marks: StroboscopicMark[];
  gravity: number;
  isSimulationDone: boolean;
}

export default function StroboscopicModal({
  open, onClose, lang, settings, onSettingsChange, marks, gravity, isSimulationDone,
}: StroboscopicModalProps) {
  const [inputDeltaT, setInputDeltaT] = useState(settings.deltaT.toString());

  const t = (ar: string, en: string, fr?: string) =>
    lang === 'ar' ? ar : lang === 'fr' ? (fr || en) : en;

  const canShowProjections = isSimulationDone && marks.length >= 2;
  const canShowDetails = settings.showProjections && canShowProjections;

  const handleConfirmDeltaT = () => {
    const val = parseFloat(inputDeltaT);
    if (!isNaN(val) && val > 0) {
      onSettingsChange({ ...settings, enabled: true, deltaT: val });
    }
  };

  const handleReset = () => {
    setInputDeltaT('0.5');
    onSettingsChange({ enabled: false, deltaT: 0.5, showProjections: false, showDetails: false });
  };

  const handleToggleProjections = () => {
    if (!canShowProjections) return;
    const newShow = !settings.showProjections;
    onSettingsChange({
      ...settings,
      showProjections: newShow,
      showDetails: newShow ? settings.showDetails : false,
    });
  };

  const handleToggleDetails = () => {
    if (!canShowDetails) return;
    onSettingsChange({ ...settings, showDetails: !settings.showDetails });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="relative w-[95vw] max-w-lg max-h-[90vh] bg-background border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/30">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              {t('التصوير المتعاقب', 'Stroboscopic Photography', 'Photographie Stroboscopique')}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {t(
                'تحليل حركة المقذوف عبر الزمن بعلامات زمنية',
                'Analyze projectile motion over time with time markers',
                'Analyser le mouvement du projectile avec des marqueurs temporels'
              )}
            </p>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {/* Section 1: Time Interval — Always open */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-green-500/10 border-b border-border flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <h3 className="text-sm font-semibold text-foreground">
                {t('الفاصل الزمني', 'Time Interval', 'Intervalle de Temps')}
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                {t(
                  'أدخل الفاصل الزمني Δt (بالثواني) لوضع علامات X على مسار المقذوف',
                  'Enter the time interval Δt (in seconds) to place X marks on the projectile path',
                  'Entrez l\'intervalle de temps Δt (en secondes) pour placer des marqueurs X sur la trajectoire'
                )}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.01"
                    value={inputDeltaT}
                    onChange={(e) => setInputDeltaT(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmDeltaT(); }}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder="Δt (s)"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">s</span>
                </div>
                <button
                  onClick={handleConfirmDeltaT}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {t('موافق', 'OK', 'OK')}
                </button>
                {settings.enabled && (
                  <button
                    onClick={handleReset}
                    className="px-3 py-2 text-sm font-medium rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-1.5"
                    title={t('إعادة تعيين', 'Reset', 'Réinitialiser')}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {t('إعادة تعيين', 'Reset', 'Réinitialiser')}
                  </button>
                )}
              </div>
              {settings.enabled && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  {t(
                    `مفعّل — Δt = ${settings.deltaT} ث`,
                    `Enabled — Δt = ${settings.deltaT} s`,
                    `Activé — Δt = ${settings.deltaT} s`
                  )}
                  {marks.length > 0 && ` (${marks.length} ${t('علامة', 'marks', 'marqueurs')})`}
                </p>
              )}
            </div>
          </div>

          {/* Section 2: Show Projections — Locked until 2+ marks */}
          <div className={`border rounded-lg overflow-hidden transition-opacity duration-300 ${canShowProjections ? 'border-border' : 'border-border/50 opacity-60'}`}>
            <button
              onClick={handleToggleProjections}
              disabled={!canShowProjections}
              className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${canShowProjections ? 'hover:bg-secondary/50 cursor-pointer' : 'cursor-not-allowed'} ${settings.showProjections ? 'bg-yellow-500/10' : 'bg-secondary/20'}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${settings.showProjections ? 'bg-yellow-500' : 'bg-muted-foreground/40'}`} />
                <h3 className="text-sm font-semibold text-foreground">
                  {t('إظهار الإسقاطات', 'Show Projections', 'Afficher les Projections')}
                </h3>
              </div>
              {canShowProjections ? (
                <Unlock className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Lock className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {!canShowProjections && (
              <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border/30">
                {t(
                  'يجب تشغيل المحاكاة مع وجود علامتين على الأقل',
                  'Run the simulation with at least 2 marks to unlock',
                  'Lancez la simulation avec au moins 2 marqueurs pour débloquer'
                )}
              </div>
            )}
            {settings.showProjections && canShowProjections && (
              <div className="p-4 border-t border-border space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-6 h-0.5 bg-green-500 inline-block" style={{ borderTop: '2px dashed' }} />
                  <span className="text-muted-foreground">
                    {t('إسقاط على محور X — حركة مستقيمة منتظمة (MRU)', 'X-axis projection — Uniform Rectilinear Motion (MRU)', 'Projection X — MRU')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-6 h-0.5 bg-orange-500 inline-block" style={{ borderTop: '2px dashed' }} />
                  <span className="text-muted-foreground">
                    {t('إسقاط على محور Y — حركة مستقيمة متسارعة (MRUA)', 'Y-axis projection — Uniformly Accelerated Motion (MRUA)', 'Projection Y — MRUA')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Projection Details — Locked until Section 2 active */}
          <div className={`border rounded-lg overflow-hidden transition-opacity duration-300 ${canShowDetails ? 'border-border' : 'border-border/50 opacity-60'}`}>
            <button
              onClick={handleToggleDetails}
              disabled={!canShowDetails}
              className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${canShowDetails ? 'hover:bg-secondary/50 cursor-pointer' : 'cursor-not-allowed'} ${settings.showDetails ? 'bg-orange-500/10' : 'bg-secondary/20'}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${settings.showDetails ? 'bg-orange-500' : 'bg-muted-foreground/40'}`} />
                <h3 className="text-sm font-semibold text-foreground">
                  {t('تفاصيل الإسقاطات', 'Projection Details', 'Détails des Projections')}
                </h3>
              </div>
              {canShowDetails ? (
                <Info className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Lock className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {!canShowDetails && !settings.showProjections && (
              <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border/30">
                {t(
                  'يجب تفعيل "إظهار الإسقاطات" أولاً',
                  'Enable "Show Projections" first',
                  'Activez "Afficher les Projections" d\'abord'
                )}
              </div>
            )}
            {settings.showDetails && canShowDetails && (
              <div className="p-4 border-t border-border space-y-4">
                {/* Motion Analysis Summary */}
                <div className="grid grid-cols-2 gap-3">
                  {/* X-axis info */}
                  <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 space-y-1.5">
                    <h4 className="text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      {t('محور X', 'X-axis', 'Axe X')}
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                      {t('النوع: MRU', 'Type: MRU', 'Type: MRU')}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {t('السرعة: ثابتة', 'Velocity: Constant', 'Vitesse: Constante')}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {t('التسارع: 0', 'Acceleration: 0', 'Accélération: 0')}
                    </p>
                    {marks.length > 0 && (
                      <p className="text-[10px] font-mono text-green-600 dark:text-green-400">
                        Vx = {marks[0].vx.toFixed(2)} m/s
                      </p>
                    )}
                  </div>

                  {/* Y-axis info */}
                  <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3 space-y-1.5">
                    <h4 className="text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      {t('محور Y', 'Y-axis', 'Axe Y')}
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                      {t('النوع: MRUA', 'Type: MRUA', 'Type: MRUA')}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {t('السرعة: متغيرة', 'Velocity: Variable', 'Vitesse: Variable')}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {t('التسارع:', 'Acceleration:', 'Accélération:')} -g = {(-gravity).toFixed(2)} m/s²
                    </p>
                  </div>
                </div>

                {/* Marks Table */}
                {marks.length > 0 && (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-secondary/30 border-b border-border">
                      <h4 className="text-xs font-semibold text-foreground">
                        {t('تفاصيل العلامات', 'Mark Details', 'Détails des Marqueurs')}
                      </h4>
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="border-b border-border bg-secondary/10">
                            <th className="px-2 py-1.5 text-start font-medium text-muted-foreground">#</th>
                            <th className="px-2 py-1.5 text-start font-medium text-muted-foreground">t (s)</th>
                            <th className="px-2 py-1.5 text-start font-medium text-muted-foreground">X (m)</th>
                            <th className="px-2 py-1.5 text-start font-medium text-muted-foreground">Y (m)</th>
                            <th className="px-2 py-1.5 text-start font-medium text-green-600">Vx (m/s)</th>
                            <th className="px-2 py-1.5 text-start font-medium text-orange-600">Vy (m/s)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {marks.map((mark, i) => (
                            <tr key={i} className="border-b border-border/30 hover:bg-secondary/20">
                              <td className="px-2 py-1 font-mono text-foreground">{i + 1}</td>
                              <td className="px-2 py-1 font-mono text-foreground">{mark.time.toFixed(3)}</td>
                              <td className="px-2 py-1 font-mono text-foreground">{mark.x.toFixed(2)}</td>
                              <td className="px-2 py-1 font-mono text-foreground">{mark.y.toFixed(2)}</td>
                              <td className="px-2 py-1 font-mono text-green-600 dark:text-green-400">{mark.vx.toFixed(2)}</td>
                              <td className="px-2 py-1 font-mono text-orange-600 dark:text-orange-400">{mark.vy.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
