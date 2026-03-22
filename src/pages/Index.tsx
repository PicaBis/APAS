import React, { useState, useRef, useCallback, useEffect, Suspense, lazy, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Play, Pause, RotateCcw, Camera, Moon, Sun, Globe, Volume2, VolumeX, ChevronDown, ZoomIn, ZoomOut, Maximize, Minimize, Crosshair, ArrowRight, GitBranch, Layers, Save, X, FileText, QrCode, FileDown, Info, Box, Globe2, Droplets, Thermometer, Gauge, Eye, EyeOff, Clock, Palette, Settings, Focus, Grid3x3, Home, Filter, Shield, LogOut, LogIn, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSimulation } from '@/hooks/useSimulation';
import { useAuth } from '@/contexts/AuthContext';
import GuestRestrictionOverlay from '@/components/auth/GuestRestrictionOverlay';
import DevPrivilegesButton from '@/components/auth/DevPrivilegesButton';
import { calcMetrics, type ModelData } from '@/utils/physics';
import { useAdvancedPhysics } from '@/hooks/useAdvancedPhysics';
import { playClick, playUIClick, playToggle, playNav, vibrate, playSectionToggle, playSliderChange, playTutorialClick } from '@/utils/sound';
import { TRANSLATIONS } from '@/constants/translations';

import SplashScreen from '@/components/apas/SplashScreen';
import ApasLogo from '@/components/apas/ApasLogo';
import PageTransition from '@/components/apas/PageTransition';
import { playPageTransition } from '@/utils/sound';
import SimulationCanvas from '@/components/apas/SimulationCanvas';
const SimulationCanvas3D = lazy(() => import('@/components/apas/SimulationCanvas3D'));
import { Slider } from '@/components/ui/slider';
const PhysicsTutor = lazy(() => import('@/components/apas/PhysicsTutor'));
import { Switch } from '@/components/ui/switch';
import ApasVisionButton from '@/components/apas/ApasVisionButton';
import ApasVideoButton from '@/components/apas/ApasVideoButton';
import ApasSubjectReading from '@/components/apas/ApasSubjectReading';
import ApasVoiceButton from '@/components/apas/ApasVoiceButton';
import EquationsPanel from '@/components/apas/EquationsPanel';
import ErrorBoundary from '@/components/apas/ErrorBoundary';
import KeyboardShortcutsHelp from '@/components/apas/KeyboardShortcutsHelp';
import ExperimentalInput from '@/components/apas/ExperimentalInput';
import ExportSection from '@/components/apas/ExportSection';
import ForceVectorsSection, { type VectorVisibility } from '@/components/apas/ForceVectorsSection';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
const OnboardingTutorial = lazy(() => import('@/components/apas/OnboardingTutorial'));
import IntegrationMethodsPanel from '@/components/apas/IntegrationMethodsPanel';
import { AdvancedPhysicsPanel } from '@/components/apas/AdvancedPhysicsPanel';
const EnergyAnalysis = lazy(() => import('@/components/apas/EnergyAnalysis'));
const MultiSimulationModal = lazy(() => import('@/components/apas/MultiSimulationModal'));
const DocumentationModal = lazy(() => import('@/components/apas/DocumentationModal'));
const StroboscopicModal = lazy(() => import('@/components/apas/StroboscopicModal'));
import { type StroboscopicSettings, type StroboscopicMark } from '@/components/apas/StroboscopicModal';
import EnvironmentSelector, { ENVIRONMENTS, type Environment } from '@/components/apas/EnvironmentSelector';
import ParamInputWithUnit from '@/components/apas/ParamInputWithUnit';
import ToggleOption from '@/components/apas/ToggleOption';
import CollapsibleSection from '@/components/apas/CollapsibleSection';
import ResultsSection from '@/components/apas/ResultsSection';
import CanvasToolbar from '@/components/apas/CanvasToolbar';
import AnimatedValue from '@/components/apas/AnimatedValue';
import { AnimatedSVGElements, AnimatedLoadingSpinner, AnimatedWaveLine } from '@/components/ui/AnimatedSVG';
import AcademicAmbient from '@/components/apas/AcademicAmbient';
import HeaderWave from '@/components/apas/HeaderWave';
import FooterRobot from '@/components/apas/LightModeDecorations';
const IdlePhysicsTips = lazy(() => import('@/components/apas/IdlePhysicsTips'));
const SessionManager = lazy(() => import('@/components/apas/SessionManager'));
const MonteCarloPanel = lazy(() => import('@/components/apas/MonteCarloPanel'));
const SimulationRecorder = lazy(() => import('@/components/apas/SimulationRecorder'));
import ShareSimulation, { decodeSimParams } from '@/components/apas/ShareSimulation';
import type { SessionData } from '@/components/apas/SessionManager';
import SettingsPanel from '@/components/apas/SettingsPanel';
const ScientificCalculator = lazy(() => import('@/components/apas/ScientificCalculator'));
const CanvasRuler = lazy(() => import('@/components/apas/CanvasRuler'));
const CanvasProtractor = lazy(() => import('@/components/apas/CanvasProtractor'));
const NoiseFilter = lazy(() => import('@/components/apas/NoiseFilter'));
const LiveCalibration = lazy(() => import('@/components/apas/LiveCalibration'));
const SecurityPrivacy = lazy(() => import('@/components/apas/SecurityPrivacy'));
const EquationEngine = lazy(() => import('@/components/apas/EquationEngine'));
import type { EquationTrajectoryPoint } from '@/components/apas/EquationEngine';
import type { TrajectoryPoint } from '@/utils/physics';
const ApasRecommendations = lazy(() => import('@/components/apas/ApasRecommendations'));
import SensorLab from '@/components/apas/SensorLab';
import BugReportButton from '@/components/apas/BugReportButton';
const LensDistortionCorrection = lazy(() => import('@/components/apas/LensDistortionCorrection'));
const ExplainableAI = lazy(() => import('@/components/apas/ExplainableAI'));
const CrowdsourcedAccuracy = lazy(() => import('@/components/apas/CrowdsourcedAccuracy'));
const AccessibilitySonification = lazy(() => import('@/components/apas/AccessibilitySonification'));
const DevOpsTesting = lazy(() => import('@/components/apas/DevOpsTesting'));

// Presets for different projectile types
const PRESETS = [
  { name: '● افتراضي', nameEn: '● Default', p: { velocity: 50, angle: 45, height: 0, gravity: 9.81, airResistance: 0, mass: 1 } },
  { name: '⚽ كرة قدم', nameEn: '⚽ Football', p: { velocity: 28, angle: 35, height: 0, gravity: 9.81, airResistance: 0.02, mass: 0.45 } },
  { name: '🏀 كرة سلة', nameEn: '🏀 Basketball', p: { velocity: 8.5, angle: 52, height: 2, gravity: 9.81, airResistance: 0.015, mass: 0.62 } },
  { name: '💣 قذيفة', nameEn: '💣 Cannon', p: { velocity: 120, angle: 45, height: 0, gravity: 9.81, airResistance: 0.001, mass: 15 } },
  { name: '🏹 سهم', nameEn: '🏹 Arrow', p: { velocity: 75, angle: 20, height: 1.5, gravity: 9.81, airResistance: 0.008, mass: 0.02 } },
  { name: '🚀 صاروخ', nameEn: '🚀 Rocket', p: { velocity: 200, angle: 85, height: 0, gravity: 9.81, airResistance: 0.003, mass: 500 } },
];

const axisVars = [
  { key: 'time', symbol: 't', unit: 's' },
  { key: 'x', symbol: 'X', unit: 'm' },
  { key: 'y', symbol: 'Y', unit: 'm' },
  { key: 'speed', symbol: 'V', unit: 'm/s' },
  { key: 'vx', symbol: 'Vx', unit: 'm/s' },
  { key: 'vy', symbol: 'Vy', unit: 'm/s' },
  { key: 'acceleration', symbol: 'a', unit: 'm/s²' },
  { key: 'kineticEnergy', symbol: 'KE', unit: 'J' },
  { key: 'potentialEnergy', symbol: 'PE', unit: 'J' },
];

// Unit conversion definitions
const UNIT_OPTIONS: Record<string, { label: string; labelAr: string; units: { key: string; label: string; labelAr: string; factor: number }[] }> = {
  velocity: {
    label: 'Velocity', labelAr: 'السرعة',
    units: [
      { key: 'm/s', label: 'm/s', labelAr: 'م/ث', factor: 1 },
      { key: 'km/h', label: 'km/h', labelAr: 'كم/س', factor: 3.6 },
      { key: 'ft/s', label: 'ft/s', labelAr: 'قدم/ث', factor: 3.28084 },
      { key: 'mph', label: 'mph', labelAr: 'ميل/س', factor: 2.23694 },
      { key: 'knot', label: 'knot', labelAr: 'عقدة', factor: 1.94384 },
    ]
  },
  angle: {
    label: 'Angle', labelAr: 'الزاوية',
    units: [
      { key: '°', label: '°', labelAr: '°', factor: 1 },
      { key: 'rad', label: 'rad', labelAr: 'راديان', factor: Math.PI / 180 },
      { key: 'grad', label: 'grad', labelAr: 'غراد', factor: 10 / 9 },
    ]
  },
  gravity: {
    label: 'Gravity', labelAr: 'الجاذبية',
    units: [
      { key: 'm/s²', label: 'm/s²', labelAr: 'م/ث²', factor: 1 },
      { key: 'ft/s²', label: 'ft/s²', labelAr: 'قدم/ث²', factor: 3.28084 },
      { key: 'g', label: 'g', labelAr: 'g', factor: 1 / 9.80665 },
    ]
  },
  mass: {
    label: 'Mass', labelAr: 'الكتلة',
    units: [
      { key: 'kg', label: 'kg', labelAr: 'كجم', factor: 1 },
      { key: 'g', label: 'g', labelAr: 'غرام', factor: 1000 },
      { key: 'lb', label: 'lb', labelAr: 'رطل', factor: 2.20462 },
      { key: 'oz', label: 'oz', labelAr: 'أونصة', factor: 35.274 },
    ]
  },
  height: {
    label: 'Height', labelAr: 'الارتفاع',
    units: [
      { key: 'm', label: 'm', labelAr: 'م', factor: 1 },
      { key: 'cm', label: 'cm', labelAr: 'سم', factor: 100 },
      { key: 'ft', label: 'ft', labelAr: 'قدم', factor: 3.28084 },
      { key: 'in', label: 'in', labelAr: 'بوصة', factor: 39.3701 },
    ]
  },
  windSpeed: {
    label: 'Wind Speed', labelAr: 'سرعة الرياح',
    units: [
      { key: 'm/s', label: 'm/s', labelAr: 'م/ث', factor: 1 },
      { key: 'km/h', label: 'km/h', labelAr: 'كم/س', factor: 3.6 },
      { key: 'mph', label: 'mph', labelAr: 'ميل/س', factor: 2.23694 },
    ]
  },
};

const getRating = (r2: number, T: Record<string, string>) => {
  if (r2 >= 0.99) return { label: T.metricsExcellent, color: 'hsl(var(--foreground))' };
  if (r2 >= 0.95) return { label: T.metricsGood, color: 'hsl(var(--muted-foreground))' };
  if (r2 >= 0.85) return { label: T.metricsAcceptable, color: 'hsl(var(--muted-foreground))' };
  return { label: T.metricsPoor, color: 'hsl(var(--muted-foreground))' };
};

