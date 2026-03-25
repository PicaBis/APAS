import React, { useState, useRef, useCallback, useEffect, Suspense, lazy, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, ZoomIn, ZoomOut, Maximize, Minimize, Camera, Box, Eye, EyeOff, Focus, Grid3x3, Crosshair, GitBranch, Layers, Save, X, Globe2, Clock, Gauge, Filter, ArrowDownUp, Calculator, Lock, Activity } from 'lucide-react';
import { useSimulation } from '@/hooks/useSimulation';
import { useAdvancedPhysics } from '@/hooks/useAdvancedPhysics';
import { playClick, playUIClick, playToggle, playSectionToggle, playSliderChange, playSnapshotSound, playModeSwitch, playZoomSound, playNav } from '@/utils/sound';
import { type ModelData } from '@/utils/physics';
import type { EquationTrajectoryPoint } from '@/components/apas/EquationEngine';
import type { TrajectoryPoint } from '@/utils/physics';
import { type StroboscopicSettings } from '@/components/apas/StroboscopicModal';
import { ENVIRONMENTS, type Environment } from '@/components/apas/EnvironmentSelector';
import { type VectorVisibility } from '@/components/apas/ForceVectorsSection';
import { decodeSimParams } from '@/components/apas/ShareSimulation';
import type { SessionData } from '@/components/apas/SessionManager';
import { useRelativity } from '@/hooks/useRelativity';
import { computeDualFrameTrajectory, type DualFrameTrajectory } from '@/utils/relativityPhysics';

// Extracted constants & types
import { PRESETS, axisVars, UNIT_OPTIONS, getRating, objectTypeToEmoji } from './index/constants';
import type { SavedSnapshotData } from './index/constants';

// Extracted hooks
import { useUndoRedo } from './index/hooks/useUndoRedo';
import { useStroboscopicMarks } from './index/hooks/useStroboscopicMarks';
import { useAccentTheme } from './index/hooks/useAccentTheme';
import { useKeyboardShortcuts } from './index/hooks/useKeyboardShortcuts';
import { useUnitConversion } from './index/hooks/useUnitConversion';
import { useLocalStorageSync } from './index/hooks/useLocalStorageSync';

// Extracted components
import HeaderNav from './index/components/HeaderNav';
import RightSidebar from './index/components/RightSidebar';
import ModalsOverlays from './index/components/ModalsOverlays';

// Direct component imports (used in center/left panels)
import SplashScreen from '@/components/apas/SplashScreen';
import PageTransition from '@/components/apas/PageTransition';
import SimulationCanvas from '@/components/apas/SimulationCanvas';
const SimulationCanvas3D = lazy(() => import('@/components/apas/SimulationCanvas3D'));
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import EquationsPanel from '@/components/apas/EquationsPanel';
import ErrorBoundary from '@/components/apas/ErrorBoundary';
import ExperimentalInput from '@/components/apas/ExperimentalInput';
import ExportSection from '@/components/apas/ExportSection';
import ForceVectorsSection from '@/components/apas/ForceVectorsSection';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { AdvancedPhysicsPanel } from '@/components/apas/AdvancedPhysicsPanel';
import ParamInputWithUnit from '@/components/apas/ParamInputWithUnit';
import ToggleOption from '@/components/apas/ToggleOption';
import CollapsibleSection from '@/components/apas/CollapsibleSection';
import ResultsSection from '@/components/apas/ResultsSection';
import CanvasToolbar from '@/components/apas/CanvasToolbar';
import { AnimatedLoadingSpinner } from '@/components/ui/AnimatedSVG';
import AcademicAmbient from '@/components/apas/AcademicAmbient';
import FooterRobot from '@/components/apas/LightModeDecorations';
import SensorLab from '@/components/apas/SensorLab';
import VideoOverlay from '@/components/apas/VideoOverlay';
import QuickStartTips from '@/components/apas/QuickStartTips';
import CalculationsSection from '@/components/apas/CalculationsSection';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  MobileBottomNav,
  MobileTopBar,
  MobileFloatingControls,
  MobileBottomSheet,
  MobileAIAssistant,
  MobileAnalysisDashboard,
  MobileSavedExperiments,
  PWAInstallPrompt,
} from '@/components/mobile';
import type { SavedExperiment } from '@/components/mobile';
import { useTouchGestures } from '@/hooks/use-touch-gestures';
const DynamicAnalyticsDashboard = lazy(() => import('@/components/apas/DynamicAnalyticsDashboard'));
const EnergyAnalysis = lazy(() => import('@/components/apas/EnergyAnalysis'));
const MonteCarloPanel = lazy(() => import('@/components/apas/MonteCarloPanel'));
const SimulationRecorder = lazy(() => import('@/components/apas/SimulationRecorder'));
const EquationEngine = lazy(() => import('@/components/apas/EquationEngine'));
const ExplainableAI = lazy(() => import('@/components/apas/ExplainableAI'));
const CrowdsourcedAccuracy = lazy(() => import('@/components/apas/CrowdsourcedAccuracy'));
const AccessibilitySonification = lazy(() => import('@/components/apas/AccessibilitySonification'));
const DevOpsTesting = lazy(() => import('@/components/apas/DevOpsTesting'));

