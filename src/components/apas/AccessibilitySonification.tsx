import React, { useState, useCallback, useRef } from 'react';
import { Volume2, VolumeX, ChevronDown, Play, Square, Ear, Music } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

interface AccessibilitySonificationProps {
  lang: string;
  trajectoryData: Array<{ x: number; y: number; time: number; speed: number }>;
  muted: boolean;
}

const T: Record<string, Record<string, string>> = {
  ar: {
    title: 'الوصول الشامل — التصويت',
    subtitle: 'تحويل المسار الفيزيائي إلى نغمات صوتية',
    play: 'تشغيل النغمات',
    stop: 'إيقاف',
    playing: 'جاري التشغيل...',
    noData: 'أطلق المحاكاة لسماع تحول الطاقة',
    heightToFreq: 'الارتفاع → التردد',
    speedToVolume: 'السرعة → شدة الصوت',
    description: 'تحول هذه الأداة المنحنى الفيزيائي إلى نغمات صوتية يتغير ترددها مع ارتفاع وانخفاض المقذوف، مما يسمح بفهم الفيزياء عبر السمع.',
    minFreq: 'أدنى تردد (Hz)',
    maxFreq: 'أعلى تردد (Hz)',
    duration: 'مدة التشغيل (ثانية)',
    waveType: 'نوع الموجة',
    sine: 'جيبية',
    triangle: 'مثلثية',
    square: 'مربعة',
    sawtooth: 'منشارية',
    enableSpeedMapping: 'ربط السرعة بشدة الصوت',
    enableHeightMapping: 'ربط الارتفاع بالتردد',
    accessibilityNote: 'مصمم لمساعدة ذوي الإعاقة البصرية على فهم حركة المقذوف عبر السمع',
    currentHeight: 'الارتفاع الحالي',
    currentFreq: 'التردد الحالي',
  },
  en: {
    title: 'Accessibility — Sonification',
    subtitle: 'Convert physics trajectory to audio tones',
    play: 'Play Tones',
    stop: 'Stop',
    playing: 'Playing...',
    noData: 'Launch simulation to hear energy transformation',
    heightToFreq: 'Height → Frequency',
    speedToVolume: 'Speed → Volume',
    description: 'This tool converts the physics curve into audio tones whose frequency changes with the rise and fall of the projectile, enabling understanding of physics through hearing.',
    minFreq: 'Min Frequency (Hz)',
    maxFreq: 'Max Frequency (Hz)',
    duration: 'Playback Duration (seconds)',
    waveType: 'Wave Type',
    sine: 'Sine',
    triangle: 'Triangle',
    square: 'Square',
    sawtooth: 'Sawtooth',
    enableSpeedMapping: 'Map Speed to Volume',
    enableHeightMapping: 'Map Height to Frequency',
    accessibilityNote: 'Designed to help visually impaired users understand projectile motion through hearing',
    currentHeight: 'Current Height',
    currentFreq: 'Current Frequency',
  },
  fr: {
    title: 'Accessibilité — Sonification',
    subtitle: 'Convertir la trajectoire physique en tons audio',
    play: 'Jouer les Tons',
    stop: 'Arrêter',
    playing: 'Lecture...',
    noData: 'Lancez la simulation pour entendre la transformation d\'énergie',
    heightToFreq: 'Hauteur → Fréquence',
    speedToVolume: 'Vitesse → Volume',
    description: 'Cet outil convertit la courbe physique en tons audio dont la fréquence change avec la montée et la descente du projectile.',
    minFreq: 'Fréq. Min (Hz)',
    maxFreq: 'Fréq. Max (Hz)',
    duration: 'Durée de Lecture (secondes)',
    waveType: 'Type d\'Onde',
    sine: 'Sinusoïdale',
    triangle: 'Triangle',
    square: 'Carrée',
    sawtooth: 'Dent de Scie',
    enableSpeedMapping: 'Mapper Vitesse au Volume',
    enableHeightMapping: 'Mapper Hauteur à la Fréquence',
    accessibilityNote: 'Conçu pour aider les malvoyants à comprendre le mouvement des projectiles par l\'ouïe',
    currentHeight: 'Hauteur Actuelle',
    currentFreq: 'Fréquence Actuelle',
  },
};

const WAVE_TYPES: OscillatorType[] = ['sine', 'triangle', 'square', 'sawtooth'];

