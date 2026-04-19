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
}

/**
 * Static, professional "text-effect" brand logo for APAS.
 *
 * The look is modeled on editorial text-effect templates (Freepik / Envato style):
 *   - deep navy 3D offset shadow for depth
 *   - thick dark outer stroke
 *   - indigo → royal-blue → navy vertical gradient fill (matches the logo)
 *   - thin gold edge highlight peeking over the top of each letter
 *   - a subtle white gloss on the upper half of each letter
 *
 * No animations. The letter row is forced LTR so Arabic pages still read "APAS",
 * never the mirrored "SAPA".
 */
const ApasTitle: React.FC<ApasTitleProps> = ({
  text = 'APAS',
  sizeClassName = 'text-5xl sm:text-7xl',
  className = '',
  as = 'h1',
}) => {
  const letters = text.split('');
  const Tag = as;

  return (
    <Tag
      dir="ltr"
      className={`apas-title font-black tracking-wider select-none inline-block ${sizeClassName} ${className}`}
      aria-label={text}
    >
      <span className="apas-title-letters" dir="ltr">
        {letters.map((ch, i) => (
          <span key={`${ch}-${i}`} className="apas-title-letter-wrap">
            {/* 3D extruded shadow (deep navy offsets) */}
            <span aria-hidden="true" className="apas-title-letter apas-title-extrude">{ch}</span>
            {/* Thick outer dark stroke */}
            <span aria-hidden="true" className="apas-title-letter apas-title-stroke">{ch}</span>
            {/* Gold edge highlight behind the main fill — shows a thin rim */}
            <span aria-hidden="true" className="apas-title-letter apas-title-gold">{ch}</span>
            {/* Main gradient fill */}
            <span className="apas-title-letter apas-title-fill">{ch}</span>
            {/* Upper gloss highlight */}
            <span aria-hidden="true" className="apas-title-letter apas-title-gloss">{ch}</span>
          </span>
        ))}
      </span>

      <style>{`
        .apas-title {
          line-height: 1.05;
          isolation: isolate;
        }
        .apas-title-letters {
          display: inline-flex;
          direction: ltr;
          unicode-bidi: isolate;
        }
        .apas-title-letter-wrap {
          position: relative;
          display: inline-block;
          padding: 0 0.04em;
        }
        .apas-title-letter {
          display: inline-block;
          font-weight: 900;
          letter-spacing: inherit;
          line-height: 1;
        }
        /* Stack all layers perfectly on top of the first */
        .apas-title-letter-wrap .apas-title-letter:not(:first-child) {
          position: absolute;
          inset: 0;
          padding: 0 0.04em;
        }

        /* 1) 3D extruded depth — many tiny offsets build a solid slab */
        .apas-title-extrude {
          color: #0b1440;
          text-shadow:
            1px 1px 0 #0b1440,
            2px 2px 0 #0b1440,
            3px 3px 0 #0b1440,
            4px 4px 0 #0b1440,
            5px 5px 0 #0b1440,
            6px 6px 0 #0b1440,
            7px 7px 0 #0b1440,
            8px 8px 0 #0b1440,
            10px 12px 24px rgba(11, 20, 64, 0.55);
          z-index: 0;
        }

        /* 2) Thick outer stroke */
        .apas-title-stroke {
          color: transparent;
          -webkit-text-stroke: 0.08em #0b1440;
          z-index: 1;
        }

        /* 3) Gold edge highlight — slightly larger + offset upward so it peeks as a rim */
        .apas-title-gold {
          color: transparent;
          -webkit-text-stroke: 0.04em #d4a441;
          transform: translate(-0.5px, -1.5px) scale(1.01);
          transform-origin: 50% 50%;
          filter: drop-shadow(0 0 0.08em rgba(212, 164, 65, 0.6));
          z-index: 2;
        }

        /* 4) Main gradient fill — logo-accurate blue/indigo */
        .apas-title-fill {
          background: linear-gradient(180deg,
            #8b9cff 0%,
            #6a7bff 22%,
            #4f46e5 48%,
            #3b46c4 72%,
            #1e2a8a 100%);
          -webkit-background-clip: text;
                  background-clip: text;
          color: transparent;
          -webkit-text-stroke: 0.005em rgba(11, 20, 64, 0.6);
          z-index: 3;
        }

        /* 5) Upper gloss — a soft reflection on the top half */
        .apas-title-gloss {
          background: linear-gradient(180deg,
            rgba(255, 255, 255, 0.75) 0%,
            rgba(255, 255, 255, 0.25) 34%,
            rgba(255, 255, 255, 0) 52%);
          -webkit-background-clip: text;
                  background-clip: text;
          color: transparent;
          mix-blend-mode: screen;
          pointer-events: none;
          z-index: 4;
        }
      `}</style>
    </Tag>
  );
};

export default ApasTitle;
