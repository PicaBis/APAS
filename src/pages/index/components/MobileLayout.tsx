import React, { Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Activity, Info, Save, Eye, Smartphone, Accessibility, Calculator, X, RotateCcw, Pause, Play, Turtle, Minimize } from 'lucide-react';
import { MobileTopBar, MobileBottomNav, MobileAIAssistant, PWAInstallPrompt } from '@/components/mobile';
import PageTransition from '@/components/apas/PageTransition';
import SimulationCanvas from '@/components/apas/SimulationCanvas';
import ResultsSection from '@/components/apas/ResultsSection';
import SensorLab from '@/components/apas/SensorLab';
import { AnimatedLoadingSpinner } from '@/components/ui/AnimatedSVG';
import ErrorBoundary from '@/components/apas/ErrorBoundary';

const SimulationCanvas3D = React.lazy(() => import('@/components/apas/SimulationCanvas3D'));
const AccessibilitySonification = React.lazy(() => import('@/components/apas/AccessibilitySonification'));
const CalculationsSection = React.lazy(() => import('@/components/apas/CalculationsSection'));
const ApasVisionButton = React.lazy(() => import('@/components/apas/ApasVisionButton'));
const ApasVideoButton = React.lazy(() => import('@/components/apas/ApasVideoButton'));
const ApasSubjectReading = React.lazy(() => import('@/components/apas/ApasSubjectReading'));
const ApasVoiceButton = React.lazy(() => import('@/components/apas/ApasVoiceButton'));

interface MobileLayoutProps {
  state: any;
  handlers: any;
  derived: any;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ state, handlers, derived }) => {
  const {
    sim, T, lang, isRTL,
    mobileActiveTab, setMobileActiveTab,
    showMobileAI, setShowMobileAI,
    mobileFullscreen, setMobileFullscreen,
    showMobileVision, setShowMobileVision,
    showMobileVideo, setShowMobileVideo,
    showMobileSubject, setShowMobileSubject,
    showMobileVoice, setShowMobileVoice,
    showMobileSensorLab, setShowMobileSensorLab,
    showMobileAccessibility, setShowMobileAccessibility,
    showMobileCalculationsModal, setShowMobileCalculationsModal,
    lastAnalyzedMediaSrc, detectedMedia,
    is3DMode, theme3d, webglError, setIs3DMode, setWebglError,
    canvasContainerRef, pathDotClass,
    showLiveData, showGrid, stroboscopicSettings, activePresetEmoji, calibrationScale, currentEnvId, dualTrajectory,
  } = state;

  const {
    handleMobileVisionParams,
    handleMobileVoiceParams,
    handleAutoRunSimulation,
    handleDetectedMedia,
    handleAnalysisComplete,
    handleMobileExperimentLoad,
    switchLanguage,
  } = handlers;

  return (
    <PageTransition>
      <div className={`min-h-screen bg-background relative overflow-hidden ${state.isLangTransitioning ? 'lang-fade-out' : ''}`} dir={T.dir}>
        {/* Ambient background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse-slow" />
          <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full bg-primary/3 blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
        </div>

        {/* Mobile Top Bar */}
        <MobileTopBar
          lang={lang}
          onOpenAI={() => setShowMobileAI(true)}
          onOpenVision={() => setShowMobileVision(true)}
          onOpenVideo={() => setShowMobileVideo(true)}
          onOpenSubject={() => setShowMobileSubject(true)}
          onOpenVoice={() => setShowMobileVoice(true)}
          onOpenCalculations={() => setShowMobileCalculationsModal(true)}
          onOpenSettings={() => state.setShowSettingsPanel(true)}
          hasAnalyzedMedia={!!lastAnalyzedMediaSrc}
        />

        {/* Mobile Main Content */}
        <div className="mobile-content-area relative z-10 min-h-screen">
          {/* ── Simulation Tab ── */}
          {mobileActiveTab === 'simulation' && (
            <div className="px-3 py-3 space-y-3">
              {/* Canvas */}
              <div ref={canvasContainerRef} className="relative rounded-xl overflow-hidden border border-border/30 bg-card/30">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <h2 className="text-xs font-semibold text-foreground flex items-center gap-1.5 shrink-0">
                    <span className={pathDotClass} />
                    {lang === 'ar' ? 'المحاكاة' : 'Simulation'}
                  </h2>
                </div>
                <div className="aspect-video relative">
                  {is3DMode ? (
                    <ErrorBoundary sectionName="3D Mobile">
                      <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><AnimatedLoadingSpinner /></div>}>
                        <SimulationCanvas3D
                          trajectoryData={sim.trajectoryData} prediction={sim.prediction} currentTime={sim.currentTime}
                          height={sim.height} showCriticalPoints={sim.showCriticalPoints} showExternalForces={sim.showExternalForces}
                          vectorVisibility={state.vectorVisibility} mass={sim.mass} gravity={sim.gravity} airResistance={sim.airResistance}
                          lang={lang} nightMode={sim.nightMode} isAnimating={sim.isAnimating} playbackSpeed={sim.playbackSpeed}
                          bounceCoefficient={sim.bounceCoefficient} phi={sim.phi} showLiveData={showLiveData}
                          stroboscopicMarks={state.stroboscopicMarks}
                          environmentId={currentEnvId} showGrid={showGrid} theme3d={theme3d}
                          onWebglError={(msg: string) => { setWebglError(msg); setIs3DMode(false); }}
                        />
                      </Suspense>
                    </ErrorBoundary>
                  ) : (
                    <SimulationCanvas
                      trajectoryData={sim.trajectoryData} theoreticalData={sim.theoreticalData} prediction={sim.prediction}
                      currentTime={sim.currentTime} height={sim.height} showCriticalPoints={sim.showCriticalPoints}
                      showExternalForces={sim.showExternalForces} vectorVisibility={state.vectorVisibility}
                      mass={sim.mass} gravity={sim.gravity} airResistance={sim.airResistance} windSpeed={sim.windSpeed}
                      T={T} lang={lang} nightMode={sim.nightMode} zoom={1}
                      isAnimating={sim.isAnimating} isFullscreen={false} showLiveData={showLiveData}
                      stroboscopicMarks={state.stroboscopicMarks}
                      environmentId={currentEnvId} showGrid={showGrid}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ... other mobile content ... */}
        </div>

        {/* Mobile AI Assistant */}
        <MobileAIAssistant
          isOpen={showMobileAI}
          onClose={() => setShowMobileAI(false)}
          lang={lang}
          velocity={sim.velocity} angle={sim.angle} height={sim.height} gravity={sim.gravity} airResistance={sim.airResistance} mass={sim.mass}
          prediction={sim.prediction} isAnimating={sim.isAnimating} trajectoryLength={sim.trajectoryData.length}
        />

        {/* Mobile Bottom Nav */}
        <MobileBottomNav activeTab={mobileActiveTab} onTabChange={setMobileActiveTab} lang={lang} isMuted={sim.isMuted} />

        {/* PWA Install Prompt */}
        <PWAInstallPrompt lang={lang} />
      </div>
    </PageTransition>
  );
};

export default MobileLayout;
