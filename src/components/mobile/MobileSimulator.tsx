import React, { useState, useRef, useCallback, Suspense, lazy } from 'react';
import { Play, Pause, RotateCcw, ChevronDown, Zap, Globe, Layers } from 'lucide-react';
import type { useSimulation } from '@/hooks/useSimulation';
import SimulationCanvas from '@/components/apas/SimulationCanvas';
import { Slider } from '@/components/ui/slider';
import { playClick } from '@/utils/sound';

const SimulationCanvas3D = lazy(() => import('@/components/apas/SimulationCanvas3D'));

interface Props {
  lang: string;
  sim: ReturnType<typeof useSimulation>;
}

const PRESETS = [
  { name: '● Default', nameAr: '● افتراضي', p: { velocity: 50, angle: 45, height: 0, gravity: 9.81, airResistance: 0, mass: 1 } },
  { name: '⚽ Football', nameAr: '⚽ كرة قدم', p: { velocity: 28, angle: 35, height: 0, gravity: 9.81, airResistance: 0.02, mass: 0.45 } },
  { name: '🏀 Basketball', nameAr: '🏀 كرة سلة', p: { velocity: 8.5, angle: 52, height: 2, gravity: 9.81, airResistance: 0.015, mass: 0.62 } },
  { name: '🚀 Rocket', nameAr: '🚀 صاروخ', p: { velocity: 200, angle: 85, height: 0, gravity: 9.81, airResistance: 0.003, mass: 500 } },
];

