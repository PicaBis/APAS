import React, { Suspense } from 'react';
import { ChevronDown, ZoomIn, ZoomOut, Maximize, Minimize, Camera, Box, Eye, EyeOff, Focus, Grid3x3, Activity, Gauge, GitBranch, Save, X, Globe2, Calculator, Lock, Filter, Layers, Info, AlertTriangle, BarChart3, Crosshair, ChevronRight } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import HeaderNav from './HeaderNav';
import RightSidebar from './RightSidebar';
import SimulationCanvas from '@/components/apas/SimulationCanvas';
import CanvasToolbar from '@/components/apas/CanvasToolbar';
import ResultsSection from '@/components/apas/ResultsSection';
import EquationsPanel from '@/components/apas/EquationsPanel';
import ExperimentalInput from '@/components/apas/ExperimentalInput';
import ExportSection from '@/components/apas/ExportSection';
import ForceVectorsSection from '@/components/apas/ForceVectorsSection';
import { AdvancedPhysicsPanel } from '@/components/apas/AdvancedPhysicsPanel';
import ParamInputWithUnit from '@/components/apas/ParamInputWithUnit';
import ToggleOption from '@/components/apas/ToggleOption';
import CollapsibleSection from '@/components/apas/CollapsibleSection';
import ErrorBoundary from '@/components/apas/ErrorBoundary';
import { AnimatedLoadingSpinner } from '@/components/ui/AnimatedSVG';
import VideoOverlay from '@/components/apas/VideoOverlay';
import AcademicAmbient from '@/components/apas/AcademicAmbient';
import FooterRobot from '@/components/apas/LightModeDecorations';
import SensorLab from '@/components/apas/SensorLab';
import { toast } from 'sonner';
import { ArrowDownToLine } from 'lucide-react';
import { UNIT_OPTIONS, axisVars, getRating } from '../constants';

const SimulationCanvas3D = React.lazy(() => import('@/components/apas/SimulationCanvas3D'));
const IdlePhysicsTips = React.lazy(() => import('@/components/apas/IdlePhysicsTips'));
const DynamicAnalyticsDashboard = React.lazy(() => import('@/components/apas/DynamicAnalyticsDashboard'));
const MainSimulationChart = React.lazy(() => import('@/components/apas/MainSimulationChart'));
const EnergyAnalysis = React.lazy(() => import('@/components/apas/EnergyAnalysis'));
const MonteCarloPanel = React.lazy(() => import('@/components/apas/MonteCarloPanel'));
const SimulationRecorder = React.lazy(() => import('@/components/apas/SimulationRecorder'));
const EquationEngine = React.lazy(() => import('@/components/apas/EquationEngine'));
const AccessibilitySonification = React.lazy(() => import('@/components/apas/AccessibilitySonification'));
const DevOpsTesting = React.lazy(() => import('@/components/apas/DevOpsTesting'));

interface DesktopLayoutProps {
  state: any;
  handlers: any;
  derived: any;
}

