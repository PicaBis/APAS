import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useSimulation } from '@/hooks/useSimulation';
import { useAdvancedPhysics } from '@/hooks/useAdvancedPhysics';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAccentTheme } from './useAccentTheme';
import { useUnitConversion } from './useUnitConversion';
import { useUndoRedo } from './useUndoRedo';
import { useStroboscopicMarks } from './useStroboscopicMarks';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useLocalStorageSync } from './useLocalStorageSync';
import { useRelativity } from '@/hooks/useRelativity';
import { computeDualFrameTrajectory } from '@/utils/relativityPhysics';
import { decodeSimParams } from '@/components/apas/ShareSimulation';
import { objectTypeToEmoji } from '../constants';
import { toast } from 'sonner';
import { playClick, playNav, playToggle, playSnapshotSound, playSliderChange, playZoomSound, playModeSwitch, playSectionToggle, playUIClick } from '@/utils/sound';
import type { DetectedMediaData } from '@/components/apas/CalculationsSection';
import type { EquationTrajectoryPoint } from '@/components/apas/EquationEngine';
import type { StroboscopicSettings } from '@/components/apas/StroboscopicModal';
import type { VectorVisibility } from '@/components/apas/ForceVectorsSection';
import type { SessionData } from '@/components/apas/SessionManager';
import type { DualFrameTrajectory } from '@/utils/relativityPhysics';

const ACCENT_COLORS = [
  { id: 'navy', label: 'Navy', hsl: '230 45% 45%', ring: '42 55% 55%' },
  // ... more colors will be handled by useAccentTheme
];

