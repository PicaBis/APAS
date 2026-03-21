import React from 'react';

interface ApasLogoProps {
  size?: number;
  animated?: boolean;
}

const ApasLogo: React.FC<ApasLogoProps> = ({ size = 64, animated = false }) => {
  const id = `apas-${size}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        filter: `drop-shadow(0 2px 10px rgba(20,184,166,0.3)) drop-shadow(0 4px 20px rgba(0,136,255,0.15))`,
      }}
    >
      <defs>
        {/* Hexagon border gradient - cyan to blue with richer stops */}
        <linearGradient id={`${id}-border`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00ffcc" />
          <stop offset="25%" stopColor="#00e5c8" />
          <stop offset="50%" stopColor="#00d4ff" />
          <stop offset="75%" stopColor="#0099ff" />
          <stop offset="100%" stopColor="#0066ff" />
        </linearGradient>

        {/* Shield fill - subtle glass-like gradient */}
        <linearGradient id={`${id}-fill`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#e0faf5" stopOpacity="0.15" />
          <stop offset="40%" stopColor="#e0f7fa" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#b2ebf2" stopOpacity="0.04" />
        </linearGradient>

        {/* Inner glass reflection */}
        <linearGradient id={`${id}-glass`} x1="0.5" y1="0" x2="0.5" y2="0.5">
          <stop offset="0%" stopColor="white" stopOpacity="0.12" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        {/* Trajectory gradient - green to cyan to blue with more vibrancy */}
        <linearGradient id={`${id}-traj`} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0%" stopColor="#00e676" stopOpacity="0.7" />
          <stop offset="20%" stopColor="#00e5c8" />
          <stop offset="50%" stopColor="#00d4ff" />
          <stop offset="80%" stopColor="#2196f3" />
          <stop offset="100%" stopColor="#448aff" />
        </linearGradient>

        {/* Secondary trajectory for depth */}
        <linearGradient id={`${id}-traj2`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00e676" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#448aff" stopOpacity="0.3" />
        </linearGradient>

        {/* Glow filter for trajectory - enhanced */}
        <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Sparkle glow - brighter */}
        <filter id={`${id}-sparkle`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Outer glow for hexagon - deeper */}
        <filter id={`${id}-hexglow`} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* AI badge gradient */}
        <linearGradient id={`${id}-aibadge`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00e5c8" />
          <stop offset="100%" stopColor="#0088ff" />
        </linearGradient>
      </defs>

      {/* Outer hexagon border with enhanced glow */}
      <path
        d="M60 8 L104 30 L104 74 L60 112 L16 74 L16 30 Z"
        stroke={`url(#${id}-border)`}
        strokeWidth="3.5"
        fill={`url(#${id}-fill)`}
        strokeLinejoin="round"
        filter={`url(#${id}-hexglow)`}
      />

      {/* Glass reflection on upper portion */}
      <path
        d="M60 10 L102 31 L102 52 L60 60 L18 52 L18 31 Z"
        fill={`url(#${id}-glass)`}
      />

      {/* Inner border - refined double line */}
      <path
        d="M60 14 L99 33 L99 71 L60 106 L21 71 L21 33 Z"
        stroke="white"
        strokeWidth="0.8"
        fill="none"
        opacity="0.25"
        strokeLinejoin="round"
      />
      <path
        d="M60 17 L96 34.5 L96 69.5 L60 103 L24 69.5 L24 34.5 Z"
        stroke="white"
        strokeWidth="0.3"
        fill="none"
        opacity="0.1"
        strokeLinejoin="round"
      />

      {/* Grid lines inside hexagon - refined with varying opacity */}
      <line x1="28" y1="82" x2="92" y2="82" stroke="#00d4ff" strokeWidth="0.5" opacity="0.18" />
      <line x1="28" y1="68" x2="92" y2="68" stroke="#00d4ff" strokeWidth="0.35" opacity="0.12" strokeDasharray="3 3" />
      <line x1="28" y1="54" x2="92" y2="54" stroke="#00d4ff" strokeWidth="0.35" opacity="0.12" strokeDasharray="3 3" />
      <line x1="28" y1="40" x2="92" y2="40" stroke="#00d4ff" strokeWidth="0.3" opacity="0.08" strokeDasharray="2 4" />
      <line x1="40" y1="28" x2="40" y2="90" stroke="#00d4ff" strokeWidth="0.3" opacity="0.08" strokeDasharray="2 4" />
      <line x1="60" y1="20" x2="60" y2="95" stroke="#00d4ff" strokeWidth="0.35" opacity="0.1" strokeDasharray="3 3" />
      <line x1="80" y1="28" x2="80" y2="90" stroke="#00d4ff" strokeWidth="0.3" opacity="0.08" strokeDasharray="2 4" />

      {/* Axis markers - small ticks for precision feel */}
      <line x1="27" y1="82" x2="30" y2="82" stroke="#00e5c8" strokeWidth="1" opacity="0.3" />
      <line x1="28" y1="83" x2="28" y2="80" stroke="#00e5c8" strokeWidth="1" opacity="0.3" />

      {/* Secondary trajectory shadow for depth */}
      <path
        d="M30 83 C38 79, 46 38, 60 30 C74 22, 86 58, 96 83"
        stroke={`url(#${id}-traj2)`}
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        opacity="0.4"
      />

      {/* Main parabolic trajectory with enhanced glow */}
      <path
        d="M28 82 C36 78, 44 36, 58 28 C72 20, 84 56, 94 82"
        stroke={`url(#${id}-traj)`}
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
        filter={`url(#${id}-glow)`}
        className={animated ? 'apas-logo-path' : ''}
      />

      {/* Trajectory inner highlight - sharper */}
      <path
        d="M30 81 C38 77, 45 38, 58 30 C71 22, 83 57, 93 81"
        stroke="white"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
        opacity="0.35"
      />

      {/* Launch point indicator */}
      <circle cx="28" cy="82" r="2.5" fill="#00e676" opacity="0.8" filter={`url(#${id}-sparkle)`} />
      <circle cx="28" cy="82" r="1" fill="white" opacity="0.9" />

      {/* Impact point indicator */}
      <circle cx="94" cy="82" r="2.5" fill="#448aff" opacity="0.8" filter={`url(#${id}-sparkle)`} />
      <circle cx="94" cy="82" r="1" fill="white" opacity="0.9" />

      {/* Apex indicator - small crosshair */}
      <line x1="56" y1="26" x2="60" y2="26" stroke="#00e5c8" strokeWidth="0.6" opacity="0.5" />
      <line x1="58" y1="24" x2="58" y2="28" stroke="#00e5c8" strokeWidth="0.6" opacity="0.5" />

      {/* Sparkle dots along trajectory - enhanced with varying sizes */}
      {[
        { cx: 35, cy: 72, r: 2, delay: 0 },
        { cx: 42, cy: 52, r: 2.5, delay: 0.25 },
        { cx: 50, cy: 36, r: 1.8, delay: 0.5 },
        { cx: 58, cy: 28, r: 3, delay: 0.75 },
        { cx: 66, cy: 34, r: 1.8, delay: 1.0 },
        { cx: 74, cy: 48, r: 2.5, delay: 1.25 },
        { cx: 82, cy: 64, r: 2, delay: 1.5 },
        { cx: 88, cy: 76, r: 1.5, delay: 1.75 },
      ].map((s, i) => (
        <circle
          key={i}
          cx={s.cx}
          cy={s.cy}
          r={s.r}
          fill="white"
          opacity="0.75"
          filter={`url(#${id}-sparkle)`}
        >
          {animated && (
            <animate
              attributeName="opacity"
              values="0.3;1;0.3"
              dur="2.2s"
              begin={`${s.delay}s`}
              repeatCount="indefinite"
            />
          )}
        </circle>
      ))}

      {/* Velocity vector arrow at launch */}
      <line x1="28" y1="82" x2="36" y2="70" stroke="#00e676" strokeWidth="1" opacity="0.5" />
      <polygon points="36,70 34,73 37.5,72" fill="#00e676" opacity="0.5" />

      {/* AI badge - premium rounded pill with gradient */}
      <rect x="71" y="87" width="26" height="15" rx="7.5" fill={`url(#${id}-aibadge)`} opacity="0.95" />
      <rect x="71" y="87" width="26" height="15" rx="7.5" fill="none" stroke="white" strokeWidth="0.6" opacity="0.35" />
      {/* AI badge inner highlight */}
      <rect x="72" y="88" width="24" height="7" rx="6" fill="white" opacity="0.1" />
      <text
        x="84"
        y="97.5"
        textAnchor="middle"
        fontSize="9"
        fontWeight="800"
        fill="white"
        fontFamily="Inter, system-ui, sans-serif"
        letterSpacing="0.5"
      >
        AI
      </text>

      {/* Corner accent dots for premium feel */}
      <circle cx="60" cy="11" r="1" fill="#00e5c8" opacity="0.4" />
      <circle cx="102" cy="31" r="1" fill="#00d4ff" opacity="0.3" />
      <circle cx="102" cy="73" r="1" fill="#0088ff" opacity="0.3" />

      {animated && (
        <style>{`
          @keyframes apasPathDraw {
            0% { stroke-dashoffset: 200; }
            100% { stroke-dashoffset: 0; }
          }
          .apas-logo-path {
            stroke-dasharray: 200;
            animation: apasPathDraw 2s ease-out forwards;
          }
        `}</style>
      )}
    </svg>
  );
};

export default ApasLogo;
