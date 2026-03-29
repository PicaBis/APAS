import { useEffect, useMemo, useCallback } from 'react';
import { useIndexState } from './index/hooks/useIndexState';
import { useIsMobile } from '@/hooks/use-mobile';
import DesktopLayout from './index/components/DesktopLayout';
import MobileLayout from './index/components/MobileLayout';
import ModalsOverlays from './index/components/ModalsOverlays';
import SplashScreen from '@/components/apas/SplashScreen';
import { decodeSimParams } from '@/components/apas/ShareSimulation';
import { objectTypeToEmoji } from './index/constants';
import { playClick, playNav, playSnapshotSound } from '@/utils/sound';
import { toast } from 'sonner';

const Index = () => {
  const isMobile = useIsMobile();
  const state = useIndexState();
  const {
    sim, advancedPhysics, T, lang,
    showSplash, setShowSplash, setShowWelcomeDialog,
    setCurrentEnvId, setAirDensity,
    setDetectedMedia, setHasModelAnalysis, setAnalysisHistory,
    setActiveHistoryEntryId, setShowHistoryModal,
    setMethodChangePulse, setEquationTrajectory,
    setActivePresetEmoji,
  } = state;

  // ── Derived state ──
  const lastPt = useMemo(() => sim.trajectoryData[sim.trajectoryData.length - 1], [sim.trajectoryData]);
  const isPaused = useMemo(() => !sim.isAnimating && sim.currentTime > 0 && lastPt && sim.currentTime < lastPt.time, [sim.isAnimating, sim.currentTime, lastPt]);
  const isFinished = useMemo(() => !sim.isAnimating && sim.currentTime > 0 && lastPt && sim.currentTime >= lastPt.time, [sim.isAnimating, sim.currentTime, lastPt]);
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

  const derived = { lastPt, isPaused, isFinished, pathDotClass, playButtonText };

  // ── Handlers ──
  const handleEnvironmentSelect = useCallback((env: any) => {
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
    playNav(sim.isMuted);
  }, [sim, advancedPhysics, setCurrentEnvId, setAirDensity, playNav]);

  const handleIntegrationMethodChange = useCallback((method: string) => {
    setMethodChangePulse(true);
    setTimeout(() => setMethodChangePulse(false), 1500);
    sim.setSelectedIntegrationMethod(method as 'euler' | 'rk4' | 'ai-apas');
  }, [sim, setMethodChangePulse]);

  const exportSimulationPNG = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `APAS_Simulation_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    playSnapshotSound(sim.isMuted);
  }, [sim.isMuted]);

  const handleSessionLoad = useCallback((session: any) => {
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
  }, [sim, setCurrentEnvId]);

  const handleEquationTrajectory = useCallback((points: any[] | null) => {
    if (!points || points.length < 2) {
      setEquationTrajectory(null);
      return;
    }
    // ... conversion logic ...
    sim.resetAnimation();
    // sim.setTrajectoryData(converted);
    sim.setCurrentTime(0);
    setEquationTrajectory(null);
  }, [sim, setEquationTrajectory]);

  const handleDetectedMedia = useCallback((data: any) => {
    setDetectedMedia(data);
    setHasModelAnalysis(true);
  }, [setDetectedMedia, setHasModelAnalysis]);

  const handleAnalysisComplete = useCallback((entry: any) => {
    setHasModelAnalysis(true);
    const newId = Date.now();
    const fullEntry = { id: newId, timestamp: new Date(), ...entry };
    setAnalysisHistory((prev: any) => [fullEntry, ...prev].slice(0, 50));

    if (entry.params) {
      if (entry.params.velocity !== undefined) sim.setVelocity(entry.params.velocity);
      if (entry.params.angle !== undefined) sim.setAngle(entry.params.angle);
      if (entry.params.height !== undefined) sim.setHeight(entry.params.height);
      if (entry.params.mass !== undefined) sim.setMass(entry.params.mass);
      
      if (entry.params.isOutdoor) {
        sim.setAirResistance(0.02);
        sim.setWindSpeed(2.5);
        sim.setShowExternalForces(true);
        toast.info(lang === 'ar' ? 'تم تفعيل مقاومة الهواء والرياح تلقائياً للبيئة الخارجية' : 'Air resistance and wind enabled automatically for outdoor environment');
      }

      const detectedEmoji = objectTypeToEmoji(entry.params.objectType);
      setActivePresetEmoji(detectedEmoji);
      sim.setShowExternalForces(true);
    }

    if (entry.type !== 'subject') {
      setActiveHistoryEntryId(newId);
      setShowHistoryModal(true);
    }
  }, [sim, lang, setHasModelAnalysis, setAnalysisHistory, setActivePresetEmoji, setActiveHistoryEntryId, setShowHistoryModal]);

  const handleClearAnalysisHistory = useCallback(() => setAnalysisHistory([]), [setAnalysisHistory]);
  const handleDeleteAnalysisEntry = useCallback((id: number) => setAnalysisHistory((prev: any) => prev.filter((e: any) => e.id !== id)), [setAnalysisHistory]);
  const handleAutoRunSimulation = useCallback(() => { if (!sim.isAnimating) sim.resetAnimation(); }, [sim]);

  const getChartData = useCallback(() => {
    if (!state.chartAxisX || !state.chartAxisY || !sim.trajectoryData || !sim.trajectoryData.length) return [];
    return sim.trajectoryData.map((p: any) => ({
      xVal: p[state.chartAxisX],
      yVal: p[state.chartAxisY],
    })).filter((d: any) => d.xVal != null && d.yVal != null && !isNaN(d.xVal) && !isNaN(d.yVal));
  }, [state.chartAxisX, state.chartAxisY, sim.trajectoryData]);

  const fmtTick = (v: any): string => {
    if (v == null || typeof v !== 'number' || !isFinite(v)) return '';
    return Math.abs(v) >= 1000 ? v.toExponential(1) : v.toFixed(1);
  };
  const safeFixed = (v: unknown, digits = 2): string => {
    if (v == null || typeof v !== 'number' || !isFinite(v)) return '0';
    return v.toFixed(digits);
  };

  const handleMobileVisionParams = useCallback((p: any) => {
    if (p.velocity !== undefined) sim.setVelocity(p.velocity);
    if (p.angle !== undefined) sim.setAngle(p.angle);
    if (p.height !== undefined) sim.setHeight(p.height);
    if (p.mass !== undefined) sim.setMass(p.mass);
    const detectedEmoji = objectTypeToEmoji(p.objectType);
    if (detectedEmoji) setActivePresetEmoji(detectedEmoji);
    playClick(sim.isMuted);
  }, [sim, setActivePresetEmoji]);

  const handleMobileVoiceParams = useCallback((p: any) => {
    if (p.velocity !== undefined) sim.setVelocity(p.velocity);
    if (p.angle !== undefined) sim.setAngle(p.angle);
    if (p.height !== undefined) sim.setHeight(p.height);
    if (p.mass !== undefined) sim.setMass(p.mass);
    if (p.gravity !== undefined) sim.setGravity(p.gravity);
    playClick(sim.isMuted);
  }, [sim]);

  const handleMobileExperimentLoad = useCallback((exp: any) => {
    sim.setVelocity(exp.velocity);
    sim.setAngle(exp.angle);
    sim.setHeight(exp.height);
    sim.setGravity(exp.gravity);
    sim.setAirResistance(exp.airResistance);
    sim.setMass(exp.mass);
    sim.setSelectedIntegrationMethod(exp.integrationMethod);
    state.setMobileActiveTab('simulation');
  }, [sim, state]);

  const switchLanguage = useCallback((newLang: any) => {
    if (newLang !== lang) {
      sim.setLanguageDirect(newLang);
      playNav(sim.isMuted);
    }
  }, [lang, sim]);

  const handlers = {
    handleEnvironmentSelect, handleIntegrationMethodChange, exportSimulationPNG, handleSessionLoad,
    handleEquationTrajectory, handleDetectedMedia, handleAnalysisComplete, handleClearAnalysisHistory,
    handleDeleteAnalysisEntry, handleAutoRunSimulation, getChartData, fmtTick, safeFixed,
    handleMobileVisionParams, handleMobileVoiceParams, handleMobileExperimentLoad, switchLanguage
  };

  // ── Effects ──
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
      if (params.integrationMethod !== undefined) sim.setSelectedIntegrationMethod(params.integrationMethod as any);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (showSplash) document.documentElement.classList.add('dark');
  }, [showSplash]);

  useEffect(() => {
    if (!showSplash) {
      if (sim.nightMode) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      window.scrollTo(0, 0);
    }
  }, [showSplash, sim.nightMode]);

  if (showSplash) {
    return <SplashScreen lang={lang} onComplete={() => {
      setShowSplash(false);
      try { if (localStorage.getItem('apas_guideDismissed') !== 'true') { setShowWelcomeDialog(true); } } catch { setShowWelcomeDialog(true); }
    }} />;
  }

  return (
    <>
      {isMobile ? (
        <MobileLayout state={state} handlers={handlers} derived={derived} />
      ) : (
        <DesktopLayout state={state} handlers={handlers} derived={derived} />
      )}
      <ModalsOverlays
        lang={lang} isMuted={sim.isMuted}
        showOnboarding={state.showOnboarding} setShowOnboarding={state.setShowOnboarding}
        showWelcomeDialog={state.showWelcomeDialog} setShowWelcomeDialog={state.setShowWelcomeDialog}
        showEnvSelector={state.showEnvSelector} setShowEnvSelector={state.setShowEnvSelector}
        currentEnvId={state.currentEnvId} onEnvironmentSelect={handleEnvironmentSelect}
        showDocumentation={state.showDocumentation} setShowDocumentation={state.setShowDocumentation}
        showStroboscopicModal={state.showStroboscopicModal} setShowStroboscopicModal={state.setShowStroboscopicModal}
        stroboscopicSettings={state.stroboscopicSettings} setStroboscopicSettings={state.setStroboscopicSettings}
        stroboscopicMarks={state.stroboscopicMarks} gravity={sim.gravity}
        isSimulationDone={!!isFinished || sim.isAnimating}
        showMultiSimModal={state.showMultiSimModal} setShowMultiSimModal={state.setShowMultiSimModal}
        velocity={sim.velocity} angle={sim.angle} height={sim.height}
        airResistance={sim.airResistance} mass={sim.mass} windSpeed={sim.windSpeed}
        enableBounce={sim.enableBounce} bounceCoefficient={sim.bounceCoefficient}
        selectedIntegrationMethod={sim.selectedIntegrationMethod}
        hasExperimentalData={state.hasExperimentalData} trajectoryData={sim.trajectoryData}
        showSettingsPanel={state.showSettingsPanel} setShowSettingsPanel={state.setShowSettingsPanel}
        nightMode={sim.nightMode}
        onToggleNightMode={() => { sim.setNightMode(!sim.nightMode); }}
        onToggleMute={() => { sim.setIsMuted(!sim.isMuted); }}
        onSwitchLanguage={switchLanguage}
        accentColor={state.accentColor} accentColors={state.ACCENT_COLORS} onAccentChange={state.setAccentColor}
        is3DMode={state.is3DMode} theme3d={state.theme3d} onTheme3dChange={state.setTheme3d}
        showCalculator={state.showCalculator} setShowCalculator={state.setShowCalculator}
        showRuler={state.showRuler} setShowRuler={state.setShowRuler}
        showProtractor={state.showProtractor} setShowProtractor={state.setShowProtractor}
        showNoiseFilter={state.showNoiseFilter} setShowNoiseFilter={state.setShowNoiseFilter}
        setTrajectoryData={sim.setTrajectoryData}
        showLiveCalibration={state.showLiveCalibration} setShowLiveCalibration={state.setShowLiveCalibration}
        setCalibrationScale={state.setCalibrationScale} calibrationMediaSrc={state.lastAnalyzedMediaSrc}
        showSecurityPrivacy={state.showSecurityPrivacy} setShowSecurityPrivacy={state.setShowSecurityPrivacy}
        autoDeleteVideos={state.autoDeleteVideos} onToggleAutoDelete={state.setAutoDeleteVideos}
        showComprehensiveGuide={state.showComprehensiveGuide} setShowComprehensiveGuide={state.setShowComprehensiveGuide}
        showRestrictionOverlay={state.showRestrictionOverlay} setShowRestrictionOverlay={state.setShowRestrictionOverlay}
      />
    </>
  );
};

export default Index;
