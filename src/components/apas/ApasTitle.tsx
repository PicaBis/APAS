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
 * Clean, academic-grade brand title for "APAS".
 *
 * Design goals (per user direction):
 *   - scientific / editorial feel (not arcade / gaming)
 *   - single, calm navy-blue gradient using CSS --primary (no 3D extrude, no thick outer stroke)
 *   - generous letter tracking with a refined weight (700)
 *   - one discreet gold accent: a thin underline with a small gold dot,
 *     echoing the gold dot on the logo without shouting
 *   - RTL-safe: letters are forced LTR so Arabic pages still show "APAS"
 */
const ApasTitle: React.FC<ApasTitleProps> = ({
  text = 'APAS',
  sizeClassName = 'text-5xl sm:text-7xl',
  className = '',
  as = 'h1',
}) => {
  const Tag = as;

  return (
    <Tag
      dir="ltr"
      className={`apas-title relative inline-block font-bold select-none ${sizeClassName} ${className}`}
      aria-label={text}
    >
      <span className="apas-title-text" dir="ltr">
        {text}
      </span>
      <span aria-hidden="true" className="apas-title-accent">
        <span className="apas-title-accent-line" />
        <span className="apas-title-accent-dot" />
        <span className="apas-title-accent-line" />
      </span>

      <style>{`
        .apas-title {
          line-height: 1.1;
          isolation: isolate;
        }
        .apas-title-text {
          display: inline-block;
          direction: ltr;
          unicode-bidi: isolate;
          font-weight: 700;
          letter-spacing: 0.14em;
          /* Horizontal primary (navy) gradient — matches brand palette */
          background: linear-gradient(90deg,
            hsl(var(--primary)) 0%,
            hsl(var(--primary) / 0.8) 50%,
            hsl(var(--primary) / 0.5) 100%);
          -webkit-background-clip: text;
                  background-clip: text;
          color: transparent;
          /* A whisper-thin stroke just to crisp up edges on light bg */
          -webkit-text-stroke: 0.006em hsl(var(--primary) / 0.35);
          /* Soft elevation, not a poster shadow */
          filter: drop-shadow(0 2px 6px hsl(var(--primary) / 0.18));
        }

        /* Tiny gold accent under the word: —— · —— */
        .apas-title-accent {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4em;
          margin-top: 0.18em;
          height: 0.12em;
          opacity: 0.9;
        }
        .apas-title-accent-line {
          display: inline-block;
          flex: 0 0 auto;
          width: 1.1em;
          height: 1px;
          background: linear-gradient(90deg,
            transparent 0%,
            #c9a24b 50%,
            transparent 100%);
        }
        .apas-title-accent-dot {
          display: inline-block;
          width: 0.22em;
          height: 0.22em;
          border-radius: 9999px;
          background: radial-gradient(circle, #f2d27a 0%, #c9a24b 70%, #8d6a1e 100%);
          box-shadow: 0 0 0.25em rgba(201, 162, 75, 0.55);
        }
      `}</style>
    </Tag>
  );
};

export default ApasTitle;