const Index = () => {
  const advancedPhysics = useAdvancedPhysics();
  const sim = useSimulation();
  const { T, lang } = sim;
  const isRTL = T.dir === 'rtl';

  // Connect advanced physics to trajectory calculation
  useEffect(() => {
    const params = advancedPhysics.buildAdvancedPhysicsParams(
      sim.gravity, sim.mass, 1.225, sim.windSpeed
    );
    sim.setAdvancedParams(params);
    sim.recalculate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    advancedPhysics.enableCoriolis, advancedPhysics.enableMagnus, advancedPhysics.enableAltitudeDensity,
    advancedPhysics.enableCentrifugal, advancedPhysics.enableRelativeMotion,
    advancedPhysics.enableBuoyancy, advancedPhysics.enableHydrodynamicDrag,
    advancedPhysics.enableFluidPressure, advancedPhysics.enableGyroscopic,
    advancedPhysics.enableBallisticStability, advancedPhysics.enableRelativistic,
    advancedPhysics.enableEnvironmentalCoupling, advancedPhysics.isUnderwater,
    advancedPhysics.latitude, advancedPhysics.spinRate, advancedPhysics.diameter,
    advancedPhysics.dragCoefficient, advancedPhysics.frameVx, advancedPhysics.frameVy,
    advancedPhysics.frameAx, advancedPhysics.frameAy, advancedPhysics.frameOmega,
    advancedPhysics.fluidDensity, advancedPhysics.environmentTemperature,
    advancedPhysics.environmentPressure, advancedPhysics.environmentHumidity,
    sim.gravity, sim.mass, sim.windSpeed,
  ]);

  // ── UI State ──
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [isLangTransitioning, setIsLangTransitioning] = useState(false);
  const [showIntegrationComparison, setShowIntegrationComparison] = useState(false);
  const [showAIMetrics, setShowAIMetrics] = useState(false);
  const [showPathInfo, setShowPathInfo] = useState(false);
  const [showChartSection, setShowChartSection] = useState(false);
  const [showCalculationsModal, setShowCalculationsModal] = useState(false);
  const [chartAxisX, setChartAxisX] = useState('');
  const [chartAxisY, setChartAxisY] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [showLiveData, setShowLiveData] = useState(false);
  const [showErrorsSection, setShowErrorsSection] = useState(false);
  const [showPhysicsPanel, setShowPhysicsPanel] = useState(false);
  const [showDisplayOptions, setShowDisplayOptions] = useState(false);
  const [showMultiSimModal, setShowMultiSimModal] = useState(false);
  const [hasExperimentalData, setHasExperimentalData] = useState(false);
  const [showEnvSelector, setShowEnvSelector] = useState(false);
  const [showDocumentation, setShowDocumentation] = useState(false);
  const [showStroboscopicModal, setShowStroboscopicModal] = useState(false);
  const [stroboscopicSettings, setStroboscopicSettings] = useState<StroboscopicSettings>({
    enabled: false, deltaT: 0.5, showProjections: false, showDetails: false,
  });
  const [currentEnvId, setCurrentEnvId] = useState('earth');
  const [activePresetEmoji, setActivePresetEmoji] = useState<string | undefined>(undefined);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showRuler, setShowRuler] = useState(false);
  const [showProtractor, setShowProtractor] = useState(false);
  const [showNoiseFilter, setShowNoiseFilter] = useState(false);
  const [showLiveCalibration, setShowLiveCalibration] = useState(false);
  const [showSecurityPrivacy, setShowSecurityPrivacy] = useState(false);
  const [showComprehensiveGuide, setShowComprehensiveGuide] = useState(false);
  const [calibrationScale, setCalibrationScale] = useState<number | null>(null);
  const [lastAnalyzedMediaSrc, setLastAnalyzedMediaSrc] = useState<string | null>(null);
  const [lastAnalyzedMediaType, setLastAnalyzedMediaType] = useState<'video' | 'image'>('video');
  const [showVideoOverlay, setShowVideoOverlay] = useState(false);
  const [showDynamicDashboard, setShowDynamicDashboard] = useState(false);
  const [showTheoreticalComparison, setShowTheoreticalComparison] = useState(false);
  const [showQuickTips, setShowQuickTips] = useState(true);
  const [showComparisonSection, setShowComparisonSection] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [equationTrajectory, setEquationTrajectory] = useState<EquationTrajectoryPoint[] | null>(null);
  const [showRestrictionOverlay, setShowRestrictionOverlay] = useState<string | null>(null);
  const [dragCd, setDragCd] = useState(0.47);
  const [airDensity, setAirDensity] = useState(1.225);
  const [savedSnapshot, setSavedSnapshot] = useState<SavedSnapshotData | null>(null);
  const [vectorVisibility, setVectorVisibility] = useState<VectorVisibility>({
    V: true, Vx: true, Vy: true, Fg: true, Fd: true, Fw: false, Ffluid: false, Fnet: false, acc: false,
  });

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // ── Mobile UI State ──
  const [mobileActiveTab, setMobileActiveTab] = useState<'home' | 'simulation' | 'analysis' | 'saved' | 'settings'>('simulation');
  const [showMobileBottomSheet, setShowMobileBottomSheet] = useState(false);
  const [showMobileAI, setShowMobileAI] = useState(false);

  // ── Touch Gestures ──
  useTouchGestures(canvasContainerRef, {
    onPinchZoom: (scale) => setCanvasZoom(z => Math.max(0.5, Math.min(3, z * scale))),
    onDoubleTap: () => setCanvasZoom(z => z === 1 ? 2 : 1),
    enabled: isMobile,
  });

  // ── Mobile experiment load handler ──
  const handleMobileExperimentLoad = useCallback((exp: SavedExperiment) => {
    sim.setVelocity(exp.velocity);
    sim.setAngle(exp.angle);
    sim.setHeight(exp.height);
    sim.setGravity(exp.gravity);
    sim.setAirResistance(exp.airResistance);
    sim.setMass(exp.mass);
    sim.setSelectedIntegrationMethod(exp.integrationMethod as 'euler' | 'rk4' | 'ai-apas');
    setMobileActiveTab('simulation');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Extracted Hooks ──
  const { theme3d, setTheme3d, autoDeleteVideos, setAutoDeleteVideos } = useLocalStorageSync({
    setLanguageDirect: sim.setLanguageDirect,
    setNightMode: sim.setNightMode,
    setIsMuted: sim.setIsMuted,
    nightMode: sim.nightMode,
    isMuted: sim.isMuted,
    lang,
  });

  const { accentColor, setAccentColor, ACCENT_COLORS } = useAccentTheme(lang, sim.nightMode);
  const { selectedUnits, setSelectedUnits, getDisplayValue, getUnitLabel, fromDisplayValue } = useUnitConversion(lang);
  const { undoParams, redoParams } = useUndoRedo(sim);
  const stroboscopicMarks = useStroboscopicMarks(stroboscopicSettings, sim.currentTime, sim.trajectoryData);

  // ── Relativity & Reference Frames ──
  const relativity = useRelativity(lang);
  const dualTrajectory = useMemo<DualFrameTrajectory | null>(() => {
    if (!relativity.enabled || sim.trajectoryData.length === 0) return null;
    return computeDualFrameTrajectory(sim.trajectoryData, relativity.params, sim.mass);
  }, [relativity.enabled, relativity.params, sim.trajectoryData, sim.mass]);
  const relativitySPrimeTrajectory = dualTrajectory?.frameSPrime ?? null;

  // ── Fullscreen ──
  const toggleFullscreen = useCallback(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Keyboard Shortcuts ──
  useKeyboardShortcuts({
    isAnimating: sim.isAnimating,
    pauseAnimation: sim.pauseAnimation,
    startAnimation: sim.startAnimation,
    resetAnimation: sim.resetAnimation,
    isMuted: sim.isMuted,
    is3DMode,
    webglError,
    setIs3DMode,
    setCanvasZoom,
    setShowGrid,
    toggleFullscreen,
    undoParams,
    redoParams,
  });

  // ── Splash / Dark mode management ──
  useEffect(() => {
    if (showSplash) {
      document.documentElement.classList.add('dark');
    }
  }, [showSplash]);

  useEffect(() => {
    if (!showSplash) {
      if (sim.nightMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      window.scrollTo(0, 0);
    }
  }, [showSplash, sim.nightMode]);

  // ── Chart Data ──
  const getChartData = useCallback(() => {
    if (!chartAxisX || !chartAxisY || !sim.trajectoryData.length) return [];
    return sim.trajectoryData.map((p) => ({
      xVal: (p as unknown as Record<string, unknown>)[chartAxisX] as number,
      yVal: (p as unknown as Record<string, unknown>)[chartAxisY] as number,
    })).filter((d) => d.xVal != null && d.yVal != null && typeof d.xVal === 'number' && typeof d.yVal === 'number' && !isNaN(d.xVal) && !isNaN(d.yVal));
  }, [chartAxisX, chartAxisY, sim.trajectoryData]);

  const fmtTick = (v: number) => (typeof v === 'number' && v != null && !isNaN(v) && isFinite(v)) ? Math.abs(v) >= 1000 ? v.toExponential(1) : v.toFixed(1) : '';

  // ── Derived state ──
  const lastPt = sim.trajectoryData[sim.trajectoryData.length - 1];
  const isPaused = !sim.isAnimating && sim.currentTime > 0 && lastPt && sim.currentTime < lastPt.time;
  const isFinished = !sim.isAnimating && sim.currentTime > 0 && lastPt && sim.currentTime >= lastPt.time;
  const pathDotClass = useMemo(() => sim.isAnimating
    ? 'w-2 h-2 rounded-full inline-block animate-blink-green'
    : isFinished
      ? 'w-2 h-2 rounded-full inline-block bg-red-500'
      : 'w-2 h-2 rounded-full inline-block bg-foreground',
    [sim.isAnimating, isFinished]);
  const playButtonText = useMemo(() => sim.isAnimating
    ? T.pause
    : isPaused
      ? (lang === 'ar' ? '\u0623\u0643\u0645\u0644' : lang === 'fr' ? 'Continuer' : 'Continue')
      : (lang === 'ar' ? '\u0645\u062d\u0627\u0643\u0627\u0629' : lang === 'fr' ? 'Simuler' : 'Simulate'),
    [sim.isAnimating, isPaused, lang, T.pause]);

  // ── Handlers ──
  const handleEnvironmentSelect = useCallback((env: Environment) => {
    setCurrentEnvId(env.id);
    sim.setGravity(env.gravity);
    setAirDensity(env.fluidDensity);
    if (env.fluidDensity === 0) {
      sim.setAirResistance(0);
    } else if (env.id === 'underwater') {
      sim.setAirResistance(0);
      advancedPhysics.setIsUnderwater(true);
      advancedPhysics.setEnableBuoyancy(true);
      advancedPhysics.setEnableHydrodynamicDrag(true);
      advancedPhysics.setFluidDensity(env.fluidDensity);
    } else {
      advancedPhysics.setIsUnderwater(false);
      advancedPhysics.setEnableBuoyancy(false);
      advancedPhysics.setEnableHydrodynamicDrag(false);
      if (sim.airResistance === 0 && env.fluidDensity > 0) sim.setAirResistance(0.02);
    }
    playUIClick(sim.isMuted);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim.isMuted, sim.airResistance]);

  const exportSimulationPNG = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `APAS_Simulation_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    playSnapshotSound(sim.isMuted);
  }, [sim.isMuted]);

  const handleSessionLoad = useCallback((session: SessionData) => {
    const p = session.params;
    sim.setVelocity(p.velocity);
    sim.setAngle(p.angle);
    sim.setHeight(p.height);
    sim.setGravity(p.gravity);
    sim.setAirResistance(p.airResistance);
    sim.setMass(p.mass);
    sim.setWindSpeed(p.windSpeed);
    setCurrentEnvId(p.environmentId);
    sim.setNightMode(p.nightMode);
    sim.setSelectedIntegrationMethod(p.integrationMethod as 'euler' | 'rk4' | 'ai-apas');
    if (p.enableBounce !== undefined) sim.setEnableBounce(p.enableBounce);
    if (p.bounceCoefficient !== undefined) sim.setBounceCoefficient(p.bounceCoefficient);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEquationTrajectory = useCallback((points: EquationTrajectoryPoint[] | null) => {
    if (!points || points.length < 2) {
      setEquationTrajectory(null);
      return;
    }
    const converted: TrajectoryPoint[] = points.map((p, i, arr) => {
      const dt = i > 0 ? p.t - arr[i - 1].t : (arr.length > 1 ? arr[1].t - arr[0].t : 0.05);
      const vx = i > 0 ? (p.x - arr[i - 1].x) / dt : (arr.length > 1 ? (arr[1].x - arr[0].x) / (arr[1].t - arr[0].t) : 0);
      const vy = i > 0 ? (p.y - arr[i - 1].y) / dt : (arr.length > 1 ? (arr[1].y - arr[0].y) / (arr[1].t - arr[0].t) : 0);
      const speed = Math.sqrt(vx * vx + vy * vy);
      const ax = i > 1 ? ((p.x - 2 * arr[i - 1].x + arr[i - 2].x) / (dt * dt)) : 0;
      const ay = i > 1 ? ((p.y - 2 * arr[i - 1].y + arr[i - 2].y) / (dt * dt)) : 0;
      const acceleration = Math.sqrt(ax * ax + ay * ay);
      return {
        x: p.x, y: p.y, time: p.t,
        vx, vy, speed,
        ax, ay, acceleration,
        kineticEnergy: 0.5 * sim.mass * speed * speed,
        potentialEnergy: sim.mass * sim.gravity * Math.max(0, p.y),
      };
    });
    sim.resetAnimation();
    sim.setTrajectoryData(converted);
    sim.setCurrentTime(0);
    setEquationTrajectory(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim.mass, sim.gravity]);

  const switchLanguage = useCallback((newLang: 'ar' | 'en' | 'fr') => {
    if (newLang !== lang) {
      sim.setLanguageDirect(newLang);
      playNav(sim.isMuted);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, sim.isMuted]);

  // ── URL Parameter Loading ──
  useEffect(() => {
    const params = decodeSimParams(window.location.search);
    if (params) {
      if (params.velocity !== undefined) sim.setVelocity(params.velocity);
      if (params.angle !== undefined) sim.setAngle(params.angle);
      if (params.height !== undefined) sim.setHeight(params.height);
      if (params.gravity !== undefined) sim.setGravity(params.gravity);
      if (params.airResistance !== undefined) sim.setAirResistance(params.airResistance);
      if (params.mass !== undefined) sim.setMass(params.mass);
      if (params.windSpeed !== undefined) sim.setWindSpeed(params.windSpeed);
      if (params.environmentId !== undefined) setCurrentEnvId(params.environmentId);
      if (params.nightMode !== undefined) sim.setNightMode(params.nightMode);
      if (params.integrationMethod !== undefined) sim.setSelectedIntegrationMethod(params.integrationMethod as 'euler' | 'rk4' | 'ai-apas');
      window.history.replaceState({}, '', window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Mobile bottom sheet variables ──
  const mobileVariables = useMemo(() => [
    { key: 'velocity', label: lang === 'ar' ? 'السرعة' : lang === 'fr' ? 'Vitesse' : 'Velocity', value: sim.velocity, min: 0, max: 500, step: 1, unit: 'm/s', onChange: sim.setVelocity },
    { key: 'angle', label: lang === 'ar' ? 'الزاوية' : lang === 'fr' ? 'Angle' : 'Angle', value: sim.angle, min: -360, max: 360, step: 1, unit: '°', onChange: sim.setAngle },
    { key: 'height', label: lang === 'ar' ? 'الارتفاع' : lang === 'fr' ? 'Hauteur' : 'Height', value: sim.height, min: 0, max: 5000, step: 0.5, unit: 'm', onChange: sim.setHeight },
    { key: 'gravity', label: lang === 'ar' ? 'الجاذبية' : lang === 'fr' ? 'Gravité' : 'Gravity', value: sim.gravity, min: 0, max: 100, step: 0.01, unit: 'm/s²', onChange: (v: number) => sim.setGravity(Math.max(0, v)) },
    { key: 'mass', label: lang === 'ar' ? 'الكتلة' : lang === 'fr' ? 'Masse' : 'Mass', value: sim.mass, min: 0.01, max: 50000, step: 0.01, unit: 'kg', onChange: sim.setMass },
  ], [lang, sim.velocity, sim.angle, sim.height, sim.gravity, sim.mass, sim.setVelocity, sim.setAngle, sim.setHeight, sim.setGravity, sim.setMass]);

  // ── Splash Screen ──
  if (showSplash) {
    return <SplashScreen lang={lang} onComplete={() => { setShowSplash(false); setShowOnboarding(true); }} />;
  }

  // ═══════════════════════════════════════════════
  // ═══ MOBILE LAYOUT ═══
  // ═══════════════════════════════════════════════
  if (isMobile) {
    return (
      <PageTransition>
        <div className={`min-h-screen bg-background relative overflow-hidden ${isLangTransitioning ? 'lang-fade-out' : ''}`} dir={T.dir}>
          {/* Ambient background */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse-slow" />
            <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full bg-primary/3 blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
          </div>

          {/* Mobile Top Bar */}
          <MobileTopBar
            lang={lang}
            onOpenSettings={() => setShowSettingsPanel(true)}
            onOpenAI={() => setShowMobileAI(true)}
          />

          {/* Mobile Main Content */}
          <div className="mobile-content-area relative z-10 min-h-screen">
            {/* ── Simulation Tab ── */}
            {mobileActiveTab === 'simulation' && (
              <div className="px-3 py-3 space-y-3">
                {/* Canvas */}
                <div ref={canvasContainerRef} className="relative rounded-xl overflow-hidden border border-border/30 bg-card/30">
                  <div className="flex items-center justify-between px-3 py-2">
                    <h2 className="text-xs font-semibold text-foreground flex items-center gap-2">
                      <span className={pathDotClass} />
                      {lang === 'ar' ? 'مسار المقذوف' : 'Projectile Path'}
                    </h2>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setCanvasZoom(z => Math.max(0.5, z - 0.25))}
                        className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground">
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[9px] font-mono text-muted-foreground w-7 text-center">{Math.round(canvasZoom * 100)}%</span>
                      <button onClick={() => setCanvasZoom(z => Math.min(3, z + 0.25))}
                        className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground">
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { if (!webglError) setIs3DMode(!is3DMode); }}
                        className={is3DMode ? 'p-1.5 rounded-lg bg-primary text-primary-foreground' : 'p-1.5 rounded-lg text-muted-foreground hover:bg-primary/10'}>
                        <Box className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setShowGrid(g => !g)}
                        className={showGrid ? 'p-1.5 rounded-lg bg-primary text-primary-foreground' : 'p-1.5 rounded-lg text-muted-foreground hover:bg-primary/10'}>
                        <Grid3x3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {is3DMode ? (
                    <ErrorBoundary sectionName="3D Simulation">
                      <Suspense fallback={<div className="w-full h-[50vh] flex items-center justify-center"><AnimatedLoadingSpinner /></div>}>
                        <SimulationCanvas3D
                          trajectoryData={sim.trajectoryData} prediction={sim.prediction} currentTime={sim.currentTime}
                          height={sim.height} showCriticalPoints={sim.showCriticalPoints} showExternalForces={sim.showExternalForces}
                          vectorVisibility={vectorVisibility} mass={sim.mass} gravity={sim.gravity} airResistance={sim.airResistance}
                          lang={lang} nightMode={sim.nightMode} isAnimating={sim.isAnimating} playbackSpeed={sim.playbackSpeed}
                          bounceCoefficient={sim.bounceCoefficient} phi={sim.phi} showLiveData={showLiveData}
                          stroboscopicMarks={stroboscopicSettings.enabled ? stroboscopicMarks : []}
                          showStroboscopicProjections={stroboscopicSettings.showProjections}
                          environmentId={currentEnvId} activePresetEmoji={activePresetEmoji} showGrid={showGrid}
                          enableMagnusSpin={advancedPhysics.enableMagnus && advancedPhysics.spinRate !== 0}
                          spinRate={advancedPhysics.spinRate} theme3d={theme3d}
                          onWebglError={(msg) => { setWebglError(msg); setIs3DMode(false); }}
                        />
                      </Suspense>
                    </ErrorBoundary>
                  ) : (
                    <ErrorBoundary sectionName="2D Simulation">
                      <SimulationCanvas
                        trajectoryData={sim.trajectoryData} theoreticalData={sim.theoreticalData} prediction={sim.prediction}
                        currentTime={sim.currentTime} height={sim.height} showCriticalPoints={sim.showCriticalPoints}
                        showExternalForces={sim.showExternalForces} vectorVisibility={vectorVisibility}
                        showAIComparison={sim.showAIComparison} aiModels={sim.aiModels} customColors={sim.customColors}
                        comparisonMode={sim.comparisonMode} savedTrajectory={sim.savedTrajectory}
                        multiTrajectoryMode={sim.multiTrajectoryMode} multiTrajectories={sim.multiTrajectories}
                        mass={sim.mass} gravity={sim.gravity} airResistance={sim.airResistance} windSpeed={sim.windSpeed}
                        T={T} lang={lang} countdown={sim.countdown} nightMode={sim.nightMode} zoom={canvasZoom}
                        isAnimating={sim.isAnimating} isFullscreen={false} showLiveData={showLiveData}
                        stroboscopicMarks={stroboscopicSettings.enabled ? stroboscopicMarks : []}
                        showStroboscopicProjections={stroboscopicSettings.showProjections}
                        environmentId={currentEnvId} activePresetEmoji={activePresetEmoji}
                        equationTrajectory={equationTrajectory} showGrid={showGrid}
                        secondBody={null} collisionPoint={null}
                        fluidFrictionRay={advancedPhysics.enableHydrodynamicDrag || advancedPhysics.isUnderwater}
                        isUnderwater={advancedPhysics.isUnderwater}
                        fluidDensity={advancedPhysics.isUnderwater ? advancedPhysics.fluidDensity : 1.225}
                        calibrationScale={calibrationScale}
                        relativityTrajectory={relativitySPrimeTrajectory} relativityEnabled={relativity.enabled}
                        relativityMode={relativity.mode} relativityActiveObserver={relativity.activeObserver}
                        relativityShowDual={relativity.showDualTrajectories} relativityFrameVelocity={relativity.frameVelocity}
                      />
                    </ErrorBoundary>
                  )}

                  {/* Floating Controls */}
                  <MobileFloatingControls
                    isAnimating={sim.isAnimating}
                    isPaused={!!isPaused}
                    playbackSpeed={sim.playbackSpeed}
                    onTogglePlay={sim.isAnimating ? sim.pauseAnimation : sim.startAnimation}
                    onReset={sim.resetAnimation}
                    onSetPlaybackSpeed={sim.setPlaybackSpeed}
                    lang={lang}
                  />
                </div>

                {/* Quick Results */}
                {sim.prediction && (
                  <ResultsSection
                    lang={lang} T={T} prediction={sim.prediction}
                    velocity={sim.velocity} angle={sim.angle} height={sim.height}
                    gravity={sim.gravity} airResistance={sim.airResistance} mass={sim.mass}
                    showPathInfo={showPathInfo} onTogglePathInfo={() => setShowPathInfo(!showPathInfo)}
                  />
                )}
              </div>
            )}

            {/* ── Home Tab ── */}
            {mobileActiveTab === 'home' && (
              <div className="px-4 py-4 space-y-4">
                <div className="text-center py-6">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent mb-2">APAS</h1>
                  <p className="text-xs text-muted-foreground">{lang === 'ar' ? 'نظام تحليل المقذوفات بالذكاء الاصطناعي' : 'AI Projectile Analysis System'}</p>
                </div>
                {/* Quick action cards */}
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setMobileActiveTab('simulation')} className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-center active:scale-95 transition-all">
                    <Activity className="w-6 h-6 text-primary mx-auto mb-2" />
                    <span className="text-xs font-semibold text-foreground">{lang === 'ar' ? 'بدء المحاكاة' : 'Start Simulation'}</span>
                  </button>
                  <button onClick={() => { setMobileActiveTab('simulation'); setShowMobileBottomSheet(true); }} className="p-4 rounded-xl bg-secondary/50 border border-border/30 text-center active:scale-95 transition-all">
                    <Gauge className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <span className="text-xs font-semibold text-foreground">{lang === 'ar' ? 'تعديل المتغيرات' : 'Edit Variables'}</span>
                  </button>
                  <button onClick={() => setShowMobileAI(true)} className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center active:scale-95 transition-all">
                    <Eye className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                    <span className="text-xs font-semibold text-foreground">{lang === 'ar' ? 'مساعد AI' : 'AI Assistant'}</span>
                  </button>
                  <button onClick={() => setMobileActiveTab('saved')} className="p-4 rounded-xl bg-secondary/50 border border-border/30 text-center active:scale-95 transition-all">
                    <Save className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <span className="text-xs font-semibold text-foreground">{lang === 'ar' ? 'التجارب المحفوظة' : 'Saved Experiments'}</span>
                  </button>
                </div>
                {/* Current params summary */}
                <div className="p-3 rounded-xl bg-card/60 border border-border/30">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{lang === 'ar' ? 'المعاملات الحالية' : 'Current Parameters'}</p>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div><span className="text-muted-foreground">V</span><p className="font-mono font-semibold text-foreground">{sim.velocity} m/s</p></div>
                    <div><span className="text-muted-foreground">&theta;</span><p className="font-mono font-semibold text-foreground">{sim.angle}&deg;</p></div>
                    <div><span className="text-muted-foreground">h</span><p className="font-mono font-semibold text-foreground">{sim.height} m</p></div>
                    <div><span className="text-muted-foreground">g</span><p className="font-mono font-semibold text-foreground">{sim.gravity} m/s&sup2;</p></div>
                    <div><span className="text-muted-foreground">m</span><p className="font-mono font-semibold text-foreground">{sim.mass} kg</p></div>
                    <div><span className="text-muted-foreground">k</span><p className="font-mono font-semibold text-foreground">{sim.airResistance.toFixed(3)}</p></div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Analysis Tab ── */}
            {mobileActiveTab === 'analysis' && (
              <div className="px-4 py-4">
                <MobileAnalysisDashboard
                  prediction={sim.prediction}
                  velocity={sim.velocity}
                  angle={sim.angle}
                  lang={lang}
                />
                {!sim.prediction && (
                  <div className="py-12 text-center">
                    <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">{lang === 'ar' ? 'ابدأ المحاكاة لرؤية التحليل' : 'Run simulation to see analysis'}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Saved Tab ── */}
            {mobileActiveTab === 'saved' && (
              <div className="px-4 py-4">
                <MobileSavedExperiments
                  lang={lang}
                  currentParams={{
                    velocity: sim.velocity,
                    angle: sim.angle,
                    height: sim.height,
                    gravity: sim.gravity,
                    airResistance: sim.airResistance,
                    mass: sim.mass,
                  }}
                  prediction={sim.prediction ? {
                    range: sim.prediction.range,
                    maxHeight: sim.prediction.maxHeight,
                    timeOfFlight: sim.prediction.timeOfFlight,
                  } : null}
                  integrationMethod={sim.selectedIntegrationMethod}
                  onLoadExperiment={handleMobileExperimentLoad}
                />
              </div>
            )}

            {/* ── Settings Tab ── */}
            {mobileActiveTab === 'settings' && (
              <div className="px-4 py-4 space-y-3">
                <h3 className="text-sm font-bold text-foreground">{lang === 'ar' ? 'الإعدادات' : 'Settings'}</h3>
                {/* Night mode */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-card/60 border border-border/30">
                  <span className="text-xs font-medium text-foreground">{lang === 'ar' ? 'الوضع الليلي' : 'Dark Mode'}</span>
                  <Switch checked={sim.nightMode} onCheckedChange={(checked) => { sim.setNightMode(checked); playToggle(sim.isMuted, checked); }} />
                </div>
                {/* Sound */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-card/60 border border-border/30">
                  <span className="text-xs font-medium text-foreground">{lang === 'ar' ? 'الصوت' : 'Sound'}</span>
                  <Switch checked={!sim.isMuted} onCheckedChange={(checked) => { sim.setIsMuted(!checked); }} />
                </div>
                {/* Language */}
                <div className="p-3 rounded-xl bg-card/60 border border-border/30">
                  <span className="text-xs font-medium text-foreground block mb-2">{lang === 'ar' ? 'اللغة' : 'Language'}</span>
                  <div className="flex gap-2">
                    {(['ar', 'en', 'fr'] as const).map((l) => (
                      <button key={l} onClick={() => switchLanguage(l)}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all ${lang === l ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'}`}>
                        {l === 'ar' ? 'عربي' : l === 'en' ? 'EN' : 'FR'}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Integration method */}
                <div className="p-3 rounded-xl bg-card/60 border border-border/30">
                  <span className="text-xs font-medium text-foreground block mb-2">{lang === 'ar' ? 'طريقة التكامل' : 'Integration Method'}</span>
                  <div className="flex gap-2">
                    {(['euler', 'rk4', 'ai-apas'] as const).map((m) => (
                      <button key={m} onClick={() => sim.setSelectedIntegrationMethod(m)}
                        className={`flex-1 px-2 py-2 text-[10px] font-semibold rounded-lg transition-all ${sim.selectedIntegrationMethod === m ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'}`}>
                        {m.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Air Resistance */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-card/60 border border-border/30">
                  <span className="text-xs font-medium text-foreground">{lang === 'ar' ? 'مقاومة الهواء' : 'Air Resistance'}</span>
                  <Switch checked={sim.airResistance > 0} onCheckedChange={(checked) => { sim.setAirResistance(checked ? 0.02 : 0); playToggle(sim.isMuted, checked); }} />
                </div>
                {/* Bouncing */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-card/60 border border-border/30">
                  <span className="text-xs font-medium text-foreground">{lang === 'ar' ? 'ارتداد المقذوف' : 'Bouncing'}</span>
                  <Switch checked={sim.enableBounce} onCheckedChange={(checked) => { sim.setEnableBounce(checked); playToggle(sim.isMuted, checked); }} />
                </div>
              </div>
            )}
          </div>

          {/* Mobile Bottom Sheet — variables */}
          {mobileActiveTab === 'simulation' && (
            <MobileBottomSheet
              variables={mobileVariables}
              lang={lang}
              isOpen={showMobileBottomSheet}
              onToggle={() => setShowMobileBottomSheet(!showMobileBottomSheet)}
            />
          )}

          {/* Mobile AI Assistant */}
          <MobileAIAssistant
            isOpen={showMobileAI}
            onClose={() => setShowMobileAI(false)}
            lang={lang}
            velocity={sim.velocity}
            angle={sim.angle}
            height={sim.height}
            gravity={sim.gravity}
            airResistance={sim.airResistance}
            mass={sim.mass}
            prediction={sim.prediction}
            isAnimating={sim.isAnimating}
            trajectoryLength={sim.trajectoryData.length}
          />

          {/* Mobile Bottom Nav */}
          <MobileBottomNav
            activeTab={mobileActiveTab}
            onTabChange={setMobileActiveTab}
            lang={lang}
          />

          {/* PWA Install Prompt */}
          <PWAInstallPrompt lang={lang} />

          {/* Modals — reuse desktop modals */}
          <ModalsOverlays
            lang={lang} isMuted={sim.isMuted}
            showOnboarding={showOnboarding} setShowOnboarding={setShowOnboarding}
            showEnvSelector={showEnvSelector} setShowEnvSelector={setShowEnvSelector}
            currentEnvId={currentEnvId} onEnvironmentSelect={handleEnvironmentSelect}
            showDocumentation={showDocumentation} setShowDocumentation={setShowDocumentation}
            showStroboscopicModal={showStroboscopicModal} setShowStroboscopicModal={setShowStroboscopicModal}
            stroboscopicSettings={stroboscopicSettings} setStroboscopicSettings={setStroboscopicSettings}
            stroboscopicMarks={stroboscopicMarks} gravity={sim.gravity}
            isSimulationDone={!!isFinished || sim.isAnimating}
            showMultiSimModal={showMultiSimModal} setShowMultiSimModal={setShowMultiSimModal}
            velocity={sim.velocity} angle={sim.angle} height={sim.height}
            airResistance={sim.airResistance} mass={sim.mass} windSpeed={sim.windSpeed}
            enableBounce={sim.enableBounce} bounceCoefficient={sim.bounceCoefficient}
            selectedIntegrationMethod={sim.selectedIntegrationMethod}
            hasExperimentalData={hasExperimentalData} trajectoryData={sim.trajectoryData}
            showSettingsPanel={showSettingsPanel} setShowSettingsPanel={setShowSettingsPanel}
            nightMode={sim.nightMode}
            onToggleNightMode={() => { sim.setNightMode(!sim.nightMode); playToggle(sim.isMuted, !sim.nightMode); }}
            onToggleMute={() => { sim.setIsMuted(!sim.isMuted); playToggle(sim.isMuted, sim.isMuted); }}
            onSwitchLanguage={switchLanguage}
            accentColor={accentColor} accentColors={ACCENT_COLORS} onAccentChange={setAccentColor}
            is3DMode={is3DMode} theme3d={theme3d} onTheme3dChange={setTheme3d}
            showCalculator={showCalculator} setShowCalculator={setShowCalculator}
            showRuler={showRuler} setShowRuler={setShowRuler}
            showProtractor={showProtractor} setShowProtractor={setShowProtractor}
            showNoiseFilter={showNoiseFilter} setShowNoiseFilter={setShowNoiseFilter}
            setTrajectoryData={sim.setTrajectoryData}
            showLiveCalibration={showLiveCalibration} setShowLiveCalibration={setShowLiveCalibration}
            setCalibrationScale={setCalibrationScale} calibrationMediaSrc={lastAnalyzedMediaSrc}
            showSecurityPrivacy={showSecurityPrivacy} setShowSecurityPrivacy={setShowSecurityPrivacy}
            autoDeleteVideos={autoDeleteVideos} onToggleAutoDelete={setAutoDeleteVideos}
            showComprehensiveGuide={showComprehensiveGuide} setShowComprehensiveGuide={setShowComprehensiveGuide}
            showRestrictionOverlay={showRestrictionOverlay} setShowRestrictionOverlay={setShowRestrictionOverlay}
          />
        </div>
      </PageTransition>
    );
  }

  // ═══════════════════════════════════════════════
  // ═══ DESKTOP LAYOUT (unchanged) ═══
  // ═══════════════════════════════════════════════
  return (
    <PageTransition>
      <div className={`min-h-screen bg-background relative overflow-hidden ${isLangTransitioning ? 'lang-fade-out' : ''}`} dir={T.dir}>
        {/* Ambient background gradient orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse-slow" />
          <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full bg-primary/3 blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
          <div className="absolute -bottom-20 right-1/4 w-72 h-72 rounded-full bg-accent/5 blur-3xl animate-pulse-slow" style={{ animationDelay: '4s' }} />
        </div>
        <AcademicAmbient />

        {/* ── Top Nav Bar ── */}
        <HeaderNav
          lang={lang}
          T={T}
          isMuted={sim.isMuted}
          nightMode={sim.nightMode}
          velocity={sim.velocity}
          angle={sim.angle}
          height={sim.height}
          gravity={sim.gravity}
          airResistance={sim.airResistance}
          mass={sim.mass}
          prediction={sim.prediction}
          trajectoryData={sim.trajectoryData}
          selectedIntegrationMethod={sim.selectedIntegrationMethod}
          currentEnvId={currentEnvId}
          isFinished={!!isFinished}
          hasExperimentalData={hasExperimentalData}
          onOpenSettings={() => setShowSettingsPanel(true)}
          onShowRestrictionOverlay={setShowRestrictionOverlay}
        />

        {/* ── Main Content ── */}
        <div className="max-w-[1600px] mx-auto px-3 sm:px-5 md:px-6 py-4 sm:py-6">
          <div className={isFocusMode ? 'grid grid-cols-1 lg:grid-cols-[240px_1fr] xl:grid-cols-[260px_1fr] gap-3 sm:gap-4 md:gap-5' : 'grid grid-cols-1 md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr_200px] xl:grid-cols-[260px_1fr_220px] gap-3 sm:gap-4 md:gap-5'}>

            {/* ═══ LEFT — Parameters Panel ═══ */}
            <aside data-tour="left-panel" className="space-y-3.5 sm:space-y-4 order-2 md:order-1 md:sticky md:top-16 md:self-start md:max-h-[calc(100vh-5rem)] md:overflow-y-auto md:scrollbar-thin md:scrollbar-thumb-border md:scrollbar-track-transparent md:pt-24">
              {/* Dynamic Analytics Dashboard — collapsible, syncs only when open */}
              <div className="border border-border/40 rounded-xl overflow-hidden bg-card/70 backdrop-blur-sm shadow-lg shadow-black/[0.04] dark:shadow-black/15 transition-all duration-300 hover:shadow-xl hover:shadow-primary/[0.06] dark:border-border/30">
                <button
                  onClick={() => { setShowDynamicDashboard(!showDynamicDashboard); playSectionToggle(sim.isMuted); }}
                  className="w-full px-3 sm:px-4 py-3 flex items-center justify-between hover:bg-primary/5 transition-all duration-300"
                >
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-tight flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    {lang === 'ar' ? 'لوحة التحليلات الديناميكية' : 'Dynamic Analytics'}
                  </h3>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${showDynamicDashboard ? 'rotate-180' : ''}`} />
                </button>

                {showDynamicDashboard && (
                  <div className="border-t border-border animate-slideDown">
                    <Suspense fallback={<div className="p-4 flex items-center justify-center"><AnimatedLoadingSpinner /></div>}>
                      <DynamicAnalyticsDashboard
                        lang={lang}
                        trajectoryData={sim.trajectoryData}
                        currentTime={sim.currentTime}
                        mass={sim.mass}
                        gravity={sim.gravity}
                        observerType={relativity.enabled && relativity.mode === 'galilean' ? 'moving' : 'stationary'}
                        frameVelocity={relativity.enabled ? relativity.frameVelocity : 0}
                      />
                    </Suspense>
                  </div>
                )}
              </div>

              <div className="border border-border/40 rounded-xl overflow-hidden bg-card/70 backdrop-blur-sm shadow-lg shadow-black/[0.04] dark:shadow-black/15 transition-all duration-300 hover:shadow-xl hover:shadow-primary/[0.06] dark:border-border/30">
                <button
                  onClick={() => { setShowPhysicsPanel(!showPhysicsPanel); playSectionToggle(sim.isMuted); }}
                  className="w-full px-3 sm:px-4 py-3 flex items-center justify-between hover:bg-primary/5 transition-all duration-300"
                >
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-tight flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-primary" />
                    {T.physicsPanel}
                  </h3>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${showPhysicsPanel ? 'rotate-180' : ''}`} />
                </button>

                {showPhysicsPanel && (
                  <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-border pt-3 animate-slideDown">
                    <div className="grid grid-cols-2 sm:grid-cols-1 gap-x-3 gap-y-0">
                      <ParamInputWithUnit
                        label={lang === 'ar' ? '\u0627\u0644\u0633\u0631\u0639\u0629' : lang === 'fr' ? 'Vitesse' : 'Velocity'}
                        value={getDisplayValue('velocity', sim.velocity)}
                        onChange={(v) => sim.setVelocity(fromDisplayValue('velocity', v))}
                        min={-500} max={500} step={1} isRTL={isRTL}
                        unitKey="velocity" selectedUnit={selectedUnits.velocity}
                        units={UNIT_OPTIONS.velocity.units} lang={lang}
                        onUnitChange={(u) => setSelectedUnits(prev => ({ ...prev, velocity: u }))}
                        muted={sim.isMuted}
                        tooltip={lang === 'ar' ? '\u0633\u0631\u0639\u0629 \u0627\u0646\u0637\u0644\u0627\u0642 \u0627\u0644\u0645\u0642\u0630\u0648\u0641 (V\u2080). \u0627\u0644\u0642\u064a\u0645 \u0627\u0644\u0633\u0627\u0644\u0628\u0629 \u062a\u0639\u0643\u0633 \u0627\u0644\u0627\u062a\u062c\u0627\u0647' : 'Initial launch speed (V\u2080). Negative values reverse direction'}
                      />
                      <ParamInputWithUnit
                        label={lang === 'ar' ? (is3DMode ? '\u0627\u0644\u0632\u0627\u0648\u064a\u0629 \u03b8' : '\u0627\u0644\u0632\u0627\u0648\u064a\u0629') : lang === 'fr' ? (is3DMode ? 'Angle \u03b8' : 'Angle') : (is3DMode ? 'Angle \u03b8' : 'Angle')}
                        value={getDisplayValue('angle', sim.angle)}
                        onChange={(v) => sim.setAngle(fromDisplayValue('angle', v))}
                        min={selectedUnits.angle === 'rad' ? -6.2832 : selectedUnits.angle === 'grad' ? -400 : -360} max={selectedUnits.angle === 'rad' ? 6.2832 : selectedUnits.angle === 'grad' ? 400 : 360}
                        step={selectedUnits.angle === 'rad' ? 0.01 : 1} isRTL={isRTL}
                        unitKey="angle" selectedUnit={selectedUnits.angle}
                        units={UNIT_OPTIONS.angle.units} lang={lang}
                        onUnitChange={(u) => setSelectedUnits(prev => ({ ...prev, angle: u }))}
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
                        onChange={(v) => sim.setGravity(Math.max(0, fromDisplayValue('gravity', v)))}
                        min={0} max={100} step={0.01} isRTL={isRTL}
                        unitKey="gravity" selectedUnit={selectedUnits.gravity}
                        units={UNIT_OPTIONS.gravity.units} lang={lang}
                        onUnitChange={(u) => setSelectedUnits(prev => ({ ...prev, gravity: u }))}
                        muted={sim.isMuted}
                        tooltip={lang === 'ar' ? '\u062a\u0633\u0627\u0631\u0639 \u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629. \u0627\u0644\u0623\u0631\u0636=9.81\u060c \u0627\u0644\u0642\u0645\u0631=1.62\u060c \u0627\u0644\u0645\u0631\u064a\u062e=3.72' : 'Gravitational acceleration. Earth=9.81, Moon=1.62, Mars=3.72'}
                      />
                      <ParamInputWithUnit
                        label={lang === 'ar' ? '\u0627\u0644\u0643\u062a\u0644\u0629' : lang === 'fr' ? 'Masse' : 'Mass'}
                        value={getDisplayValue('mass', sim.mass)}
                        onChange={(v) => sim.setMass(fromDisplayValue('mass', v))}
                        min={0.01} max={50000} step={0.01} isRTL={isRTL}
                        unitKey="mass" selectedUnit={selectedUnits.mass}
                        units={UNIT_OPTIONS.mass.units} lang={lang}
                        onUnitChange={(u) => setSelectedUnits(prev => ({ ...prev, mass: u }))}
                        muted={sim.isMuted}
                        tooltip={lang === 'ar' ? '\u0643\u062a\u0644\u0629 \u0627\u0644\u0645\u0642\u0630\u0648\u0641. \u062a\u0624\u062b\u0631 \u0639\u0644\u0649 \u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0647\u0648\u0627\u0621 \u0648\u0642\u0648\u0629 \u0645\u0627\u063a\u0646\u0648\u0633' : 'Projectile mass. Affects air resistance and Magnus force'}
                      />
                      <ParamInputWithUnit
                        label={lang === 'ar' ? '\u0627\u0644\u0627\u0631\u062a\u0641\u0627\u0639' : lang === 'fr' ? 'Hauteur' : 'Height'}
                        value={getDisplayValue('height', sim.height)}
                        onChange={(v) => sim.setHeight(fromDisplayValue('height', v))}
                        min={0} max={5000} step={0.5} isRTL={isRTL}
                        unitKey="height" selectedUnit={selectedUnits.height}
                        units={UNIT_OPTIONS.height.units} lang={lang}
                        onUnitChange={(u) => setSelectedUnits(prev => ({ ...prev, height: u }))}
                      />
                      <ParamInputWithUnit
                        label={lang === 'ar' ? '\u0627\u0644\u0645\u0648\u0636\u0639 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a (x\u2080)' : lang === 'fr' ? 'Position initiale (x\u2080)' : 'Initial Position (x\u2080)'}
                        value={getDisplayValue('height', sim.initialX)}
                        onChange={(v) => sim.setInitialX(fromDisplayValue('height', v))}
                        min={-5000} max={5000} step={0.5} isRTL={isRTL}
                        unitKey="height" selectedUnit={selectedUnits.height}
                        units={UNIT_OPTIONS.height.units} lang={lang}
                        onUnitChange={(u) => setSelectedUnits(prev => ({ ...prev, height: u }))}
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
                        <ParamInputWithUnit
                          label={lang === 'ar' ? '\u0633\u0631\u0639\u0629 \u0627\u0644\u0631\u064a\u0627\u062d' : lang === 'fr' ? 'Vitesse du Vent' : 'Wind Speed'}
                          value={getDisplayValue('windSpeed', sim.windSpeed)}
                          onChange={(v) => sim.setWindSpeed(fromDisplayValue('windSpeed', v))}
                          min={-100} max={100} step={1} isRTL={isRTL}
                          unitKey="windSpeed" selectedUnit={selectedUnits.windSpeed}
                          units={UNIT_OPTIONS.windSpeed.units} lang={lang}
                          onUnitChange={(u) => setSelectedUnits(prev => ({ ...prev, windSpeed: u }))}
                        />
                        <div>
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Cd ({lang === 'ar' ? '\u0645\u0639\u0627\u0645\u0644 \u0627\u0644\u0633\u062d\u0628' : lang === 'fr' ? 'Forme de Train\u00e9e' : 'Drag shape'})</span>
                            <span className="font-mono">{dragCd.toFixed(2)}</span>
                          </div>
                          <Slider value={[dragCd]} min={0.1} max={2.0} step={0.01}
                            onValueChange={([v]) => { setDragCd(v); playSliderChange(sim.isMuted); }} />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>&rho; ({lang === 'ar' ? '\u0643\u062b\u0627\u0641\u0629 \u0627\u0644\u0647\u0648\u0627\u0621' : lang === 'fr' ? "Densit\u00e9 de l'Air" : 'Air density'}) kg/m&sup3;</span>
                            <span className="font-mono">{airDensity.toFixed(3)}</span>
                          </div>
                          <Slider value={[airDensity]} min={0.5} max={2.0} step={0.001}
                            onValueChange={([v]) => { setAirDensity(v); playSliderChange(sim.isMuted); }} />
                        </div>
                        <p className="text-[9px] text-muted-foreground text-center border-t border-border pt-1.5 mt-1">
                          F_d = &frac12; &middot; Cd &middot; &rho; &middot; A &middot; (v - v_wind)&sup2;
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Display Options */}
              <div className="border border-border/40 rounded-xl overflow-hidden bg-card/70 backdrop-blur-sm shadow-lg shadow-black/[0.04] dark:shadow-black/15 transition-all duration-300 hover:shadow-xl hover:shadow-primary/[0.06] dark:border-border/30">
                <button
                  onClick={() => { setShowDisplayOptions(!showDisplayOptions); playSectionToggle(sim.isMuted); }}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary/5 transition-all duration-300"
                >
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-tight flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    {lang === 'ar' ? '\u062e\u064a\u0627\u0631\u0627\u062a \u0627\u0644\u0639\u0631\u0636' : lang === 'fr' ? "Options d'Affichage" : 'Display Options'}
                  </h3>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${showDisplayOptions ? 'rotate-180' : ''}`} />
                </button>

                {showDisplayOptions && (
                  <div className="p-4 pt-0 space-y-2 animate-slideDown" style={{ animationDuration: '0.3s' }}>
                    <button
                      onClick={() => { setShowEnvSelector(true); playClick(sim.isMuted); }}
                      className="group w-full text-xs font-medium py-2.5 px-3 rounded-lg flex items-center gap-2 text-foreground hover:bg-primary/10 border border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300"
                    >
                      <Globe2 className="w-3.5 h-3.5" />
                      {lang === 'ar' ? '\u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0628\u064a\u0626\u0629' : lang === 'fr' ? 'Environnement' : 'Environment'}
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {ENVIRONMENTS.find(e => e.id === currentEnvId)?.emoji} {ENVIRONMENTS.find(e => e.id === currentEnvId)?.name[lang as 'ar' | 'en' | 'fr']}
                      </span>
                    </button>
                    <ToggleOption label={lang === 'ar' ? '\u0627\u0644\u0646\u0642\u0627\u0637 \u0627\u0644\u062d\u0631\u062c\u0629' : lang === 'fr' ? 'Points Critiques' : 'Critical Points'} active={sim.showCriticalPoints}
                      onClick={() => { sim.setShowCriticalPoints(!sim.showCriticalPoints); playClick(sim.isMuted); }} icon={<Crosshair className="w-3.5 h-3.5" />} />
                    <ForceVectorsSection
                      lang={lang}
                      showExternalForces={sim.showExternalForces}
                      onToggle={() => { sim.setShowExternalForces(!sim.showExternalForces); playClick(sim.isMuted); }}
                      vectorVisibility={vectorVisibility}
                      onVectorToggle={(key) => { setVectorVisibility(prev => ({ ...prev, [key]: !prev[key] })); playClick(sim.isMuted); }}
                      isWaterEnvironment={currentEnvId === 'underwater'}
                      hydrodynamicEnabled={advancedPhysics.enableHydrodynamicDrag || advancedPhysics.isUnderwater}
                    />
                    <button
                      onClick={() => { setShowStroboscopicModal(true); playClick(sim.isMuted); }}
                      className={`group w-full text-xs font-medium py-2.5 px-3 rounded-lg flex items-center gap-2 transition-all duration-300 ${stroboscopicSettings.enabled ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border border-primary/50 shadow-md shadow-primary/20' : 'text-foreground hover:bg-primary/10 border border-border/50 hover:border-primary/20'}`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {lang === 'ar' ? '\u0627\u0644\u062a\u0635\u0648\u064a\u0631 \u0627\u0644\u0645\u062a\u0639\u0627\u0642\u0628' : lang === 'fr' ? 'Photographie Stroboscopique' : 'Stroboscopic'}
                      {stroboscopicSettings.enabled && (
                        <span className="ml-auto text-[10px] opacity-80">&Delta;t={stroboscopicSettings.deltaT}s</span>
                      )}
                    </button>
                    <ToggleOption label={lang === 'ar' ? '\u0627\u0631\u062a\u062f\u0627\u062f \u0627\u0644\u0645\u0642\u0630\u0648\u0641' : lang === 'fr' ? 'Rebond du Projectile' : 'Bouncing'} active={sim.enableBounce}
                      onClick={() => { sim.setEnableBounce(!sim.enableBounce); playToggle(sim.isMuted, !sim.enableBounce); }} icon={<ArrowDownUp className="w-3.5 h-3.5" />} />
                    {sim.enableBounce && (
                      <div className="px-1 pb-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                          <span>{lang === 'ar' ? '\u0645\u0639\u0627\u0645\u0644 \u0627\u0644\u0627\u0631\u062a\u062f\u0627\u062f' : lang === 'fr' ? 'Coeff. de Rebond' : 'COR'}</span>
                          <span className="font-mono">{sim.bounceCoefficient.toFixed(2)}</span>
                        </div>
                        <Slider value={[sim.bounceCoefficient]} min={0.1} max={0.95} step={0.05}
                          onValueChange={([v]) => { sim.setBounceCoefficient(v); playSliderChange(sim.isMuted); }} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Advanced Physics Panel */}
              <AdvancedPhysicsPanel lang={lang} advancedPhysicsInstance={advancedPhysics} onPhysicsChange={() => sim.recalculate()} environmentId={currentEnvId} relativity={relativity} muted={sim.isMuted} />

              {/* Save/Compare */}
              <div className="border border-border/50 rounded-xl overflow-hidden bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
                <button
                  onClick={() => { setShowComparisonSection(!showComparisonSection); playSectionToggle(sim.isMuted); }}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary/5 transition-all duration-300"
                >
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-tight flex items-center gap-2">
                    <GitBranch className="w-3.5 h-3.5 text-primary" />
                    {lang === 'ar' ? '\u0627\u0644\u0645\u0642\u0627\u0631\u0646\u0629' : lang === 'fr' ? 'Comparaison' : 'Comparison'}
                  </h3>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${showComparisonSection ? 'rotate-180' : ''}`} />
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
                        <button onClick={() => { sim.setShowAIComparison(!sim.showAIComparison); playClick(sim.isMuted); }}
                          className={`group w-full text-xs font-medium py-2 px-3 rounded flex items-center justify-center gap-1.5 transition-all duration-200 ${
                            sim.showAIComparison
                              ? 'text-primary-foreground bg-primary border border-primary/50 shadow-md'
                              : 'text-foreground border border-border hover:border-foreground/30 hover:bg-secondary hover:shadow-md'
                          }`}>
                          <GitBranch className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" /> {lang === 'ar' ? '\u0645\u0642\u0627\u0631\u0646\u0629 \u0646\u0645\u0627\u0630\u062c \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a' : lang === 'fr' ? 'Comparaison des Mod\u00e8les IA' : 'AI Model Comparison'}
                        </button>
                        <button onClick={() => { setShowMultiSimModal(true); playClick(sim.isMuted); }}
                          className="group w-full text-xs font-medium text-foreground py-2 px-3 rounded border border-border hover:border-foreground/30 hover:bg-secondary hover:shadow-md transition-all duration-200 flex items-center justify-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" /> {lang === 'ar' ? '\u0627\u0644\u0645\u0642\u0627\u0631\u0646\u0629 \u0627\u0644\u0645\u062a\u0642\u062f\u0645\u0629' : lang === 'fr' ? 'Comparaison Avanc\u00e9e' : 'Advanced Comparison'}
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

                    {/* Saved comparison snapshot panel */}
                    {sim.comparisonMode && savedSnapshot && (
                      <div className="mt-3 border border-border rounded-lg overflow-hidden bg-secondary/30 animate-slideDown">
                        <div className="px-3 py-2 bg-secondary/50 border-b border-border">
                          <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                            <Save className="w-3 h-3" />
                            {lang === 'ar' ? '\u0644\u0642\u0637\u0629 \u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0629' : lang === 'fr' ? 'Instantan\u00e9 de Trajectoire' : 'Saved Trajectory Snapshot'}
                          </p>
                        </div>
                        <div className="p-3 space-y-2">
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                            <div className="flex justify-between"><span className="text-muted-foreground">V&#x2080;</span><span className="font-mono font-semibold text-foreground">{savedSnapshot.velocity.toFixed(2)} {T.u_ms}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">&theta;</span><span className="font-mono font-semibold text-foreground">{savedSnapshot.angle.toFixed(1)}&deg;</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">h&#x2080;</span><span className="font-mono font-semibold text-foreground">{savedSnapshot.height.toFixed(2)} {T.u_m_s}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">g</span><span className="font-mono font-semibold text-foreground">{savedSnapshot.gravity.toFixed(2)} {T.u_ms2}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">m</span><span className="font-mono font-semibold text-foreground">{savedSnapshot.mass.toFixed(2)} {T.u_kg}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">k</span><span className="font-mono font-semibold text-foreground">{savedSnapshot.airResistance.toFixed(3)}</span></div>
                          </div>
                          <div className="border-t border-border" />
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                            <div className="flex justify-between"><span className="text-muted-foreground">{lang === 'ar' ? '\u0627\u0644\u0645\u062f\u0649' : lang === 'fr' ? 'Port\u00e9e' : 'Range'}</span><span className="font-mono font-semibold text-foreground">{savedSnapshot.range.toFixed(2)} {T.u_m_s}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">{lang === 'ar' ? '\u0623\u0642\u0635\u0649 \u0627\u0631\u062a\u0641\u0627\u0639' : lang === 'fr' ? 'Hauteur Max' : 'Max H'}</span><span className="font-mono font-semibold text-foreground">{savedSnapshot.maxHeight.toFixed(2)} {T.u_m_s}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">{lang === 'ar' ? '\u0632\u0645\u0646 \u0627\u0644\u0637\u064a\u0631\u0627\u0646' : lang === 'fr' ? 'Temps de Vol' : 'T. Flight'}</span><span className="font-mono font-semibold text-foreground">{savedSnapshot.flightTime.toFixed(2)} {T.u_s}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">{lang === 'ar' ? '\u0627\u0644\u0633\u0631\u0639\u0629 \u0627\u0644\u0646\u0647\u0627\u0626\u064a\u0629' : lang === 'fr' ? 'Vitesse Finale' : 'V Final'}</span><span className="font-mono font-semibold text-foreground">{savedSnapshot.finalVelocity.toFixed(2)} {T.u_ms}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">{lang === 'ar' ? '\u0632\u0627\u0648\u064a\u0629 \u0627\u0644\u0633\u0642\u0648\u0637' : lang === 'fr' ? 'Angle Impact' : 'Impact \u03b8'}</span><span className="font-mono font-semibold text-foreground">{savedSnapshot.impactAngle.toFixed(1)}&deg;</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">{lang === 'ar' ? '\u0627\u0644\u0637\u0631\u064a\u0642\u0629' : lang === 'fr' ? 'M\u00e9thode' : 'Method'}</span><span className="font-mono font-semibold text-foreground">{savedSnapshot.integrationMethod.toUpperCase()}</span></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Export */}
              <ExportSection
                lang={lang}
                trajectoryData={sim.trajectoryData}
                prediction={sim.prediction}
                velocity={sim.velocity}
                angle={sim.angle}
                height={sim.height}
                gravity={sim.gravity}
                airResistance={sim.airResistance}
                mass={sim.mass}
                onExportPNG={exportSimulationPNG}
                muted={sim.isMuted}
                spinRate={sim.spinRate}
                projectileRadius={sim.projectileRadius}
                windSpeed={sim.windSpeed}
                integrationMethod={sim.selectedIntegrationMethod}
              />
            </aside>

            {/* ═══ CENTER — Canvas & Results ═══ */}
            <div data-tour="center-canvas" className="space-y-3 sm:space-y-5 order-1 md:order-2 min-w-0">

              {/* Calculations Button — above canvas, unlocks after image/video analysis */}
              <div className="flex items-center justify-center">
                <button
                  onClick={() => { if (lastAnalyzedMediaSrc) { setShowCalculationsModal(true); playClick(sim.isMuted); } }}
                  disabled={!lastAnalyzedMediaSrc}
                  className={`relative flex items-center gap-1.5 group transition-all duration-300 ${
                    lastAnalyzedMediaSrc
                      ? 'apas-assistant-btn rounded-lg px-3 py-1.5 text-white shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.02]'
                      : 'rounded-lg px-3 py-1.5 bg-secondary/50 text-muted-foreground cursor-not-allowed opacity-60 border border-border/50'
                  }`}
                  title={!lastAnalyzedMediaSrc ? (lang === 'ar' ? 'حلّل صورة أو فيديو أولاً لعرض الحسابات' : lang === 'fr' ? 'Analysez d\'abord une image ou vidéo' : 'Analyze an image or video first to view calculations') : ''}
                >
                  <span className="relative flex items-center justify-center w-4 h-4">
                    {lastAnalyzedMediaSrc ? (
                      <>
                        <Calculator className="w-4 h-4 sparkle-icon-flash" />
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white shadow-sm"></span>
                        </span>
                      </>
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                  </span>
                  <span className="relative z-10 text-[11px] font-bold whitespace-nowrap flex items-center gap-1 tracking-wide" dir={isRTL ? 'rtl' : 'ltr'}>
                    <span>{lang === 'ar' ? 'كيف تم الحساب' : lang === 'fr' ? 'Calculs' : 'Calculations'}</span>
                    <span className="font-extrabold">APAS</span>
                  </span>
                </button>
              </div>

              {/* Canvas area */}
              <div ref={canvasContainerRef} className={isFullscreen ? 'fixed inset-0 z-50 bg-background flex flex-col' : ''}>
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2.5">
                    <span className={pathDotClass} />
                    {lang === 'ar' ? '\u0645\u0633\u0627\u0631 \u0627\u0644\u0645\u0642\u0630\u0648\u0641' : lang === 'fr' ? 'Trajectoire du Projectile' : 'Projectile Path'}
                  </h2>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setCanvasZoom(z => Math.max(0.5, z - 0.25)); playZoomSound(sim.isMuted, false); }}
                      className="group p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary border border-transparent hover:border-primary/20 hover:shadow-md transition-all duration-300"
                      title={lang === 'ar' ? '\u062a\u0635\u063a\u064a\u0631' : 'Zoom Out'}>
                      <ZoomOut className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" />
                    </button>
                    <span className="text-[10px] font-mono text-muted-foreground w-8 text-center">{Math.round(canvasZoom * 100)}%</span>
                    <button onClick={() => { setCanvasZoom(z => Math.min(3, z + 0.25)); playZoomSound(sim.isMuted, true); }}
                      className="group p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary border border-transparent hover:border-primary/20 hover:shadow-md transition-all duration-300"
                      title={lang === 'ar' ? '\u062a\u0643\u0628\u064a\u0631' : 'Zoom In'}>
                      <ZoomIn className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" />
                    </button>
                    <button onClick={() => {
                        if (is3DMode) { setIs3DMode(false); playModeSwitch(sim.isMuted, false); }
                        else if (!webglError) { setIs3DMode(true); playModeSwitch(sim.isMuted, true); }
                      }}
                      className={is3DMode ? 'group p-1.5 rounded-lg bg-primary text-primary-foreground border border-primary hover:shadow-md transition-all duration-300' : 'group p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 hover:shadow-md transition-all duration-300'}
                      title={lang === 'ar' ? '\u0648\u0636\u0639 \u062b\u0644\u0627\u062b\u064a \u0627\u0644\u0623\u0628\u0639\u0627\u062f' : '3D Mode'}>
                      <Box className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" />
                    </button>
                    <button onClick={exportSimulationPNG}
                      className="group p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary border border-transparent hover:border-primary/20 hover:shadow-md transition-all duration-300"
                      title={lang === 'ar' ? '\u062a\u0635\u0648\u064a\u0631' : 'Screenshot'}>
                      <Camera className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" />
                    </button>
                    <button onClick={() => { setShowLiveData(v => !v); playUIClick(sim.isMuted); }}
                      className={showLiveData ? 'group p-1.5 rounded-lg bg-primary text-primary-foreground border border-primary hover:shadow-md transition-all duration-300' : 'group p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 hover:shadow-md transition-all duration-300'}
                      title={lang === 'ar' ? '\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062d\u064a\u0629' : 'Live Data'}>
                      {showLiveData ? <Eye className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" /> : <EyeOff className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" />}
                    </button>
                    <button onClick={toggleFullscreen}
                      className="group p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary border border-transparent hover:border-primary/20 hover:shadow-md transition-all duration-300"
                      title={lang === 'ar' ? '\u0645\u0644\u0621 \u0627\u0644\u0634\u0627\u0634\u0629' : 'Fullscreen'}>
                      {isFullscreen ? <Minimize className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" /> : <Maximize className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" />}
                    </button>
                    <button onClick={() => { setShowGrid(g => !g); playUIClick(sim.isMuted); }}
                      className={showGrid ? 'group p-1.5 rounded-lg bg-primary text-primary-foreground border border-primary hover:shadow-md transition-all duration-300' : 'group p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 hover:shadow-md transition-all duration-300'}
                      title={lang === 'ar' ? '\u0627\u0644\u0634\u0628\u0643\u0629' : 'Grid'}>
                      <Grid3x3 className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" />
                    </button>
                    <button onClick={() => { setIsFocusMode(f => !f); playUIClick(sim.isMuted); }}
                      className={isFocusMode ? 'group p-1.5 rounded-lg bg-primary text-primary-foreground border border-primary hover:shadow-md transition-all duration-300' : 'group p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 hover:shadow-md transition-all duration-300'}
                      title={lang === 'ar' ? '\u0648\u0636\u0639 \u0627\u0644\u062a\u0631\u0643\u064a\u0632' : 'Focus Mode'}>
                      <Focus className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" />
                    </button>
                    <Suspense fallback={null}>
                      <SimulationRecorder lang={lang} muted={sim.isMuted} canvasContainerRef={canvasContainerRef} onStartAnimation={sim.startAnimation} />
                    </Suspense>
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
                          stroboscopicMarks={stroboscopicSettings.enabled ? stroboscopicMarks : []}
                          showStroboscopicProjections={stroboscopicSettings.showProjections}
                          environmentId={currentEnvId} activePresetEmoji={activePresetEmoji} showGrid={showGrid}
                          enableMagnusSpin={advancedPhysics.enableMagnus && advancedPhysics.spinRate !== 0}
                          spinRate={advancedPhysics.spinRate} theme3d={theme3d}
                          onWebglError={(msg) => { setWebglError(msg); setIs3DMode(false); }}
                        />
                        {webglError && (
                          <div className="mt-2 p-2 text-xs text-amber-800 bg-amber-100 border border-amber-300 rounded">
                            <p className="font-semibold">{lang === 'ar' ? '\u062a\u062d\u0630\u064a\u0631 WebGL' : 'WebGL Warning'}:</p>
                            <p>{webglError}</p>
                            <button className="mt-1 px-2 py-1 bg-primary text-primary-foreground rounded text-[11px]"
                              onClick={() => { setIs3DMode(false); setWebglError(null); }}>
                              {lang === 'ar' ? '\u0627\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0627\u0644\u0648\u0636\u0639 \u062b\u0646\u0627\u0626\u064a \u0627\u0644\u0623\u0628\u0639\u0627\u062f' : 'Switch to 2D Mode'}
                            </button>
                          </div>
                        )}
                      </Suspense>
                    </ErrorBoundary>
                  ) : (
                    <ErrorBoundary sectionName="2D Simulation">
                      <SimulationCanvas
                        trajectoryData={sim.trajectoryData} theoreticalData={sim.theoreticalData} prediction={sim.prediction}
                        currentTime={sim.currentTime} height={sim.height} showCriticalPoints={sim.showCriticalPoints}
                        showExternalForces={sim.showExternalForces} vectorVisibility={vectorVisibility}
                        showAIComparison={sim.showAIComparison} aiModels={sim.aiModels} customColors={sim.customColors}
                        comparisonMode={sim.comparisonMode} savedTrajectory={sim.savedTrajectory}
                        multiTrajectoryMode={sim.multiTrajectoryMode} multiTrajectories={sim.multiTrajectories}
                        mass={sim.mass} gravity={sim.gravity} airResistance={sim.airResistance} windSpeed={sim.windSpeed}
                        T={T} lang={lang} countdown={sim.countdown} nightMode={sim.nightMode} zoom={canvasZoom}
                        isAnimating={sim.isAnimating} isFullscreen={isFullscreen} showLiveData={showLiveData}
                        stroboscopicMarks={stroboscopicSettings.enabled ? stroboscopicMarks : []}
                        showStroboscopicProjections={stroboscopicSettings.showProjections}
                        environmentId={currentEnvId} activePresetEmoji={activePresetEmoji}
                        equationTrajectory={equationTrajectory} showGrid={showGrid}
                        secondBody={null} collisionPoint={null}
                        fluidFrictionRay={advancedPhysics.enableHydrodynamicDrag || advancedPhysics.isUnderwater}
                        isUnderwater={advancedPhysics.isUnderwater}
                        fluidDensity={advancedPhysics.isUnderwater ? advancedPhysics.fluidDensity : 1.225}
                        calibrationScale={calibrationScale}
                        relativityTrajectory={relativitySPrimeTrajectory} relativityEnabled={relativity.enabled}
                        relativityMode={relativity.mode} relativityActiveObserver={relativity.activeObserver}
                        relativityShowDual={relativity.showDualTrajectories} relativityFrameVelocity={relativity.frameVelocity}
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

              {/* ── Video/Image Overlay ── */}
              {showVideoOverlay && lastAnalyzedMediaSrc && (
                <VideoOverlay
                  lang={lang}
                  mediaSrc={lastAnalyzedMediaSrc}
                  mediaType={lastAnalyzedMediaType}
                  trajectoryData={sim.trajectoryData}
                  currentTime={sim.currentTime}
                  isAnimating={sim.isAnimating}
                  onClose={() => setShowVideoOverlay(false)}
                  muted={sim.isMuted}
                />
              )}

              {/* ── Below-canvas sections (hidden in focus mode) ── */}
              {!isFocusMode && <>
                {/* Quick Start Tips */}
                {showQuickTips && (
                  <QuickStartTips
                    lang={lang}
                    hasTrajectory={sim.trajectoryData.length > 0}
                    hasMediaAnalysis={!!lastAnalyzedMediaSrc}
                    onDismiss={() => setShowQuickTips(false)}
                  />
                )}

                {/* ── Results ── */}
                {sim.prediction && (
                  <ResultsSection
                    lang={lang} T={T} prediction={sim.prediction}
                    velocity={sim.velocity} angle={sim.angle} height={sim.height}
                    gravity={sim.gravity} airResistance={sim.airResistance} mass={sim.mass}
                    showPathInfo={showPathInfo} onTogglePathInfo={() => setShowPathInfo(!showPathInfo)}
                  />
                )}

                {/* Chart Section */}
                <CollapsibleSection title={lang === 'ar' ? '\ud83d\udcc8 \u0627\u0644\u062a\u0645\u062b\u064a\u0644 \u0627\u0644\u0628\u064a\u0627\u0646\u064a' : '\ud83d\udcc8 Graphical Representation'} icon="\ud83d\udcc8" open={showChartSection} toggle={() => setShowChartSection(!showChartSection)}
                  miniPreview={
                    chartAxisX && chartAxisY ? (
                      <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">
                        {axisVars.find(v => v.key === chartAxisX)?.symbol || chartAxisX} vs {axisVars.find(v => v.key === chartAxisY)?.symbol || chartAxisY}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{lang === 'ar' ? '\u0644\u0645 \u064a\u064f\u062d\u062f\u062f' : 'Not set'}</span>
                    )
                  }
                >
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">{T.xAxis}</p>
                      <select value={chartAxisX} onChange={(e) => setChartAxisX(e.target.value)} dir={T.dir} className="w-full text-sm">
                        <option value="">{lang === 'ar' ? '\u0627\u062e\u062a\u0631...' : 'Select...'}</option>
                        {axisVars.map((v) => <option key={v.key} value={v.key}>{v.symbol} ({v.unit})</option>)}
                      </select>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">{T.yAxis}</p>
                      <select value={chartAxisY} onChange={(e) => setChartAxisY(e.target.value)} dir={T.dir} className="w-full text-sm">
                        <option value="">{lang === 'ar' ? '\u0627\u062e\u062a\u0631...' : 'Select...'}</option>
                        {axisVars.map((v) => <option key={v.key} value={v.key}>{v.symbol} ({v.unit})</option>)}
                      </select>
                    </div>
                  </div>
                  {chartAxisX && chartAxisY ? (() => {
                    const chartData = getChartData();
                    if (!chartData.length) return <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">{lang === 'ar' ? '\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a' : 'No data'}</div>;
                    const xs = chartData.map((d) => d.xVal);
                    const ys = chartData.map((d) => d.yVal);
                    const rawXMin = Math.min(...xs); const rawXMax = Math.max(...xs);
                    const rawYMin = Math.min(...ys); const rawYMax = Math.max(...ys);
                    const xPad = Math.max(Math.abs(rawXMax - rawXMin) * 0.1, 0.1);
                    const yPad = Math.max(Math.abs(rawYMax - rawYMin) * 0.1, 0.1);
                    const xMin = rawXMin >= 0 ? 0 : rawXMin - xPad; const xMax = rawXMax <= 0 ? 0 : rawXMax + xPad;
                    const yMin = rawYMin >= 0 ? 0 : rawYMin - yPad; const yMax = rawYMax <= 0 ? 0 : rawYMax + yPad;
                    return (
                      <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                          <defs>
                            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--foreground))" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="xVal" type="number" domain={[xMin, xMax]} stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={fmtTick} tickCount={6} />
                          <YAxis dataKey="yVal" domain={[yMin, yMax]} stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={fmtTick} tickCount={6} width={50} />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 6, color: 'hsl(var(--foreground))', fontSize: 12 }} />
                          <Area type="monotone" dataKey="yVal" stroke="hsl(var(--foreground))" strokeWidth={2} fill="url(#chartGrad)" dot={false} isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    );
                  })() : (
                    <div className="h-[260px] flex items-center justify-center border border-dashed border-border rounded-md">
                      <p className="text-sm font-medium text-muted-foreground">{lang === 'ar' ? '\u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u062d\u0627\u0648\u0631 \u0623\u0639\u0644\u0627\u0647' : 'Select axes above'}</p>
                    </div>
                  )}
                </CollapsibleSection>

                {/* Equations & Details */}
                <Collapsible defaultOpen={false} className="border border-border/50 rounded-xl bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 overflow-hidden">
                  <CollapsibleTrigger onClick={() => playSectionToggle(sim.isMuted)} className="flex items-center justify-between w-full px-4 py-3.5 cursor-pointer hover:bg-primary/5 transition-all duration-300">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                      {lang === 'ar' ? '\ud83d\udcdd \u0642\u0633\u0645 \u0627\u0644\u0645\u0639\u0627\u062f\u0644\u0627\u062a \u0648 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644' : '\ud83d\udcdd Equations & Details'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-300 [[data-state=open]>&]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t border-border/30">
                    <div className="p-4 space-y-4">
                      <EquationsPanel lang={lang} velocity={sim.velocity} angle={sim.angle} height={sim.height} gravity={sim.gravity} airResistance={sim.airResistance} mass={sim.mass} currentTime={sim.currentTime} muted={sim.isMuted} prediction={sim.prediction} />
                      <Suspense fallback={null}>
                        <EquationEngine lang={lang} muted={sim.isMuted} onTrajectoryGenerated={handleEquationTrajectory} />
                      </Suspense>
                      <CollapsibleSection
                        title={lang === 'ar' ? '\u222b \u0634\u0631\u062d \u062a\u0641\u0635\u064a\u0644\u064a \u0644\u0637\u0631\u0642 \u0627\u0644\u062a\u0643\u0627\u0645\u0644' : '\u222b Detailed Integration Methods Explanation'}
                        icon="\u222b" open={showIntegrationComparison} toggle={() => setShowIntegrationComparison(!showIntegrationComparison)}
                        miniPreview={<span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">Euler &middot; RK4 &middot; AI</span>}
                      >
                        <div className="space-y-4">
                          <div className="text-xs text-muted-foreground mb-3">
                            {lang === 'ar' ? '\u0627\u062e\u062a\u0631 \u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062a\u0643\u0627\u0645\u0644 \u0627\u0644\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0627\u062d\u062a\u064a\u0627\u062c\u0627\u062a\u0643 \u0645\u0646 \u062d\u064a\u062b \u0627\u0644\u062f\u0642\u0629 \u0648\u0627\u0644\u0633\u0631\u0639\u0629' : 'Choose the integration method that suits your needs in terms of accuracy and speed'}
                          </div>
                          {/* Euler */}
                          <div className="border border-border rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <h4 className="text-sm font-semibold text-foreground">Euler</h4>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{lang === 'ar' ? '\u26a1 \u0633\u0631\u064a\u0639' : '\u26a1 Fast'}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{lang === 'ar' ? '\u0637\u0631\u064a\u0642\u0629 \u0628\u0633\u064a\u0637\u0629 \u0648\u0633\u0631\u064a\u0639\u0629 \u0648\u0644\u0643\u0646 \u0623\u0642\u0644 \u062f\u0642\u0629. \u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0644\u0645\u062d\u0627\u0643\u0627\u0629 \u0627\u0644\u0633\u0631\u064a\u0639\u0629 \u0648\u0627\u0644\u062a\u0639\u0644\u064a\u0645 \u0627\u0644\u0623\u0633\u0627\u0633\u064a.' : 'Simple and fast method but less accurate. Suitable for quick simulations and basic education.'}</p>
                            <div className="bg-secondary/30 rounded p-2 mb-2">
                              <p className="text-xs font-medium text-foreground mb-1">{lang === 'ar' ? '\u0627\u0644\u0645\u0639\u0627\u062f\u0644\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u0629:' : 'Equations Used:'}</p>
                              <div className="space-y-1 text-[10px] font-mono">
                                <div className="text-center">x(t + dt) = x(t) + vx(t) * dt</div>
                                <div className="text-center">y(t + dt) = y(t) + vy(t) * dt</div>
                                <div className="text-center">vx(t + dt) = vx(t) + ax(t) * dt</div>
                                <div className="text-center">vy(t + dt) = vy(t) + ay(t) * dt</div>
                              </div>
                            </div>
                          </div>
                          {/* RK4 */}
                          <div className="border border-border rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <h4 className="text-sm font-semibold text-foreground">RK4</h4>
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{lang === 'ar' ? '\ud83d\udcd0 \u062f\u0642\u0629 \u0639\u0627\u0644\u064a\u0629' : '\ud83d\udcd0 High Accuracy'}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{lang === 'ar' ? '\u0637\u0631\u064a\u0642\u0629 \u0631\u0648\u0646\u062c-\u0643\u0648\u062a\u0627 \u0645\u0646 \u0627\u0644\u0631\u062a\u0628\u0629 \u0627\u0644\u0631\u0627\u0628\u0639\u0629. \u062a\u0648\u0627\u0632\u0646 \u0645\u0645\u062a\u0627\u0632 \u0628\u064a\u0646 \u0627\u0644\u062f\u0642\u0629 \u0648\u0627\u0644\u0633\u0631\u0639\u0629.' : 'Fourth-order Runge-Kutta method. Excellent balance between accuracy and speed.'}</p>
                            <div className="bg-secondary/30 rounded p-2 mb-2">
                              <p className="text-xs font-medium text-foreground mb-1">{lang === 'ar' ? '\u0627\u0644\u0645\u0639\u0627\u062f\u0644\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u0629:' : 'Equations Used:'}</p>
                              <div className="space-y-1 text-[10px] font-mono">
                                <div className="text-center">k1 = f(t, y), k2 = f(t + dt/2, y + k1*dt/2)</div>
                                <div className="text-center">k3 = f(t + dt/2, y + k2*dt/2), k4 = f(t + dt, y + k3*dt)</div>
                                <div className="text-center">y(t + dt) = y(t) + (k1 + 2*k2 + 2*k3 + k4) * dt/6</div>
                              </div>
                            </div>
                          </div>
                          {/* AI APAS */}
                          <div className="border border-border rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                              <h4 className="text-sm font-semibold text-foreground">AI APAS</h4>
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{lang === 'ar' ? '\ud83e\udd16 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064a' : '\ud83e\udd16 AI Powered'}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{lang === 'ar' ? '\u0637\u0631\u064a\u0642\u0629 \u0645\u062a\u0642\u062f\u0645\u0629 \u0645\u062f\u0639\u0648\u0645\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a. \u0623\u0639\u0644\u0649 \u062f\u0642\u0629 \u0645\u0645\u0643\u0646\u0629.' : 'Advanced AI-powered method. Highest possible accuracy with intelligent optimizations.'}</p>
                            <div className="bg-secondary/30 rounded p-2 mb-2">
                              <p className="text-xs font-medium text-foreground mb-1">{lang === 'ar' ? '\u0627\u0644\u0645\u0639\u0627\u062f\u0644\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u0629:' : 'Equations Used:'}</p>
                              <div className="space-y-1 text-[10px] font-mono">
                                <div className="text-center">dt_adaptive = AI_analyze()</div>
                                <div className="text-center">{'x(t+dt) = x(t) + vx(t)*dt + 0.5*ax(t)*dt\u00b2 + AI_correction'}</div>
                                <div className="text-center">{'F_drag = AI_optimize_drag(v, \u03c1, Cd)'}</div>
                              </div>
                            </div>
                          </div>
                          {/* Comparison Table */}
                          <table className="w-full text-xs">
                            <thead><tr className="border-b border-border">
                              <th className="text-right py-2">{lang === 'ar' ? '\u0627\u0644\u0637\u0631\u064a\u0642\u0629' : 'Method'}</th>
                              <th className="text-center py-2">{lang === 'ar' ? '\u0627\u0644\u062f\u0642\u0629' : 'Accuracy'}</th>
                              <th className="text-center py-2">{lang === 'ar' ? '\u0627\u0644\u0633\u0631\u0639\u0629' : 'Speed'}</th>
                              <th className="text-center py-2">{lang === 'ar' ? '\u0627\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645' : 'Use Case'}</th>
                            </tr></thead>
                            <tbody>
                              <tr className="border-b border-border/50"><td className="py-2 font-medium">Euler</td><td className="text-center">90%</td><td className="text-center">{'\u26a1\u26a1\u26a1'}</td><td className="text-center">{lang === 'ar' ? '\u062a\u0639\u0644\u064a\u0645\u064a' : 'Educational'}</td></tr>
                              <tr className="border-b border-border/50"><td className="py-2 font-medium">RK4</td><td className="text-center">98%</td><td className="text-center">{'\u26a1\u26a1'}</td><td className="text-center">{lang === 'ar' ? '\u0639\u0627\u0645' : 'General'}</td></tr>
                              <tr><td className="py-2 font-medium">AI APAS</td><td className="text-center">99.7%</td><td className="text-center">{'\u26a1'}</td><td className="text-center">{lang === 'ar' ? '\u0628\u062d\u062b\u064a' : 'Research'}</td></tr>
                            </tbody>
                          </table>
                        </div>
                      </CollapsibleSection>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Analysis & Errors */}
                <Collapsible defaultOpen={false} className="border border-border/50 rounded-xl bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 overflow-hidden">
                  <CollapsibleTrigger onClick={() => playSectionToggle(sim.isMuted)} className="flex items-center justify-between w-full px-4 py-3.5 cursor-pointer hover:bg-primary/5 transition-all duration-300">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                      {lang === 'ar' ? '\ud83d\udd0d \u0642\u0633\u0645 \u0627\u0644\u062a\u062d\u0644\u064a\u0644\u0627\u062a \u0648\u0627\u0644\u0623\u062e\u0637\u0627\u0621' : '\ud83d\udd0d Analysis & Errors'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-300 [[data-state=open]>&]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t border-border/30">
                    <div className="p-4 space-y-4">
                      <CollapsibleSection
                        title={lang === 'ar' ? '\ud83d\udcca \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0623\u062e\u0637\u0627\u0621 \u0648\u0627\u0644\u0642\u064a\u0627\u0633\u0627\u062a' : '\ud83d\udcca Error Analysis & Measurements'}
                        icon="\ud83d\udcc9" open={showErrorsSection} toggle={() => setShowErrorsSection(!showErrorsSection)}
                        miniPreview={(() => {
                          const avgErr = ((sim.prediction.rangeError + sim.prediction.maxHeightError + sim.prediction.timeError) / 3);
                          const acc = Math.max(0, 100 - avgErr);
                          return (
                            <>
                              <span className={`px-1.5 py-0.5 rounded ${acc >= 95 ? 'bg-green-500/10 text-green-600 dark:text-green-400' : acc >= 85 ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                                {lang === 'ar' ? '\u0627\u0644\u062f\u0642\u0629' : 'Acc'} {acc.toFixed(1)}%
                              </span>
                              <span className="inline-flex items-center gap-0.5">
                                <span className="w-8 h-1.5 rounded-full bg-muted overflow-hidden inline-block">
                                  <span className={`block h-full rounded-full ${acc >= 95 ? 'bg-green-500' : acc >= 85 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${acc}%` }} />
                                </span>
                              </span>
                            </>
                          );
                        })()}
                      >
                        <div className="space-y-4">
                          <div className="space-y-3">
                            <p className="text-xs font-medium text-muted-foreground">{lang === 'ar' ? '\u0646\u0638\u0631\u064a / \u0645\u062d\u0627\u0643\u0627\u0629' : 'Theoretical / Simulated'}</p>
                            {[
                              { label: T.range, theo: sim.prediction!.rangeTheoretical, exp: sim.prediction!.range, err: sim.prediction!.rangeError, unit: T.u_m_s },
                              { label: T.maxHeight, theo: sim.prediction!.maxHeightTheoretical, exp: sim.prediction!.maxHeight, err: sim.prediction!.maxHeightError, unit: T.u_m_s },
                              { label: T.flightTime, theo: sim.prediction!.timeOfFlightTheoretical, exp: sim.prediction!.timeOfFlight, err: sim.prediction!.timeError, unit: T.u_s },
                            ].map(({ label, theo, exp, err }) => {
                              const absErr = Math.abs(exp - theo);
                              const accuracy = err < 5 ? T.errHigh : err < 15 ? T.errMed : T.errLow;
                              return (
                                <div key={label} className="bg-secondary/30 rounded-md p-3">
                                  <p className="text-xs font-medium text-foreground mb-2">{label}</p>
                                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                                    <div className="bg-background rounded p-1.5 text-center"><p className="text-muted-foreground">{T.theoryLabel}</p><p className="font-mono font-semibold text-foreground">{theo.toFixed(3)}</p></div>
                                    <div className="bg-background rounded p-1.5 text-center"><p className="text-muted-foreground">{T.theoryExp}</p><p className="font-mono font-semibold text-foreground">{exp.toFixed(3)}</p></div>
                                    <div className="bg-background rounded p-1.5 text-center"><p className="text-muted-foreground">{T.theoryErrPct}</p><p className="font-mono font-semibold text-foreground">{err.toFixed(2)}%</p></div>
                                  </div>
                                  <div className="mt-1.5 text-[9px] text-muted-foreground">|&Delta;| = {absErr.toFixed(4)} &mdash; {accuracy}</div>
                                </div>
                              );
                            })}
                          </div>
                          <ExperimentalInput lang={lang} prediction={sim.prediction} onAnalyzed={(has) => setHasExperimentalData(has)} />
                        </div>
                      </CollapsibleSection>
                      <Suspense fallback={null}><EnergyAnalysis lang={lang} trajectoryData={sim.trajectoryData} currentTime={sim.currentTime} mass={sim.mass} airResistance={sim.airResistance} gravity={sim.gravity} velocity={sim.velocity} angle={sim.angle} height={sim.height} spinRate={sim.spinRate} projectileRadius={sim.projectileRadius} /></Suspense>
                      <Suspense fallback={null}><MonteCarloPanel lang={lang} muted={sim.isMuted} velocity={sim.velocity} angle={sim.angle} height={sim.height} gravity={sim.gravity} airResistance={sim.airResistance} mass={sim.mass} /></Suspense>
                      <Suspense fallback={null}><CrowdsourcedAccuracy lang={lang} velocity={sim.velocity} angle={sim.angle} height={sim.height} gravity={sim.gravity} airResistance={sim.airResistance} mass={sim.mass} prediction={sim.prediction} muted={sim.isMuted} /></Suspense>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* AI Section */}
                {sim.aiModels && (
                  <Collapsible defaultOpen={false} className="border border-border/50 rounded-xl bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 overflow-hidden">
                    <CollapsibleTrigger onClick={() => playSectionToggle(sim.isMuted)} className="flex items-center justify-between w-full px-4 py-3.5 cursor-pointer hover:bg-primary/5 transition-all duration-300">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                        {lang === 'ar' ? '\ud83e\udde0 \u0642\u0633\u0645 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a' : '\ud83e\udde0 Artificial Intelligence'}
                      </span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-300 [[data-state=open]>&]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="border-t border-border/30">
                      <div className="p-4 space-y-4">
                        <CollapsibleSection title={lang === 'ar' ? '\ud83c\udfaf \u0627\u0644\u0646\u0645\u0627\u0630\u062c \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u0629 \u0644\u0644\u062a\u0646\u0628\u0624' : '\ud83c\udfaf Prediction Models'} icon="\ud83c\udfaf" open={showAIMetrics} toggle={() => setShowAIMetrics(!showAIMetrics)}
                          miniPreview={<span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">{Object.keys(sim.aiModels!).length} {lang === 'ar' ? '\u0646\u0645\u0627\u0630\u062c' : 'models'}</span>}
                        >
                          <div className="overflow-x-auto">
                            <table className="academic-table">
                              <thead><tr><th>{T.metricsModel}</th><th>{T.metricsR2}</th><th>{T.metricsMAE}</th><th>{T.metricsRMSE}</th><th>{T.metricsRating}</th></tr></thead>
                              <tbody>
                                {Object.values(sim.aiModels).map((m: ModelData, i: number) => {
                                  const rating = getRating(m.metrics.r2, T);
                                  return (
                                    <tr key={i}>
                                      <td style={{ textAlign: isRTL ? 'right' : 'left', paddingInlineStart: 14 }}>
                                        <span className="model-dot" style={{ backgroundColor: m.color }} />
                                        <span className="font-medium">{m.name}</span>
                                      </td>
                                      <td className="font-mono font-semibold">{m.metrics.r2}</td>
                                      <td className="font-mono">{m.metrics.mae}</td>
                                      <td className="font-mono">{m.metrics.rmse}</td>
                                      <td><span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-secondary border border-border" style={{ color: rating.color }}>{rating.label}</span></td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </CollapsibleSection>
                        <Suspense fallback={null}><ExplainableAI lang={lang} trajectoryData={sim.trajectoryData} velocity={sim.velocity} angle={sim.angle} gravity={sim.gravity} airResistance={sim.airResistance} mass={sim.mass} muted={sim.isMuted} /></Suspense>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Supporting Technologies */}
                <Collapsible defaultOpen={false} className="border border-border/50 rounded-xl bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 overflow-hidden">
                  <CollapsibleTrigger onClick={() => playSectionToggle(sim.isMuted)} className="flex items-center justify-between w-full px-4 py-3.5 cursor-pointer hover:bg-primary/5 transition-all duration-300">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                      {lang === 'ar' ? '\ud83d\udee0\ufe0f \u0642\u0633\u0645 \u0627\u0644\u062a\u0642\u0646\u064a\u0627\u062a \u0627\u0644\u0645\u0633\u0627\u0639\u062f\u0629' : '\ud83d\udee0\ufe0f Supporting Technologies'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-300 [[data-state=open]>&]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t border-border/30">
                    <div className="p-4 space-y-4">
                      <button onClick={() => setShowNoiseFilter(true)}
                        className="w-full text-xs font-medium py-3 px-4 rounded-xl flex items-center gap-3 text-foreground hover:bg-primary/10 border border-border/50 hover:border-primary/20 transition-all duration-300 bg-card/60 backdrop-blur-sm">
                        <Filter className="w-5 h-5 text-primary" />
                        <div className="text-left rtl:text-right">
                          <div className="font-semibold">{lang === 'ar' ? '\u062a\u0635\u0641\u064a\u0629 \u0627\u0644\u0636\u0648\u0636\u0627\u0621' : 'Noise Filtering'}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{lang === 'ar' ? 'Kalman / \u0645\u062a\u0648\u0633\u0637 \u0645\u062a\u062d\u0631\u0643 \u0644\u062a\u0646\u0639\u064a\u0645 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a' : 'Kalman / Moving Average smoothing'}</div>
                        </div>
                      </button>
                      <SensorLab lang={lang} muted={sim.isMuted} />
                      <Suspense fallback={null}><AccessibilitySonification lang={lang} trajectoryData={sim.trajectoryData} muted={sim.isMuted} /></Suspense>
                      <Suspense fallback={null}><DevOpsTesting lang={lang} velocity={sim.velocity} angle={sim.angle} height={sim.height} gravity={sim.gravity} airResistance={sim.airResistance} mass={sim.mass} prediction={sim.prediction} muted={sim.isMuted} /></Suspense>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>}

              {/* Footer */}
              <div className="text-center py-8 border-t border-border/30 mt-6 space-y-3">
                <p className="text-xs text-muted-foreground font-medium">{T.footerDev}</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-xs font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{T.footerName1}</span>
                  <span className="text-xs text-primary/40">&middot;</span>
                  <span className="text-xs font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{T.footerName2}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{T.footerSchool}</p>
                <p className="text-[10px] font-mono text-muted-foreground/60 mt-2">v1.1 &mdash; 2025/2026</p>
                <div className="flex flex-col items-center mt-3"><FooterRobot /></div>
              </div>
            </div>

            {/* ═══ RIGHT — APAS Vision & Presets ═══ */}
            <RightSidebar
              lang={lang} isMuted={sim.isMuted} isFocusMode={isFocusMode}
              velocity={sim.velocity} angle={sim.angle} height={sim.height}
              gravity={sim.gravity} airResistance={sim.airResistance} mass={sim.mass}
              windSpeed={sim.windSpeed} currentEnvId={currentEnvId} nightMode={sim.nightMode}
              selectedIntegrationMethod={sim.selectedIntegrationMethod}
              enableBounce={sim.enableBounce} bounceCoefficient={sim.bounceCoefficient}
              setSelectedIntegrationMethod={sim.setSelectedIntegrationMethod}
              setVelocity={sim.setVelocity} setAngle={sim.setAngle} setHeight={sim.setHeight}
              setMass={sim.setMass} setGravity={sim.setGravity}
              setActivePresetEmoji={setActivePresetEmoji}
              onSessionLoad={handleSessionLoad} onShowRestrictionOverlay={setShowRestrictionOverlay}
              onMediaAnalyzed={(src: string) => {
                setLastAnalyzedMediaSrc(src || null);
                if (src) {
                  const ext = src.split('.').pop()?.toLowerCase() ?? '';
                  const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(ext) || src.includes('video');
                  setLastAnalyzedMediaType(isVideo ? 'video' : 'image');
                  setShowVideoOverlay(true);
                  setShowTheoreticalComparison(true);
                  setShowDynamicDashboard(true);
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Modals & Overlays ── */}
      <ModalsOverlays
        lang={lang} isMuted={sim.isMuted}
        showOnboarding={showOnboarding} setShowOnboarding={setShowOnboarding}
        showEnvSelector={showEnvSelector} setShowEnvSelector={setShowEnvSelector}
        currentEnvId={currentEnvId} onEnvironmentSelect={handleEnvironmentSelect}
        showDocumentation={showDocumentation} setShowDocumentation={setShowDocumentation}
        showStroboscopicModal={showStroboscopicModal} setShowStroboscopicModal={setShowStroboscopicModal}
        stroboscopicSettings={stroboscopicSettings} setStroboscopicSettings={setStroboscopicSettings}
        stroboscopicMarks={stroboscopicMarks} gravity={sim.gravity}
        isSimulationDone={!!isFinished || sim.isAnimating}
        showMultiSimModal={showMultiSimModal} setShowMultiSimModal={setShowMultiSimModal}
        velocity={sim.velocity} angle={sim.angle} height={sim.height}
        airResistance={sim.airResistance} mass={sim.mass} windSpeed={sim.windSpeed}
        enableBounce={sim.enableBounce} bounceCoefficient={sim.bounceCoefficient}
        selectedIntegrationMethod={sim.selectedIntegrationMethod}
        hasExperimentalData={hasExperimentalData} trajectoryData={sim.trajectoryData}
        showSettingsPanel={showSettingsPanel} setShowSettingsPanel={setShowSettingsPanel}
        nightMode={sim.nightMode}
        onToggleNightMode={() => { sim.setNightMode(!sim.nightMode); playToggle(sim.isMuted, !sim.nightMode); }}
        onToggleMute={() => { sim.setIsMuted(!sim.isMuted); playToggle(sim.isMuted, sim.isMuted); }}
        onSwitchLanguage={switchLanguage}
        accentColor={accentColor} accentColors={ACCENT_COLORS} onAccentChange={setAccentColor}
        is3DMode={is3DMode} theme3d={theme3d} onTheme3dChange={setTheme3d}
        showCalculator={showCalculator} setShowCalculator={setShowCalculator}
        showRuler={showRuler} setShowRuler={setShowRuler}
        showProtractor={showProtractor} setShowProtractor={setShowProtractor}
        showNoiseFilter={showNoiseFilter} setShowNoiseFilter={setShowNoiseFilter}
        setTrajectoryData={sim.setTrajectoryData}
        showLiveCalibration={showLiveCalibration} setShowLiveCalibration={setShowLiveCalibration}
        setCalibrationScale={setCalibrationScale} calibrationMediaSrc={lastAnalyzedMediaSrc}
        showSecurityPrivacy={showSecurityPrivacy} setShowSecurityPrivacy={setShowSecurityPrivacy}
        autoDeleteVideos={autoDeleteVideos} onToggleAutoDelete={setAutoDeleteVideos}
        showComprehensiveGuide={showComprehensiveGuide} setShowComprehensiveGuide={setShowComprehensiveGuide}
        showRestrictionOverlay={showRestrictionOverlay} setShowRestrictionOverlay={setShowRestrictionOverlay}
      />

      {/* Calculations Modal — centered, scrollable */}
      {showCalculationsModal && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowCalculationsModal(false)}>
          <div
            className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-slideDown"
            dir={isRTL ? 'rtl' : 'ltr'}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  {lang === 'ar' ? 'كيف تم الحساب — APAS' : lang === 'fr' ? 'Comment les Calculs Ont Été Faits — APAS' : 'How Calculations Were Made — APAS'}
                </h3>
              </div>
              <button onClick={() => setShowCalculationsModal(false)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <CalculationsSection lang={lang} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </PageTransition>
  );
};

export default Index;
