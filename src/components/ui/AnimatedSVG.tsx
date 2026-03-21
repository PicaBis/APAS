import React from 'react';

interface AnimatedSVGElementsProps {
  variant?: 'floating' | 'minimal' | 'full';
  className?: string;
}

export const AnimatedSVGElements: React.FC<AnimatedSVGElementsProps> = ({
  variant = 'minimal',
  className = '',
}) => {
  if (variant === 'floating') {
    return (
      <svg
        className={`absolute pointer-events-none ${className}`}
        viewBox="0 0 100 100"
        width="60"
        height="60"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <style>{`
            .float-circle { animation: float 3s ease-in-out infinite; }
            .float-rect { animation: float 3s ease-in-out infinite 0.5s; }
            .float-triangle { animation: float 3s ease-in-out infinite 1s; }
            @keyframes float {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-10px) rotate(5deg); }
            }
          `}</style>
        </defs>
        <circle
          cx="30"
          cy="30"
          r="8"
          fill="currentColor"
          opacity="0.3"
          className="float-circle"
        />
        <rect
          x="50"
          y="20"
          width="12"
          height="12"
          fill="currentColor"
          opacity="0.3"
          className="float-rect"
        />
        <polygon
          points="50,60 58,72 42,72"
          fill="currentColor"
          opacity="0.3"
          className="float-triangle"
        />
      </svg>
    );
  }

  if (variant === 'minimal') {
    return (
      <svg
        className={`inline animate-spin ${className}`}
        viewBox="0 0 24 24"
        width="20"
        height="20"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" opacity="0.25" />
        <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg
      className={`${className}`}
      viewBox="0 0 200 200"
      width="100"
      height="100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <style>{`
          @keyframes orbiting {
            from { transform: rotate(0deg) translateX(30px) rotate(0deg); }
            to { transform: rotate(360deg) translateX(30px) rotate(-360deg); }
          }
          .orbit-circle {
            animation: orbiting 4s linear infinite;
            transform-origin: 100px 100px;
          }
          @keyframes pulsing {
            0%, 100% { r: 4; opacity: 1; }
            50% { r: 6; opacity: 0.5; }
          }
          .pulse-dot {
            animation: pulsing 2s ease-in-out infinite;
          }
        `}</style>
      </defs>
      {/* Orbital circles */}
      <g className="orbit-circle">
        <circle cx="100" cy="70" r="4" fill="currentColor" opacity="0.4" />
      </g>
      <g className="orbit-circle" style={{ animationDelay: '-1.3s' }}>
        <circle cx="100" cy="70" r="3" fill="currentColor" opacity="0.3" />
      </g>
      {/* Center pulse */}
      <circle cx="100" cy="100" r="6" fill="currentColor" className="pulse-dot" />
    </svg>
  );
};

/* Loading Spinner Component */
export const AnimatedLoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  return (
    <div className={`spinner ${sizeMap[size]}`} />
  );
};

/* Animated Trajectory Particle */
export const ParticleEffect: React.FC<{
  x: number;
  y: number;
  duration?: number;
}> = ({ x, y, duration = 2 }) => {
  return (
    <div
      className="animate-particle-float"
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        pointerEvents: 'none',
        animationDuration: `${duration}s`,
      }}
    >
      <svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg">
        <circle cx="4" cy="4" r="3" fill="#3b82f6" opacity="0.7" />
      </svg>
    </div>
  );
};

/* Animated Wave Line */
export const AnimatedWaveLine: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  return (
    <svg
      className={`w-full h-8 ${className}`}
      viewBox="0 0 100 20"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <style>{`
          @keyframes wave {
            0%, 100% {
              d: path('M0,10 Q5,5 10,10 T20,10 T30,10 T40,10 T50,10 T60,10 T70,10 T80,10 T90,10 T100,10');
            }
            50% {
              d: path('M0,10 Q5,15 10,10 T20,10 T30,10 T40,10 T50,10 T60,10 T70,10 T80,10 T90,10 T100,10');
            }
          }
          .wave-path {
            animation: wave 2s ease-in-out infinite;
            stroke: currentColor;
            fill: none;
            stroke-width: 0.5;
            stroke-linecap: round;
          }
        `}</style>
      </defs>
      <path
        className="wave-path"
        d="M0,10 Q5,5 10,10 T20,10 T30,10 T40,10 T50,10 T60,10 T70,10 T80,10 T90,10 T100,10"
      />
    </svg>
  );
};

/* Animated Gradient Background */
export const AnimatedGradientBG: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  return (
    <div
      className={`animate-gradient ${className}`}
      style={{
        background: 'linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)',
        backgroundSize: '400% 400%',
      }}
    />
  );
};

/* Animated Dots Pattern */
export const AnimatedDotsPattern: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  return (
    <svg
      className={`w-full h-full ${className}`}
      viewBox="0 0 60 60"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <style>{`
          @keyframes dotPulse {
            0%, 100% { r: 1; opacity: 0.3; }
            50% { r: 2; opacity: 0.7; }
          }
          .dot { animation: dotPulse 2s ease-in-out infinite; }
          .dot:nth-child(1) { animation-delay: 0s; }
          .dot:nth-child(2) { animation-delay: 0.2s; }
          .dot:nth-child(3) { animation-delay: 0.4s; }
          .dot:nth-child(4) { animation-delay: 0.6s; }
          .dot:nth-child(5) { animation-delay: 0.8s; }
          .dot:nth-child(6) { animation-delay: 1s; }
        `}</style>
      </defs>
      <circle cx="10" cy="10" r="1" fill="currentColor" className="dot" />
      <circle cx="30" cy="10" r="1" fill="currentColor" className="dot" />
      <circle cx="50" cy="10" r="1" fill="currentColor" className="dot" />
      <circle cx="10" cy="30" r="1" fill="currentColor" className="dot" />
      <circle cx="30" cy="30" r="1" fill="currentColor" className="dot" />
      <circle cx="50" cy="30" r="1" fill="currentColor" className="dot" />
    </svg>
  );
};

export default AnimatedSVGElements;
