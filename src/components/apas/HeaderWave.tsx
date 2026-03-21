import React from 'react';

/**
 * Animated wave + floating particles along the bottom of the header.
 * Pure CSS/SVG animation, no canvas, lightweight.
 * Particles are now more visible with increased opacity, size, and count.
 */
export default function HeaderWave() {
  return (
    <>
      <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden pointer-events-none">
        <div className="header-wave-track" />
        <div className="header-wave-glow" />
      </div>

      {/* Light mode: animated sparkle particles floating across header — more visible */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none dark:hidden">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1600 56" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          {/* Primary floating dots — larger and more opaque */}
          <circle r="2.5" fill="hsl(var(--primary))" opacity="0.22">
            <animateMotion dur="11s" repeatCount="indefinite" path="M-20 28 Q400 10 800 28 T1620 28" />
          </circle>
          <circle r="1.8" fill="hsl(var(--primary))" opacity="0.2">
            <animateMotion dur="14s" repeatCount="indefinite" path="M-20 35 Q500 45 1000 20 T1620 35" begin="-3s" />
          </circle>
          <circle r="3" fill="hsl(var(--primary))" opacity="0.15">
            <animateMotion dur="16s" repeatCount="indefinite" path="M-20 20 Q300 40 700 15 T1620 25" begin="-7s" />
          </circle>
          <circle r="2" fill="hsl(var(--primary))" opacity="0.2">
            <animateMotion dur="9s" repeatCount="indefinite" path="M-20 40 Q600 8 1200 35 T1620 22" begin="-5s" />
          </circle>
          {/* Additional particles for density */}
          <circle r="1.5" fill="hsl(var(--primary))" opacity="0.18">
            <animateMotion dur="13s" repeatCount="indefinite" path="M-20 18 Q350 42 800 22 T1620 30" begin="-2s" />
          </circle>
          <circle r="2.2" fill="hsl(var(--primary))" opacity="0.16">
            <animateMotion dur="17s" repeatCount="indefinite" path="M-20 44 Q700 12 1100 38 T1620 20" begin="-9s" />
          </circle>
          <circle r="1.2" fill="hsl(var(--primary))" opacity="0.25">
            <animateMotion dur="8s" repeatCount="indefinite" path="M-20 30 Q200 15 600 35 T1620 28" begin="-1s" />
          </circle>
          {/* Tiny trajectory arcs — more visible */}
          <path d="M200 42 Q250 15 300 42" stroke="hsl(var(--primary))" strokeWidth="0.7" fill="none" opacity="0.12"
            strokeDasharray="4 3">
            <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="3s" repeatCount="indefinite" />
          </path>
          <path d="M900 38 Q960 12 1020 38" stroke="hsl(var(--primary))" strokeWidth="0.7" fill="none" opacity="0.12"
            strokeDasharray="4 3">
            <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="4s" repeatCount="indefinite" />
          </path>
          <path d="M550 40 Q600 14 650 40" stroke="hsl(var(--primary))" strokeWidth="0.6" fill="none" opacity="0.1"
            strokeDasharray="3 4">
            <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="3.5s" repeatCount="indefinite" />
          </path>
          {/* Faint connecting lines between particles */}
          <line x1="0" y1="28" x2="1600" y2="28" stroke="hsl(var(--primary))" strokeWidth="0.2" opacity="0.04" />
        </svg>
      </div>

      {/* Dark mode: subtle particles too */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden dark:block">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1600 56" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <circle r="2" fill="hsl(var(--primary))" opacity="0.15">
            <animateMotion dur="12s" repeatCount="indefinite" path="M-20 28 Q400 10 800 28 T1620 28" />
          </circle>
          <circle r="1.5" fill="hsl(var(--primary))" opacity="0.12">
            <animateMotion dur="15s" repeatCount="indefinite" path="M-20 35 Q500 45 1000 20 T1620 35" begin="-4s" />
          </circle>
          <circle r="2.5" fill="hsl(var(--primary))" opacity="0.1">
            <animateMotion dur="18s" repeatCount="indefinite" path="M-20 20 Q300 40 700 15 T1620 25" begin="-8s" />
          </circle>
        </svg>
      </div>

      <style>{`
        .header-wave-track {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            hsl(var(--primary) / 0.08) 10%,
            hsl(var(--primary) / 0.25) 20%,
            hsl(var(--primary) / 0.4) 30%,
            hsl(var(--primary) / 0.25) 40%,
            hsl(var(--primary) / 0.08) 50%,
            transparent 60%,
            hsl(var(--primary) / 0.06) 70%,
            hsl(var(--primary) / 0.22) 80%,
            hsl(var(--primary) / 0.06) 90%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: headerWaveFlow 7s ease-in-out infinite;
        }
        .header-wave-glow {
          position: absolute;
          inset: -2px 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            hsl(var(--primary) / 0.1) 25%,
            hsl(var(--primary) / 0.2) 50%,
            hsl(var(--primary) / 0.1) 75%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: headerWaveFlow 7s ease-in-out infinite;
          filter: blur(3px);
        }
        @keyframes headerWaveFlow {
          0% { background-position: 100% 0; }
          50% { background-position: -100% 0; }
          100% { background-position: 100% 0; }
        }
      `}</style>
    </>
  );
}
