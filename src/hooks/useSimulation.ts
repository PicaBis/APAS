import { useState, useRef, useEffect, useCallback } from 'react';
import { calculateTrajectory, buildAIModels, type TrajectoryPoint, type PredictionResult, type ModelData } from '@/utils/physics';
import { playLaunch, playImpact, playClick, playBounce, startWhizz, stopWhizz, updateWhizz, vibrate } from '@/utils/sound';
import { TRANSLATIONS, type Lang } from '@/constants/translations';
import type { AdvancedPhysicsParams } from '@/utils/advancedPhysics';
import { useToast } from './use-toast';

export interface SimulationState {
  lang: Lang;
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  windSpeed: number;
  mass: number;
  trajectoryData: TrajectoryPoint[];
  theoreticalData: Array<{ x: number; y: number; time: number }>;
  prediction: PredictionResult | null;
  aiModels: Record<string, ModelData> | null;
  isAnimating: boolean;
  currentTime: number;
  playbackSpeed: number;
  countdown: number | string | null;
  isMuted: boolean;
  nightMode: boolean;
  showCriticalPoints: boolean;
  showExternalForces: boolean;
  customColors: { trajectory: string; projectile: string; velocity: string };
  showAIComparison: boolean;
  comparisonMode: boolean;
  savedTrajectory: TrajectoryPoint[] | null;
  multiTrajectoryMode: boolean;
  multiTrajectories: Array<{ angle: number; points: TrajectoryPoint[]; color: string }>;
  enableBounce: boolean;
  bounceCoefficient: number;
  bounceEvents: number[];
  selectedIntegrationMethod: 'euler' | 'rk4' | 'ai-apas';
  spinRate: number;
  projectileRadius: number;
  forceGroundDetection: boolean;
  // Two-body collision
  secondBodyEnabled: boolean;
  secondBodyX: number;
  secondBodyY: number;
  secondBodyRadius: number;
  secondBodyMass: number;
  collisionType: 'elastic' | 'inelastic';
  collisionCOR: number;
}

