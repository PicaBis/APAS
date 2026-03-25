import React, { Suspense, lazy } from 'react';
import type { StroboscopicSettings, StroboscopicMark } from '@/components/apas/StroboscopicModal';
import type { TrajectoryPoint } from '@/utils/physics';
import type { AccentColor } from '../hooks/useAccentTheme';
import EnvironmentSelector, { type Environment } from '@/components/apas/EnvironmentSelector';
import SettingsPanel from '@/components/apas/SettingsPanel';
import GuestRestrictionOverlay from '@/components/auth/GuestRestrictionOverlay';
import KeyboardShortcutsHelp from '@/components/apas/KeyboardShortcutsHelp';
import BugReportButton from '@/components/apas/BugReportButton';

const OnboardingTutorial = lazy(() => import('@/components/apas/OnboardingTutorial'));
// IdlePhysicsTips moved to footer in Index.tsx
const DocumentationModal = lazy(() => import('@/components/apas/DocumentationModal'));
const StroboscopicModal = lazy(() => import('@/components/apas/StroboscopicModal'));
const MultiSimulationModal = lazy(() => import('@/components/apas/MultiSimulationModal'));
const ScientificCalculator = lazy(() => import('@/components/apas/ScientificCalculator'));
const CanvasRuler = lazy(() => import('@/components/apas/CanvasRuler'));
const CanvasProtractor = lazy(() => import('@/components/apas/CanvasProtractor'));
const NoiseFilter = lazy(() => import('@/components/apas/NoiseFilter'));
const LiveCalibration = lazy(() => import('@/components/apas/LiveCalibration'));
const SecurityPrivacy = lazy(() => import('@/components/apas/SecurityPrivacy'));
const ComprehensiveGuideModal = lazy(() => import('@/components/apas/ComprehensiveGuideModal'));

interface ModalsOverlaysProps {
  lang: string;
  isMuted: boolean;
  // Onboarding
  showOnboarding: boolean;
  setShowOnboarding: (v: boolean) => void;
  // Environment Selector
  showEnvSelector: boolean;
  setShowEnvSelector: (v: boolean) => void;
  currentEnvId: string;
  onEnvironmentSelect: (env: Environment) => void;
  // Documentation
  showDocumentation: boolean;
  setShowDocumentation: (v: boolean) => void;
  // Stroboscopic
  showStroboscopicModal: boolean;
  setShowStroboscopicModal: (v: boolean) => void;
  stroboscopicSettings: StroboscopicSettings;
  setStroboscopicSettings: (s: StroboscopicSettings) => void;
  stroboscopicMarks: StroboscopicMark[];
  gravity: number;
  isSimulationDone: boolean;
  // Multi Simulation
  showMultiSimModal: boolean;
  setShowMultiSimModal: (v: boolean) => void;
  velocity: number;
  angle: number;
  height: number;
  airResistance: number;
  mass: number;
  windSpeed: number;
  enableBounce: boolean;
  bounceCoefficient: number;
  selectedIntegrationMethod: string;
  hasExperimentalData: boolean;
  trajectoryData: TrajectoryPoint[];
  // Settings Panel
  showSettingsPanel: boolean;
  setShowSettingsPanel: (v: boolean) => void;
  nightMode: boolean;
  onToggleNightMode: () => void;
  onToggleMute: () => void;
  onSwitchLanguage: (lang: 'ar' | 'en' | 'fr') => void;
  accentColor: string;
  accentColors: AccentColor[];
  onAccentChange: (id: string) => void;
  is3DMode: boolean;
  theme3d: 'refined-lab' | 'academic-white' | 'technical-dark';
  onTheme3dChange: (id: 'refined-lab' | 'academic-white' | 'technical-dark') => void;
  // Calculator
  showCalculator: boolean;
  setShowCalculator: (v: boolean) => void;
  // Ruler
  showRuler: boolean;
  setShowRuler: (v: boolean) => void;
  // Protractor
  showProtractor: boolean;
  setShowProtractor: (v: boolean) => void;
  // Noise Filter
  showNoiseFilter: boolean;
  setShowNoiseFilter: (v: boolean) => void;
  setTrajectoryData: (data: TrajectoryPoint[]) => void;
  // Live Calibration
  showLiveCalibration: boolean;
  setShowLiveCalibration: (v: boolean) => void;
  setCalibrationScale: (ppm: number | null) => void;
  calibrationMediaSrc?: string | null;
  // Security & Privacy
  showSecurityPrivacy: boolean;
  setShowSecurityPrivacy: (v: boolean) => void;
  autoDeleteVideos: boolean;
  onToggleAutoDelete: (enabled: boolean) => void;
  // Comprehensive Guide
  showComprehensiveGuide: boolean;
  setShowComprehensiveGuide: (v: boolean) => void;
  // Guest Restriction
  showRestrictionOverlay: string | null;
  setShowRestrictionOverlay: (v: string | null) => void;
}

