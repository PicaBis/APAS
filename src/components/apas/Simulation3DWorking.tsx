import React from 'react';
import type { TrajectoryPoint, PredictionResult } from '@/utils/physics';
import { TRANSLATIONS } from '@/constants/translations';

interface Simulation3DProps {
  trajectoryData: TrajectoryPoint[];
  currentTime: number;
  height: number;
  showCriticalPoints: boolean;
  showExternalForces: boolean;
  vectorVisibility: { V: boolean; Vx: boolean; Vy: boolean; Fg: boolean; Fd: boolean };
  prediction: PredictionResult | null;
  mass: number;
  gravity: number;
  airResistance: number;
  T: typeof TRANSLATIONS['ar'] | typeof TRANSLATIONS['en'];
  lang: string;
  nightMode: boolean;
  isAnimating: boolean;
}

// Simple 3D-like visualization using CSS transforms
const Simulation3D: React.FC<Simulation3DProps> = (props) => {
  const currentProjectilePosition = React.useMemo(() => {
    if (props.trajectoryData.length === 0) return { x: 0, y: 0 };
    
    const animIdx = props.trajectoryData.findIndex((p) => p.time >= props.currentTime);
    const curPt = animIdx >= 0 ? props.trajectoryData[animIdx] : props.trajectoryData[props.trajectoryData.length - 1];
    
    return { x: curPt.x, y: curPt.y };
  }, [props.trajectoryData, props.currentTime]);

  const sceneScale = React.useMemo(() => {
    if (props.trajectoryData.length === 0) return 1;
    
    const allX = props.trajectoryData.map(p => p.x);
    const allY = props.trajectoryData.map(p => p.y);
    allY.push(props.height + 1);
    
    const maxX = Math.max(...allX);
    const maxY = Math.max(...allY);
    
    return Math.min(300 / Math.max(maxX, maxY), 2);
  }, [props.trajectoryData, props.height]);

  return (
    <div className={`w-full h-full relative overflow-hidden ${
      props.nightMode ? 'bg-gray-900' : 'bg-gradient-to-b from-blue-50 to-white'
    }`}>
      {/* 3D-like grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="grid grid-cols-10 grid-rows-10 h-full">
          {Array.from({ length: 100 }).map((_, i) => (
            <div key={i} className={`border ${props.nightMode ? 'border-gray-700' : 'border-gray-300'}`} />
          ))}
        </div>
      </div>

      {/* Axes */}
      <div className="absolute inset-0">
        {/* X-axis */}
        <div className={`absolute bottom-1/2 left-0 right-0 h-0.5 ${props.nightMode ? 'bg-white' : 'bg-black'}`} />
        <div className={`absolute bottom-1/2 right-4 text-xs font-bold ${props.nightMode ? 'text-white' : 'text-black'}`}>X</div>
        
        {/* Y-axis */}
        <div className={`absolute left-1/2 top-0 bottom-0 w-0.5 ${props.nightMode ? 'bg-white' : 'bg-black'}`} />
        <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 text-xs font-bold ${props.nightMode ? 'text-white' : 'text-black'}`}>Y</div>
      </div>

      {/* Trajectory path */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {props.trajectoryData.length > 1 && props.trajectoryData.slice(0, 100).map((point, index) => {
          if (index === 0) return null;
          const prevPoint = props.trajectoryData[index - 1];
          const x1 = 50 + prevPoint.x * sceneScale;
          const y1 = 50 - prevPoint.y * sceneScale;
          const x2 = 50 + point.x * sceneScale;
          const y2 = 50 - point.y * sceneScale;
          
          return (
            <line
              key={index}
              x1={`${x1}%`}
              y1={`${y1}%`}
              x2={`${x2}%`}
              y2={`${y2}%`}
              stroke={props.nightMode ? '#ffffff' : '#2563eb'}
              strokeWidth="2"
              opacity="0.8"
            />
          );
        })}
      </svg>

      {/* Projectile */}
      <div
        className="absolute w-4 h-4 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100"
        style={{
          left: `${50 + currentProjectilePosition.x * sceneScale}%`,
          top: `${50 - currentProjectilePosition.y * sceneScale}%`,
          backgroundColor: props.nightMode ? '#ffffff' : '#000000',
          boxShadow: props.nightMode 
            ? '0 0 20px rgba(255,255,255,0.5)' 
            : '0 0 20px rgba(0,0,0,0.3)',
          transform: `translate(-50%, -50%) ${props.isAnimating ? 'scale(1.2)' : 'scale(1)'}`
        }}
      />

      {/* Critical points */}
      {props.showCriticalPoints && props.prediction && (
        <>
          {/* Launch point */}
          <div
            className="absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2 bg-green-500"
            style={{
              left: '50%',
              top: `${50 - props.height * sceneScale}%`
            }}
          />
          
          {/* Max height point */}
          {props.prediction.maxHeightPoint && (
            <div
              className="absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2 bg-blue-500"
              style={{
                left: `${50 + props.prediction.maxHeightPoint.x * sceneScale}%`,
                top: `${50 - props.prediction.maxHeightPoint.y * sceneScale}%`
              }}
            />
          )}
          
          {/* Impact point */}
          <div
            className="absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2 bg-red-500"
            style={{
              left: `${50 + props.prediction.range * sceneScale}%`,
              top: '50%'
            }}
          />
        </>
      )}

      {/* Info panel */}
      <div className={`absolute top-4 right-4 p-3 rounded-lg text-xs ${
        props.nightMode ? 'bg-gray-800 text-white' : 'bg-white text-black shadow-lg'
      }`}>
        <div className="font-bold mb-2">
          {props.lang === 'ar' ? 'معلومات المحاكاة' : 'Simulation Info'}
        </div>
        <div className="space-y-1">
          <div>{props.lang === 'ar' ? 'السرعة:' : 'Velocity:'} {props.trajectoryData[0]?.speed || 0} m/s</div>
          <div>{props.lang === 'ar' ? 'الارتفاع:' : 'Height:'} {currentProjectilePosition.y.toFixed(1)} m</div>
          <div>{props.lang === 'ar' ? 'المدى:' : 'Range:'} {currentProjectilePosition.x.toFixed(1)} m</div>
          <div>{props.lang === 'ar' ? 'الوقت:' : 'Time:'} {props.currentTime.toFixed(2)} s</div>
        </div>
      </div>

      {/* 3D indicator */}
      <div className="absolute bottom-4 left-4 flex items-center space-x-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className={`text-xs font-medium ${props.nightMode ? 'text-white' : 'text-gray-700'}`}>
          {props.lang === 'ar' ? 'وضع 3D' : '3D Mode'}
        </span>
      </div>
    </div>
  );
};

export default Simulation3D;
