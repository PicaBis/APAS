import React, { Suspense, lazy } from 'react';
import { Layers, ChevronDown, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { playClick, playUIClick, playSectionToggle, playSliderChange, playPageTransition } from '@/utils/sound';
import { PRESETS, objectTypeToEmoji } from '../constants';
import ApasVisionButton from '@/components/apas/ApasVisionButton';
import ApasVideoButton from '@/components/apas/ApasVideoButton';
import ApasSubjectReading from '@/components/apas/ApasSubjectReading';
import ApasVoiceButton from '@/components/apas/ApasVoiceButton';
import ApasWhiteboardScanner from '@/components/apas/ApasWhiteboardScanner';
import ApasSlowMoAnalyzer from '@/components/apas/ApasSlowMoAnalyzer';
import ApasReportGenerator from '@/components/apas/ApasReportGenerator';
import AnalysisHistory from '@/components/apas/AnalysisHistory';
import ShareSimulation from '@/components/apas/ShareSimulation';
import SensorLab from '@/components/apas/SensorLab';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import type { SessionData } from '@/components/apas/SessionManager';

const SessionManager = lazy(() => import('@/components/apas/SessionManager'));
const LensDistortionCorrection = lazy(() => import('@/components/apas/LensDistortionCorrection'));

interface RightSidebarProps {
  lang: string;
  isMuted: boolean;
  isFocusMode: boolean;
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
  windSpeed: number;
  currentEnvId: string;
  nightMode: boolean;
  selectedIntegrationMethod: string;
  enableBounce: boolean;
  bounceCoefficient: number;
  setSelectedIntegrationMethod: (m: 'euler' | 'rk4' | 'ai-apas') => void;
  setVelocity: (v: number) => void;
  setAngle: (v: number) => void;
  setHeight: (v: number) => void;
  setMass: (v: number) => void;
  setGravity: (v: number) => void;
  setActivePresetEmoji: (e: string | undefined) => void;
  onSessionLoad: (session: SessionData) => void;
  onShowRestrictionOverlay: (name: string) => void;
  onMediaAnalyzed?: (thumbnailDataUrl: string) => void;
  onAutoRun?: () => void;
  onDetectedMedia?: (data: { source: 'video' | 'image'; detectedAngle?: number; detectedVelocity?: number; detectedHeight?: number; confidence?: number; objectType?: string }) => void;
  onAnalysisComplete?: (entry: { type: 'vision' | 'video' | 'subject' | 'voice'; report: string; mediaSrc?: string; mediaType?: 'video' | 'image'; params?: { velocity?: number; angle?: number; height?: number; mass?: number } }) => void;
  analysisHistory?: Array<{ id: number; timestamp: Date; type: 'vision' | 'video' | 'subject' | 'voice'; report: string; mediaSrc?: string; mediaType?: 'video' | 'image'; params?: { velocity?: number; angle?: number; height?: number; mass?: number } }>;
  onClearAnalysisHistory?: () => void;
  onDeleteAnalysisEntry?: (id: number) => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({
  lang, isMuted, isFocusMode,
  velocity, angle, height, gravity, airResistance, mass, windSpeed,
  currentEnvId, nightMode, selectedIntegrationMethod,
  enableBounce, bounceCoefficient,
  setSelectedIntegrationMethod, setVelocity, setAngle, setHeight, setMass, setGravity,
  setActivePresetEmoji, onSessionLoad, onShowRestrictionOverlay, onMediaAnalyzed, onAutoRun, onDetectedMedia, onAnalysisComplete,
  analysisHistory, onClearAnalysisHistory, onDeleteAnalysisEntry,
}) => {
  const { isGuest, isApproved, isAdmin, isRestricted, user } = useAuth();
  const canAccessRestrictedFeature = isAdmin || (user && isApproved && !isRestricted);

  const loadPreset = (preset: typeof PRESETS[0]) => {
    setVelocity(preset.p.velocity);
    setAngle(preset.p.angle);
    setHeight(preset.p.height);
    setGravity(preset.p.gravity);
    // Note: airResistance and mass are set through the sim object passed via props
    // We pass them through the parent's sim reference
    const emojiMatch = preset.name.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)/u);
    if (preset.name.startsWith('●')) {
      setActivePresetEmoji(undefined);
    } else {
      setActivePresetEmoji(emojiMatch ? emojiMatch[0] : undefined);
    }
    playUIClick(isMuted);
  };

  const handleVisionParams = (p: { velocity?: number; angle?: number; height?: number; mass?: number; objectType?: string }) => {
    if (p.velocity !== undefined) setVelocity(p.velocity);
    if (p.angle !== undefined) setAngle(p.angle);
    if (p.height !== undefined) setHeight(p.height);
    if (p.mass !== undefined) setMass(p.mass);
    const detectedEmoji = objectTypeToEmoji(p.objectType);
    if (detectedEmoji) setActivePresetEmoji(detectedEmoji);
    playClick(isMuted);
  };

  const handleVoiceParams = (p: { velocity?: number; angle?: number; height?: number; mass?: number; gravity?: number }) => {
    if (p.velocity !== undefined) setVelocity(p.velocity);
    if (p.angle !== undefined) setAngle(p.angle);
    if (p.height !== undefined) setHeight(p.height);
    if (p.mass !== undefined) setMass(p.mass);
    if (p.gravity !== undefined) setGravity(p.gravity);
    playClick(isMuted);
  };

  return (
    <aside data-tour="right-panel" className={`space-y-3 sm:space-y-4 order-3 lg:sticky lg:top-16 lg:self-start lg:pt-2${isFocusMode ? ' hidden' : ''}`}>
      {/* Integration Methods - Simple Version */}
      <div className="border-2 border-border/40 rounded-2xl p-4 sm:p-5 bg-card/70 backdrop-blur-sm shadow-lg shadow-black/[0.06] dark:shadow-black/20 dark:border-border/30">
        <h3 className="text-sm sm:text-base font-bold text-foreground uppercase tracking-tight mb-3 flex items-center gap-2.5">
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
                setSelectedIntegrationMethod(method.id);
                playClick(isMuted);
              }}
              className={`px-2 py-2.5 text-xs rounded-lg transition-all duration-300 font-semibold ${
                selectedIntegrationMethod === method.id
                  ? `bg-gradient-to-r ${method.color} text-white shadow-md border border-transparent`
                  : 'bg-secondary/50 hover:bg-primary/10 text-foreground border border-border/50 hover:border-primary/20'
              }`}
            >
              {method.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2.5">
          {selectedIntegrationMethod === 'ai-apas' 
            ? (lang === 'ar' ? '🤖 دقة فائقة 99.7%' : '🤖 Ultra-accurate 99.7%')
            : selectedIntegrationMethod === 'rk4'
            ? (lang === 'ar' ? '📐 دقة عالية 98%' : '📐 High accuracy 98%')
            : (lang === 'ar' ? '⚡ سريع 90%' : '⚡ Fast 90%')
          }
        </p>
      </div>

      {/* APAS Vision */}
      <div className="border-2 border-border/40 rounded-2xl p-4 sm:p-5 space-y-3 bg-card/70 backdrop-blur-sm shadow-lg shadow-black/[0.06] dark:shadow-black/20 dark:border-border/30 relative">
        {!canAccessRestrictedFeature && (
          <div className="absolute inset-0 z-10 rounded-xl bg-background/80 backdrop-blur-sm flex items-center justify-center cursor-pointer" onClick={() => onShowRestrictionOverlay('Smart Vision')}>
            <p className="text-xs text-muted-foreground text-center px-4 font-medium">
              {isGuest ? (lang === 'ar' ? 'وضع الضيف - سجل للوصول' : 'Guest mode - Register to access') : (lang === 'ar' ? 'في انتظار موافقة المطور' : 'Awaiting developer approval')}
            </p>
          </div>
        )}
        <h3 className="text-sm sm:text-base font-bold text-foreground uppercase tracking-tight mb-2 flex items-center gap-2.5">
          {lang === 'ar' ? 'الرؤية الذكية' : 'Smart Vision'}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
        </h3>
        <ApasVisionButton lang={lang} onUpdateParams={handleVisionParams} onMediaAnalyzed={onMediaAnalyzed} onAutoRun={onAutoRun} onDetectedMedia={onDetectedMedia} onAnalysisComplete={onAnalysisComplete} />
        <ApasVideoButton lang={lang} onUpdateParams={handleVisionParams} onMediaAnalyzed={onMediaAnalyzed} onAutoRun={onAutoRun} onDetectedMedia={onDetectedMedia} onAnalysisComplete={onAnalysisComplete} />
        <ApasSubjectReading
          lang={lang}
          onUpdateParams={(p) => {
            if (p.velocity !== undefined) setVelocity(p.velocity);
            if (p.angle !== undefined) setAngle(p.angle);
            if (p.height !== undefined) setHeight(p.height);
            if (p.mass !== undefined) setMass(p.mass);
            playClick(isMuted);
          }}
          onAnalysisComplete={onAnalysisComplete}
        />
        <ApasVoiceButton
          lang={lang}
          onUpdateParams={handleVoiceParams}
          simulationContext={{ velocity, angle, height, gravity, airResistance, mass }}
          onAnalysisComplete={onAnalysisComplete}
        />
        <ApasWhiteboardScanner
          lang={lang}
          onUpdateParams={handleVisionParams}
          onAnalysisComplete={onAnalysisComplete}
        />
        <ApasSlowMoAnalyzer
          lang={lang}
          onUpdateParams={handleVisionParams}
          onMediaAnalyzed={onMediaAnalyzed}
          onAutoRun={onAutoRun}
          onDetectedMedia={onDetectedMedia}
          onAnalysisComplete={onAnalysisComplete}
        />
        <ApasReportGenerator
          lang={lang}
          analysisHistory={analysisHistory || []}
          velocity={velocity}
          angle={angle}
          height={height}
          gravity={gravity}
          airResistance={airResistance}
          mass={mass}
        />
        {analysisHistory && analysisHistory.length > 0 && (
          <AnalysisHistory
            lang={lang}
            history={analysisHistory}
            onClearHistory={onClearAnalysisHistory}
            onDeleteEntry={onDeleteAnalysisEntry}
          />
        )}
      </div>

      {/* Presets / Scenarios */}
      <Collapsible defaultOpen={false} className="border-2 border-border/40 rounded-2xl bg-card/70 backdrop-blur-sm shadow-lg shadow-black/[0.06] dark:shadow-black/20 dark:border-border/30">
        <CollapsibleTrigger 
          onClick={() => playSectionToggle(isMuted)}
          className="flex items-center justify-between w-full p-4 sm:p-5 cursor-pointer hover:bg-primary/5 transition-all duration-300 group"
        >
          <h3 className="text-sm sm:text-base font-bold text-foreground uppercase tracking-tight flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-primary" />
            {lang === 'ar' ? 'السيناريوهات الجانبية' : 'Side Scenarios'}
          </h3>
          <div className="w-7 h-7 rounded-lg bg-secondary/60 flex items-center justify-center group-hover:bg-primary/10 transition-all duration-300">
            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-300 [[data-state=open]>&]:rotate-180" />
          </div>
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

      {/* Session Manager */}
      <Suspense fallback={null}>
        <SessionManager
          lang={lang}
          muted={isMuted}
          velocity={velocity}
          angle={angle}
          height={height}
          gravity={gravity}
          airResistance={airResistance}
          mass={mass}
          windSpeed={windSpeed}
          environmentId={currentEnvId}
          nightMode={nightMode}
          integrationMethod={selectedIntegrationMethod}
          enableBounce={enableBounce}
          bounceCoefficient={bounceCoefficient}
          onLoad={onSessionLoad}
        />
      </Suspense>

      {/* Advanced Features */}
      <Suspense fallback={null}>
        <LensDistortionCorrection lang={lang} muted={isMuted} />
      </Suspense>

      {/* Share Simulation */}
      <div className="mt-4 pt-3 border-t border-border/30">
        <ShareSimulation
          lang={lang}
          muted={isMuted}
          velocity={velocity}
          angle={angle}
          height={height}
          gravity={gravity}
          airResistance={airResistance}
          mass={mass}
          windSpeed={windSpeed}
          environmentId={currentEnvId}
          nightMode={nightMode}
          integrationMethod={selectedIntegrationMethod}
        />
      </div>
    </aside>
  );
};

export default RightSidebar;