export function useSimulation() {
  const [lang, setLang] = useState<Lang>('ar');
  const [velocity, setVelocity] = useState(50);
  const [angle, setAngle] = useState(45);
  const [height, setHeight] = useState(10);
  const [gravity, setGravity] = useState(9.81);
  const [airResistance, setAirResistance] = useState(0);
  const [windSpeed, setWindSpeed] = useState(0);
  const [mass, setMass] = useState(1);
  const [phi, setPhi] = useState(0); // Azimuthal angle for 3D mode (degrees)
  const [initialX, setInitialX] = useState(0); // Initial horizontal position

  const [trajectoryData, setTrajectoryData] = useState<TrajectoryPoint[]>([]);
  const [theoreticalData, setTheoreticalData] = useState<Array<{ x: number; y: number; time: number }>>([]);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [aiModels, setAiModels] = useState<Record<string, ModelData> | null>(null);

  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [countdown, setCountdown] = useState<number | string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [nightMode, setNightMode] = useState(false);
  const [showCriticalPoints, setShowCriticalPoints] = useState(false);
  const [showExternalForces, setShowExternalForces] = useState(false);
  const [showAIComparison, setShowAIComparison] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [savedTrajectory, setSavedTrajectory] = useState<TrajectoryPoint[] | null>(null);
  const [multiTrajectoryMode, setMultiTrajectoryMode] = useState(false);
  const [multiTrajectories, setMultiTrajectories] = useState<Array<{ angle: number; points: TrajectoryPoint[]; color: string }>>([]);
  const [customColors, setCustomColors] = useState({ trajectory: '#fbbf24', projectile: '#dc2626', velocity: '#10b981' });
  const [enableBounce, setEnableBounce] = useState(false);
  const [bounceCoefficient, setBounceCoefficient] = useState(0.6);
  const [bounceEvents, setBounceEvents] = useState<number[]>([]);
  const [selectedIntegrationMethod, setSelectedIntegrationMethod] = useState<'euler' | 'rk4' | 'ai-apas'>('ai-apas');
  const [spinRate, setSpinRate] = useState(0); // rad/s for Magnus force
  const [projectileRadius, setProjectileRadius] = useState(0.05); // m
  const [forceGroundDetection, setForceGroundDetection] = useState(false);
  // Two-body collision state
  const [secondBodyEnabled, setSecondBodyEnabled] = useState(false);
  const [secondBodyX, setSecondBodyX] = useState(100);
  const [secondBodyY, setSecondBodyY] = useState(0);
  const [secondBodyRadius, setSecondBodyRadius] = useState(1);
  const [secondBodyMass, setSecondBodyMass] = useState(1);
  const [collisionType, setCollisionType] = useState<'elastic' | 'inelastic'>('elastic');
  const [collisionCOR, setCollisionCOR] = useState(1.0);
  const [collisionPoint, setCollisionPoint] = useState<{ x: number; y: number; time: number } | null>(null);

  const animationRef = useRef<number | null>(null);
  const T = TRANSLATIONS[lang];
  const { toast } = useToast();
  const advancedParamsRef = useRef<AdvancedPhysicsParams | null>(null);

  // Set advanced physics params from external hook
  const setAdvancedParams = useCallback((params: AdvancedPhysicsParams | null) => {
    advancedParamsRef.current = params;
  }, []);

  // Calculate trajectory whenever params change
  const recalculate = useCallback(() => {
    const result = calculateTrajectory(velocity, angle, height, gravity, airResistance, mass, enableBounce, bounceCoefficient, 5, windSpeed, selectedIntegrationMethod, initialX, spinRate, projectileRadius, advancedParamsRef.current, forceGroundDetection);
    setTheoreticalData(result.theoPoints);
    setPrediction(result.prediction);
    setBounceEvents(result.bounceEvents || []);
    // Detect collision with second body and compute post-collision response
    if (secondBodyEnabled) {
      const cpIdx = result.points.findIndex(p => {
        const dx = p.x - secondBodyX;
        const dy = p.y - secondBodyY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist <= (projectileRadius + secondBodyRadius);
      });
      if (cpIdx >= 0) {
        const cp = result.points[cpIdx];
        setCollisionPoint({ x: cp.x, y: cp.y, time: cp.time });

        // Compute post-collision velocities using 1D collision along the line of impact
        const m1 = mass;
        const m2 = secondBodyMass;
        const e = collisionCOR; // coefficient of restitution (1 = elastic, 0 = perfectly inelastic)

        // Normal vector from projectile to second body
        const nx = secondBodyX - cp.x;
        const ny = secondBodyY - cp.y;
        const nLen = Math.sqrt(nx * nx + ny * ny) || 1;
        const ux = nx / nLen;
        const uy = ny / nLen;

        // Relative velocity along normal (second body is stationary)
        const vRel = cp.vx * ux + cp.vy * uy;

        // Only respond if projectile is approaching the second body
        if (vRel > 0) {
          // Impulse magnitude from Newton's law of restitution
          const j = (1 + e) * vRel / (1 / m1 + 1 / m2);

          // Post-collision velocity of projectile
          const newVx = cp.vx - (j / m1) * ux;
          const newVy = cp.vy - (j / m1) * uy;

          // Truncate trajectory at collision point and append post-collision trajectory
          const preCollision = result.points.slice(0, cpIdx + 1);

          // Compute post-collision trajectory using the same physics engine
          const postAngle = Math.atan2(newVy, newVx) * (180 / Math.PI);
          const postSpeed = Math.sqrt(newVx * newVx + newVy * newVy);
          if (postSpeed > 0.1) {
            const postResult = calculateTrajectory(
              postSpeed, postAngle, cp.y, gravity, airResistance, mass,
              enableBounce, bounceCoefficient, 5, windSpeed, selectedIntegrationMethod,
              cp.x, spinRate, projectileRadius, advancedParamsRef.current, forceGroundDetection
            );
            // Offset post-collision times by collision time
            const postPoints = postResult.points.map(p => ({
              ...p,
              time: p.time + cp.time,
            }));
            const merged = [...preCollision, ...postPoints.slice(1)];
            result.points = merged;
          } else {
            result.points = preCollision;
          }
        }
      } else {
        setCollisionPoint(null);
      }
    } else {
      setCollisionPoint(null);
    }
    // Update trajectory data with potentially modified points (post-collision)
    setTrajectoryData(result.points);
    const models = buildAIModels(result.points, result.theoPoints, T);
    setAiModels(models);
    return result.points;
  }, [velocity, angle, height, gravity, airResistance, mass, T, enableBounce, bounceCoefficient, windSpeed, selectedIntegrationMethod, initialX, spinRate, projectileRadius, secondBodyEnabled, secondBodyX, secondBodyY, secondBodyRadius, secondBodyMass, collisionCOR, forceGroundDetection]);

  useEffect(() => { recalculate(); }, [recalculate]);

  // Track which bounce events have been played
  const playedBounces = useRef(new Set<number>());

  // Animation loop
  const animate = useCallback(() => {
    setCurrentTime(prev => {
      const next = prev + 0.03 * playbackSpeed;
      const last = trajectoryData[trajectoryData.length - 1];
      if (last && next > last.time) {
        setIsAnimating(false);
        stopWhizz();
        playImpact(isMuted);
        return last.time;
      }
      const idx = trajectoryData.findIndex(p => p.time >= next);
      if (idx >= 0) {
        updateWhizz(trajectoryData[idx].speed, isMuted);
        // Play bounce sounds
        bounceEvents.forEach((bIdx, i) => {
          if (idx >= bIdx && !playedBounces.current.has(i)) {
            playedBounces.current.add(i);
            playBounce(isMuted, 1 - i * 0.15);
            vibrate(15);
          }
        });
      }
      return next;
    });
    animationRef.current = requestAnimationFrame(animate);
  }, [playbackSpeed, trajectoryData, isMuted, bounceEvents]);

  useEffect(() => {
    if (isAnimating) animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isAnimating, animate]);

  const resumeAnimation = useCallback(() => {
    setIsAnimating(true);
    playLaunch(isMuted);
    vibrate(30);
    setTimeout(() => startWhizz(isMuted), 100);
  }, [isMuted]);

  const startAnimation = useCallback(() => {
    if (countdown !== null) return;
    const last = trajectoryData[trajectoryData.length - 1];
    // Resume from paused position
    if (currentTime > 0 && last && currentTime < last.time) {
      resumeAnimation();
      return;
    }
    // Start fresh — immediate launch, no countdown
    recalculate();
    setCurrentTime(0);
    playedBounces.current.clear();
    setIsAnimating(true);
    playLaunch(isMuted);
    vibrate(60);
    setTimeout(() => startWhizz(isMuted), 100);
  }, [countdown, recalculate, isMuted, currentTime, trajectoryData, resumeAnimation]);

  const seekTo = useCallback((time: number) => {
    setCurrentTime(time);
    if (isAnimating) {
      // keep animating from new position
    }
  }, [isAnimating]);

  const pauseAnimation = useCallback(() => {
    setIsAnimating(false);
    stopWhizz();
    playClick(isMuted);
    vibrate(20);
  }, [isMuted]);

  const resetAnimation = useCallback(() => {
    setIsAnimating(false);
    stopWhizz();
    setCurrentTime(0);
    playClick(isMuted);
    vibrate(20);
  }, [isMuted]);

  // Multi trajectory mode
  const toggleMultiTrajectory = useCallback(() => {
    if (!multiTrajectoryMode) {
      const angles = [15, 30, 45, 60, 75];
      const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'];
      const trajectories = angles.map((a, i) => {
        const result = calculateTrajectory(velocity, a, height, gravity, airResistance, mass, false, 0.6, 5, windSpeed, 'ai-apas', initialX, spinRate, projectileRadius, null, forceGroundDetection);
        return { angle: a, points: result.points, color: colors[i] };
      });
      setMultiTrajectories(trajectories);
      setMultiTrajectoryMode(true);
    } else {
      setMultiTrajectoryMode(false);
      setMultiTrajectories([]);
    }
  }, [multiTrajectoryMode, velocity, height, gravity, airResistance, mass, windSpeed, initialX, spinRate, projectileRadius, forceGroundDetection]);

  const switchLang = useCallback(() => {
    setLang(l => {
      if (l === 'ar') return 'en';
      if (l === 'en') return 'fr';
      return 'ar'; // if l === 'fr', return to 'ar'
    });
  }, []);

  const setLanguageDirect = useCallback((newLang: Lang) => {
    setLang(newLang);
  }, []);

  return {
    lang, setLang, switchLang, setLanguageDirect, T,
    velocity, setVelocity, angle, setAngle, height, setHeight,
    gravity, setGravity, airResistance, setAirResistance, windSpeed, setWindSpeed, mass, setMass,
    phi, setPhi,
    initialX, setInitialX,
    trajectoryData, setTrajectoryData, theoreticalData, prediction, aiModels,
    isAnimating, currentTime, playbackSpeed, setPlaybackSpeed,
    countdown, isMuted, setIsMuted,
    nightMode, setNightMode,
    showCriticalPoints, setShowCriticalPoints,
    showExternalForces, setShowExternalForces,
    showAIComparison, setShowAIComparison,
    comparisonMode, setComparisonMode,
    savedTrajectory, setSavedTrajectory,
    multiTrajectoryMode, multiTrajectories,
    customColors, setCustomColors,
    enableBounce, setEnableBounce,
    bounceCoefficient, setBounceCoefficient,
    bounceEvents,
    selectedIntegrationMethod, setSelectedIntegrationMethod,
    spinRate, setSpinRate,
    projectileRadius, setProjectileRadius,
    forceGroundDetection, setForceGroundDetection,
    secondBodyEnabled, setSecondBodyEnabled,
    secondBodyX, setSecondBodyX,
    secondBodyY, setSecondBodyY,
    secondBodyRadius, setSecondBodyRadius,
    secondBodyMass, setSecondBodyMass,
    collisionType, setCollisionType,
    collisionCOR, setCollisionCOR,
    collisionPoint,
    startAnimation, pauseAnimation, resetAnimation, seekTo,
    recalculate, toggleMultiTrajectory, setCurrentTime,
    setAdvancedParams,
    toast,
  };
}
