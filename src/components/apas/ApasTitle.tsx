import React from 'react';

interface ApasTitleProps {
  /** Rendered text. Defaults to "APAS". */
  text?: string;
  /** Tailwind font-size classes for the text, e.g. "text-5xl sm:text-7xl". */
  sizeClassName?: string;
  /** Extra classes for the wrapping <h1>. */
  className?: string;
  /** Use a plain <span> instead of <h1> (useful inside existing headings). */
  as?: 'h1' | 'span' | 'div';
  /** Disable the moving projectile / shimmer overlays (keeps letters only). */
  staticOnly?: boolean;
}

/**
 * Decorated APAS title:
 * - Per-letter gradient in brand colors (primary → indigo) with a gold inline ornament.
 * - Layered drop-shadows + subtle emboss for depth.
 * - A small animated "projectile" (glowing ball) sweeps across the title and slips
 *   between the letter gaps, echoing the projectile-analysis theme.
 * - A soft shimmer sweep passes over the letters periodically.
 * - Decorative flourishes on both ends (·— APAS —·).
 *
 * Keeps the color harmony of the existing blue/purple logo while adding the brand
 * gold accent used elsewhere in the app.
 */
const ApasTitle: React.FC<ApasTitleProps> = ({
  text = 'APAS',
  sizeClassName = 'text-5xl sm:text-7xl',
  className = '',
  as = 'h1',
  staticOnly = false,
}) => {
  const letters = text.split('');
  const Tag = as;

  return (
    <Tag
      className={`apas-title relative inline-flex items-center gap-1.5 sm:gap-2 font-black tracking-wider select-none ${sizeClassName} ${className}`}
      aria-label={text}
    >
      {/* Decorative flourish — left */}
      <span
        aria-hidden="true"
        className="apas-title-flourish hidden sm:inline-flex items-center gap-1 opacity-80"
      >
        <span className="apas-title-dot" />
        <span className="apas-title-dash" />
      </span>

      <span className="apas-title-letters relative inline-flex">
        {letters.map((ch, i) => (
          <span key={`${ch}-${i}`} className="apas-title-letter-wrap" style={{ animationDelay: `${i * 80}ms` }}>
            {/* Deep shadow layer */}
            <span aria-hidden="true" className="apas-title-letter apas-title-shadow">{ch}</span>
            {/* Gold ornament layer (behind gradient, shows as inline stroke) */}
            <span aria-hidden="true" className="apas-title-letter apas-title-gold">{ch}</span>
            {/* Gradient main letter */}
            <span className="apas-title-letter apas-title-main">{ch}</span>
            {/* Gloss highlight layer */}
            <span aria-hidden="true" className="apas-title-letter apas-title-gloss">{ch}</span>
          </span>
        ))}

        {/* Shimmer sweep across letters */}
        {!staticOnly && (
          <span aria-hidden="true" className="apas-title-shimmer" />
        )}

        {/* Animated projectile: a small glowing ball that arcs across the title and slips between letters */}
        {!staticOnly && (
          <span aria-hidden="true" className="apas-title-projectile">
            <span className="apas-title-projectile-trail" />
            <span className="apas-title-projectile-core" />
          </span>
        )}
      </span>

      {/* Decorative flourish — right */}
      <span
        aria-hidden="true"
        className="apas-title-flourish hidden sm:inline-flex items-center gap-1 opacity-80 [transform:scaleX(-1)]"
      >
        <span className="apas-title-dot" />
        <span className="apas-title-dash" />
      </span>

      <style>{`
        .apas-title { line-height: 1; isolation: isolate; }
        .apas-title-letters { position: relative; display: inline-flex; }

        .apas-title-letter-wrap {
          position: relative;
          display: inline-block;
          padding: 0 0.035em;
          transform-origin: 50% 80%;
          animation: apasTitlePop 900ms cubic-bezier(0.2, 0.9, 0.2, 1.1) both;
        }
        @keyframes apasTitlePop {
          0%   { opacity: 0; transform: translateY(14px) scale(0.86) rotate(-4deg); filter: blur(6px); }
          70%  { opacity: 1; filter: blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1) rotate(0); filter: blur(0); }
        }

        .apas-title-letter {
          display: inline-block;
          font-weight: 900;
          letter-spacing: inherit;
        }
        /* Stack all letter layers on top of each other */
        .apas-title-letter-wrap .apas-title-letter:not(:first-child) {
          position: absolute;
          inset: 0;
          padding: 0 0.035em;
        }

        /* Deep shadow layer — gives the letter depth */
        .apas-title-shadow {
          color: transparent;
          text-shadow:
            0 1px 0 hsl(var(--primary) / 0.25),
            0 2px 0 hsl(var(--primary) / 0.20),
            0 3px 0 hsl(var(--primary) / 0.15),
            0 4px 0 hsl(var(--primary) / 0.10),
            0 10px 24px hsl(var(--primary) / 0.45),
            0 20px 40px rgba(0, 0, 0, 0.25);
          -webkit-text-stroke: 0;
          z-index: 0;
        }

        /* Gold ornament — a slightly enlarged gold-stroked copy that peeks around the edges */
        .apas-title-gold {
          color: transparent;
          -webkit-text-stroke: 0.035em hsl(42 85% 55%);
          text-shadow:
            0 0 0.12em hsl(42 90% 60% / 0.55),
            0 0 0.28em hsl(42 95% 65% / 0.35);
          background: linear-gradient(180deg, #fde68a 0%, #f59e0b 45%, #b45309 100%);
          -webkit-background-clip: text;
          background-clip: text;
          transform: scale(1.04);
          transform-origin: 50% 55%;
          z-index: 1;
        }

        /* Main gradient letter — matches logo (indigo/primary → purple) */
        .apas-title-main {
          background: linear-gradient(135deg,
            hsl(var(--primary)) 0%,
            hsl(258 85% 62%) 40%,
            hsl(222 85% 55%) 70%,
            hsl(var(--primary) / 0.8) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-stroke: 0.012em hsl(var(--primary) / 0.4);
          filter: drop-shadow(0 1px 0 rgba(255,255,255,0.35));
          z-index: 2;
          position: relative;
        }

        /* Gloss highlight — a subtle top-half light reflection inside each letter */
        .apas-title-gloss {
          color: transparent;
          background: linear-gradient(180deg,
            rgba(255,255,255,0.85) 0%,
            rgba(255,255,255,0.25) 35%,
            rgba(255,255,255,0) 55%);
          -webkit-background-clip: text;
          background-clip: text;
          mix-blend-mode: screen;
          pointer-events: none;
          z-index: 3;
        }

        /* Shimmer sweep — a diagonal light bar that moves across the letters */
        .apas-title-shimmer {
          position: absolute;
          inset: -10% -5%;
          pointer-events: none;
          z-index: 4;
          background: linear-gradient(115deg,
            transparent 35%,
            rgba(255, 255, 255, 0.75) 48%,
            rgba(255, 240, 190, 0.55) 52%,
            transparent 65%);
          mix-blend-mode: screen;
          transform: translateX(-60%);
          animation: apasTitleShimmer 5.2s ease-in-out 1.1s infinite;
          /* Clip the shimmer to the letters via the parent's text layer — use mask on main letters */
          -webkit-mask: linear-gradient(#000, #000);
                  mask: linear-gradient(#000, #000);
        }
        @keyframes apasTitleShimmer {
          0%   { transform: translateX(-70%); opacity: 0; }
          15%  { opacity: 1; }
          60%  { transform: translateX(70%); opacity: 1; }
          100% { transform: translateX(70%); opacity: 0; }
        }

        /* Projectile: a glowing ball + soft trail that arcs across the title
           and drops between each letter gap. The keyframes do a bell-shaped
           vertical arc so it feels like a real projectile. */
        .apas-title-projectile {
          position: absolute;
          top: 50%;
          left: 0;
          width: 100%;
          height: 1px;
          pointer-events: none;
          z-index: 5;
        }
        .apas-title-projectile-core,
        .apas-title-projectile-trail {
          position: absolute;
          top: 0;
          left: 0;
          transform: translate(-50%, -50%);
          border-radius: 9999px;
          animation: apasTitleFly 4.8s cubic-bezier(0.37, 0, 0.63, 1) infinite;
        }
        .apas-title-projectile-core {
          width: 0.28em;
          height: 0.28em;
          background: radial-gradient(circle, #ffffff 0%, hsl(42 95% 62%) 45%, hsl(28 85% 50%) 80%, transparent 100%);
          box-shadow:
            0 0 0.25em hsl(42 95% 60%),
            0 0 0.5em hsl(42 90% 55% / 0.8),
            0 0 1em hsl(var(--primary) / 0.5);
        }
        .apas-title-projectile-trail {
          width: 0.6em;
          height: 0.18em;
          background: linear-gradient(90deg, transparent 0%, hsl(42 90% 60% / 0.75) 60%, #ffffff 100%);
          filter: blur(2.5px);
          opacity: 0.85;
          animation-name: apasTitleFlyTrail;
        }
        /* Horizontal + vertical motion combined gives the arc + "dipping between letters" effect */
        @keyframes apasTitleFly {
          0%   { left: -6%;   top: 55%; opacity: 0; transform: translate(-50%, -50%) scale(0.7); }
          8%   { opacity: 1; }
          15%  { left: 20%;   top: 30%; }
          25%  { left: 30%;   top: 58%; }
          35%  { left: 48%;   top: 28%; }
          45%  { left: 56%;   top: 60%; }
          55%  { left: 72%;   top: 28%; }
          65%  { left: 82%;   top: 60%; }
          80%  { left: 104%;  top: 38%; opacity: 1; }
          90%  { opacity: 0; }
          100% { left: 110%;  top: 40%; opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
        }
        @keyframes apasTitleFlyTrail {
          0%   { left: -10%;  top: 55%; opacity: 0; }
          10%  { opacity: 0.9; }
          15%  { left: 17%;   top: 30%; }
          25%  { left: 27%;   top: 58%; }
          35%  { left: 45%;   top: 28%; }
          45%  { left: 53%;   top: 60%; }
          55%  { left: 69%;   top: 28%; }
          65%  { left: 79%;   top: 60%; }
          80%  { left: 100%;  top: 38%; opacity: 0.8; }
          100% { left: 108%;  top: 40%; opacity: 0; }
        }

        /* Flourishes (·— —·) */
        .apas-title-flourish {
          color: hsl(42 85% 55%);
          line-height: 1;
        }
        .apas-title-dot {
          display: inline-block;
          width: 0.16em;
          height: 0.16em;
          border-radius: 9999px;
          background: radial-gradient(circle, #fde68a 0%, #d97706 70%, transparent 100%);
          box-shadow: 0 0 0.4em hsl(42 95% 60% / 0.7);
        }
        .apas-title-dash {
          display: inline-block;
          width: 0.9em;
          height: 0.08em;
          border-radius: 9999px;
          background: linear-gradient(90deg, transparent 0%, hsl(42 85% 55%) 35%, hsl(var(--primary)) 100%);
          box-shadow: 0 0 0.4em hsl(var(--primary) / 0.5);
        }

        @media (prefers-reduced-motion: reduce) {
          .apas-title-letter-wrap,
          .apas-title-shimmer,
          .apas-title-projectile-core,
          .apas-title-projectile-trail { animation: none !important; }
          .apas-title-projectile { display: none; }
          .apas-title-shimmer { display: none; }
        }
      `}</style>
    </Tag>
  );
};

export default ApasTitle;