export function useIndexState() {
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
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
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
  const [calibrationScale, setCalibrationScale] = useState<number | null>(null);
  const [lastAnalyzedMediaSrc, setLastAnalyzedMediaSrc] = useState<string | null>(null);
  const [lastAnalyzedMediaType, setLastAnalyzedMediaType] = useState<'video' | 'image'>('video');
  const [detectedMedia, setDetectedMedia] = useState<DetectedMediaData | null>(null);
  const [hasModelAnalysis, setHasModelAnalysis] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<Array<any>>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeHistoryEntryId, setActiveHistoryEntryId] = useState<number | null>(null);
  const [showVideoOverlay, setShowVideoOverlay] = useState(false);
  const [showDynamicDashboard, setShowDynamicDashboard] = useState(false);
  const [showTheoreticalComparison, setShowTheoreticalComparison] = useState(false);
  const [showComprehensiveGuide, setShowComprehensiveGuide] = useState(false);
  const [showComparisonSection, setShowComparisonSection] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [equationTrajectory, setEquationTrajectory] = useState<EquationTrajectoryPoint[] | null>(null);
  const [showRestrictionOverlay, setShowRestrictionOverlay] = useState<string | null>(null);
  const [dragCd, setDragCd] = useState(0.47);
  const [airDensity, setAirDensity] = useState(1.225);
  const [savedSnapshot, setSavedSnapshot] = useState<any>(null);
  const [methodChangePulse, setMethodChangePulse] = useState(false);
  const [vectorVisibility, setVectorVisibility] = useState<VectorVisibility>({
    V: true, Vx: true, Vy: true, Fg: true, Fd: true, Fw: false, Ffluid: false, Fnet: false, acc: false,
  });

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

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
  const relativity = useRelativity(lang);

  const dualTrajectory = useMemo<DualFrameTrajectory | null>(() => {
    if (!relativity.enabled || sim.trajectoryData.length === 0) return null;
    return computeDualFrameTrajectory(sim.trajectoryData, relativity.params, sim.mass);
  }, [relativity.enabled, relativity.params, sim.trajectoryData, sim.mass]);

  const relativitySPrimeTrajectory = dualTrajectory?.frameSPrime ?? null;

  // ── Mobile UI State ──
  const [mobileActiveTab, setMobileActiveTab] = useState<'home' | 'simulation' | 'analysis' | 'saved' | 'settings'>('simulation');
  const [showMobileBottomSheet, setShowMobileBottomSheet] = useState(false);
  const [showMobileAI, setShowMobileAI] = useState(false);
  const [mobileFullscreen, setMobileFullscreen] = useState(false);
  const [showMobileDisplayOptions, setShowMobileDisplayOptions] = useState(false);
  const [showMobileVision, setShowMobileVision] = useState(false);
  const [showMobileVideo, setShowMobileVideo] = useState(false);
  const [showMobileSubject, setShowMobileSubject] = useState(false);
  const [showMobileVoice, setShowMobileVoice] = useState(false);
  const [showMobilePhysicsParams, setShowMobilePhysicsParams] = useState(false);
  const [showMobileExportCompare, setShowMobileExportCompare] = useState(false);
  const [showMobileAnalyticsErrors, setShowMobileAnalyticsErrors] = useState(false);
  const [showMobileCalculationsModal, setShowMobileCalculationsModal] = useState(false);
  const [showMobileSensorLab, setShowMobileSensorLab] = useState(false);
  const [showMobileAccessibility, setShowMobileAccessibility] = useState(false);

  return {
    sim, advancedPhysics, T, lang, isRTL, isMobile,
    showSplash, setShowSplash, showOnboarding, setShowOnboarding, showWelcomeDialog, setShowWelcomeDialog,
    is3DMode, setIs3DMode, webglError, setWebglError, isLangTransitioning, setIsLangTransitioning,
    showIntegrationComparison, setShowIntegrationComparison, showAIMetrics, setShowAIMetrics,
    showPathInfo, setShowPathInfo, showChartSection, setShowChartSection, showCalculationsModal, setShowCalculationsModal,
    chartAxisX, setChartAxisX, chartAxisY, setChartAxisY, isFullscreen, setIsFullscreen,
    canvasZoom, setCanvasZoom, showLiveData, setShowLiveData, showErrorsSection, setShowErrorsSection,
    showPhysicsPanel, setShowPhysicsPanel, showDisplayOptions, setShowDisplayOptions,
    showMultiSimModal, setShowMultiSimModal, hasExperimentalData, setHasExperimentalData,
    showEnvSelector, setShowEnvSelector, showDocumentation, setShowDocumentation,
    showStroboscopicModal, setShowStroboscopicModal, stroboscopicSettings, setStroboscopicSettings,
    currentEnvId, setCurrentEnvId, activePresetEmoji, setActivePresetEmoji,
    showSettingsPanel, setShowSettingsPanel, showCalculator, setShowCalculator,
    showRuler, setShowRuler, showProtractor, setShowProtractor, showNoiseFilter, setShowNoiseFilter,
    showLiveCalibration, setShowLiveCalibration, showSecurityPrivacy, setShowSecurityPrivacy,
    calibrationScale, setCalibrationScale, lastAnalyzedMediaSrc, setLastAnalyzedMediaSrc,
    lastAnalyzedMediaType, setLastAnalyzedMediaType, detectedMedia, setDetectedMedia,
    hasModelAnalysis, setHasModelAnalysis, analysisHistory, setAnalysisHistory,
    showHistoryModal, setShowHistoryModal, activeHistoryEntryId, setActiveHistoryEntryId,
    showVideoOverlay, setShowVideoOverlay, showDynamicDashboard, setShowDynamicDashboard,
    showTheoreticalComparison, setShowTheoreticalComparison, showComprehensiveGuide, setShowComprehensiveGuide,
    showComparisonSection, setShowComparisonSection, isFocusMode, setIsFocusMode,
    showGrid, setShowGrid, equationTrajectory, setEquationTrajectory,
    showRestrictionOverlay, setShowRestrictionOverlay, dragCd, setDragCd,
    airDensity, setAirDensity, savedSnapshot, setSavedSnapshot,
    methodChangePulse, setMethodChangePulse, vectorVisibility, setVectorVisibility,
    canvasContainerRef, theme3d, setTheme3d, autoDeleteVideos, setAutoDeleteVideos,
    accentColor, setAccentColor, ACCENT_COLORS,
    selectedUnits, setSelectedUnits, getDisplayValue, getUnitLabel, fromDisplayValue,
    undoParams, redoParams, stroboscopicMarks, relativity, dualTrajectory, relativitySPrimeTrajectory,
    mobileActiveTab, setMobileActiveTab, showMobileBottomSheet, setShowMobileBottomSheet,
    showMobileAI, setShowMobileAI, mobileFullscreen, setMobileFullscreen,
    showMobileDisplayOptions, setShowMobileDisplayOptions, showMobileVision, setShowMobileVision,
    showMobileVideo, setShowMobileVideo, showMobileSubject, setShowMobileSubject,
    showMobileVoice, setShowMobileVoice, showMobilePhysicsParams, setShowMobilePhysicsParams,
    showMobileExportCompare, setShowMobileExportCompare, showMobileAnalyticsErrors, setShowMobileAnalyticsErrors,
    showMobileCalculationsModal, setShowMobileCalculationsModal, showMobileSensorLab, setShowMobileSensorLab,
    showMobileAccessibility, setShowMobileAccessibility,
    playClick, playNav, playToggle, playSnapshotSound, playSliderChange, playZoomSound, playModeSwitch, playSectionToggle, playUIClick,
  };
}