export default function MobileSimulator({ lang, sim }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [is3D, setIs3D] = useState(false);
  const [showParams, setShowParams] = useState(true);
  const [showPresets, setShowPresets] = useState(false);
  const isAr = lang === 'ar';
  const isFinished = sim.trajectoryData.length > 0 && sim.currentTime >= (sim.trajectoryData[sim.trajectoryData.length - 1]?.time ?? 0);

  // Sync language
  React.useEffect(() => {
    sim.setLanguageDirect(lang as 'ar' | 'en' | 'fr');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const loadPreset = useCallback((p: typeof PRESETS[number]['p']) => {
    sim.setVelocity(p.velocity);
    sim.setAngle(p.angle);
    sim.setHeight(p.height);
    sim.setGravity(p.gravity);
    sim.setAirResistance(p.airResistance);
    sim.setMass(p.mass);
    playClick(sim.isMuted);
    setShowPresets(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim.isMuted]);

  const handlePlayPause = () => {
    if (sim.isAnimating) {
      sim.pauseAnimation();
    } else {
      sim.startAnimation();
    }
  };

  return (
    <div className="flex flex-col h-full" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Canvas Area */}
      <div ref={canvasRef} className="relative flex-1 min-h-[240px] bg-card/50 rounded-2xl border border-border/40 overflow-hidden mx-3 mt-2">
        {is3D ? (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
            <SimulationCanvas3D
              trajectoryData={sim.trajectoryData}
              currentTime={sim.currentTime}
              isAnimating={sim.isAnimating}
              nightMode={sim.nightMode}
              theme="refined-lab"
              showCriticalPoints={false}
              velocity={sim.velocity}
              angle={sim.angle}
              phi={0}
              height={sim.height}
              gravity={sim.gravity}
              mass={sim.mass}
              onWebGLError={() => setIs3D(false)}
            />
          </Suspense>
        ) : (
          <SimulationCanvas
            trajectoryData={sim.trajectoryData}
            theoreticalData={sim.theoreticalData}
            currentTime={sim.currentTime}
            nightMode={sim.nightMode}
            showCriticalPoints={sim.showCriticalPoints}
            prediction={sim.prediction}
            isAnimating={sim.isAnimating}
            zoom={1}
            showGrid={true}
            showExternalForces={false}
            customColors={sim.customColors}
            showAIComparison={false}
            aiModels={null}
            savedTrajectory={null}
            multiTrajectoryMode={false}
            multiTrajectories={[]}
            enableBounce={sim.enableBounce}
            bounceEvents={sim.bounceEvents}
            stroboscopicSettings={{ enabled: false, deltaT: 0.5, showProjections: false, showDetails: false }}
            stroboscopicMarks={[]}
            onStroboscopicMarksChange={() => {}}
            vectorVisibility={{ velocity: false, gravity: false, airResistance: false, normal: false, net: false }}
            equationTrajectory={null}
            secondBodyEnabled={false}
            secondBodyX={100}
            secondBodyY={0}
            secondBodyRadius={1}
            collisionPoint={null}
            calibrationScale={null}
          />
        )}

        {/* 3D toggle */}
        <button
          onClick={() => { setIs3D(!is3D); playClick(sim.isMuted); }}
          className={`absolute top-2 right-2 p-2 rounded-xl border transition-all ${is3D ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-background/80 border-border/50 text-muted-foreground'}`}
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      {/* Playback Controls */}
      <div className="px-4 py-3">
        {/* Timeline */}
        <div className="mb-3">
          <Slider
            value={[sim.currentTime]}
            max={sim.trajectoryData[sim.trajectoryData.length - 1]?.time ?? 10}
            step={0.01}
            onValueChange={([v]) => sim.seekTo(v)}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-mono">
            <span>{sim.currentTime.toFixed(2)}s</span>
            <span>{(sim.trajectoryData[sim.trajectoryData.length - 1]?.time ?? 0).toFixed(2)}s</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <button
            onClick={() => sim.resetAnimation()}
            className="p-2.5 rounded-xl bg-secondary/60 text-muted-foreground hover:text-foreground border border-border/40 active:scale-95 transition-all"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={handlePlayPause}
            className={`p-4 rounded-2xl shadow-lg active:scale-95 transition-all ${
              sim.isAnimating
                ? 'bg-amber-500 text-white shadow-amber-500/25'
                : 'bg-primary text-white shadow-primary/25'
            }`}
          >
            {sim.isAnimating ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="p-2.5 rounded-xl bg-secondary/60 text-muted-foreground hover:text-foreground border border-border/40 active:scale-95 transition-all"
          >
            <Zap className="w-5 h-5" />
          </button>
        </div>

        {/* Presets dropdown */}
        {showPresets && (
          <div className="mb-3 bg-card border border-border/50 rounded-xl p-2 space-y-1 animate-slideDown">
            {PRESETS.map((preset, i) => (
              <button
                key={i}
                onClick={() => loadPreset(preset.p)}
                className="w-full text-start px-3 py-2 rounded-lg text-sm hover:bg-primary/10 transition-colors"
              >
                {isAr ? preset.nameAr : preset.name}
              </button>
            ))}
          </div>
        )}

        {/* Results Summary */}
        {sim.prediction && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-card/80 border border-border/40 rounded-xl p-2.5 text-center">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{isAr ? 'المدى' : 'Range'}</p>
              <p className="text-sm font-bold font-mono text-foreground">{sim.prediction.range.toFixed(1)}<span className="text-[9px] text-muted-foreground ml-0.5">m</span></p>
            </div>
            <div className="bg-card/80 border border-border/40 rounded-xl p-2.5 text-center">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{isAr ? 'الارتفاع' : 'Height'}</p>
              <p className="text-sm font-bold font-mono text-foreground">{sim.prediction.maxHeight.toFixed(1)}<span className="text-[9px] text-muted-foreground ml-0.5">m</span></p>
            </div>
            <div className="bg-card/80 border border-border/40 rounded-xl p-2.5 text-center">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{isAr ? 'الزمن' : 'Time'}</p>
              <p className="text-sm font-bold font-mono text-foreground">{sim.prediction.timeOfFlight.toFixed(2)}<span className="text-[9px] text-muted-foreground ml-0.5">s</span></p>
            </div>
          </div>
        )}

        {/* Parameters Section */}
        <button
          onClick={() => setShowParams(!showParams)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-card/60 border border-border/40 mb-2"
        >
          <span className="text-xs font-semibold text-foreground">{isAr ? 'المعاملات' : 'Parameters'}</span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showParams ? 'rotate-180' : ''}`} />
        </button>

        {showParams && (
          <div className="space-y-3 px-1 animate-slideDown">
            {/* Velocity */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-muted-foreground">{isAr ? 'السرعة' : 'Velocity'}</label>
                <span className="text-xs font-mono text-foreground">{sim.velocity} m/s</span>
              </div>
              <Slider value={[sim.velocity]} min={0} max={300} step={1} onValueChange={([v]) => sim.setVelocity(v)} />
            </div>
            {/* Angle */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-muted-foreground">{isAr ? 'الزاوية' : 'Angle'}</label>
                <span className="text-xs font-mono text-foreground">{sim.angle}°</span>
              </div>
              <Slider value={[sim.angle]} min={0} max={90} step={1} onValueChange={([v]) => sim.setAngle(v)} />
            </div>
            {/* Height */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-muted-foreground">{isAr ? 'الارتفاع' : 'Height'}</label>
                <span className="text-xs font-mono text-foreground">{sim.height} m</span>
              </div>
              <Slider value={[sim.height]} min={0} max={100} step={0.5} onValueChange={([v]) => sim.setHeight(v)} />
            </div>
            {/* Mass */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-muted-foreground">{isAr ? 'الكتلة' : 'Mass'}</label>
                <span className="text-xs font-mono text-foreground">{sim.mass} kg</span>
              </div>
              <Slider value={[sim.mass]} min={0.01} max={100} step={0.1} onValueChange={([v]) => sim.setMass(v)} />
            </div>
            {/* Gravity */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-muted-foreground">{isAr ? 'الجاذبية' : 'Gravity'}</label>
                <span className="text-xs font-mono text-foreground">{sim.gravity} m/s²</span>
              </div>
              <Slider value={[sim.gravity]} min={0.1} max={30} step={0.01} onValueChange={([v]) => sim.setGravity(v)} />
            </div>
            {/* Air Resistance */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-muted-foreground">{isAr ? 'مقاومة الهواء' : 'Air Resistance'}</label>
                <span className="text-xs font-mono text-foreground">{sim.airResistance}</span>
              </div>
              <Slider value={[sim.airResistance]} min={0} max={0.5} step={0.001} onValueChange={([v]) => sim.setAirResistance(v)} />
            </div>
            {/* Playback Speed */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-muted-foreground">{isAr ? 'سرعة التشغيل' : 'Speed'}</label>
                <span className="text-xs font-mono text-foreground">{sim.playbackSpeed}x</span>
              </div>
              <Slider value={[sim.playbackSpeed]} min={0.1} max={5} step={0.1} onValueChange={([v]) => sim.setPlaybackSpeed(v)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