const Index = () => {
  const advancedPhysics = useAdvancedPhysics();
  const sim = useSimulation();
  const navigate = useNavigate();
  const { T, lang } = sim;
  const { isGuest, isApproved, isAdmin, isRestricted, user, signOut, profile } = useAuth();
  const [showRestrictionOverlay, setShowRestrictionOverlay] = useState<string | null>(null);

  // Check if user can access restricted features
  const canAccessRestrictedFeature = isAdmin || (user && isApproved && !isRestricted);
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
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showPathInfo, setShowPathInfo] = useState(false);
  const [showChartSection, setShowChartSection] = useState(false);
  const [chartAxisX, setChartAxisX] = useState('');
  const [chartAxisY, setChartAxisY] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [showLiveData, setShowLiveData] = useState(false);
  const [showErrorsSection, setShowErrorsSection] = useState(false);
  const [showPhysicsPanel, setShowPhysicsPanel] = useState(false);
  const [showDisplayOptions, setShowDisplayOptions] = useState(false); // Collapsed by default
  const [showMultiSimModal, setShowMultiSimModal] = useState(false);
  const [hasExperimentalData, setHasExperimentalData] = useState(false);
  const [showEnvSelector, setShowEnvSelector] = useState(false);
  const [showDocumentation, setShowDocumentation] = useState(false);
  const [showStroboscopicModal, setShowStroboscopicModal] = useState(false);
  const [stroboscopicSettings, setStroboscopicSettings] = useState<StroboscopicSettings>({
    enabled: false, deltaT: 0.5, showProjections: false, showDetails: false,
  });
  const [stroboscopicMarks, setStroboscopicMarks] = useState<StroboscopicMark[]>([]);
  const [currentEnvId, setCurrentEnvId] = useState('earth');
  const [activePresetEmoji, setActivePresetEmoji] = useState<string | undefined>(undefined);
  const [accentColor, setAccentColor] = useState<string>(() => {
    try { return localStorage.getItem('apas_accentColor') || 'teal'; } catch { return 'teal'; }
  });
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showRuler, setShowRuler] = useState(false);
  const [showProtractor, setShowProtractor] = useState(false);
  const [showNoiseFilter, setShowNoiseFilter] = useState(false);
  const [showLiveCalibration, setShowLiveCalibration] = useState(false);
  const [showSecurityPrivacy, setShowSecurityPrivacy] = useState(false);
  const [autoDeleteVideos, setAutoDeleteVideos] = useState(() => {
    try { return localStorage.getItem('apas_autoDeleteVideos') === 'true'; } catch { return false; }
  });
  const [calibrationScale, setCalibrationScale] = useState<number | null>(null);
  const [showComparisonSection, setShowComparisonSection] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [equationTrajectory, setEquationTrajectory] = useState<EquationTrajectoryPoint[] | null>(null);

  // ── Undo/Redo History ──
  interface ParamSnapshot {
    velocity: number; angle: number; height: number;
    gravity: number; airResistance: number; mass: number;
    windSpeed: number;
  }
  const [paramHistory, setParamHistory] = useState<ParamSnapshot[]>([{
    velocity: sim.velocity, angle: sim.angle, height: sim.height,
    gravity: sim.gravity, airResistance: sim.airResistance, mass: sim.mass,
    windSpeed: sim.windSpeed,
  }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedoRef = useRef(false);

  // Track parameter changes for undo/redo
  const currentParams = useMemo(() => ({
    velocity: sim.velocity, angle: sim.angle, height: sim.height,
    gravity: sim.gravity, airResistance: sim.airResistance, mass: sim.mass,
    windSpeed: sim.windSpeed,
  }), [sim.velocity, sim.angle, sim.height, sim.gravity, sim.airResistance, sim.mass, sim.windSpeed]);

  useEffect(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    const last = paramHistory[historyIndex];
    if (last && last.velocity === currentParams.velocity && last.angle === currentParams.angle &&
        last.height === currentParams.height && last.gravity === currentParams.gravity &&
        last.airResistance === currentParams.airResistance && last.mass === currentParams.mass &&
        last.windSpeed === currentParams.windSpeed) return;
    const newHistory = paramHistory.slice(0, historyIndex + 1);
    newHistory.push({ ...currentParams });
    // Keep max 50 entries
    if (newHistory.length > 50) newHistory.shift();
    setParamHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentParams]);

  const undoParams = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const snap = paramHistory[newIndex];
    isUndoRedoRef.current = true;
    sim.setVelocity(snap.velocity);
    sim.setAngle(snap.angle);
    sim.setHeight(snap.height);
    sim.setGravity(snap.gravity);
    sim.setAirResistance(snap.airResistance);
    sim.setMass(snap.mass);
    sim.setWindSpeed(snap.windSpeed);
    setHistoryIndex(newIndex);
  }, [historyIndex, paramHistory, sim]);

  const redoParams = useCallback(() => {
    if (historyIndex >= paramHistory.length - 1) return;
    const newIndex = historyIndex + 1;
    const snap = paramHistory[newIndex];
    isUndoRedoRef.current = true;
    sim.setVelocity(snap.velocity);
    sim.setAngle(snap.angle);
    sim.setHeight(snap.height);
    sim.setGravity(snap.gravity);
    sim.setAirResistance(snap.airResistance);
    sim.setMass(snap.mass);
    sim.setWindSpeed(snap.windSpeed);
    setHistoryIndex(newIndex);
  }, [historyIndex, paramHistory, sim]);
  const [dragCd, setDragCd] = useState(0.47);
  const [airDensity, setAirDensity] = useState(1.225);

  // Saved comparison snapshot: stores parameters + prediction at the moment of save
  const [savedSnapshot, setSavedSnapshot] = useState<{
    velocity: number; angle: number; height: number;
    gravity: number; airResistance: number; mass: number;
    range: number; maxHeight: number; flightTime: number;
    finalVelocity: number; impactAngle: number;
    integrationMethod: string;
  } | null>(null);

  // Vector visibility for individual toggle
  const [vectorVisibility, setVectorVisibility] = useState<VectorVisibility>({
    V: true, Vx: true, Vy: true, Fg: true, Fd: true, Fw: false, Ffluid: false, Fnet: false, acc: false,
  });

  // Unit selections (store selected unit key per param)
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('apas_units');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return { velocity: 'm/s', angle: '°', gravity: 'm/s²', mass: 'kg', height: 'm', windSpeed: 'm/s' };
  });

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // ── Load saved settings from localStorage on mount ──
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('apas_lang');
      if (savedLang && (savedLang === 'ar' || savedLang === 'en' || savedLang === 'fr')) {
        sim.setLanguageDirect(savedLang);
      }
      const savedNight = localStorage.getItem('apas_nightMode');
      if (savedNight !== null) {
        sim.setNightMode(savedNight === 'true');
      }
      const savedMuted = localStorage.getItem('apas_isMuted');
      if (savedMuted !== null) {
        sim.setIsMuted(savedMuted === 'true');
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist settings to localStorage ──
  useEffect(() => {
    try { localStorage.setItem('apas_lang', lang); } catch { /* ignore */ }
  }, [lang]);
  useEffect(() => {
    try { localStorage.setItem('apas_nightMode', String(sim.nightMode)); } catch { /* ignore */ }
  }, [sim.nightMode]);
  useEffect(() => {
    try { localStorage.setItem('apas_accentColor', accentColor); } catch { /* ignore */ }
  }, [accentColor]);
  useEffect(() => {
    try { localStorage.setItem('apas_units', JSON.stringify(selectedUnits)); } catch { /* ignore */ }
  }, [selectedUnits]);
  useEffect(() => {
    try { localStorage.setItem('apas_isMuted', String(sim.isMuted)); } catch { /* ignore */ }
  }, [sim.isMuted]);

  // Scroll to top when app loads (after splash) to prevent canvas drifting down
  // Force dark mode during splash, switch to light when onboarding/app starts
  useEffect(() => {
    if (showSplash) {
      document.documentElement.classList.add('dark');
    }
  }, [showSplash]);

  // Manage dark/light based on nightMode preference (only when not in splash)
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

  const switchLangAnimated = () => {
    setIsLangTransitioning(true);
    setTimeout(() => {
      sim.switchLang();
      setTimeout(() => setIsLangTransitioning(false), 300);
    }, 300);
  };

  // Accent color theme definitions with localized labels
  const tLabel = (ar: string, en: string, fr: string) => lang === 'ar' ? ar : lang === 'fr' ? fr : en;
  const ALL_ACCENT_COLORS: { id: string; label: string; hsl: string; ring: string }[] = [
    { id: 'teal', label: tLabel('أزرق مخضر', 'Teal', 'Sarcelle'), hsl: '172 66% 50%', ring: '172 66% 50%' },
    { id: 'blue', label: tLabel('أزرق', 'Blue', 'Bleu'), hsl: '217 91% 60%', ring: '217 91% 60%' },
    { id: 'purple', label: tLabel('بنفسجي', 'Purple', 'Violet'), hsl: '270 70% 60%', ring: '270 70% 60%' },
    { id: 'orange', label: tLabel('برتقالي', 'Orange', 'Orange'), hsl: '25 95% 53%', ring: '25 95% 53%' },
    { id: 'green', label: tLabel('أخضر', 'Green', 'Vert'), hsl: '142 71% 45%', ring: '142 71% 45%' },
    { id: 'rose', label: tLabel('وردي', 'Rose', 'Rose'), hsl: '346 77% 55%', ring: '346 77% 55%' },
    { id: 'white', label: tLabel('أبيض', 'White', 'Blanc'), hsl: '0 0% 100%', ring: '0 0% 100%' },
    { id: 'black', label: tLabel('أسود', 'Black', 'Noir'), hsl: '0 0% 10%', ring: '0 0% 10%' },
  ];
  // Filter: hide black in night mode, hide white in day mode
  const ACCENT_COLORS = ALL_ACCENT_COLORS.filter(c => {
    if (c.id === 'black' && sim.nightMode) return false;
    if (c.id === 'white' && !sim.nightMode) return false;
    return true;
  });

  // Auto-reset accent if it becomes unavailable after mode switch
  useEffect(() => {
    if (accentColor === 'black' && sim.nightMode) setAccentColor('teal');
    if (accentColor === 'white' && !sim.nightMode) setAccentColor('teal');
  }, [sim.nightMode, accentColor]);

  // Detect contrast conflict: white accent in day mode or black accent in night mode
  const isAccentConflict = (accentColor === 'white' && !sim.nightMode) || (accentColor === 'black' && sim.nightMode);

  // Apply accent color to CSS custom properties
  useEffect(() => {
    const color = ACCENT_COLORS.find(c => c.id === accentColor);
    if (color) {
      document.documentElement.style.setProperty('--primary', color.hsl);
      document.documentElement.style.setProperty('--ring', color.ring);
    }

    // Handle contrast conflict: flip text/foreground colors to maintain visibility
    if (isAccentConflict) {
      document.documentElement.setAttribute('data-accent-conflict', accentColor);
      if (accentColor === 'white') {
        // White accent in day mode: primary-foreground must be dark
        document.documentElement.style.setProperty('--primary-foreground', '0 0% 0%');
      } else {
        // Black accent in night mode: primary-foreground must be light
        document.documentElement.style.setProperty('--primary-foreground', '0 0% 100%');
      }
    } else {
      document.documentElement.removeAttribute('data-accent-conflict');
      document.documentElement.style.removeProperty('--primary-foreground');
    }

    return () => {
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--ring');
      document.documentElement.style.removeProperty('--primary-foreground');
      document.documentElement.removeAttribute('data-accent-conflict');
    };
  }, [accentColor, sim.nightMode, isAccentConflict]);

  const loadPreset = (preset: typeof PRESETS[0]) => {
    sim.setVelocity(preset.p.velocity);
    sim.setAngle(preset.p.angle);
    sim.setHeight(preset.p.height);
    sim.setGravity(preset.p.gravity);
    sim.setAirResistance(preset.p.airResistance);
    sim.setMass(preset.p.mass);
    // Extract emoji from preset name for projectile visual
    const emojiMatch = preset.name.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)/u);
    // '●' is the default preset marker — reset to default dot
    if (preset.name.startsWith('●')) {
      setActivePresetEmoji(undefined);
    } else {
      setActivePresetEmoji(emojiMatch ? emojiMatch[0] : undefined);
    }
    playUIClick(sim.isMuted);
  };

  // Map objectType from APAS Vision/Video to emoji
  const objectTypeToEmoji = (objectType?: string): string | undefined => {
    if (!objectType) return undefined;
    const lower = objectType.toLowerCase();
    if (lower.includes('football') || lower.includes('soccer') || lower.includes('كرة قدم')) return '⚽';
    if (lower.includes('basketball') || lower.includes('كرة سلة')) return '🏀';
    if (lower.includes('cannon') || lower.includes('قذيفة') || lower.includes('bomb') || lower.includes('قنبلة')) return '💣';
    if (lower.includes('arrow') || lower.includes('سهم') || lower.includes('bow')) return '🏹';
    if (lower.includes('rocket') || lower.includes('صاروخ') || lower.includes('missile')) return '🚀';
    if (lower.includes('tennis') || lower.includes('تنس')) return '🎾';
    if (lower.includes('baseball') || lower.includes('بيسبول')) return '⚾';
    if (lower.includes('golf') || lower.includes('غولف')) return '⛳';
    if (lower.includes('ball') || lower.includes('كرة')) return '⚽';
    return undefined;
  };

  const handleEnvironmentSelect = (env: Environment) => {
    setCurrentEnvId(env.id);
    sim.setGravity(env.gravity);
    setAirDensity(env.fluidDensity);
    if (env.fluidDensity === 0) {
      sim.setAirResistance(0);
    } else if (env.id === 'underwater') {
      // Water environment: enable underwater physics so water resistance affects simulation
      sim.setAirResistance(0);
      advancedPhysics.setIsUnderwater(true);
      advancedPhysics.setEnableBuoyancy(true);
      advancedPhysics.setEnableHydrodynamicDrag(true);
      advancedPhysics.setFluidDensity(env.fluidDensity);
    } else {
      // Non-water environment: disable underwater physics
      advancedPhysics.setIsUnderwater(false);
      advancedPhysics.setEnableBuoyancy(false);
      advancedPhysics.setEnableHydrodynamicDrag(false);
      if (sim.airResistance === 0 && env.fluidDensity > 0) sim.setAirResistance(0.02);
    }
    playUIClick(sim.isMuted);
  };

  const exportSimulationPNG = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `APAS_Simulation_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const toggleFullscreen = () => {
    const el = canvasContainerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Keyboard shortcuts: Space = toggle play/pause, R = reset, G = grid, F = fullscreen, +/- = zoom, 3 = 3D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo: Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z — works even in inputs
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        undoParams();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey))) {
        e.preventDefault();
        redoParams();
        return;
      }

      // Ignore other shortcuts if user is typing in an input/textarea/select
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
      if ((e.target as HTMLElement)?.closest('[role="slider"], [role="switch"], [contenteditable]')) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (sim.isAnimating) {
          sim.pauseAnimation();
        } else {
          sim.startAnimation();
        }
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        sim.resetAnimation();
      } else if (e.code === 'KeyG') {
        e.preventDefault();
        setShowGrid(g => !g);
        playUIClick(sim.isMuted);
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'Equal' || e.code === 'NumpadAdd') {
        e.preventDefault();
        setCanvasZoom(z => Math.min(3, z + 0.25));
        playUIClick(sim.isMuted);
      } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
        e.preventDefault();
        setCanvasZoom(z => Math.max(0.5, z - 0.25));
        playUIClick(sim.isMuted);
      } else if (e.code === 'Digit3') {
        e.preventDefault();
        if (is3DMode) {
          setIs3DMode(false);
        } else if (!webglError) {
          setIs3DMode(true);
        }
        playUIClick(sim.isMuted);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sim.isAnimating, sim.pauseAnimation, sim.startAnimation, sim.resetAnimation, sim.isMuted, is3DMode, webglError, undoParams, redoParams]);

  const getChartData = useCallback(() => {
    if (!chartAxisX || !chartAxisY || !sim.trajectoryData.length) return [];
    return sim.trajectoryData.map((p) => ({
      xVal: (p as unknown as Record<string, unknown>)[chartAxisX] as number,
      yVal: (p as unknown as Record<string, unknown>)[chartAxisY] as number,
    })).filter((d) => d.xVal !== undefined && d.yVal !== undefined);
  }, [chartAxisX, chartAxisY, sim.trajectoryData]);

  const fmtTick = (v: number) => (typeof v === 'number' && v !== null) ? Math.abs(v) >= 1000 ? v.toExponential(1) : v.toFixed(1) : String(v ?? '');

  // ── Stroboscopic mark generation ──
  // Compute marks from trajectory data based on deltaT
  useEffect(() => {
    if (!stroboscopicSettings.enabled || !sim.trajectoryData.length) {
      return;
    }
    const dt = stroboscopicSettings.deltaT;
    if (dt <= 0) return;
    const data = sim.trajectoryData;
    const lastData = data[data.length - 1];
    if (!lastData) return;

    // Only generate marks up to currentTime (synchronized with animation)
    const maxTime = sim.currentTime;
    if (maxTime <= 0) {
      setStroboscopicMarks([]);
      return;
    }

    const newMarks: StroboscopicMark[] = [];
    for (let t = dt; t <= maxTime + 0.001; t += dt) {
      // Find the two points surrounding this time
      let lo = 0, hi = data.length - 1;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (data[mid].time <= t) lo = mid;
        else hi = mid;
      }
      const a = data[lo];
      const b = data[hi];
      const segDt = b.time - a.time;
      const frac = segDt > 0 ? Math.min(1, (t - a.time) / segDt) : 0;
      newMarks.push({
        x: a.x + (b.x - a.x) * frac,
        y: a.y + (b.y - a.y) * frac,
        time: t,
        vx: a.vx + (b.vx - a.vx) * frac,
        vy: a.vy + (b.vy - a.vy) * frac,
        speed: a.speed + (b.speed - a.speed) * frac,
      });
    }
    setStroboscopicMarks(newMarks);
  }, [stroboscopicSettings.enabled, stroboscopicSettings.deltaT, sim.currentTime, sim.trajectoryData]);

  // Clear marks on reset (currentTime goes to 0)
  useEffect(() => {
    if (sim.currentTime === 0) {
      setStroboscopicMarks([]);
    }
  }, [sim.currentTime]);

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
      ? (lang === 'ar' ? 'أكمل' : lang === 'fr' ? 'Continuer' : 'Continue')
      : (lang === 'ar' ? 'محاكاة' : lang === 'fr' ? 'Simuler' : 'Simulate'),
    [sim.isAnimating, isPaused, lang, T.pause]);

  // Helper to get display value with unit conversion
  const getDisplayValue = useCallback((paramKey: string, baseValue: number) => {
    const unitKey = selectedUnits[paramKey];
    const unitDef = UNIT_OPTIONS[paramKey]?.units.find(u => u.key === unitKey);
    if (!unitDef) return baseValue;
    return baseValue * unitDef.factor;
  }, [selectedUnits]);

  const getUnitLabel = useCallback((paramKey: string) => {
    const unitKey = selectedUnits[paramKey];
    const unitDef = UNIT_OPTIONS[paramKey]?.units.find(u => u.key === unitKey);
    if (!unitDef) return '';
    if (lang === 'ar') return unitDef.labelAr;
    return unitDef.label;
  }, [selectedUnits, lang]);

  // Convert from display unit back to base (SI) unit
  const fromDisplayValue = useCallback((paramKey: string, displayValue: number) => {
    const unitKey = selectedUnits[paramKey];
    const unitDef = UNIT_OPTIONS[paramKey]?.units.find(u => u.key === unitKey);
    if (!unitDef) return displayValue;
    return displayValue / unitDef.factor;
  }, [selectedUnits]);

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
      // Clean URL after loading params
      window.history.replaceState({}, '', window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Session Load Handler ──
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

  // ── Equation Engine → main canvas trajectory handler ──
  const handleEquationTrajectory = useCallback((points: EquationTrajectoryPoint[] | null) => {
    if (!points || points.length < 2) {
      setEquationTrajectory(null);
      return;
    }
    // Convert equation points to TrajectoryPoint[] and inject into simulation
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
    // Replace the main canvas trajectory with the equation-generated one
    // Don't auto-launch — just set the path, user launches manually
    sim.resetAnimation();
    sim.setTrajectoryData(converted);
    sim.setCurrentTime(0);
    setEquationTrajectory(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim.mass, sim.gravity]);

  // Language switching function
  const switchLanguage = (newLang: 'ar' | 'en' | 'fr') => {
    if (newLang !== lang) {
      sim.setLanguageDirect(newLang);
      playNav(sim.isMuted);
    }
    setShowLangDropdown(false);
  };

  if (showSplash) {
    return <SplashScreen lang={lang} onComplete={() => { setShowSplash(false); setShowOnboarding(true); }} />;
  }

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
        <header data-tour="header" className="border-b border-border/60 bg-background/95 backdrop-blur-xl sticky top-0 z-40 shadow-md shadow-black/[0.06] dark:shadow-black/25 dark:bg-background/85 dark:border-border/40 relative">
          <HeaderWave />
          <div className="max-w-[1600px] mx-auto px-3 sm:px-5 md:px-6 h-12 sm:h-14 flex items-center justify-between gap-2" dir="ltr">
            {/* Left side: Settings for non-Arabic, Home for Arabic */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 relative">
              {lang !== 'ar' && (
                <button onClick={() => { setShowSettingsPanel(true); playNav(sim.isMuted); }}
                  className="group text-xs font-medium text-muted-foreground hover:text-primary px-2 sm:px-3 py-1.5 rounded-lg hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all duration-300 flex items-center gap-1.5"
                  title="Settings">
                  <Settings className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-45" />
                  <span className="hidden xs:inline font-medium">
                    {lang === 'fr' ? 'Paramètres' : 'Settings'}
                  </span>
                </button>
              )}
              {lang === 'ar' && (
                <button onClick={() => { playPageTransition(sim.isMuted); setTimeout(() => navigate('/home'), 120); }}
                  className="group text-xs font-medium text-muted-foreground hover:text-primary px-2 sm:px-3 py-1.5 rounded-lg hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all duration-300 flex items-center gap-1.5 nav-btn-animate"
                  title="الرئيسية">
                  <Home className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                  <span className="hidden xs:inline font-medium">الرئيسية</span>
                </button>
              )}
            </div>

            {/* Center: APAS buttons + logo */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0" dir={T.dir}>
              {canAccessRestrictedFeature ? (
                <Suspense fallback={null}>
                    <PhysicsTutor lang={lang} hasModel={sim.trajectoryData.length > 0 && !!sim.prediction} simulationContext={{
                      velocity: sim.velocity, angle: sim.angle, height: sim.height,
                      gravity: sim.gravity, airResistance: sim.airResistance, mass: sim.mass,
                      range: (sim.prediction?.range ?? 0).toFixed(2),
                      maxHeight: (sim.prediction?.maxHeight ?? 0).toFixed(2),
                      flightTime: (sim.prediction?.timeOfFlight ?? 0).toFixed(2),
                    }} />
                </Suspense>
              ) : (
                <button
                  onClick={() => setShowRestrictionOverlay('Smart Assistant')}
                  className="rounded-lg px-2.5 py-1.5 bg-secondary/50 text-muted-foreground cursor-not-allowed opacity-60 border border-border/50 flex items-center gap-1.5 text-[11px] font-bold"
                >
                  <Filter className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'اسأل' : 'Ask'} APAS</span>
                </button>
              )}
              {canAccessRestrictedFeature ? (
                <Suspense fallback={null}>
                  <ApasRecommendations
                    lang={lang}
                    muted={sim.isMuted}
                    isUnlocked={!!isFinished || hasExperimentalData}
                    simulationContext={{
                      velocity: sim.velocity, angle: sim.angle, height: sim.height,
                      gravity: sim.gravity, airResistance: sim.airResistance, mass: sim.mass,
                      range: (sim.prediction?.range ?? 0).toFixed(2),
                      maxHeight: (sim.prediction?.maxHeight ?? 0).toFixed(2),
                      flightTime: (sim.prediction?.timeOfFlight ?? 0).toFixed(2),
                      environmentId: currentEnvId,
                      integrationMethod: sim.selectedIntegrationMethod,
                    }}
                  />
                </Suspense>
              ) : (
                <button
                  onClick={() => setShowRestrictionOverlay('APAS Recommendations')}
                  className="rounded-lg px-2.5 py-1.5 bg-secondary/50 text-muted-foreground cursor-not-allowed opacity-60 border border-border/50 flex items-center gap-1.5 text-[11px] font-bold"
                >
                  <Filter className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'توصيات' : 'Tips'} APAS</span>
                </button>
              )}
              <span className="text-sm text-muted-foreground/80 hidden md:inline font-medium">{T.appTitleFull}</span>
              <span className="text-lg sm:text-xl font-bold tracking-wider bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent drop-shadow-sm">APAS</span>
              <ApasLogo size={28} />
            </div>

            {/* Right side: Home + Auth buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 relative">
              <DevPrivilegesButton lang={lang} />
              {isAdmin && (
                <button onClick={() => navigate('/admin')}
                  className="group text-xs font-medium text-muted-foreground hover:text-primary px-2 py-1.5 rounded-lg hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all duration-300 flex items-center gap-1.5"
                  title="Admin">
                  <Shield className="w-4 h-4" />
                </button>
              )}
              {user ? (
                <button onClick={async () => { await signOut(); navigate('/'); }}
                  className="group text-xs font-medium text-muted-foreground hover:text-destructive px-2 py-1.5 rounded-lg hover:bg-destructive/10 transition-all duration-300 flex items-center gap-1.5"
                  title="Sign Out">
                  <LogOut className="w-4 h-4" />
                </button>
              ) : isGuest ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => navigate('/?mode=signup')}
                    className="group text-xs font-medium text-primary px-2 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/15 border border-primary/20 transition-all duration-300 flex items-center gap-1"
                    title={lang === 'ar' ? 'إنشاء حساب' : lang === 'fr' ? 'S\'inscrire' : 'Sign Up'}>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline font-medium text-[11px]">
                      {lang === 'ar' ? 'إنشاء حساب' : lang === 'fr' ? 'S\'inscrire' : 'Sign Up'}
                    </span>
                  </button>
                  <button onClick={() => navigate('/')}
                    className="group text-xs font-medium text-muted-foreground hover:text-primary px-2 py-1.5 rounded-lg hover:bg-primary/10 transition-all duration-300 flex items-center gap-1"
                    title={lang === 'ar' ? 'تسجيل الدخول' : lang === 'fr' ? 'Connexion' : 'Login'}>
                    <LogIn className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline font-medium text-[11px]">
                      {lang === 'ar' ? 'تسجيل الدخول' : lang === 'fr' ? 'Connexion' : 'Login'}
                    </span>
                  </button>
                </div>
              ) : null}
              {lang !== 'ar' && (
                <button onClick={() => { playPageTransition(sim.isMuted); setTimeout(() => navigate('/home'), 120); }}
                  className="group text-xs font-medium text-muted-foreground hover:text-primary px-2 sm:px-3 py-1.5 rounded-lg hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all duration-300 flex items-center gap-1.5 nav-btn-animate"
                  title={lang === 'fr' ? 'Accueil' : 'Home'}>
                  <Home className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                  <span className="hidden xs:inline font-medium">
                    {lang === 'fr' ? 'Accueil' : 'Home'}
                  </span>
                </button>
              )}
              {lang === 'ar' && (
                <button onClick={() => { setShowSettingsPanel(true); playNav(sim.isMuted); }}
                  className="group text-xs font-medium text-muted-foreground hover:text-primary px-2 sm:px-3 py-1.5 rounded-lg hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all duration-300 flex items-center gap-1.5"
                  title="الإعدادات">
                  <Settings className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-45" />
                  <span className="hidden xs:inline font-medium">الإعدادات</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ── Main Content ── */}
        <div className="max-w-[1600px] mx-auto px-3 sm:px-5 md:px-6 py-4 sm:py-6">
          <div className={isFocusMode ? 'grid grid-cols-1 lg:grid-cols-[240px_1fr] xl:grid-cols-[260px_1fr] gap-3 sm:gap-4 md:gap-5' : 'grid grid-cols-1 md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr_200px] xl:grid-cols-[260px_1fr_220px] gap-3 sm:gap-4 md:gap-5'}>

            {/* ═══ LEFT — Parameters Panel ═══ */}
            <aside data-tour="left-panel" className="space-y-3.5 sm:space-y-4 order-2 md:order-1 md:sticky md:top-16 md:self-start md:max-h-[calc(100vh-5rem)] md:overflow-y-auto md:scrollbar-thin md:scrollbar-thumb-border md:scrollbar-track-transparent md:pt-24">
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
                    label={lang === 'ar' ? 'السرعة' : lang === 'fr' ? 'Vitesse' : 'Velocity'}
                    value={getDisplayValue('velocity', sim.velocity)}
                    onChange={(v) => sim.setVelocity(fromDisplayValue('velocity', v))}
                    min={-500} max={500} step={1} isRTL={isRTL}
                    unitKey="velocity" selectedUnit={selectedUnits.velocity}
                    units={UNIT_OPTIONS.velocity.units} lang={lang}
                    onUnitChange={(u) => setSelectedUnits(prev => ({ ...prev, velocity: u }))}
                    muted={sim.isMuted}
                    tooltip={lang === 'ar' ? 'سرعة انطلاق المقذوف (V₀). القيم السالبة تعكس الاتجاه' : 'Initial launch speed (V₀). Negative values reverse direction'}
                  />
                      <ParamInputWithUnit
                    label={lang === 'ar' ? (is3DMode ? 'الزاوية θ' : 'الزاوية') : lang === 'fr' ? (is3DMode ? 'Angle θ' : 'Angle') : (is3DMode ? 'Angle θ' : 'Angle')}
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
                            {lang === 'ar' ? 'الزاوية φ (سمتية)' : lang === 'fr' ? 'Angle φ (azimut)' : 'Angle φ (azimuth)'}
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
                            <span className="text-[10px] font-mono text-muted-foreground px-1">°</span>
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
                    label={lang === 'ar' ? 'الجاذبية' : lang === 'fr' ? 'Gravité' : 'Gravity'}
                    value={getDisplayValue('gravity', sim.gravity)}
                    onChange={(v) => sim.setGravity(Math.max(0, fromDisplayValue('gravity', v)))}
                    min={0} max={100} step={0.01} isRTL={isRTL}
                    unitKey="gravity" selectedUnit={selectedUnits.gravity}
                    units={UNIT_OPTIONS.gravity.units} lang={lang}
                    onUnitChange={(u) => setSelectedUnits(prev => ({ ...prev, gravity: u }))}
                    muted={sim.isMuted}
                    tooltip={lang === 'ar' ? 'تسارع الجاذبية. الأرض=9.81، القمر=1.62، المريخ=3.72' : 'Gravitational acceleration. Earth=9.81, Moon=1.62, Mars=3.72'}
                  />
                      <ParamInputWithUnit
                    label={lang === 'ar' ? 'الكتلة' : lang === 'fr' ? 'Masse' : 'Mass'}
                    value={getDisplayValue('mass', sim.mass)}
                    onChange={(v) => sim.setMass(fromDisplayValue('mass', v))}
                    min={0.01} max={50000} step={0.01} isRTL={isRTL}
                    unitKey="mass" selectedUnit={selectedUnits.mass}
                    units={UNIT_OPTIONS.mass.units} lang={lang}
                    onUnitChange={(u) => setSelectedUnits(prev => ({ ...prev, mass: u }))}
                    muted={sim.isMuted}
                    tooltip={lang === 'ar' ? 'كتلة المقذوف. تؤثر على مقاومة الهواء وقوة ماغنوس' : 'Projectile mass. Affects air resistance and Magnus force'}
                  />
                      <ParamInputWithUnit
                    label={lang === 'ar' ? 'الارتفاع' : lang === 'fr' ? 'Hauteur' : 'Height'}
                    value={getDisplayValue('height', sim.height)}
                    onChange={(v) => sim.setHeight(fromDisplayValue('height', v))}
                    min={0} max={5000} step={0.5} isRTL={isRTL}
                    unitKey="height" selectedUnit={selectedUnits.height}
                    units={UNIT_OPTIONS.height.units} lang={lang}
                    onUnitChange={(u) => setSelectedUnits(prev => ({ ...prev, height: u }))}
                  />
                      <ParamInputWithUnit
                    label={lang === 'ar' ? 'الموضع الابتدائي (x₀)' : lang === 'fr' ? 'Position initiale (x₀)' : 'Initial Position (x₀)'}
                    value={getDisplayValue('height', sim.initialX)}
                    onChange={(v) => sim.setInitialX(fromDisplayValue('height', v))}
                    min={-5000} max={5000} step={0.5} isRTL={isRTL}
                    unitKey="height" selectedUnit={selectedUnits.height}
                    units={UNIT_OPTIONS.height.units} lang={lang}
                    onUnitChange={(u) => setSelectedUnits(prev => ({ ...prev, height: u }))}
                  />
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                  <span className="text-xs font-medium text-foreground">{lang === 'ar' ? 'مقاومة الهواء' : lang === 'fr' ? 'Résistance de l\'Air' : 'Air Resistance'}</span>
                  <Switch
                    checked={sim.airResistance > 0}
                    onCheckedChange={(checked) => { sim.setAirResistance(checked ? 0.02 : 0); playToggle(sim.isMuted, checked); }}
                  />
                </div>
                {sim.airResistance > 0 && (
                  <div className="mt-2 space-y-2">
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>k ({lang === 'ar' ? 'معامل المقاومة' : lang === 'fr' ? 'Coeff. de Trainée' : 'Drag coeff.'})</span>
                        <span className="font-mono">{sim.airResistance.toFixed(3)}</span>
                      </div>
                      <Slider value={[sim.airResistance]} min={0} max={0.1} step={0.001}
                        onValueChange={([v]) => { sim.setAirResistance(v); playSliderChange(sim.isMuted); }} />
                    </div>
                    <ParamInputWithUnit
                      label={lang === 'ar' ? 'سرعة الرياح' : lang === 'fr' ? 'Vitesse du Vent' : 'Wind Speed'}
                      value={getDisplayValue('windSpeed', sim.windSpeed)}
                      onChange={(v) => sim.setWindSpeed(fromDisplayValue('windSpeed', v))}
                      min={-100} max={100} step={1} isRTL={isRTL}
                      unitKey="windSpeed" selectedUnit={selectedUnits.windSpeed}
                      units={UNIT_OPTIONS.windSpeed.units} lang={lang}
                      onUnitChange={(u) => setSelectedUnits(prev => ({ ...prev, windSpeed: u }))}
                    />
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Cd ({lang === 'ar' ? 'معامل السحب' : lang === 'fr' ? 'Forme de Trainée' : 'Drag shape'})</span>
                        <span className="font-mono">{dragCd.toFixed(2)}</span>
                      </div>
                      <Slider value={[dragCd]} min={0.1} max={2.0} step={0.01}
                        onValueChange={([v]) => { setDragCd(v); playSliderChange(sim.isMuted); }} />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>ρ ({lang === 'ar' ? 'كثافة الهواء' : lang === 'fr' ? 'Densité de l\'Air' : 'Air density'}) kg/m³</span>
                        <span className="font-mono">{airDensity.toFixed(3)}</span>
                      </div>
                      <Slider value={[airDensity]} min={0.5} max={2.0} step={0.001}
                        onValueChange={([v]) => { setAirDensity(v); playSliderChange(sim.isMuted); }} />
                    </div>
                    <p className="text-[9px] text-muted-foreground text-center border-t border-border pt-1.5 mt-1">
                      F_d = ½ · Cd · ρ · A · (v - v_wind)²
                    </p>
                  </div>
                )}

                  </div>
                )}
              </div>

              {/* Display Options — moved here from right sidebar */}
              <div className="border border-border/40 rounded-xl overflow-hidden bg-card/70 backdrop-blur-sm shadow-lg shadow-black/[0.04] dark:shadow-black/15 transition-all duration-300 hover:shadow-xl hover:shadow-primary/[0.06] dark:border-border/30">
                <button
                  onClick={() => { setShowDisplayOptions(!showDisplayOptions); playSectionToggle(sim.isMuted); }}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary/5 transition-all duration-300"
                >
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-tight flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    {lang === 'ar' ? 'خيارات العرض' : lang === 'fr' ? 'Options d\'Affichage' : 'Display Options'}
                  </h3>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${showDisplayOptions ? 'rotate-180' : ''}`} />
                </button>

                {showDisplayOptions && (
                <div className="p-4 pt-0 space-y-2 animate-slideDown" style={{ animationDuration: '0.3s' }}>
                    {/* Environment Selection */}
                    <button
                      onClick={() => { setShowEnvSelector(true); playClick(sim.isMuted); }}
                      className="group w-full text-xs font-medium py-2.5 px-3 rounded-lg flex items-center gap-2 text-foreground hover:bg-primary/10 border border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-300"
                    >
                      <Globe2 className="w-3.5 h-3.5" />
                      {lang === 'ar' ? 'اختيار البيئة' : lang === 'fr' ? 'Environnement' : 'Environment'}
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {ENVIRONMENTS.find(e => e.id === currentEnvId)?.emoji} {ENVIRONMENTS.find(e => e.id === currentEnvId)?.name[lang as 'ar' | 'en' | 'fr']}
                      </span>
                    </button>
                    <ToggleOption label={lang === 'ar' ? 'النقاط الحرجة' : lang === 'fr' ? 'Points Critiques' : 'Critical Points'} active={sim.showCriticalPoints}
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
                      {lang === 'ar' ? 'التصوير المتعاقب' : lang === 'fr' ? 'Photographie Stroboscopique' : 'Stroboscopic'}
                      {stroboscopicSettings.enabled && (
                        <span className="ml-auto text-[10px] opacity-80">Δt={stroboscopicSettings.deltaT}s</span>
                      )}
                    </button>
                    <ToggleOption label={lang === 'ar' ? 'ارتداد المقذوف' : lang === 'fr' ? 'Rebond du Projectile' : 'Bouncing'} active={sim.enableBounce}
                      onClick={() => { sim.setEnableBounce(!sim.enableBounce); playToggle(sim.isMuted, !sim.enableBounce); }} icon={<span className="text-xs">⚾</span>} />
                    {sim.enableBounce && (
                      <div className="px-1 pb-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                          <span>{lang === 'ar' ? 'معامل الارتداد' : lang === 'fr' ? 'Coeff. de Rebond' : 'COR'}</span>
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
              <AdvancedPhysicsPanel lang={lang} advancedPhysicsInstance={advancedPhysics} onPhysicsChange={() => sim.recalculate()} environmentId={currentEnvId} />

              {/* Save/Compare — collapsible section */}
              <div className="border border-border/50 rounded-xl overflow-hidden bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
                <button
                  onClick={() => { setShowComparisonSection(!showComparisonSection); playSectionToggle(sim.isMuted); }}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary/5 transition-all duration-300"
                >
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-tight flex items-center gap-2">
                    <GitBranch className="w-3.5 h-3.5 text-primary" />
                    {lang === 'ar' ? 'المقارنة' : lang === 'fr' ? 'Comparaison' : 'Comparison'}
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
                    <GitBranch className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" /> {lang === 'ar' ? 'مقارنة نماذج الذكاء الاصطناعي' : lang === 'fr' ? 'Comparaison des Modèles IA' : 'AI Model Comparison'}
                  </button>
                  <button onClick={() => { setShowMultiSimModal(true); playClick(sim.isMuted); }}
                    className="group w-full text-xs font-medium text-foreground py-2 px-3 rounded border border-border hover:border-foreground/30 hover:bg-secondary hover:shadow-md transition-all duration-200 flex items-center justify-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" /> {lang === 'ar' ? 'المقارنة المتقدمة' : lang === 'fr' ? 'Comparaison Avancée' : 'Advanced Comparison'}
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

                {/* Saved comparison snapshot panel — immutable snapshot displayed below the button */}
                {sim.comparisonMode && savedSnapshot && (
                  <div className="mt-3 border border-border rounded-lg overflow-hidden bg-secondary/30 animate-slideDown">
                    <div className="px-3 py-2 bg-secondary/50 border-b border-border">
                      <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                        <Save className="w-3 h-3" />
                        {lang === 'ar' ? 'لقطة المسار المحفوظة' : lang === 'fr' ? 'Instantané de Trajectoire' : 'Saved Trajectory Snapshot'}
                      </p>
                    </div>
                    <div className="p-3 space-y-2">
                      {/* Parameters */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">V₀</span>
                          <span className="font-mono font-semibold text-foreground">{savedSnapshot.velocity.toFixed(2)} {T.u_ms}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">θ</span>
                          <span className="font-mono font-semibold text-foreground">{savedSnapshot.angle.toFixed(1)}°</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">h₀</span>
                          <span className="font-mono font-semibold text-foreground">{savedSnapshot.height.toFixed(2)} {T.u_m_s}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">g</span>
                          <span className="font-mono font-semibold text-foreground">{savedSnapshot.gravity.toFixed(2)} {T.u_ms2}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">m</span>
                          <span className="font-mono font-semibold text-foreground">{savedSnapshot.mass.toFixed(2)} {T.u_kg}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">k</span>
                          <span className="font-mono font-semibold text-foreground">{savedSnapshot.airResistance.toFixed(3)}</span>
                        </div>
                      </div>
                      {/* Divider */}
                      <div className="border-t border-border" />
                      {/* Results */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{lang === 'ar' ? 'المدى' : lang === 'fr' ? 'Portée' : 'Range'}</span>
                          <span className="font-mono font-semibold text-foreground">{savedSnapshot.range.toFixed(2)} {T.u_m_s}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{lang === 'ar' ? 'أقصى ارتفاع' : lang === 'fr' ? 'Hauteur Max' : 'Max H'}</span>
                          <span className="font-mono font-semibold text-foreground">{savedSnapshot.maxHeight.toFixed(2)} {T.u_m_s}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{lang === 'ar' ? 'زمن الطيران' : lang === 'fr' ? 'Temps de Vol' : 'T. Flight'}</span>
                          <span className="font-mono font-semibold text-foreground">{savedSnapshot.flightTime.toFixed(2)} {T.u_s}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{lang === 'ar' ? 'السرعة النهائية' : lang === 'fr' ? 'Vitesse Finale' : 'V Final'}</span>
                          <span className="font-mono font-semibold text-foreground">{savedSnapshot.finalVelocity.toFixed(2)} {T.u_ms}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{lang === 'ar' ? 'زاوية السقوط' : lang === 'fr' ? 'Angle Impact' : 'Impact θ'}</span>
                          <span className="font-mono font-semibold text-foreground">{savedSnapshot.impactAngle.toFixed(1)}°</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{lang === 'ar' ? 'الطريقة' : lang === 'fr' ? 'Méthode' : 'Method'}</span>
                          <span className="font-mono font-semibold text-foreground">{savedSnapshot.integrationMethod.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                  </div>
                )}
              </div>

              {/* Export — moved here from right sidebar */}
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
              />
            </aside>

            {/* ═══ CENTER — Canvas & Results ═══ */}
            <div data-tour="center-canvas" className="space-y-3 sm:space-y-5 order-1 md:order-2 min-w-0">


              {/* Canvas Toolbar */}
              <div ref={canvasContainerRef} className={isFullscreen ? 'fixed inset-0 z-50 bg-background flex flex-col' : ''}>
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2.5">
                    <span className={pathDotClass} />
                    {lang === 'ar' ? 'مسار المقذوف' : lang === 'fr' ? 'Trajectoire du Projectile' : 'Projectile Path'}
                  </h2>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCanvasZoom(z => Math.max(0.5, z - 0.25))}
                      className="group p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary border border-transparent hover:border-primary/20 hover:shadow-md transition-all duration-300"
                      title={lang === 'ar' ? 'تصغير' : 'Zoom Out'}>
                      <ZoomOut className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" />
                    </button>
                    <span className="text-[10px] font-mono text-muted-foreground w-8 text-center">{Math.round(canvasZoom * 100)}%</span>
                    <button onClick={() => setCanvasZoom(z => Math.min(3, z + 0.25))}
                      className="group p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary border border-transparent hover:border-primary/20 hover:shadow-md transition-all duration-300"
                      title={lang === 'ar' ? 'تكبير' : 'Zoom In'}>
                      <ZoomIn className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" />
                    </button>
                    <button onClick={() => {
                        if (is3DMode) {
                          setIs3DMode(false);
                        } else if (!webglError) {
                          setIs3DMode(true);
                        }
                        playUIClick(sim.isMuted);
                      }}
                      className={is3DMode ? 'group p-1.5 rounded-lg bg-primary text-primary-foreground border border-primary hover:shadow-md transition-all duration-300' : 'group p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 hover:shadow-md transition-all duration-300'}
                      title={lang === 'ar' ? 'وضع ثلاثي الأبعاد' : '3D Mode'}>
                      <Box className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" />
                    </button>
                    <button onClick={exportSimulationPNG}
                      className="group p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary border border-transparent hover:border-primary/20 hover:shadow-md transition-all duration-300"
                      title={lang === 'ar' ? 'تصوير' : 'Screenshot'}>
                      <Camera className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" />
                    </button>
                    <button onClick={() => { setShowLiveData(v => !v); playUIClick(sim.isMuted); }}
                      className={showLiveData ? 'group p-1.5 rounded-lg bg-primary text-primary-foreground border border-primary hover:shadow-md transition-all duration-300' : 'group p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 hover:shadow-md transition-all duration-300'}
                      title={lang === 'ar' ? 'البيانات الحية' : 'Live Data'}>
                      {showLiveData ? <Eye className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" /> : <EyeOff className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" />}
                    </button>
                    <button onClick={toggleFullscreen}
                      className="group p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary border border-transparent hover:border-primary/20 hover:shadow-md transition-all duration-300"
                      title={lang === 'ar' ? 'ملء الشاشة' : 'Fullscreen'}>
                      {isFullscreen ? <Minimize className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" /> : <Maximize className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" />}
                    </button>
                    <button onClick={() => { setShowGrid(g => !g); playUIClick(sim.isMuted); }}
                      className={showGrid ? 'group p-1.5 rounded-lg bg-primary text-primary-foreground border border-primary hover:shadow-md transition-all duration-300' : 'group p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 hover:shadow-md transition-all duration-300'}
                      title={lang === 'ar' ? 'الشبكة' : 'Grid'}>
                      <Grid3x3 className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" />
                    </button>
                    <button onClick={() => { setIsFocusMode(f => !f); playUIClick(sim.isMuted); }}
                      className={isFocusMode ? 'group p-1.5 rounded-lg bg-primary text-primary-foreground border border-primary hover:shadow-md transition-all duration-300' : 'group p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 hover:shadow-md transition-all duration-300'}
                      title={lang === 'ar' ? 'وضع التركيز' : 'Focus Mode'}>
                      <Focus className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" />
                    </button>
                    {/* Rec button — compact recorder in toolbar */}
                    <Suspense fallback={null}>
                      <SimulationRecorder
                        lang={lang}
                        muted={sim.isMuted}
                        canvasContainerRef={canvasContainerRef}
                        onStartAnimation={sim.startAnimation}
                      />
                    </Suspense>
                  </div>
                </div>

                <div className={isFullscreen ? 'flex-1 min-h-0' : ''}>
                  {is3DMode ? (
                    <ErrorBoundary sectionName="3D Simulation">
                    <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><AnimatedLoadingSpinner /></div>}>
                      <SimulationCanvas3D
                        trajectoryData={sim.trajectoryData}
                        prediction={sim.prediction}
                        currentTime={sim.currentTime}
                        height={sim.height}
                        showCriticalPoints={sim.showCriticalPoints}
                        showExternalForces={sim.showExternalForces}
                        vectorVisibility={vectorVisibility}
                        mass={sim.mass}
                        gravity={sim.gravity}
                        airResistance={sim.airResistance}
                        lang={lang}
                        nightMode={sim.nightMode}
                        isAnimating={sim.isAnimating}
                        playbackSpeed={sim.playbackSpeed}
                        bounceCoefficient={sim.bounceCoefficient}
                        phi={sim.phi}
                        showLiveData={showLiveData}
                        stroboscopicMarks={stroboscopicSettings.enabled ? stroboscopicMarks : []}
                        showStroboscopicProjections={stroboscopicSettings.showProjections}
                        environmentId={currentEnvId}
                        activePresetEmoji={activePresetEmoji}
                        showGrid={showGrid}
                        enableMagnusSpin={advancedPhysics.enableMagnus && advancedPhysics.spinRate !== 0}
                        spinRate={advancedPhysics.spinRate}
                        onWebglError={(msg) => {
                          setWebglError(msg);
                          setIs3DMode(false);
                        }}
                      />
                      {webglError && (
                        <div className="mt-2 p-2 text-xs text-amber-800 bg-amber-100 border border-amber-300 rounded">
                          <p className="font-semibold">{lang === 'ar' ? 'تحذير WebGL' : 'WebGL Warning'}:</p>
                          <p>{webglError}</p>
                          <button
                            className="mt-1 px-2 py-1 bg-primary text-primary-foreground rounded text-[11px]"
                            onClick={() => { setIs3DMode(false); setWebglError(null); }}
                          >
                            {lang === 'ar' ? 'العودة إلى الوضع ثنائي الأبعاد' : 'Switch to 2D Mode'}
                          </button>
                        </div>
                      )}
                    </Suspense>
                    </ErrorBoundary>
                  ) : (
                    <SimulationCanvas
                      trajectoryData={sim.trajectoryData}
                      theoreticalData={sim.theoreticalData}
                      prediction={sim.prediction}
                      currentTime={sim.currentTime}
                      height={sim.height}
                      showCriticalPoints={sim.showCriticalPoints}
                      showExternalForces={sim.showExternalForces}
                      vectorVisibility={vectorVisibility}
                      showAIComparison={sim.showAIComparison}
                      aiModels={sim.aiModels}
                      customColors={sim.customColors}
                      comparisonMode={sim.comparisonMode}
                      savedTrajectory={sim.savedTrajectory}
                      multiTrajectoryMode={sim.multiTrajectoryMode}
                      multiTrajectories={sim.multiTrajectories}
                      mass={sim.mass}
                      gravity={sim.gravity}
                      airResistance={sim.airResistance}
                      windSpeed={sim.windSpeed}
                      T={T}
                      lang={lang}
                      countdown={sim.countdown}
                      nightMode={sim.nightMode}
                      zoom={canvasZoom}
                      isAnimating={sim.isAnimating}
                      isFullscreen={isFullscreen}
                      showLiveData={showLiveData}
                      stroboscopicMarks={stroboscopicSettings.enabled ? stroboscopicMarks : []}
                      showStroboscopicProjections={stroboscopicSettings.showProjections}
                      environmentId={currentEnvId}
                      activePresetEmoji={activePresetEmoji}
                      equationTrajectory={equationTrajectory}
                      showGrid={showGrid}
                      secondBody={null}
                      collisionPoint={null}
                      fluidFrictionRay={advancedPhysics.enableHydrodynamicDrag || advancedPhysics.isUnderwater}
                      isUnderwater={advancedPhysics.isUnderwater}
                      fluidDensity={advancedPhysics.isUnderwater ? advancedPhysics.fluidDensity : 1.225}
                    />
                  )}
                </div>

                <CanvasToolbar
                  isAnimating={sim.isAnimating}
                  onReset={sim.resetAnimation}
                  onTogglePlay={sim.isAnimating ? sim.pauseAnimation : sim.startAnimation}
                  playButtonText={playButtonText}
                  trajectoryData={sim.trajectoryData}
                  currentTime={sim.currentTime}
                  onSeek={sim.seekTo}
                  playbackSpeed={sim.playbackSpeed}
                  onSetPlaybackSpeed={sim.setPlaybackSpeed}
                  isMuted={sim.isMuted}
                  T={T}
                  isFullscreen={isFullscreen}
                />
              </div>

              {/* ── Below-canvas sections (hidden in focus mode) ── */}
              {!isFocusMode && <>
              {/* ── AI Predictions ── */}
              {sim.prediction && (
                <ResultsSection
                  lang={lang}
                  T={T}
                  prediction={sim.prediction}
                  velocity={sim.velocity}
                  angle={sim.angle}
                  height={sim.height}
                  gravity={sim.gravity}
                  airResistance={sim.airResistance}
                  mass={sim.mass}
                  showPathInfo={showPathInfo}
                  onTogglePathInfo={() => setShowPathInfo(!showPathInfo)}
                />
              )}

              {/* ═══ 1. التمثيل البياني ═══ */}
              <CollapsibleSection title={lang === 'ar' ? '📈 التمثيل البياني' : '📈 Graphical Representation'} icon="📈" open={showChartSection} toggle={() => setShowChartSection(!showChartSection)}
                miniPreview={
                  chartAxisX && chartAxisY ? (
                    <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">
                      {axisVars.find(v => v.key === chartAxisX)?.symbol || chartAxisX} vs {axisVars.find(v => v.key === chartAxisY)?.symbol || chartAxisY}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{lang === 'ar' ? 'لم يُحدد' : 'Not set'}</span>
                  )
                }
              >
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">{T.xAxis}</p>
                    <select value={chartAxisX} onChange={(e) => setChartAxisX(e.target.value)} dir={T.dir}
                      className="w-full text-sm">
                      <option value="">{lang === 'ar' ? 'اختر...' : 'Select...'}</option>
                      {axisVars.map((v) => <option key={v.key} value={v.key}>{v.symbol} ({v.unit})</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">{T.yAxis}</p>
                    <select value={chartAxisY} onChange={(e) => setChartAxisY(e.target.value)} dir={T.dir}
                      className="w-full text-sm">
                      <option value="">{lang === 'ar' ? 'اختر...' : 'Select...'}</option>
                      {axisVars.map((v) => <option key={v.key} value={v.key}>{v.symbol} ({v.unit})</option>)}
                    </select>
                  </div>
                </div>
                {chartAxisX && chartAxisY ? (() => {
                  const chartData = getChartData();
                  if (!chartData.length) return <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">{lang === 'ar' ? 'لا توجد بيانات' : 'No data'}</div>;
                  const xs = chartData.map((d) => d.xVal);
                  const ys = chartData.map((d) => d.yVal);
                  const rawXMin = Math.min(...xs);
                  const rawXMax = Math.max(...xs);
                  const rawYMin = Math.min(...ys);
                  const rawYMax = Math.max(...ys);
                  const xPad = Math.max(Math.abs(rawXMax - rawXMin) * 0.1, 0.1);
                  const yPad = Math.max(Math.abs(rawYMax - rawYMin) * 0.1, 0.1);
                  const xMin = rawXMin >= 0 ? 0 : rawXMin - xPad;
                  const xMax = rawXMax <= 0 ? 0 : rawXMax + xPad;
                  const yMin = rawYMin >= 0 ? 0 : rawYMin - yPad;
                  const yMax = rawYMax <= 0 ? 0 : rawYMax + yPad;
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
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">{lang === 'ar' ? 'اختر المحاور أعلاه' : 'Select axes above'}</p>
                    </div>
                  </div>
                )}
              </CollapsibleSection>

              {/* ═══ 2. قسم المعادلات و التفاصيل ═══ */}
              <Collapsible defaultOpen={false} className="border border-border/50 rounded-xl bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 overflow-hidden">
                <CollapsibleTrigger 
                  onClick={() => playSectionToggle(sim.isMuted)}
                  className="flex items-center justify-between w-full px-4 py-3.5 cursor-pointer hover:bg-primary/5 transition-all duration-300"
                >
                  <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                    📝 {lang === 'ar' ? 'قسم المعادلات و التفاصيل' : 'Equations & Details'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-300 [[data-state=open]>&]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="border-t border-border/30">
                  <div className="p-4 space-y-4">
                    {/* المعادلات والقيم اللحظية */}
                    <EquationsPanel
                      lang={lang}
                      velocity={sim.velocity}
                      angle={sim.angle}
                      height={sim.height}
                      gravity={sim.gravity}
                      airResistance={sim.airResistance}
                      mass={sim.mass}
                      currentTime={sim.currentTime}
                      muted={sim.isMuted}
                      prediction={sim.prediction}
                    />

                    {/* محرك المعادلات العام */}
                    <Suspense fallback={null}>
                      <EquationEngine lang={lang} muted={sim.isMuted} onTrajectoryGenerated={handleEquationTrajectory} />
                    </Suspense>

                    {/* شرح تفصيلي لطرق التكامل */}
                    <CollapsibleSection 
                      title={lang === 'ar' ? '∫ شرح تفصيلي لطرق التكامل' : '∫ Detailed Integration Methods Explanation'} 
                      icon="∫" 
                      open={showIntegrationComparison} 
                      toggle={() => setShowIntegrationComparison(!showIntegrationComparison)}
                      miniPreview={
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          Euler · RK4 · AI
                        </span>
                      }
                    >
                      <div className="space-y-4">
                        <div className="text-xs text-muted-foreground mb-3">
                          {lang === 'ar' 
                            ? 'اختر طريقة التكامل المناسبة لاحتياجاتك من حيث الدقة والسرعة' 
                            : 'Choose the integration method that suits your needs in terms of accuracy and speed'}
                        </div>
                        
                        {/* Euler Method */}
                        <div className="border border-border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <h4 className="text-sm font-semibold text-foreground">Euler</h4>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">⚡ {lang === 'ar' ? 'سريع' : 'Fast'}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {lang === 'ar' 
                              ? 'طريقة بسيطة وسريعة ولكن أقل دقة. مناسبة للمحاكاة السريعة والتعليم الأساسي.'
                              : 'Simple and fast method but less accurate. Suitable for quick simulations and basic education.'}
                          </p>
                          <div className="bg-secondary/30 rounded p-2 mb-2">
                            <p className="text-xs font-medium text-foreground mb-1">{lang === 'ar' ? 'المعادلات المستخدمة:' : 'Equations Used:'}</p>
                            <div className="space-y-1 text-[10px] font-mono">
                              <div>{lang === 'ar' ? 'الموقع التالي:' : 'Next Position:'}</div>
                              <div className="text-center">x(t + dt) = x(t) + vx(t) * dt</div>
                              <div className="text-center">y(t + dt) = y(t) + vy(t) * dt</div>
                              <div className="mt-1">{lang === 'ar' ? 'السرعة التالية:' : 'Next Velocity:'}</div>
                              <div className="text-center">vx(t + dt) = vx(t) + ax(t) * dt</div>
                              <div className="text-center">vy(t + dt) = vy(t) + ay(t) * dt</div>
                              <div className="mt-1">{lang === 'ar' ? 'التسارع:' : 'Acceleration:'}</div>
                              <div className="text-center">ax = -k * vx(t) / m</div>
                              <div className="text-center">ay = -g - k * vy(t) / m</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="font-medium text-muted-foreground">{lang === 'ar' ? 'الدقة:' : 'Accuracy:'}</span>
                              <span className="text-foreground mr-1">~90%</span>
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">{lang === 'ar' ? 'السرعة:' : 'Speed:'}</span>
                              <span className="text-foreground mr-1">⚡⚡⚡</span>
                            </div>
                          </div>
                        </div>

                        {/* RK4 Method */}
                        <div className="border border-border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <h4 className="text-sm font-semibold text-foreground">RK4</h4>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">📐 {lang === 'ar' ? 'دقة عالية' : 'High Accuracy'}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {lang === 'ar' 
                              ? 'طريقة رونج-كوتا من الرتبة الرابعة. توازن ممتاز بين الدقة والسرعة. الخيار الأكثر شيوعاً.'
                              : 'Fourth-order Runge-Kutta method. Excellent balance between accuracy and speed. Most common choice.'}
                          </p>
                          <div className="bg-secondary/30 rounded p-2 mb-2">
                            <p className="text-xs font-medium text-foreground mb-1">{lang === 'ar' ? 'المعادلات المستخدمة:' : 'Equations Used:'}</p>
                            <div className="space-y-1 text-[10px] font-mono">
                              <div>{lang === 'ar' ? 'حساب المشتقات الأربع:' : 'Four Derivatives Calculation:'}</div>
                              <div className="text-center">k1 = f(t, y)</div>
                              <div className="text-center">k2 = f(t + dt/2, y + k1*dt/2)</div>
                              <div className="text-center">k3 = f(t + dt/2, y + k2*dt/2)</div>
                              <div className="text-center">k4 = f(t + dt, y + k3*dt)</div>
                              <div className="mt-1">{lang === 'ar' ? 'تحديث الموقع:' : 'Position Update:'}</div>
                              <div className="text-center">y(t + dt) = y(t) + (k1 + 2*k2 + 2*k3 + k4) * dt/6</div>
                              <div className="mt-1">{lang === 'ar' ? 'للمقذوف:' : 'For Projectile:'}</div>
                              <div className="text-center">x(t+dt) = x(t) + (vx1 + 2*vx2 + 2*vx3 + vx4) * dt/6</div>
                              <div className="text-center">y(t+dt) = y(t) + (vy1 + 2*vy2 + 2*vy3 + vy4) * dt/6</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="font-medium text-muted-foreground">{lang === 'ar' ? 'الدقة:' : 'Accuracy:'}</span>
                              <span className="text-foreground mr-1">~98%</span>
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">{lang === 'ar' ? 'السرعة:' : 'Speed:'}</span>
                              <span className="text-foreground mr-1">⚡⚡</span>
                            </div>
                          </div>
                        </div>

                        {/* AI APAS Method */}
                        <div className="border border-border rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                            <h4 className="text-sm font-semibold text-foreground">AI APAS</h4>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">🤖 {lang === 'ar' ? 'ذكاء اصطناعي' : 'AI Powered'}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {lang === 'ar' 
                              ? 'طريقة متقدمة مدعومة بالذكاء الاصطناعي. أعلى دقة ممكنة مع تحسينات ذكية للأداء.'
                              : 'Advanced AI-powered method. Highest possible accuracy with intelligent performance optimizations.'}
                          </p>
                          <div className="bg-secondary/30 rounded p-2 mb-2">
                            <p className="text-xs font-medium text-foreground mb-1">{lang === 'ar' ? 'المعادلات المستخدمة:' : 'Equations Used:'}</p>
                            <div className="space-y-1 text-[10px] font-mono">
                              <div>{lang === 'ar' ? 'تكامل تكيفي ذكي:' : 'Adaptive Intelligent Integration:'}</div>
                              <div className="text-center">dt_adaptive = AI_analyze_trajectory_complexity()</div>
                              <div className="text-center">error_correction = ML_predict_next_error()</div>
                              <div className="mt-1">{lang === 'ar' ? 'معادلات المقذوف المحسنة:' : 'Enhanced Projectile Equations:'}</div>
                              <div className="text-center">x(t+dt) = x(t) + vx(t)*dt + 0.5*ax(t)*dt^2 + AI_correction</div>
                              <div className="text-center">y(t+dt) = y(t) + vy(t)*dt + 0.5*ay(t)*dt^2 + AI_optimization</div>
                              <div className="mt-1">{lang === 'ar' ? 'مقاومة الهواء الذكية:' : 'Intelligent Air Resistance:'}</div>
                              <div className="text-center">F_drag = AI_optimize_drag_coefficient(v, rho, Cd)</div>
                              <div className="text-center">v_terminal = ML_calculate_terminal_velocity()</div>
                              <div className="mt-1">{lang === 'ar' ? 'تصحيح الأخطاء:' : 'Error Correction:'}</div>
                              <div className="text-center">error = compare_with_analytical_solution()</div>
                              <div className="text-center">correction = neural_network_predict(error)</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="font-medium text-muted-foreground">{lang === 'ar' ? 'الدقة:' : 'Accuracy:'}</span>
                              <span className="text-foreground mr-1">~99.7%</span>
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">{lang === 'ar' ? 'السرعة:' : 'Speed:'}</span>
                              <span className="text-foreground mr-1">⚡</span>
                            </div>
                          </div>
                        </div>

                        {/* Comparison Table */}
                        <div className="mt-4">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-right py-2">{lang === 'ar' ? 'الطريقة' : 'Method'}</th>
                                <th className="text-center py-2">{lang === 'ar' ? 'الدقة' : 'Accuracy'}</th>
                                <th className="text-center py-2">{lang === 'ar' ? 'السرعة' : 'Speed'}</th>
                                <th className="text-center py-2">{lang === 'ar' ? 'الاستخدام' : 'Use Case'}</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-border/50">
                                <td className="py-2 font-medium">Euler</td>
                                <td className="text-center">90%</td>
                                <td className="text-center">⚡⚡⚡</td>
                                <td className="text-center text-xs">{lang === 'ar' ? 'تعليمي' : 'Educational'}</td>
                              </tr>
                              <tr className="border-b border-border/50">
                                <td className="py-2 font-medium">RK4</td>
                                <td className="text-center">98%</td>
                                <td className="text-center">⚡⚡</td>
                                <td className="text-center text-xs">{lang === 'ar' ? 'عام' : 'General'}</td>
                              </tr>
                              <tr>
                                <td className="py-2 font-medium">AI APAS</td>
                                <td className="text-center">99.7%</td>
                                <td className="text-center">⚡</td>
                                <td className="text-center text-xs">{lang === 'ar' ? 'بحثي' : 'Research'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </CollapsibleSection>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* ═══ 3. قسم التحليلات والأخطاء ═══ */}
              <Collapsible defaultOpen={false} className="border border-border/50 rounded-xl bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 overflow-hidden">
                <CollapsibleTrigger 
                  onClick={() => playSectionToggle(sim.isMuted)}
                  className="flex items-center justify-between w-full px-4 py-3.5 cursor-pointer hover:bg-primary/5 transition-all duration-300"
                >
                  <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                    🔍 {lang === 'ar' ? 'قسم التحليلات والأخطاء' : 'Analysis & Errors'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-300 [[data-state=open]>&]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="border-t border-border/30">
                  <div className="p-4 space-y-4">
                    {/* تحليل الأخطاء والقياسات */}
                    <CollapsibleSection 
                      title={lang === 'ar' ? '📊 تحليل الأخطاء والقياسات' : '📊 Error Analysis & Measurements'} 
                      icon="📉" 
                      open={showErrorsSection} 
                      toggle={() => setShowErrorsSection(!showErrorsSection)}
                      miniPreview={(() => {
                        const avgErr = ((sim.prediction.rangeError + sim.prediction.maxHeightError + sim.prediction.timeError) / 3);
                        const acc = Math.max(0, 100 - avgErr);
                        return (
                          <>
                            <span className={`px-1.5 py-0.5 rounded ${
                              acc >= 95 ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                              acc >= 85 ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                              'bg-red-500/10 text-red-600 dark:text-red-400'
                            }`}>
                              {lang === 'ar' ? 'الدقة' : 'Acc'} {acc.toFixed(1)}%
                            </span>
                            <span className="inline-flex items-center gap-0.5">
                              <span className="w-8 h-1.5 rounded-full bg-muted overflow-hidden inline-block">
                                <span className={`block h-full rounded-full ${
                                  acc >= 95 ? 'bg-green-500' : acc >= 85 ? 'bg-yellow-500' : 'bg-red-500'
                                }`} style={{ width: `${acc}%` }} />
                              </span>
                            </span>
                          </>
                        );
                      })()}
                    >
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <p className="text-xs font-medium text-muted-foreground">{lang === 'ar' ? 'نظري / محاكاة' : 'Theoretical / Simulated'}</p>
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
                                  <div className="bg-background rounded p-1.5 text-center">
                                    <p className="text-muted-foreground">{T.theoryLabel}</p>
                                    <p className="font-mono font-semibold text-foreground">{theo.toFixed(3)}</p>
                                  </div>
                                  <div className="bg-background rounded p-1.5 text-center">
                                    <p className="text-muted-foreground">{T.theoryExp}</p>
                                    <p className="font-mono font-semibold text-foreground">{exp.toFixed(3)}</p>
                                  </div>
                                  <div className="bg-background rounded p-1.5 text-center">
                                    <p className="text-muted-foreground">{T.theoryErrPct}</p>
                                    <p className="font-mono font-semibold text-foreground">{err.toFixed(2)}%</p>
                                  </div>
                                </div>
                                <div className="mt-1.5 text-[9px] text-muted-foreground">|Δ| = {absErr.toFixed(4)} — {accuracy}</div>
                              </div>
                            );
                          })}
                        </div>
                        <ExperimentalInput lang={lang} prediction={sim.prediction} onAnalyzed={(has) => setHasExperimentalData(has)} />
                      </div>
                    </CollapsibleSection>

                    {/* تحليل الطاقة */}
                    <Suspense fallback={null}>
                      <EnergyAnalysis
                        lang={lang}
                        trajectoryData={sim.trajectoryData}
                        currentTime={sim.currentTime}
                        mass={sim.mass}
                        airResistance={sim.airResistance}
                        gravity={sim.gravity}
                        velocity={sim.velocity}
                        angle={sim.angle}
                        height={sim.height}
                      />
                    </Suspense>

                    {/* تحليل مونت كارلو */}
                    <Suspense fallback={null}>
                      <MonteCarloPanel
                        lang={lang}
                        muted={sim.isMuted}
                        velocity={sim.velocity}
                        angle={sim.angle}
                        height={sim.height}
                        gravity={sim.gravity}
                        airResistance={sim.airResistance}
                        mass={sim.mass}
                      />
                    </Suspense>

                    {/* نظام السمعة والدقة */}
                    <Suspense fallback={null}>
                      <CrowdsourcedAccuracy
                        lang={lang}
                        velocity={sim.velocity}
                        angle={sim.angle}
                        height={sim.height}
                        gravity={sim.gravity}
                        airResistance={sim.airResistance}
                        mass={sim.mass}
                        prediction={sim.prediction}
                        muted={sim.isMuted}
                      />
                    </Suspense>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* ═══ 4. قسم الذكاء الاصطناعي ═══ */}
              {sim.aiModels && (
              <Collapsible defaultOpen={false} className="border border-border/50 rounded-xl bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 overflow-hidden">
                <CollapsibleTrigger 
                  onClick={() => playSectionToggle(sim.isMuted)}
                  className="flex items-center justify-between w-full px-4 py-3.5 cursor-pointer hover:bg-primary/5 transition-all duration-300"
                >
                  <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                    🧠 {lang === 'ar' ? 'قسم الذكاء الاصطناعي' : 'Artificial Intelligence'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-300 [[data-state=open]>&]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="border-t border-border/30">
                  <div className="p-4 space-y-4">
                    {/* النماذج المستخدمة للتنبؤ */}
                    <CollapsibleSection title={lang === 'ar' ? '🎯 النماذج المستخدمة للتنبؤ' : '🎯 Prediction Models'} icon="🎯" open={showAIMetrics} toggle={() => setShowAIMetrics(!showAIMetrics)}
                      miniPreview={
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          {Object.keys(sim.aiModels!).length} {lang === 'ar' ? 'نماذج' : 'models'}
                        </span>
                      }
                    >
                      <div className="overflow-x-auto">
                        <table className="academic-table">
                          <thead>
                            <tr>
                              <th>{T.metricsModel}</th>
                              <th>{T.metricsR2}</th>
                              <th>{T.metricsMAE}</th>
                              <th>{T.metricsRMSE}</th>
                              <th>{T.metricsRating}</th>
                            </tr>
                          </thead>
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
                                  <td>
                                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-secondary border border-border" style={{ color: rating.color }}>
                                      {rating.label}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CollapsibleSection>

                    {/* الذكاء الاصطناعي التفسيري */}
                    <Suspense fallback={null}>
                      <ExplainableAI
                        lang={lang}
                        trajectoryData={sim.trajectoryData}
                        velocity={sim.velocity}
                        angle={sim.angle}
                        gravity={sim.gravity}
                        airResistance={sim.airResistance}
                        mass={sim.mass}
                        muted={sim.isMuted}
                      />
                    </Suspense>
                  </div>
                </CollapsibleContent>
              </Collapsible>
              )}

              {/* ═══ 5. قسم التقنيات المساعدة ═══ */}
              <Collapsible defaultOpen={false} className="border border-border/50 rounded-xl bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 overflow-hidden">
                <CollapsibleTrigger 
                  onClick={() => playSectionToggle(sim.isMuted)}
                  className="flex items-center justify-between w-full px-4 py-3.5 cursor-pointer hover:bg-primary/5 transition-all duration-300"
                >
                  <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                    🛠️ {lang === 'ar' ? 'قسم التقنيات المساعدة' : 'Supporting Technologies'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-300 [[data-state=open]>&]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="border-t border-border/30">
                  <div className="p-4 space-y-4">
                    {/* أداة تصفية الضوضاء */}
                    <button
                      onClick={() => setShowNoiseFilter(true)}
                      className="w-full text-xs font-medium py-3 px-4 rounded-xl flex items-center gap-3 text-foreground hover:bg-primary/10 border border-border/50 hover:border-primary/20 transition-all duration-300 bg-card/60 backdrop-blur-sm"
                    >
                      <Filter className="w-5 h-5 text-primary" />
                      <div className="text-left rtl:text-right">
                        <div className="font-semibold">{lang === 'ar' ? 'تصفية الضوضاء' : 'Noise Filtering'}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {lang === 'ar' ? 'Kalman / متوسط متحرك لتنعيم البيانات' : 'Kalman / Moving Average smoothing'}
                        </div>
                      </div>
                    </button>
                    {/* مختبر المستشعرات */}
                    <SensorLab
                      lang={lang}
                      muted={sim.isMuted}
                    />

                    {/* الاستدامة والوصول الشامل */}
                    <Suspense fallback={null}>
                      <AccessibilitySonification
                        lang={lang}
                        trajectoryData={sim.trajectoryData}
                        muted={sim.isMuted}
                      />
                    </Suspense>

                    <Suspense fallback={null}>
                      <DevOpsTesting
                        lang={lang}
                        velocity={sim.velocity}
                        angle={sim.angle}
                        height={sim.height}
                        gravity={sim.gravity}
                        airResistance={sim.airResistance}
                        mass={sim.mass}
                        prediction={sim.prediction}
                        muted={sim.isMuted}
                      />
                    </Suspense>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              </>}

              {/* Footer */}
              <div className="text-center py-8 border-t border-border/30 mt-6 space-y-3">
                <p className="text-xs text-muted-foreground font-medium">{T.footerDev}</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-xs font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{T.footerName1}</span>
                  <span className="text-xs text-primary/40">·</span>
                  <span className="text-xs font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{T.footerName2}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{T.footerSchool}</p>
                <p className="text-[10px] font-mono text-muted-foreground/60 mt-2">v1.1 — 2025/2026</p>
                <div className="flex flex-col items-center mt-3">
                  <FooterRobot />
                </div>
              </div>
            </div>

            {/* ═══ RIGHT — APAS Vision & Presets ═══ */}
            <aside data-tour="right-panel" className={`space-y-3 sm:space-y-4 order-3 lg:sticky lg:top-16 lg:self-start lg:pt-2${isFocusMode ? ' hidden' : ''}`}>
              {/* Integration Methods - Simple Version */}
              <div className="border border-border/50 rounded-xl p-4 bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-tight mb-3 flex items-center gap-2">
                  {lang === 'ar' ? 'طريقة التكامل' : 'Integration Method'}
                </h3>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'euler' as const, name: lang === 'ar' ? 'أويلر' : 'Euler', color: 'from-chart-2 to-chart-2/70' },
                    { id: 'rk4' as const, name: 'RK4', color: 'from-chart-3 to-chart-3/70' },
                    { id: 'ai-apas' as const, name: lang === 'ar' ? 'ذكاء APAS' : 'AI APAS', color: 'from-primary to-primary/70' }
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => {
                        sim.setSelectedIntegrationMethod(method.id);
                        playClick(sim.isMuted);
                      }}
                      className={`px-2 py-2 text-[10px] rounded-lg transition-all duration-300 font-medium ${
                        sim.selectedIntegrationMethod === method.id
                          ? `bg-gradient-to-r ${method.color} text-white shadow-md border border-transparent`
                          : 'bg-secondary/50 hover:bg-primary/10 text-foreground border border-border/50 hover:border-primary/20'
                      }`}
                    >
                      {method.name}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-muted-foreground text-center mt-2.5">
                  {sim.selectedIntegrationMethod === 'ai-apas' 
                    ? (lang === 'ar' ? '🤖 دقة فائقة 99.7%' : '🤖 Ultra-accurate 99.7%')
                    : sim.selectedIntegrationMethod === 'rk4'
                    ? (lang === 'ar' ? '📐 دقة عالية 98%' : '📐 High accuracy 98%')
                    : (lang === 'ar' ? '⚡ سريع 90%' : '⚡ Fast 90%')
                  }
                </p>
              </div>

              {/* APAS Vision */}
              <div className="border border-border/50 rounded-xl p-4 space-y-3 bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 relative">
                {!canAccessRestrictedFeature && (
                  <div className="absolute inset-0 z-10 rounded-xl bg-background/80 backdrop-blur-sm flex items-center justify-center cursor-pointer" onClick={() => setShowRestrictionOverlay('Smart Vision')}>
                    <p className="text-xs text-muted-foreground text-center px-4 font-medium">
                      {isGuest ? (lang === 'ar' ? 'وضع الضيف - سجل للوصول' : 'Guest mode - Register to access') : (lang === 'ar' ? 'في انتظار موافقة المطور' : 'Awaiting developer approval')}
                    </p>
                  </div>
                )}
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-tight mb-2 flex items-center gap-2">
                  {lang === 'ar' ? 'الرؤية الذكية' : 'Smart Vision'}
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                  </span>
                </h3>
                <ApasVisionButton
                  lang={lang}
                  onUpdateParams={(p) => {
                    if (p.velocity !== undefined) sim.setVelocity(p.velocity);
                    if (p.angle !== undefined) sim.setAngle(p.angle);
                    if (p.height !== undefined) sim.setHeight(p.height);
                    if (p.mass !== undefined) sim.setMass(p.mass);
                    // Auto-switch projectile emoji based on detected object type
                    const detectedEmoji = objectTypeToEmoji(p.objectType);
                    if (detectedEmoji) setActivePresetEmoji(detectedEmoji);
                    playClick(sim.isMuted);
                  }}
                />
                <ApasVideoButton
                  lang={lang}
                  onUpdateParams={(p) => {
                    if (p.velocity !== undefined) sim.setVelocity(p.velocity);
                    if (p.angle !== undefined) sim.setAngle(p.angle);
                    if (p.height !== undefined) sim.setHeight(p.height);
                    if (p.mass !== undefined) sim.setMass(p.mass);
                    // Auto-switch projectile emoji based on detected object type
                    const detectedEmoji = objectTypeToEmoji(p.objectType);
                    if (detectedEmoji) setActivePresetEmoji(detectedEmoji);
                    playClick(sim.isMuted);
                  }}
                />
                <ApasSubjectReading
                  lang={lang}
                  onUpdateParams={(p) => {
                    if (p.velocity !== undefined) sim.setVelocity(p.velocity);
                    if (p.angle !== undefined) sim.setAngle(p.angle);
                    if (p.height !== undefined) sim.setHeight(p.height);
                    if (p.mass !== undefined) sim.setMass(p.mass);
                    playClick(sim.isMuted);
                  }}
                />
                <ApasVoiceButton
                  lang={lang}
                  onUpdateParams={(p) => {
                    if (p.velocity !== undefined) sim.setVelocity(p.velocity);
                    if (p.angle !== undefined) sim.setAngle(p.angle);
                    if (p.height !== undefined) sim.setHeight(p.height);
                    if (p.mass !== undefined) sim.setMass(p.mass);
                    if (p.gravity !== undefined) sim.setGravity(p.gravity);
                    playClick(sim.isMuted);
                  }}
                  simulationContext={{
                    velocity: sim.velocity,
                    angle: sim.angle,
                    height: sim.height,
                    gravity: sim.gravity,
                    airResistance: sim.airResistance,
                    mass: sim.mass,
                  }}
                />
              </div>

              {/* Presets / Scenarios */}
              <Collapsible defaultOpen={false} className="border border-border/50 rounded-xl bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5">
                <CollapsibleTrigger 
                  onClick={() => playSectionToggle(sim.isMuted)}
                  className="flex items-center justify-between w-full p-3 sm:p-4 cursor-pointer hover:bg-primary/5 transition-all duration-300"
                >
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-tight flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    {lang === 'ar' ? 'السيناريوهات الجانبية' : 'Side Scenarios'}
                  </h3>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground transition-transform duration-300 [[data-state=open]>&]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                  <div className="grid grid-cols-3 sm:grid-cols-2 gap-1.5">
                    {PRESETS.map((p) => (
                      <button key={p.name} onClick={() => loadPreset(p)}
                        className="text-xs font-medium text-foreground py-2.5 px-2 rounded-lg hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all duration-300 text-center hover:-translate-y-0.5">
                        {lang === 'ar' ? p.name : p.nameEn}
                      </button>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>


              {/* ── Session Manager ── */}
              <Suspense fallback={null}>
                <SessionManager
                  lang={lang}
                  muted={sim.isMuted}
                  velocity={sim.velocity}
                  angle={sim.angle}
                  height={sim.height}
                  gravity={sim.gravity}
                  airResistance={sim.airResistance}
                  mass={sim.mass}
                  windSpeed={sim.windSpeed}
                  environmentId={currentEnvId}
                  nightMode={sim.nightMode}
                  integrationMethod={sim.selectedIntegrationMethod}
                  enableBounce={sim.enableBounce}
                  bounceCoefficient={sim.bounceCoefficient}
                  onLoad={handleSessionLoad}
                />
              </Suspense>

              {/* ── Advanced Features ── */}
              <Suspense fallback={null}>
                <LensDistortionCorrection lang={lang} muted={sim.isMuted} />
              </Suspense>


              {/* ── Share Simulation — small buttons at very bottom ── */}
              <div className="mt-4 pt-3 border-t border-border/30">
                <ShareSimulation
                  lang={lang}
                  muted={sim.isMuted}
                  velocity={sim.velocity}
                  angle={sim.angle}
                  height={sim.height}
                  gravity={sim.gravity}
                  airResistance={sim.airResistance}
                  mass={sim.mass}
                  windSpeed={sim.windSpeed}
                  environmentId={currentEnvId}
                  nightMode={sim.nightMode}
                  integrationMethod={sim.selectedIntegrationMethod}
                />
              </div>

            </aside>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <OnboardingTutorial lang={lang} open={showOnboarding} onClose={() => setShowOnboarding(false)} />
      </Suspense>

      {/* Idle Physics Tips */}
      <Suspense fallback={null}>
        <IdlePhysicsTips lang={lang} />
      </Suspense>

      <EnvironmentSelector
        open={showEnvSelector}
        onClose={() => setShowEnvSelector(false)}
        lang={lang}
        currentEnvId={currentEnvId}
        onSelect={handleEnvironmentSelect}
      />

      <Suspense fallback={null}>
        <DocumentationModal
          open={showDocumentation}
          onClose={() => setShowDocumentation(false)}
          lang={lang}
        />
      </Suspense>

      <Suspense fallback={null}>
        <StroboscopicModal
          open={showStroboscopicModal}
          onClose={() => setShowStroboscopicModal(false)}
          lang={lang}
          settings={stroboscopicSettings}
          onSettingsChange={setStroboscopicSettings}
          marks={stroboscopicMarks}
          gravity={sim.gravity}
          isSimulationDone={!!isFinished || sim.isAnimating}
        />
      </Suspense>

      <Suspense fallback={null}>
        <MultiSimulationModal
        open={showMultiSimModal}
        onClose={() => setShowMultiSimModal(false)}
        lang={lang}
        velocity={sim.velocity}
        angle={sim.angle}
        height={sim.height}
        gravity={sim.gravity}
        airResistance={sim.airResistance}
        mass={sim.mass}
        windSpeed={sim.windSpeed}
        enableBounce={sim.enableBounce}
        bounceCoefficient={sim.bounceCoefficient}
        selectedIntegrationMethod={sim.selectedIntegrationMethod}
        hasExperimentalData={hasExperimentalData}
        trajectoryData={sim.trajectoryData}
      />
      </Suspense>

      {/* ── Unified Settings Panel ── */}
      <SettingsPanel
        open={showSettingsPanel}
        onClose={() => setShowSettingsPanel(false)}
        lang={lang}
        onSwitchLanguage={switchLanguage}
        isMuted={sim.isMuted}
        onToggleMute={() => { sim.setIsMuted(!sim.isMuted); playToggle(sim.isMuted, sim.isMuted); }}
        nightMode={sim.nightMode}
        onToggleNightMode={() => { sim.setNightMode(!sim.nightMode); playToggle(sim.isMuted, !sim.nightMode); }}
        accentColor={accentColor}
        accentColors={ACCENT_COLORS}
        onAccentChange={(id) => setAccentColor(id)}
        onOpenGuide={() => setShowOnboarding(true)}
        onOpenDocumentation={() => setShowDocumentation(true)}
        onOpenCalculator={() => setShowCalculator(true)}
        onToggleRuler={() => setShowRuler(!showRuler)}
        rulerActive={showRuler}
        is3DMode={is3DMode}
        onToggleProtractor={() => setShowProtractor(!showProtractor)}
        protractorActive={showProtractor}
        onOpenNoiseFilter={() => setShowNoiseFilter(true)}
        onOpenLiveCalibration={() => setShowLiveCalibration(true)}
        onOpenSecurityPrivacy={() => setShowSecurityPrivacy(true)}
      />

      {/* ── Scientific Calculator (floating, draggable) ── */}
      <Suspense fallback={null}>
        <ScientificCalculator
          open={showCalculator}
          onClose={() => setShowCalculator(false)}
          lang={lang}
        />
      </Suspense>

      {/* ── Canvas Ruler (2D only, draggable) ── */}
      <Suspense fallback={null}>
        <CanvasRuler
          active={showRuler && !is3DMode}
          onClose={() => setShowRuler(false)}
          lang={lang}
        />
      </Suspense>

      {/* ── Canvas Protractor (2D only, draggable) ── */}
      <Suspense fallback={null}>
        <CanvasProtractor
          active={showProtractor && !is3DMode}
          onClose={() => setShowProtractor(false)}
          lang={lang}
        />
      </Suspense>

      {/* ── Noise Filter Modal ── */}
      <Suspense fallback={null}>
        <NoiseFilter
          open={showNoiseFilter}
          onClose={() => setShowNoiseFilter(false)}
          lang={lang}
          trajectoryData={sim.trajectoryData}
          onApplyFiltered={(filtered) => {
            sim.setTrajectoryData(filtered);
            setShowNoiseFilter(false);
          }}
        />
      </Suspense>

      {/* ── Live Calibration Overlay ── */}
      <Suspense fallback={null}>
        <LiveCalibration
          open={showLiveCalibration}
          onClose={() => setShowLiveCalibration(false)}
          lang={lang}
          onCalibrate={(ppm) => {
            setCalibrationScale(ppm);
            setShowLiveCalibration(false);
          }}
        />
      </Suspense>

      {/* ── Security & Privacy Panel ── */}
      <Suspense fallback={null}>
        <SecurityPrivacy
          open={showSecurityPrivacy}
          onClose={() => setShowSecurityPrivacy(false)}
          lang={lang}
          autoDeleteEnabled={autoDeleteVideos}
          onToggleAutoDelete={(enabled) => {
            setAutoDeleteVideos(enabled);
            try { localStorage.setItem('apas_autoDeleteVideos', String(enabled)); } catch { /* localStorage unavailable */ }
          }}
        />
      </Suspense>

      {/* ── Guest/Pending Restriction Overlay ── */}
      {showRestrictionOverlay && (
        <GuestRestrictionOverlay
          featureName={showRestrictionOverlay}
          lang={lang}
          onClose={() => setShowRestrictionOverlay(null)}
        />
      )}

      {/* ── Keyboard Shortcuts Help ── */}
      <KeyboardShortcutsHelp lang={lang} muted={sim.isMuted} />

      {/* ── Bug Report Button ── */}
      <BugReportButton lang={lang} />
    </PageTransition>
  );
};

export default Index;