const DesktopLayout: React.FC<DesktopLayoutProps> = ({ state, handlers, derived }) => {
  const {
    sim, advancedPhysics, T, lang, isRTL,
    showDynamicDashboard, setShowDynamicDashboard,
    showPhysicsPanel, setShowPhysicsPanel,
    showDisplayOptions, setShowDisplayOptions,
    showComparisonSection, setShowComparisonSection,
    showChartSection, setShowChartSection,
    showIntegrationComparison, setShowIntegrationComparison,
    showErrorsSection, setShowErrorsSection,
    showAIMetrics, setShowAIMetrics,
    showPathInfo, setShowPathInfo,
    showCalculationsModal, setShowCalculationsModal,
    chartAxisX, setChartAxisX, chartAxisY, setChartAxisY,
    isFullscreen, toggleFullscreen,
    canvasZoom, setCanvasZoom,
    showLiveData, setShowLiveData,
    showGrid, setShowGrid,
    isFocusMode, setIsFocusMode,
    is3DMode, setIs3DMode,
    webglError, setWebglError,
    theme3d, setTheme3d,
    accentColor, setAccentColor, ACCENT_COLORS,
    selectedUnits, setSelectedUnits,
    getDisplayValue, fromDisplayValue,
    currentEnvId, activePresetEmoji,
    dragCd, setDragCd, airDensity, setAirDensity,
    vectorVisibility, setVectorVisibility,
    canvasContainerRef,
    lastAnalyzedMediaSrc, lastAnalyzedMediaType,
    hasModelAnalysis, hasExperimentalData, setHasExperimentalData,
    analysisHistory, activeHistoryEntryId,
    stroboscopicMarks, stroboscopicSettings,
    relativity, relativitySPrimeTrajectory,
    equationTrajectory,
    savedSnapshot, setSavedSnapshot,
    methodChangePulse,
    playClick, playUIClick, playToggle, playSectionToggle, playSliderChange, playZoomSound, playModeSwitch, playSnapshotSound,
  } = state;

  const {
    handleEnvironmentSelect,
    handleIntegrationMethodChange,
    exportSimulationPNG,
    handleSessionLoad,
    handleEquationTrajectory,
    handleDetectedMedia,
    handleAnalysisComplete,
    handleClearAnalysisHistory,
    handleDeleteAnalysisEntry,
    handleAutoRunSimulation,
    getChartData,
    fmtTick,
    safeFixed,
    switchLanguage,
  } = handlers;

  const {
    lastPt, isPaused, isFinished, pathDotClass, playButtonText
  } = derived;

  return (
    <div className={`min-h-screen bg-background relative overflow-hidden ${state.isLangTransitioning ? 'lang-fade-out' : ''}`} dir={T.dir}>
      {/* Ambient background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full bg-primary/3 blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-20 right-1/4 w-72 h-72 rounded-full bg-accent/5 blur-3xl animate-pulse-slow" style={{ animationDelay: '4s' }} />
      </div>
      <AcademicAmbient />

      {/* ── Top Nav Bar ── */}
      <HeaderNav
        lang={lang} T={T} isMuted={sim.isMuted} nightMode={sim.nightMode}
        velocity={sim.velocity} angle={sim.angle} height={sim.height} gravity={sim.gravity} airResistance={sim.airResistance} mass={sim.mass}
        prediction={sim.prediction} trajectoryData={sim.trajectoryData} selectedIntegrationMethod={sim.selectedIntegrationMethod}
        currentEnvId={currentEnvId} isFinished={!!isFinished} hasExperimentalData={hasExperimentalData}
        onOpenSettings={() => state.setShowSettingsPanel(true)}
        onShowRestrictionOverlay={state.setShowRestrictionOverlay}
      />

      {/* ── Main Content ── */}
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 md:px-6 py-2 sm:py-3">
        <div className={isFocusMode ? 'grid grid-cols-1 lg:grid-cols-[240px_1fr] xl:grid-cols-[260px_1fr] gap-3 sm:gap-4 md:gap-5' : 'grid grid-cols-1 md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr_200px] xl:grid-cols-[260px_1fr_220px] gap-3 sm:gap-4 md:gap-5'}>

          {/* ═══ LEFT — Parameters Panel ═══ */}
          <aside data-tour="left-panel" className="space-y-3.5 sm:space-y-4 order-2 md:order-1 md:pt-2 md:pb-4">
            <div className="border-2 border-border/40 rounded-2xl overflow-hidden bg-card/70 backdrop-blur-sm shadow-lg shadow-black/[0.06] dark:shadow-black/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/[0.08] dark:border-border/30">
              <button
                onClick={() => { setShowDynamicDashboard(!showDynamicDashboard); playSectionToggle(sim.isMuted); }}
                className="w-full px-4 sm:px-5 py-4 flex items-center justify-between hover:bg-primary/5 transition-all duration-300 group"
              >
                <h3 className="text-sm sm:text-base font-bold text-foreground uppercase tracking-tight flex items-center gap-2.5">
                  <Activity className="w-5 h-5 text-primary" />
                  {lang === 'ar' ? 'البيانات الديناميكية' : 'Dynamic Analytics'}
                </h3>
                <div className="w-7 h-7 rounded-lg bg-secondary/60 flex items-center justify-center group-hover:bg-primary/10 transition-all duration-300">
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${showDynamicDashboard ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {showDynamicDashboard && (
                <div className="border-t border-border animate-slideDown">
                  <Suspense fallback={<div className="p-4 flex items-center justify-center"><AnimatedLoadingSpinner /></div>}>
                    <DynamicAnalyticsDashboard
                      lang={lang} trajectoryData={sim.trajectoryData} currentTime={sim.currentTime} mass={sim.mass} gravity={sim.gravity}
                      observerType={relativity.enabled && relativity.mode === 'galilean' ? 'moving' : 'stationary'}
                      frameVelocity={relativity.enabled ? relativity.frameVelocity : 0}
                    />
                  </Suspense>
                </div>
              )}
            </div>

            <div className="border-2 border-border/40 rounded-2xl overflow-hidden bg-card/70 backdrop-blur-sm shadow-lg shadow-black/[0.06] dark:shadow-black/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/[0.08] dark:border-border/30">
              <button
                onClick={() => { setShowPhysicsPanel(!showPhysicsPanel); playSectionToggle(sim.isMuted); }}
                className="w-full px-4 sm:px-5 py-4 flex items-center justify-between hover:bg-primary/5 transition-all duration-300 group"
              >
                <h3 className="text-sm sm:text-base font-bold text-foreground uppercase tracking-tight flex items-center gap-2.5">
                  <Gauge className="w-5 h-5 text-primary" />
                  {T.physicsPanel}
                </h3>
                <div className="w-7 h-7 rounded-lg bg-secondary/60 flex items-center justify-center group-hover:bg-primary/10 transition-all duration-300">
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${showPhysicsPanel ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {showPhysicsPanel && (
                <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-border pt-3 animate-slideDown">
                  <div className="grid grid-cols-2 sm:grid-cols-1 gap-x-3 gap-y-0">
                    <ParamInputWithUnit
                      label={lang === 'ar' ? '\u0627\u0644\u0633\u0631\u0639\u0629' : lang === 'fr' ? 'Vitesse' : 'Velocity'}
                      value={getDisplayValue('velocity', sim.velocity)}
                      onChange={(v: number) => sim.setVelocity(fromDisplayValue('velocity', v))}
                      min={-500} max={500} step={1} isRTL={isRTL}
                      unitKey="velocity" selectedUnit={selectedUnits.velocity}
                      units={UNIT_OPTIONS.velocity.units} lang={lang}
                      onUnitChange={(u: string) => setSelectedUnits((prev: any) => ({ ...prev, velocity: u }))}
                      muted={sim.isMuted}
                      tooltip={lang === 'ar' ? '\u0633\u0631\u0639\u0629 \u0627\u0646\u0637\u0644\u0627\u0642 \u0627\u0644\u0645\u0642\u0630\u0648\u0641 (V\u2080). \u0627\u0644\u0642\u064a\u0645 \u0627\u0644\u0633\u0627\u0644\u0628\u0629 \u062a\u0639\u0643\u0633 \u0627\u0644\u0627\u062a\u062c\u0627\u0647' : 'Initial launch speed (V\u2080). Negative values reverse direction'}
                    />
                    <ParamInputWithUnit
                      label={lang === 'ar' ? (is3DMode ? '\u0627\u0644\u0632\u0627\u0648\u064a\u0629 \u03b8' : '\u0627\u0644\u0632\u0627\u0648\u064a\u0629') : lang === 'fr' ? (is3DMode ? 'Angle \u03b8' : 'Angle') : (is3DMode ? 'Angle \u03b8' : 'Angle')}
                      value={getDisplayValue('angle', sim.angle)}
                      onChange={(v: number) => sim.setAngle(fromDisplayValue('angle', v))}
                      min={selectedUnits.angle === 'rad' ? -6.2832 : selectedUnits.angle === 'grad' ? -400 : -360} max={selectedUnits.angle === 'rad' ? 6.2832 : selectedUnits.angle === 'grad' ? 400 : 360}
                      step={selectedUnits.angle === 'rad' ? 0.01 : 1} isRTL={isRTL}
                      unitKey="angle" selectedUnit={selectedUnits.angle}
                      units={UNIT_OPTIONS.angle.units} lang={lang}
                      onUnitChange={(u: string) => setSelectedUnits((prev: any) => ({ ...prev, angle: u }))}
                    />
                    {is3DMode && (
                      <div className="mb-4">
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                          {lang === 'ar' ? '\u0627\u0644\u0632\u0627\u0648\u064a\u0629 \u03c6 (\u0633\u0645\u062a\u064a\u0629)' : lang === 'fr' ? 'Angle \u03c6 (azimut)' : 'Angle \u03c6 (azimuth)'}
                        </label>
                        <div className="flex items-center gap-1.5 mb-2">
                          <input
                            type="number"
                            value={Number(sim.phi.toFixed(1))}
                            onChange={(e) => sim.setPhi(Number(e.target.value))}
                            min={-180} max={180} step={1}
                            className="flex-1 text-sm font-mono min-w-0 !py-1"
                            dir="ltr"
                          />
                          <span className="text-[10px] font-mono text-muted-foreground px-1">&deg;</span>
                        </div>
                        <div className="px-1">
                          <Slider
                            value={[sim.phi]}
                            min={-180}
                            max={180}
                            step={1}
                            onValueChange={([v]) => { sim.setPhi(v); playSliderChange(sim.isMuted); }}
                            className="h-4"
                          />
                        </div>
                      </div>
                    )}
                    <ParamInputWithUnit
                      label={lang === 'ar' ? '\u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629' : lang === 'fr' ? 'Gravit\u00e9' : 'Gravity'}
                      value={getDisplayValue('gravity', sim.gravity)}
                      onChange={(v: number) => sim.setGravity(Math.max(0, fromDisplayValue('gravity', v)))}
                      min={0} max={100} step={0.01} isRTL={isRTL}
                      unitKey="gravity" selectedUnit={selectedUnits.gravity}
                      units={UNIT_OPTIONS.gravity.units} lang={lang}
                      onUnitChange={(u: string) => setSelectedUnits((prev: any) => ({ ...prev, gravity: u }))}
                      muted={sim.isMuted}
                      tooltip={lang === 'ar' ? '\u062a\u0633\u0627\u0631\u0639 \u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629. \u0627\u0644\u0623\u0631\u0636=9.81\u060c \u0627\u0644\u0642\u0645\u0631=1.62\u060c \u0627\u0644\u0645\u0631\u064a\u062e=3.72' : 'Gravitational acceleration. Earth=9.81, Moon=1.62, Mars=3.72'}
                    />
                    <ParamInputWithUnit
                      label={lang === 'ar' ? '\u0627\u0644\u0643\u062a\u0644\u0629' : lang === 'fr' ? 'Masse' : 'Mass'}
                      value={getDisplayValue('mass', sim.mass)}
                      onChange={(v: number) => sim.setMass(fromDisplayValue('mass', v))}
                      min={0.01} max={50000} step={0.01} isRTL={isRTL}
                      unitKey="mass" selectedUnit={selectedUnits.mass}
                      units={UNIT_OPTIONS.mass.units} lang={lang}
                      onUnitChange={(u: string) => setSelectedUnits((prev: any) => ({ ...prev, mass: u }))}
                      muted={sim.isMuted}
                      tooltip={lang === 'ar' ? '\u0643\u062a\u0644\u0629 \u0627\u0644\u0645\u0642\u0630\u0648\u0641. \u062a\u0624\u062b\u0631 \u0639\u0644\u0649 \u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0647\u0648\u0627\u0621 \u0648\u0642\u0648\u0629 \u0645\u0627\u063a\u0646\u0648\u0633' : 'Projectile mass. Affects air resistance and Magnus force'}
                    />
                    <ParamInputWithUnit
                      label={lang === 'ar' ? '\u0627\u0644\u0627\u0631\u062a\u0641\u0627\u0639' : lang === 'fr' ? 'Hauteur' : 'Height'}
                      value={getDisplayValue('height', sim.height)}
                      onChange={(v: number) => sim.setHeight(fromDisplayValue('height', v))}
                      min={-5000} max={5000} step={0.5} isRTL={isRTL}
                      unitKey="height" selectedUnit={selectedUnits.height}
                      units={UNIT_OPTIONS.height.units} lang={lang}
                      onUnitChange={(u: string) => setSelectedUnits((prev: any) => ({ ...prev, height: u }))}
                    />
                  </div>

                  {/* Force Ground Detection toggle — shown when height < 0 */}
                  {sim.height < 0 && (
                    <div className="mt-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 animate-slideDown">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <ArrowDownToLine className="w-4 h-4 text-amber-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-medium text-foreground block">
                              {lang === 'ar' ? 'فرض الجاذبية والأرض كمحور X' : lang === 'fr' ? 'Forcer le sol à y=0' : 'Force Ground at y=0'}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              {lang === 'ar' ? 'اصطدام المقذوف بالأرض عند العودة لـ y=0' : lang === 'fr' ? 'Le projectile touche le sol en revenant à y=0' : 'Projectile hits ground when returning to y=0'}
                            </span>
                          </div>
                        </div>
                        <Switch
                          checked={sim.forceGroundDetection}
                          onCheckedChange={(checked) => {
                            sim.setForceGroundDetection(checked);
                            playToggle(sim.isMuted, checked);
                            toast.info(
                              lang === 'ar'
                                ? checked
                                  ? 'تم تفعيل اصطدام الأرض. المقذوف سيتوقف عند y=0 حتى لو بدأ من ارتفاع سالب.'
                                  : 'تم تعطيل اصطدام الأرض. المقذوف سيستمر في الطيران دون قيود الأرض.'
                                : checked
                                  ? 'Ground detection enabled. Projectile will stop at y=0 even when starting from negative height.'
                                  : 'Ground detection disabled. Projectile will continue flying without ground constraint.',
                              { icon: <ArrowDownToLine className="w-4 h-4 text-amber-500" /> }
                            );
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Initial Position X₀ */}
                  <div className="mt-3">
                    <ParamInputWithUnit
                      label={lang === 'ar' ? 'الموضع الابتدائي (X₀)' : lang === 'fr' ? 'Position Initiale (X₀)' : 'Initial Position (X₀)'}
                      value={getDisplayValue('height', sim.initialX)}
                      onChange={(v: number) => sim.setInitialX(fromDisplayValue('height', v))}
                      min={-5000} max={5000} step={0.5} isRTL={isRTL}
                      unitKey="height" selectedUnit={selectedUnits.height}
                      units={UNIT_OPTIONS.height.units} lang={lang}
                      onUnitChange={(u: string) => setSelectedUnits((prev: any) => ({ ...prev, height: u }))}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <span className="text-xs font-medium text-foreground">{lang === 'ar' ? '\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0647\u0648\u0627\u0621' : lang === 'fr' ? "R\u00e9sistance de l'Air" : 'Air Resistance'}</span>
                    <Switch
                      checked={sim.airResistance > 0}
                      onCheckedChange={(checked) => { sim.setAirResistance(checked ? 0.02 : 0); playToggle(sim.isMuted, checked); }}
                    />
                  </div>
                  {sim.airResistance > 0 && (
                    <div className="mt-2 space-y-2">
                      <div>
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                          <span>k ({lang === 'ar' ? '\u0645\u0639\u0627\u0645\u0644 \u0627\u0644\u0645\u0642\u0627\u0648\u0645\u0629' : lang === 'fr' ? 'Coeff. de Train\u00e9e' : 'Drag coeff.'})</span>
                          <span className="font-mono">{sim.airResistance.toFixed(3)}</span>
                        </div>
                        <Slider value={[sim.airResistance]} min={0} max={0.1} step={0.001}
                          onValueChange={([v]) => { sim.setAirResistance(v); playSliderChange(sim.isMuted); }} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-2 border-border/40 rounded-2xl overflow-hidden bg-card/70 backdrop-blur-sm shadow-lg shadow-black/[0.06] dark:shadow-black/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/[0.08] dark:border-border/30">
              <button
                onClick={() => { setShowDisplayOptions(!showDisplayOptions); playSectionToggle(sim.isMuted); }}
                className="w-full px-4 sm:px-5 py-4 flex items-center justify-between hover:bg-primary/5 transition-all duration-300 group"
              >
                <h3 className="text-sm sm:text-base font-bold text-foreground uppercase tracking-tight flex items-center gap-2.5">
                  <Eye className="w-5 h-5 text-primary" />
                  {lang === 'ar' ? '\u062e\u064a\u0627\u0631\u0627\u062a \u0627\u0644\u0639\u0631\u0636' : lang === 'fr' ? "Options d'Affichage" : 'Display Options'}
                </h3>
                <div className="w-7 h-7 rounded-lg bg-secondary/60 flex items-center justify-center group-hover:bg-primary/10 transition-all duration-300">
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${showDisplayOptions ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {showDisplayOptions && (
                <div className="p-4 pt-2 space-y-1.5 animate-slideDown border-t border-border/30">
                  <button
                    onClick={() => { state.setShowEnvSelector(true); playClick(sim.isMuted); }}
                    className="group w-full text-xs font-medium py-2 px-3 rounded border border-border hover:border-foreground/30 hover:bg-secondary hover:shadow-md transition-all duration-200 flex items-center justify-center gap-1.5"
                  >
                    <Globe2 className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
                    {lang === 'ar' ? '\u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0628\u064a\u0626\u0629' : lang === 'fr' ? 'Environnement' : 'Environment'}
                  </button>
                  <ToggleOption label={lang === 'ar' ? '\u0627\u0644\u0646\u0642\u0627\u0637 \u0627\u0644\u062d\u0631\u062c\u0629' : lang === 'fr' ? 'Points Critiques' : 'Critical Points'} active={sim.showCriticalPoints}
                    onClick={() => { sim.setShowCriticalPoints(!sim.showCriticalPoints); playClick(sim.isMuted); }} icon={<Crosshair className="w-3.5 h-3.5" />} />
                  <ForceVectorsSection
                    lang={lang}
                    showExternalForces={sim.showExternalForces}
                    onToggle={() => { sim.setShowExternalForces(!sim.showExternalForces); playClick(sim.isMuted); }}
                    vectorVisibility={vectorVisibility}
                    onVectorToggle={(key: any) => { setVectorVisibility((prev: any) => ({ ...prev, [key]: !prev[key] })); playClick(sim.isMuted); }}
                  />
                </div>
              )}
            </div>

            <AdvancedPhysicsPanel lang={lang} advancedPhysicsInstance={advancedPhysics} onPhysicsChange={() => sim.recalculate()} environmentId={currentEnvId} relativity={relativity} muted={sim.isMuted} />

            <div className="border-2 border-border/40 rounded-2xl overflow-hidden bg-card/70 backdrop-blur-sm shadow-lg shadow-black/[0.06] dark:shadow-black/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/[0.08] dark:border-border/30">
              <button
                onClick={() => { setShowComparisonSection(!showComparisonSection); playSectionToggle(sim.isMuted); }}
                className="w-full px-4 sm:px-5 py-4 flex items-center justify-between hover:bg-primary/5 transition-all duration-300 group"
              >
                <h3 className="text-sm sm:text-base font-bold text-foreground uppercase tracking-tight flex items-center gap-2.5">
                  <GitBranch className="w-5 h-5 text-primary" />
                  {lang === 'ar' ? '\u0627\u0644\u0645\u0642\u0627\u0631\u0646\u0629' : lang === 'fr' ? 'Comparaison' : 'Comparison'}
                </h3>
                <div className="w-7 h-7 rounded-lg bg-secondary/60 flex items-center justify-center group-hover:bg-primary/10 transition-all duration-300">
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${showComparisonSection ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {showComparisonSection && (
                <div className="px-3 pb-3 border-t border-border space-y-1.5 pt-2 animate-slideDown">
                  {!sim.comparisonMode ? (
                    <>
                      <button onClick={() => {
                        sim.setSavedTrajectory([...sim.trajectoryData]);
                        sim.setComparisonMode(true);
                        setSavedSnapshot({
                          velocity: sim.velocity,
                          angle: sim.angle,
                          height: sim.height,
                          gravity: sim.gravity,
                          airResistance: sim.airResistance,
                          mass: sim.mass,
                          range: sim.prediction?.range ?? 0,
                          maxHeight: sim.prediction?.maxHeight ?? 0,
                          flightTime: sim.prediction?.timeOfFlight ?? 0,
                          finalVelocity: sim.prediction?.finalVelocity ?? 0,
                          impactAngle: sim.prediction?.impactAngle ?? 0,
                          integrationMethod: sim.selectedIntegrationMethod,
                        });
                        playClick(sim.isMuted);
                      }}
                        className="group w-full text-xs font-medium text-foreground py-2 px-3 rounded border border-border hover:border-foreground/30 hover:bg-secondary hover:shadow-md transition-all duration-200 flex items-center justify-center gap-1.5">
                        <Save className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" /> {T.saveCompare}
                      </button>
                    </>
                  ) : (
                    <button onClick={() => {
                      sim.setComparisonMode(false);
                      sim.setSavedTrajectory(null);
                      setSavedSnapshot(null);
                      playClick(sim.isMuted);
                    }}
                      className="group w-full text-xs font-medium text-foreground py-2 px-3 rounded border border-border hover:border-foreground/30 hover:bg-secondary hover:shadow-md transition-all duration-200 flex items-center justify-center gap-1.5">
                      <X className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" /> {T.cancelCompare}
                    </button>
                  )}
                </div>
              )}
            </div>

            <ExportSection
              lang={lang} trajectoryData={sim.trajectoryData} prediction={sim.prediction}
              velocity={sim.velocity} angle={sim.angle} height={sim.height} gravity={sim.gravity} airResistance={sim.airResistance} mass={sim.mass}
              onExportPNG={exportSimulationPNG} muted={sim.isMuted} windSpeed={sim.windSpeed} integrationMethod={sim.selectedIntegrationMethod}
            />
          </aside>

          {/* ═══ CENTER — Canvas & Results ═══ */}
          <div data-tour="center-canvas" className="space-y-1.5 sm:space-y-2 order-1 md:order-2 min-w-0">
            <div ref={canvasContainerRef} className={isFullscreen ? 'fixed inset-0 z-50 bg-background flex flex-col' : ''}>
              <div className="flex items-center justify-between mb-1.5 px-1">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2.5">
                  <span className={pathDotClass} />
                  {lang === 'ar' ? '\u0645\u0633\u0627\u0631 \u0627\u0644\u0645\u0642\u0630\u0648\u0641' : lang === 'fr' ? 'Trajectoire du Projectile' : 'Projectile Path'}
                </h2>
                <div className="flex items-center gap-0.5 bg-secondary/40 backdrop-blur-sm rounded-xl px-1.5 py-1 border border-border/30">
                  <button onClick={() => { setCanvasZoom((z: number) => Math.max(0.5, z - 0.25)); playZoomSound(sim.isMuted, false); }}
                    className="group p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary border border-transparent hover:border-primary/20 hover:shadow-md transition-all duration-300">
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono text-muted-foreground w-8 text-center">{Math.round(canvasZoom * 100)}%</span>
                  <button onClick={() => { setCanvasZoom((z: number) => Math.min(3, z + 0.25)); playZoomSound(sim.isMuted, true); }}
                    className="group p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary border border-transparent hover:border-primary/20 hover:shadow-md transition-all duration-300">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-5 bg-border/50 mx-0.5" />
                  <button onClick={() => {
                      if (is3DMode) { setIs3DMode(false); playModeSwitch(sim.isMuted, false); }
                      else if (!webglError) { setIs3DMode(true); playModeSwitch(sim.isMuted, true); }
                    }}
                    className={is3DMode ? 'group p-1.5 rounded-lg bg-primary text-primary-foreground' : 'group p-1.5 rounded-lg text-muted-foreground'}
                  >
                    <Box className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className={isFullscreen ? 'flex-1 min-h-0' : ''}>
                {is3DMode ? (
                  <ErrorBoundary sectionName="3D Simulation">
                    <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><AnimatedLoadingSpinner /></div>}>
                      <SimulationCanvas3D
                        trajectoryData={sim.trajectoryData} prediction={sim.prediction} currentTime={sim.currentTime}
                        height={sim.height} showCriticalPoints={sim.showCriticalPoints} showExternalForces={sim.showExternalForces}
                        vectorVisibility={vectorVisibility} mass={sim.mass} gravity={sim.gravity} airResistance={sim.airResistance}
                        lang={lang} nightMode={sim.nightMode} isAnimating={sim.isAnimating} playbackSpeed={sim.playbackSpeed}
                        bounceCoefficient={sim.bounceCoefficient} phi={sim.phi} showLiveData={showLiveData}
                        stroboscopicMarks={stroboscopicMarks}
                        environmentId={currentEnvId} showGrid={showGrid} theme3d={theme3d}
                        onWebglError={(msg: string) => { setWebglError(msg); setIs3DMode(false); }}
                      />
                    </Suspense>
                  </ErrorBoundary>
                ) : (
                  <ErrorBoundary sectionName="2D Simulation">
                    <SimulationCanvas
                      trajectoryData={sim.trajectoryData} theoreticalData={sim.theoreticalData} prediction={sim.prediction}
                      currentTime={sim.currentTime} height={sim.height} showCriticalPoints={sim.showCriticalPoints}
                      showExternalForces={sim.showExternalForces} vectorVisibility={vectorVisibility}
                      showAIComparison={sim.showAIComparison} aiModels={sim.aiModels}
                      comparisonMode={sim.comparisonMode} savedTrajectory={sim.savedTrajectory}
                      mass={sim.mass} gravity={sim.gravity} airResistance={sim.airResistance} windSpeed={sim.windSpeed}
                      T={T} lang={lang} nightMode={sim.nightMode} zoom={canvasZoom}
                      isAnimating={sim.isAnimating} isFullscreen={isFullscreen} showLiveData={showLiveData}
                      stroboscopicMarks={stroboscopicMarks}
                      environmentId={currentEnvId} showGrid={showGrid}
                    />
                  </ErrorBoundary>
                )}
              </div>

              <CanvasToolbar
                isAnimating={sim.isAnimating} onReset={sim.resetAnimation}
                onTogglePlay={sim.isAnimating ? sim.pauseAnimation : sim.startAnimation}
                playButtonText={playButtonText} trajectoryData={sim.trajectoryData}
                currentTime={sim.currentTime} onSeek={sim.seekTo}
                playbackSpeed={sim.playbackSpeed} onSetPlaybackSpeed={sim.setPlaybackSpeed}
                isMuted={sim.isMuted} T={T} isFullscreen={isFullscreen}
              />
            </div>

            {lastAnalyzedMediaSrc && (
              <VideoOverlay
                lang={lang} mediaSrc={lastAnalyzedMediaSrc} mediaType={lastAnalyzedMediaType}
                trajectoryData={sim.trajectoryData} currentTime={sim.currentTime}
                isAnimating={sim.isAnimating} onClose={() => state.setShowVideoOverlay(false)} muted={sim.isMuted}
              />
            )}

            {!isFocusMode && (
              <>
                {sim.prediction && (
                  <ResultsSection
                    lang={lang} T={T} prediction={sim.prediction}
                    velocity={sim.velocity} angle={sim.angle} height={sim.height}
                    gravity={sim.gravity} airResistance={sim.airResistance} mass={sim.mass}
                    showPathInfo={showPathInfo} onTogglePathInfo={() => setShowPathInfo(!showPathInfo)}
                    hasModelAnalysis={hasModelAnalysis}
                  />
                )}

                <Collapsible open={showChartSection} onOpenChange={() => setShowChartSection(!showChartSection)} className="border-2 border-border/40 rounded-2xl bg-card/70 backdrop-blur-sm shadow-xl overflow-hidden transition-all duration-300">
                  <CollapsibleTrigger onClick={() => playSectionToggle(sim.isMuted)} className="flex items-center justify-between w-full px-5 py-5 cursor-pointer hover:bg-primary/5">
                    <span className="text-base font-bold text-foreground flex items-center gap-3">
                      {lang === 'ar' ? '📈 التمثيل البياني' : '📈 Graphical Representation'}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${showChartSection ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t border-border/30 p-4">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">{T.xAxis}</p>
                        <select value={chartAxisX} onChange={(e) => setChartAxisX(e.target.value)} className="w-full text-sm">
                          <option value="">{lang === 'ar' ? 'اختر...' : 'Select...'}</option>
                          {axisVars.map((v: any) => <option key={v.key} value={v.key}>{v.symbol} ({v.unit})</option>)}
                        </select>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">{T.yAxis}</p>
                        <select value={chartAxisY} onChange={(e) => setChartAxisY(e.target.value)} className="w-full text-sm">
                          <option value="">{lang === 'ar' ? 'اختر...' : 'Select...'}</option>
                          {axisVars.map((v: any) => <option key={v.key} value={v.key}>{v.symbol} ({v.unit})</option>)}
                        </select>
                      </div>
                    </div>
                    {chartAxisX && chartAxisY ? (
                      <Suspense fallback={<div>Loading chart...</div>}>
                        <MainSimulationChart data={getChartData()} fmtTick={fmtTick} />
                      </Suspense>
                    ) : (
                      <div className="h-[260px] flex items-center justify-center border border-dashed border-border rounded-md">
                        <p className="text-sm font-medium text-muted-foreground">{lang === 'ar' ? 'اختر المحاور أعلاه' : 'Select axes above'}</p>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

            <div className="text-center py-8 border-t border-border/30 mt-6 space-y-3">
              <p className="text-xs text-muted-foreground font-medium">{T.footerDev}</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-xs font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{T.footerName1}</span>
                <span className="text-xs text-primary/40">&middot;</span>
                <span className="text-xs font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{T.footerName2}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{T.footerSchool}</p>
              <div className="relative inline-flex flex-col items-center mt-4">
                <FooterRobot />
              </div>
              <Suspense fallback={null}>
                <IdlePhysicsTips lang={lang} />
              </Suspense>
            </div>
          </div>

          <RightSidebar
            lang={lang} isMuted={sim.isMuted} isFocusMode={isFocusMode}
            velocity={sim.velocity} angle={sim.angle} height={sim.height} gravity={sim.gravity} airResistance={sim.airResistance} mass={sim.mass} windSpeed={sim.windSpeed}
            currentEnvId={currentEnvId} nightMode={sim.nightMode} selectedIntegrationMethod={sim.selectedIntegrationMethod}
            enableBounce={sim.enableBounce} bounceCoefficient={sim.bounceCoefficient}
            setSelectedIntegrationMethod={sim.setSelectedIntegrationMethod}
            onIntegrationMethodChange={handleIntegrationMethodChange}
            setVelocity={sim.setVelocity} setAngle={sim.setAngle} setHeight={sim.setHeight} setMass={sim.setMass} setGravity={sim.setGravity}
            setActivePresetEmoji={state.setActivePresetEmoji}
            onSessionLoad={handleSessionLoad} onShowRestrictionOverlay={state.setShowRestrictionOverlay}
            onAutoRun={handleAutoRunSimulation}
            onDetectedMedia={handleDetectedMedia}
            onAnalysisComplete={handleAnalysisComplete}
            analysisHistory={analysisHistory}
            onClearAnalysisHistory={handleClearAnalysisHistory}
            onDeleteAnalysisEntry={handleDeleteAnalysisEntry}
            onApplyAnalysisParams={state.onApplyAnalysisParams}
            forceOpenHistoryId={activeHistoryEntryId}
            onHistoryModalClose={() => state.setActiveHistoryEntryId(null)}
            onMediaAnalyzed={(src: string) => {
              state.setLastAnalyzedMediaSrc(src || null);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default DesktopLayout;
