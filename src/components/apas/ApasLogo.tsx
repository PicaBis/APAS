import React from 'react';

interface ApasLogoProps {
  size?: number;
  animated?: boolean;
}

const ApasLogo: React.FC<ApasLogoProps> = ({ size = 64, animated = false }) => {
  const id = React.useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        filter: `drop-shadow(0 2px 8px rgba(26,26,62,0.35))`,
      }}
    >
      <defs>
        {/* Background circle gradient - deep navy to darker navy */}
        <radialGradient id={`${id}-bg`} cx="0.45" cy="0.4" r="0.6">
          <stop offset="0%" stopColor="#2a3568" />
          <stop offset="40%" stopColor="#222d58" />
          <stop offset="75%" stopColor="#1c2248" />
          <stop offset="100%" stopColor="#161a38" />
        </radialGradient>

        {/* Subtle edge highlight for 3D depth */}
        <radialGradient id={`${id}-rim`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="88%" stopColor="transparent" />
          <stop offset="95%" stopColor="rgba(60,75,130,0.15)" />
          <stop offset="100%" stopColor="rgba(40,50,100,0.3)" />
        </radialGradient>

        {/* A letter gradient - light silvery blue */}
        <linearGradient id={`${id}-letter`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#b8c8e8" />
          <stop offset="35%" stopColor="#95a8d0" />
          <stop offset="70%" stopColor="#7b8fc0" />
          <stop offset="100%" stopColor="#6878aa" />
        </linearGradient>

        {/* Lighter stroke for the right leg */}
        <linearGradient id={`${id}-letter2`} x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#a0b0d0" />
          <stop offset="100%" stopColor="#7888b5" />
        </linearGradient>

        {/* Golden dot gradient */}
        <radialGradient id={`${id}-gold`} cx="0.4" cy="0.35" r="0.55">
          <stop offset="0%" stopColor="#f0d060" />
          <stop offset="40%" stopColor="#dbb44e" />
          <stop offset="100%" stopColor="#c9a040" />
        </radialGradient>

        {/* Subtle top glass reflection */}
        <linearGradient id={`${id}-glass`} x1="0.5" y1="0" x2="0.5" y2="0.55">
          <stop offset="0%" stopColor="white" stopOpacity="0.06" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        {/* Golden dot glow */}
        <filter id={`${id}-goldglow`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main circular background */}
      <circle cx="60" cy="60" r="56" fill={`url(#${id}-bg)`} />

      {/* Rim depth effect */}
      <circle cx="60" cy="60" r="56" fill={`url(#${id}-rim)`} />

      {/* Very subtle border */}
      <circle cx="60" cy="60" r="55.5" fill="none" stroke="#3a4a80" strokeWidth="0.5" opacity="0.3" />

      {/* Glass reflection on upper portion */}
      <ellipse cx="58" cy="40" rx="38" ry="28" fill={`url(#${id}-glass)`} />

      {/* Left main stroke - thick, sweeping upward from bottom-left to apex */}
      <path
        d="M32 90 C34 82, 38 68, 44 56 C50 44, 54 36, 57 30 Q58.5 27, 60 27"
        stroke={`url(#${id}-letter)`}
        strokeWidth="6.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right stroke - thinner, flowing from apex down to the right */}
      <path
        d="M60 27 Q62 27, 64 32 C68 40, 74 54, 80 68 C83 75, 85 80, 86 84"
        stroke={`url(#${id}-letter2)`}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.75"
      />

      {/* Crossbar - subtle angled line across the A */}
      <path
        d="M42 72 L74 63"
        stroke={`url(#${id}-letter2)`}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity="0.4"
      />

      {/* Golden accent dot - positioned at top-right near the apex */}
      <circle
        cx="70"
        cy="28"
        r="6.5"
        fill={`url(#${id}-gold)`}
        filter={`url(#${id}-goldglow)`}
        className={animated ? 'apas-gold-dot' : ''}
      />
      {/* Small specular highlight on the golden dot */}
      <circle cx="68.5" cy="26" r="2" fill="white" opacity="0.25" />

      {animated && (
        <style>{`
          @keyframes apasGoldPulse {
            0%, 100% { opacity: 1; transform-origin: 70px 28px; transform: scale(1); }
            50% { opacity: 0.85; transform-origin: 70px 28px; transform: scale(1.12); }
          }
          .apas-gold-dot {
            animation: apasGoldPulse 3s ease-in-out infinite;
          }
        `}</style>
      )}
    </svg>
  );
};

export default ApasLogo;
