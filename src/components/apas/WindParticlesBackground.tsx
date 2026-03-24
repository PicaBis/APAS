import React, { useMemo } from 'react';
import { detectPerformance } from '@/utils/performanceDetect';

/**
 * Animated floating particles background — like wind-blown dots.
 * Similar to the HeaderWave particles but covers the full page background.
 * Pure CSS/SVG animation, no canvas, lightweight.
 *
 * On low-end devices or when prefers-reduced-motion is set, renders a
 * minimal static version (just a few faint dots, no animateMotion).
 */
const WindParticlesBackground: React.FC = () => {
  const perf = useMemo(() => detectPerformance(), []);

  // On low-end devices: render only a few static dots with no motion
  if (perf.shouldReduceAnimations) {
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1600 900"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="200" cy="200" r="3" fill="hsl(var(--primary))" opacity="0.15" />
          <circle cx="800" cy="400" r="4" fill="hsl(var(--primary))" opacity="0.12" />
          <circle cx="1200" cy="300" r="2.5" fill="hsl(var(--primary))" opacity="0.1" />
          <circle cx="400" cy="650" r="3.5" fill="hsl(var(--primary))" opacity="0.1" />
          <circle cx="1000" cy="700" r="3" fill="hsl(var(--primary))" opacity="0.08" />
        </svg>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Light mode particles */}
      <svg
        className="absolute inset-0 w-full h-full dark:hidden"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Large slow-moving particles */}
        <circle r="4" fill="hsl(var(--primary))" opacity="0.35">
          <animateMotion dur="20s" repeatCount="indefinite" path="M-30 200 Q400 150 800 250 T1630 180" />
        </circle>
        <circle r="3.5" fill="hsl(var(--primary))" opacity="0.3">
          <animateMotion dur="25s" repeatCount="indefinite" path="M-30 400 Q500 350 1000 450 T1630 380" begin="-5s" />
        </circle>
        <circle r="4.5" fill="hsl(var(--primary))" opacity="0.25">
          <animateMotion dur="28s" repeatCount="indefinite" path="M-30 600 Q300 550 700 650 T1630 580" begin="-10s" />
        </circle>

        {/* Medium flowing particles */}
        <circle r="3" fill="hsl(var(--primary))" opacity="0.38">
          <animateMotion dur="16s" repeatCount="indefinite" path="M-20 100 Q600 60 1200 120 T1620 80" begin="-2s" />
        </circle>
        <circle r="2.5" fill="hsl(var(--primary))" opacity="0.32">
          <animateMotion dur="18s" repeatCount="indefinite" path="M-20 300 Q400 280 900 340 T1620 290" begin="-7s" />
        </circle>
        <circle r="3" fill="hsl(var(--primary))" opacity="0.28">
          <animateMotion dur="22s" repeatCount="indefinite" path="M-20 500 Q700 460 1100 520 T1620 480" begin="-3s" />
        </circle>
        <circle r="2.5" fill="hsl(var(--primary))" opacity="0.35">
          <animateMotion dur="15s" repeatCount="indefinite" path="M-20 700 Q500 670 900 720 T1620 690" begin="-8s" />
        </circle>

        {/* Small fast particles — wind effect */}
        <circle r="2" fill="hsl(var(--primary))" opacity="0.4">
          <animateMotion dur="10s" repeatCount="indefinite" path="M-10 150 Q300 100 800 170 T1610 130" begin="-1s" />
        </circle>
        <circle r="1.8" fill="hsl(var(--primary))" opacity="0.38">
          <animateMotion dur="12s" repeatCount="indefinite" path="M-10 350 Q500 310 1000 370 T1610 330" begin="-4s" />
        </circle>
        <circle r="2" fill="hsl(var(--primary))" opacity="0.35">
          <animateMotion dur="9s" repeatCount="indefinite" path="M-10 550 Q400 520 850 570 T1610 540" begin="-6s" />
        </circle>
        <circle r="1.5" fill="hsl(var(--primary))" opacity="0.42">
          <animateMotion dur="8s" repeatCount="indefinite" path="M-10 750 Q600 720 1100 760 T1610 730" begin="-2s" />
        </circle>
        <circle r="1.8" fill="hsl(var(--primary))" opacity="0.34">
          <animateMotion dur="11s" repeatCount="indefinite" path="M-10 50 Q350 30 700 70 T1610 40" begin="-9s" />
        </circle>
        <circle r="2.5" fill="hsl(var(--primary))" opacity="0.3">
          <animateMotion dur="14s" repeatCount="indefinite" path="M-10 850 Q450 820 900 860 T1610 830" begin="-3s" />
        </circle>

        {/* Trajectory arcs flowing like wind */}
        <path d="M100 200 Q250 140 400 200" stroke="hsl(var(--primary))" strokeWidth="0.8" fill="none" opacity="0.18" strokeDasharray="6 4">
          <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="4s" repeatCount="indefinite" />
        </path>
        <path d="M600 400 Q750 340 900 400" stroke="hsl(var(--primary))" strokeWidth="0.8" fill="none" opacity="0.18" strokeDasharray="6 4">
          <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="5s" repeatCount="indefinite" />
        </path>
        <path d="M300 650 Q450 590 600 650" stroke="hsl(var(--primary))" strokeWidth="0.7" fill="none" opacity="0.15" strokeDasharray="5 5">
          <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="4.5s" repeatCount="indefinite" />
        </path>
        <path d="M1000 150 Q1150 90 1300 150" stroke="hsl(var(--primary))" strokeWidth="0.7" fill="none" opacity="0.15" strokeDasharray="5 5">
          <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="3.5s" repeatCount="indefinite" />
        </path>
      </svg>

      {/* Dark mode particles — slightly more glow */}
      <svg
        className="absolute inset-0 w-full h-full hidden dark:block"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle r="4" fill="hsl(var(--primary))" opacity="0.3">
          <animateMotion dur="20s" repeatCount="indefinite" path="M-30 200 Q400 150 800 250 T1630 180" />
        </circle>
        <circle r="3.5" fill="hsl(var(--primary))" opacity="0.25">
          <animateMotion dur="25s" repeatCount="indefinite" path="M-30 400 Q500 350 1000 450 T1630 380" begin="-5s" />
        </circle>
        <circle r="4.5" fill="hsl(var(--primary))" opacity="0.2">
          <animateMotion dur="28s" repeatCount="indefinite" path="M-30 600 Q300 550 700 650 T1630 580" begin="-10s" />
        </circle>

        <circle r="3" fill="hsl(var(--primary))" opacity="0.32">
          <animateMotion dur="16s" repeatCount="indefinite" path="M-20 100 Q600 60 1200 120 T1620 80" begin="-2s" />
        </circle>
        <circle r="2.5" fill="hsl(var(--primary))" opacity="0.28">
          <animateMotion dur="18s" repeatCount="indefinite" path="M-20 300 Q400 280 900 340 T1620 290" begin="-7s" />
        </circle>
        <circle r="3" fill="hsl(var(--primary))" opacity="0.22">
          <animateMotion dur="22s" repeatCount="indefinite" path="M-20 500 Q700 460 1100 520 T1620 480" begin="-3s" />
        </circle>

        <circle r="2" fill="hsl(var(--primary))" opacity="0.35">
          <animateMotion dur="10s" repeatCount="indefinite" path="M-10 150 Q300 100 800 170 T1610 130" begin="-1s" />
        </circle>
        <circle r="1.8" fill="hsl(var(--primary))" opacity="0.32">
          <animateMotion dur="12s" repeatCount="indefinite" path="M-10 350 Q500 310 1000 370 T1610 330" begin="-4s" />
        </circle>
        <circle r="2" fill="hsl(var(--primary))" opacity="0.3">
          <animateMotion dur="9s" repeatCount="indefinite" path="M-10 550 Q400 520 850 570 T1610 540" begin="-6s" />
        </circle>
        <circle r="1.5" fill="hsl(var(--primary))" opacity="0.36">
          <animateMotion dur="8s" repeatCount="indefinite" path="M-10 750 Q600 720 1100 760 T1610 730" begin="-2s" />
        </circle>
        <circle r="1.8" fill="hsl(var(--primary))" opacity="0.28">
          <animateMotion dur="11s" repeatCount="indefinite" path="M-10 50 Q350 30 700 70 T1610 40" begin="-9s" />
        </circle>

        {/* Trajectory arcs */}
        <path d="M100 200 Q250 140 400 200" stroke="hsl(var(--primary))" strokeWidth="0.8" fill="none" opacity="0.15" strokeDasharray="6 4">
          <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="4s" repeatCount="indefinite" />
        </path>
        <path d="M600 400 Q750 340 900 400" stroke="hsl(var(--primary))" strokeWidth="0.8" fill="none" opacity="0.15" strokeDasharray="6 4">
          <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="5s" repeatCount="indefinite" />
        </path>
      </svg>
    </div>
  );
};

export default WindParticlesBackground;
