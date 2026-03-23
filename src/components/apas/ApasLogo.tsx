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
        filter: `drop-shadow(0 2px 10px rgba(26,26,62,0.4)) drop-shadow(0 4px 20px rgba(201,168,76,0.2))`,
      }}
    >
      <defs>
        {/* Background circle gradient - deep navy to indigo */}
        <radialGradient id={`${id}-bg`} cx="0.5" cy="0.5" r="0.55">
          <stop offset="0%" stopColor="#2d3a6e" />
          <stop offset="50%" stopColor="#232b55" />
          <stop offset="100%" stopColor="#1a1a3e" />
        </radialGradient>

        {/* A letter gradient - silver blue to light slate */}
        <linearGradient id={`${id}-letter`} x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#a8b8d8" />
          <stop offset="30%" stopColor="#8a9cc5" />
          <stop offset="60%" stopColor="#6b7db5" />
          <stop offset="100%" stopColor="#5a6da5" />
        </linearGradient>

        {/* Golden dot gradient */}
        <radialGradient id={`${id}-gold`} cx="0.4" cy="0.35" r="0.6">
          <stop offset="0%" stopColor="#e8c85a" />
          <stop offset="50%" stopColor="#d4aa4f" />
          <stop offset="100%" stopColor="#c9a84c" />
        </radialGradient>

        {/* Subtle glass reflection */}
        <linearGradient id={`${id}-glass`} x1="0.5" y1="0" x2="0.5" y2="0.6">
          <stop offset="0%" stopColor="white" stopOpacity="0.08" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        {/* Glow filter for golden dot */}
        <filter id={`${id}-goldglow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Outer glow for circle */}
        <filter id={`${id}-circleglow`} x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main circular background */}
      <circle
        cx="60"
        cy="60"
        r="54"
        fill={`url(#${id}-bg)`}
        filter={`url(#${id}-circleglow)`}
      />

      {/* Subtle border ring */}
      <circle
        cx="60"
        cy="60"
        r="53"
        fill="none"
        stroke="#3a4a8a"
        strokeWidth="1"
        opacity="0.4"
      />

      {/* Glass reflection on upper portion */}
      <ellipse
        cx="60"
        cy="42"
        rx="40"
        ry="30"
        fill={`url(#${id}-glass)`}
      />

      {/* Stylized "A" letter - main strokes */}
      {/* Left stroke of A */}
      <path
        d="M38 88 L55 32 Q56 29 58 29"
        stroke={`url(#${id}-letter)`}
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right stroke of A - curves elegantly */}
      <path
        d="M58 29 Q60 29 62 32 L82 88"
        stroke={`url(#${id}-letter)`}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      {/* Crossbar of A - slightly angled */}
      <path
        d="M44 70 L72 62"
        stroke={`url(#${id}-letter)`}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* Golden accent dot - top right area */}
      <circle
        cx="72"
        cy="30"
        r="7"
        fill={`url(#${id}-gold)`}
        filter={`url(#${id}-goldglow)`}
        className={animated ? 'apas-gold-dot' : ''}
      />
      {/* Golden dot highlight */}
      <circle
        cx="70"
        cy="28"
        r="2.5"
        fill="white"
        opacity="0.3"
      />

      {/* Small decorative dots */}
      <circle cx="30" cy="48" r="1" fill="#6b7db5" opacity="0.3" />
      <circle cx="88" cy="68" r="1" fill="#6b7db5" opacity="0.2" />

      {animated && (
        <style>{`
          @keyframes apasGoldPulse {
            0%, 100% { opacity: 1; transform-origin: 72px 30px; transform: scale(1); }
            50% { opacity: 0.85; transform-origin: 72px 30px; transform: scale(1.15); }
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