const AccessibilitySonification: React.FC<AccessibilitySonificationProps> = ({
  lang, trajectoryData,
}) => {
  const t = T[lang] || T.en;
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [minFreq, setMinFreq] = useState(200);
  const [maxFreq, setMaxFreq] = useState(800);
  const [duration, setDuration] = useState(3);
  const [waveType, setWaveType] = useState<OscillatorType>('sine');
  const [heightMapping, setHeightMapping] = useState(true);
  const [speedMapping, setSpeedMapping] = useState(true);
  const [currentPlayFreq, setCurrentPlayFreq] = useState(0);
  const [currentPlayHeight, setCurrentPlayHeight] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const stopPlayback = useCallback(() => {
    if (oscillatorRef.current) {
      try { oscillatorRef.current.stop(); } catch { /* ignore */ }
      oscillatorRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setIsPlaying(false);
    setCurrentPlayFreq(0);
    setCurrentPlayHeight(0);
  }, []);

  const playTrajectory = useCallback(() => {
    if (trajectoryData.length < 2) return;
    stopPlayback();

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = waveType;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);

    oscillatorRef.current = oscillator;
    gainRef.current = gain;

    const minY = Math.min(...trajectoryData.map(p => p.y));
    const maxY = Math.max(...trajectoryData.map(p => p.y));
    const yRange = maxY - minY || 1;
    const maxSpeed = Math.max(...trajectoryData.map(p => p.speed), 1);
    const totalDuration = duration * 1000;

    oscillator.start();
    setIsPlaying(true);

    const startTime = performance.now();

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);

      if (progress >= 1) {
        stopPlayback();
        return;
      }

      const idx = Math.min(Math.floor(progress * trajectoryData.length), trajectoryData.length - 1);
      const point = trajectoryData[idx];

      // Map height to frequency
      if (heightMapping) {
        const normalizedH = (point.y - minY) / yRange;
        const freq = minFreq + normalizedH * (maxFreq - minFreq);
        oscillator.frequency.setTargetAtTime(freq, ctx.currentTime, 0.02);
        setCurrentPlayFreq(freq);
      }

      // Map speed to volume
      if (speedMapping) {
        const normalizedSpeed = point.speed / maxSpeed;
        gain.gain.setTargetAtTime(0.1 + normalizedSpeed * 0.4, ctx.currentTime, 0.02);
      }

      setCurrentPlayHeight(point.y);
      animFrameRef.current = requestAnimationFrame(update);
    };

    animFrameRef.current = requestAnimationFrame(update);
  }, [trajectoryData, minFreq, maxFreq, duration, waveType, heightMapping, speedMapping, stopPlayback]);

  const waveTypeLabel = (type: OscillatorType) => {
    const labels: Record<string, Record<OscillatorType, string>> = {
      ar: { sine: t.sine, triangle: t.triangle, square: t.square, sawtooth: t.sawtooth },
      en: { sine: t.sine, triangle: t.triangle, square: t.square, sawtooth: t.sawtooth },
      fr: { sine: t.sine, triangle: t.triangle, square: t.square, sawtooth: t.sawtooth },
    };
    return (labels[lang] || labels.en)[type];
  };

  return (
    <div className="border border-border/50 rounded-xl bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3.5 cursor-pointer hover:bg-primary/5 transition-all duration-300"
      >
        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Ear className="w-4 h-4 text-primary" />
          {t.title}
        </span>
        <div className="flex items-center gap-2">
          {!isOpen && (
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono animate-slideDown">
              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                {lang === 'ar' ? 'مسار ← صوت' : 'Trajectory → Audio'}
              </span>
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border/30 p-4 space-y-3 animate-slideDown">
          {/* Accessibility Note */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs text-primary/80 flex items-center gap-2">
              <Volume2 className="w-4 h-4 shrink-0" />
              {t.accessibilityNote}
            </p>
          </div>

          <p className="text-xs text-muted-foreground">{t.description}</p>

          {trajectoryData.length < 2 ? (
            <p className="text-xs text-muted-foreground text-center py-4">{t.noData}</p>
          ) : (
            <>
              {/* Play/Stop Button */}
              <button
                onClick={isPlaying ? stopPlayback : playTrajectory}
                className={`w-full px-4 py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all ${
                  isPlaying
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/25 hover:bg-red-600'
                    : 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/25 hover:shadow-xl'
                }`}
              >
                {isPlaying ? (
                  <><Square className="w-4 h-4" /> {t.stop}</>
                ) : (
                  <><Play className="w-4 h-4" /> {t.play}</>
                )}
              </button>

              {/* Live display during playback */}
              {isPlaying && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-secondary/30 border border-primary/20 text-center">
                    <p className="text-[9px] text-muted-foreground">{t.currentHeight}</p>
                    <p className="text-lg font-bold text-foreground">{currentPlayHeight.toFixed(2)} m</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-secondary/30 border border-primary/20 text-center">
                    <p className="text-[9px] text-muted-foreground">{t.currentFreq}</p>
                    <p className="text-lg font-bold text-primary">{currentPlayFreq.toFixed(0)} Hz</p>
                  </div>
                </div>
              )}

              {/* Mapping Toggles */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border">
                  <span className="text-xs font-medium flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-primary" /> {t.enableHeightMapping}
                  </span>
                  <Switch checked={heightMapping} onCheckedChange={setHeightMapping} />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border">
                  <span className="text-xs font-medium flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-primary" /> {t.enableSpeedMapping}
                  </span>
                  <Switch checked={speedMapping} onCheckedChange={setSpeedMapping} />
                </div>
              </div>

              {/* Frequency Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="font-medium">{t.minFreq}</span>
                    <span className="font-mono text-muted-foreground">{minFreq} Hz</span>
                  </div>
                  <Slider value={[minFreq]} min={50} max={500} step={10}
                    onValueChange={([v]) => setMinFreq(v)} />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="font-medium">{t.maxFreq}</span>
                    <span className="font-mono text-muted-foreground">{maxFreq} Hz</span>
                  </div>
                  <Slider value={[maxFreq]} min={400} max={2000} step={50}
                    onValueChange={([v]) => setMaxFreq(v)} />
                </div>
              </div>

              {/* Duration */}
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="font-medium">{t.duration}</span>
                  <span className="font-mono text-muted-foreground">{duration}s</span>
                </div>
                <Slider value={[duration]} min={1} max={10} step={0.5}
                  onValueChange={([v]) => setDuration(v)} />
              </div>

              {/* Wave Type */}
              <div>
                <p className="text-xs font-medium mb-2">{t.waveType}</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {WAVE_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => setWaveType(type)}
                      className={`px-2 py-1.5 text-[10px] rounded-lg transition-all font-medium ${
                        waveType === type
                          ? 'bg-primary text-white border border-primary shadow-sm'
                          : 'bg-secondary/50 text-foreground border border-border/50 hover:border-primary/20'
                      }`}
                    >
                      {waveTypeLabel(type)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AccessibilitySonification;