const ModalsOverlays: React.FC<ModalsOverlaysProps> = (props) => {
  const {
    lang, isMuted,
    showOnboarding, setShowOnboarding,
    showEnvSelector, setShowEnvSelector, currentEnvId, onEnvironmentSelect,
    showDocumentation, setShowDocumentation,
    showStroboscopicModal, setShowStroboscopicModal, stroboscopicSettings, setStroboscopicSettings, stroboscopicMarks, gravity, isSimulationDone,
    showMultiSimModal, setShowMultiSimModal, velocity, angle, height, airResistance, mass, windSpeed, enableBounce, bounceCoefficient, selectedIntegrationMethod, hasExperimentalData, trajectoryData,
    showSettingsPanel, setShowSettingsPanel, nightMode, onToggleNightMode, onToggleMute, onSwitchLanguage, accentColor, accentColors, onAccentChange, is3DMode, theme3d, onTheme3dChange,
    showCalculator, setShowCalculator,
    showRuler, setShowRuler,
    showProtractor, setShowProtractor,
    showNoiseFilter, setShowNoiseFilter, setTrajectoryData,
    showLiveCalibration, setShowLiveCalibration, setCalibrationScale, calibrationMediaSrc,
    showSecurityPrivacy, setShowSecurityPrivacy, autoDeleteVideos, onToggleAutoDelete,
    showComprehensiveGuide, setShowComprehensiveGuide,
    showRestrictionOverlay, setShowRestrictionOverlay,
  } = props;

  return (
    <>
      <Suspense fallback={null}>
        <OnboardingTutorial lang={lang} open={showOnboarding} onClose={() => setShowOnboarding(false)} />
      </Suspense>

      {/* IdlePhysicsTips moved to footer near robot in Index.tsx */}

      <EnvironmentSelector
        open={showEnvSelector}
        onClose={() => setShowEnvSelector(false)}
        lang={lang}
        currentEnvId={currentEnvId}
        onSelect={onEnvironmentSelect}
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
          gravity={gravity}
          isSimulationDone={isSimulationDone}
        />
      </Suspense>

      <Suspense fallback={null}>
        <MultiSimulationModal
          open={showMultiSimModal}
          onClose={() => setShowMultiSimModal(false)}
          lang={lang}
          velocity={velocity}
          angle={angle}
          height={height}
          gravity={gravity}
          airResistance={airResistance}
          mass={mass}
          windSpeed={windSpeed}
          enableBounce={enableBounce}
          bounceCoefficient={bounceCoefficient}
          selectedIntegrationMethod={selectedIntegrationMethod}
          hasExperimentalData={hasExperimentalData}
          trajectoryData={trajectoryData}
        />
      </Suspense>

      <SettingsPanel
        open={showSettingsPanel}
        onClose={() => setShowSettingsPanel(false)}
        lang={lang}
        onSwitchLanguage={onSwitchLanguage}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
        nightMode={nightMode}
        onToggleNightMode={onToggleNightMode}
        accentColor={accentColor}
        accentColors={accentColors}
        onAccentChange={onAccentChange}
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
        onOpenComprehensiveGuide={() => setShowComprehensiveGuide(true)}
        theme3d={theme3d}
        onTheme3dChange={onTheme3dChange}
      />

      <Suspense fallback={null}>
        <ComprehensiveGuideModal
          open={showComprehensiveGuide}
          onClose={() => {
            setShowComprehensiveGuide(false);
            try { localStorage.setItem('apas_guideDismissed', 'true'); } catch { /* localStorage unavailable */ }
          }}
          lang={lang}
        />
      </Suspense>

      <Suspense fallback={null}>
        <ScientificCalculator
          open={showCalculator}
          onClose={() => setShowCalculator(false)}
          lang={lang}
        />
      </Suspense>

      <Suspense fallback={null}>
        <CanvasRuler
          active={showRuler && !is3DMode}
          onClose={() => setShowRuler(false)}
          lang={lang}
        />
      </Suspense>

      <Suspense fallback={null}>
        <CanvasProtractor
          active={showProtractor && !is3DMode}
          onClose={() => setShowProtractor(false)}
          lang={lang}
        />
      </Suspense>

      <Suspense fallback={null}>
        <NoiseFilter
          open={showNoiseFilter}
          onClose={() => setShowNoiseFilter(false)}
          lang={lang}
          trajectoryData={trajectoryData}
          onApplyFiltered={(filtered) => {
            setTrajectoryData(filtered);
            setShowNoiseFilter(false);
          }}
        />
      </Suspense>

      <Suspense fallback={null}>
        <LiveCalibration
          open={showLiveCalibration}
          onClose={() => setShowLiveCalibration(false)}
          lang={lang}
          onCalibrate={(ppm) => {
            setCalibrationScale(ppm);
            setShowLiveCalibration(false);
          }}
          mediaSrc={calibrationMediaSrc}
        />
      </Suspense>

      <Suspense fallback={null}>
        <SecurityPrivacy
          open={showSecurityPrivacy}
          onClose={() => setShowSecurityPrivacy(false)}
          lang={lang}
          autoDeleteEnabled={autoDeleteVideos}
          onToggleAutoDelete={(enabled) => {
            onToggleAutoDelete(enabled);
            try { localStorage.setItem('apas_autoDeleteVideos', String(enabled)); } catch { /* localStorage unavailable */ }
          }}
        />
      </Suspense>

      {showRestrictionOverlay && (
        <GuestRestrictionOverlay
          featureName={showRestrictionOverlay}
          lang={lang}
          onClose={() => setShowRestrictionOverlay(null)}
        />
      )}

      <KeyboardShortcutsHelp lang={lang} muted={isMuted} />
      <BugReportButton lang={lang} />
    </>
  );
};

export default ModalsOverlays;
