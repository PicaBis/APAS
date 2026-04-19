import React from 'react';

interface ApasTitleProps {
  /** Rendered text. Defaults to "APAS". */
  text?: string;
  /** Tailwind font-size classes, e.g. "text-5xl sm:text-7xl". */
  sizeClassName?: string;
  /** Extra classes for the wrapping element. */
  className?: string;
  /** Element tag. Defaults to <h1>. */
  as?: 'h1' | 'span' | 'div';
  /** Disable motion (keeps static gradient). */
  staticOnly?: boolean;
}

/**
 * Brand title for "APAS".
 *
 * Colors match the logo: deep indigo → blue-violet → cyan-blue, with the logo's
 * signature gold dot used only as a tiny accent (thin inline highlight + the
 * flying "projectile" comet).
 *
 * The animation is intentionally restrained:
 *   - gentle fade-up entry, letter by letter
 *   - slow gradient shift that keeps the text alive
 *   - a single soft shimmer sweep
 *   - one small golden "projectile" that drifts across the title every few
 *     seconds (no bouncing — the user asked for something less busy)
 *
 * IMPORTANT: the letter row is forced to LTR so Arabic pages still show
 * "APAS" and never the reversed "SAPA".
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
      dir="ltr"
      className={`apas-title relative inline-flex items-center gap-2 sm:gap-3 font-black tracking-wider select-none ${sizeClassName} ${className}`}
      aria-label={text}
    >
      <span aria-hidden="true" className="apas-title-side opacity-80" />

      <span className="apas-title-letters relative inline-flex" dir="ltr">
        {letters.map((ch, i) => (
          <span
            key={`${ch}-${i}`}
            className="apas-title-letter-wrap"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <span className="apas-title-letter">{ch}</span>
          </span>
        ))}

        {!staticOnly && <span aria-hidden="true" className="apas-title-shimmer" />}
        {!staticOnly && <span aria-hidden="true" className="apas-title-projectile" />}
      </span>

      <span aria-hidden="true" className="apas-title-side apas-title-side-right opacity-80" />

      <style>{`
        .apas-title {
          line-height: 1;
          isolation: isolate;
          filter: drop-shadow(0 4px 10px hsl(234 70% 40% / 0.28))
                  drop-shadow(0 1px 0 hsl(0 0% 100% / 0.35));
        }

        .apas-title-letters {
          position: relative;
          display: inline-flex;
          /* Keep latin order even when inside an RTL page */
          direction: ltr;
          unicode-bidi: isolate;
        }

        /* ---------- Letter ---------- */
        .apas-title-letter-wrap {
          display: inline-block;
          padding: 0 0.035em;
          transform-origin: 50% 80%;
          animation: apasTitleEnter 900ms cubic-bezier(0.2, 0.9, 0.2, 1.05) both;
        }
        @keyframes apasTitleEnter {
          0%   { opacity: 0; transform: translateY(14px) scale(0.88); filter: blur(8px); }
          70%  { opacity: 1; filter: blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }

        .apas-title-letter {
          display: inline-block;
          font-weight: 900;
          /* Logo-accurate blue-violet gradient */
          background: linear-gradient(180deg,
            #a5b4fc 0%,              /* soft indigo highlight */
            #6366f1 22%,             /* indigo */
            #4f46e5 48%,             /* primary */
            #3b82f6 74%,             /* blue */
            #1e3a8a 100%);           /* deep navy like the logo ring */
          background-size: 100% 220%;
          background-position: 0% 0%;
          -webkit-background-clip: text;
                  background-clip: text;
          color: transparent;
          -webkit-text-stroke: 0.012em hsl(234 60% 30% / 0.55);
          animation: apasTitleHueShift 8s ease-in-out infinite;
          text-shadow:
            0 1px 0 rgba(255, 255, 255, 0.25);
        }
        @keyframes apasTitleHueShift {
          0%, 100% { background-position: 0% 0%; }
          50%      { background-position: 0% 100%; }
        }

        /* ---------- Shimmer sweep ---------- */
        .apas-title-shimmer {
          position: absolute;
          inset: -8% -4%;
          pointer-events: none;
          background: linear-gradient(115deg,
            transparent 42%,
            rgba(255, 255, 255, 0.55) 49%,
            rgba(221, 230, 255, 0.6) 51%,
            transparent 58%);
          mix-blend-mode: screen;
          transform: translateX(-120%);
          animation: apasTitleShimmer 6s ease-in-out 1.2s infinite;
          z-index: 2;
        }
        @keyframes apasTitleShimmer {
          0%   { transform: translateX(-120%); opacity: 0; }
          20%  { opacity: 1; }
          70%  { transform: translateX(120%); opacity: 1; }
          100% { transform: translateX(120%); opacity: 0; }
        }

        /* ---------- Projectile (tiny gold comet drifts across) ---------- */
        .apas-title-projectile {
          position: absolute;
          top: 22%;
          left: -12%;
          width: 0.9em;
          height: 0.22em;
          pointer-events: none;
          z-index: 3;
          border-radius: 9999px;
          background: linear-gradient(90deg,
            transparent 0%,
            rgba(253, 224, 71, 0.0) 10%,
            rgba(253, 224, 71, 0.55) 60%,
            #fde68a 85%,
            #ffffff 100%);
          filter: blur(0.6px)
                  drop-shadow(0 0 0.35em hsl(42 95% 60% / 0.85))
                  drop-shadow(0 0 0.7em hsl(42 90% 55% / 0.45));
          opacity: 0;
          animation: apasTitleShoot 7s linear 0.9s infinite;
        }
        @keyframes apasTitleShoot {
          0%    { transform: translateX(0) translateY(0); opacity: 0; }
          6%    { opacity: 0.9; }
          50%   { transform: translateX(60em) translateY(-0.02em); opacity: 1; }
          92%   { transform: translateX(120em) translateY(0); opacity: 0.9; }
          100%  { transform: translateX(130em) translateY(0); opacity: 0; }
        }

        /* ---------- Side flourishes ---------- */
        .apas-title-side {
          display: inline-block;
          width: 1em;
          height: 0.12em;
          border-radius: 9999px;
          background: linear-gradient(90deg,
            transparent 0%,
            hsl(234 70% 55% / 0.0) 5%,
            hsl(234 75% 60% / 0.8) 60%,
            hsl(42 85% 55%) 100%);
          box-shadow: 0 0 0.5em hsl(234 75% 55% / 0.6);
        }
        .apas-title-side-right {
          transform: scaleX(-1);
        }

        @media (prefers-reduced-motion: reduce) {
          .apas-title-letter-wrap,
          .apas-title-letter,
          .apas-title-shimmer,
          .apas-title-projectile { animation: none !important; }
          .apas-title-shimmer,
          .apas-title-projectile { display: none; }
        }
      `}</style>
    </Tag>
  );
};

export default ApasTitle;
