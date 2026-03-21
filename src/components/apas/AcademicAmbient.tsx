import React from 'react';

/**
 * Professional academic ambient decorations.
 * Pure CSS/SVG animations — no canvas.
 * Grid dots, orbital rings, floating geometric accents, tech particles.
 * Designed to give a world-class, technical/academic feel.
 */
const AcademicAmbient: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* Soft radial glow top-right */}
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-[0.06] dark:opacity-[0.08]"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.3) 40%, transparent 70%)',
          animation: 'ambientPulse 8s ease-in-out infinite',
        }}
      />

      {/* Soft radial glow bottom-left */}
      <div
        className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full opacity-[0.05] dark:opacity-[0.07]"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.3) 40%, transparent 70%)',
          animation: 'ambientPulse 10s ease-in-out infinite 3s',
        }}
      />

      {/* Subtle center glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.025] dark:opacity-[0.035]"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.5) 0%, transparent 60%)',
          animation: 'ambientPulse 12s ease-in-out infinite 5s',
        }}
      />

      {/* Orbital ring SVG — top area */}
      <svg
        className="absolute top-[8%] right-[12%] w-20 h-20 text-primary opacity-[0.08] dark:opacity-[0.1]"
        viewBox="0 0 80 80"
      >
        <ellipse
          cx="40" cy="40" rx="35" ry="14"
          fill="none" stroke="currentColor" strokeWidth="0.7"
          strokeDasharray="4 6"
          style={{ animation: 'orbitSpin 14s linear infinite' }}
        />
        <ellipse
          cx="40" cy="40" rx="35" ry="14"
          fill="none" stroke="currentColor" strokeWidth="0.5"
          strokeDasharray="3 5"
          transform="rotate(60 40 40)"
          style={{ animation: 'orbitSpin 18s linear infinite reverse' }}
        />
        {/* Orbiting dot */}
        <circle r="1.5" fill="currentColor" opacity="0.6">
          <animateMotion dur="14s" repeatCount="indefinite" path="M40 26 A35 14 0 1 1 39.99 26" />
        </circle>
        <circle cx="40" cy="40" r="2" fill="currentColor" opacity="0.4" />
        <circle cx="40" cy="40" r="5" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.3" />
      </svg>

      {/* Orbital ring SVG — bottom area */}
      <svg
        className="absolute bottom-[15%] left-[10%] w-16 h-16 text-primary opacity-[0.06] dark:opacity-[0.08]"
        viewBox="0 0 80 80"
      >
        <ellipse
          cx="40" cy="40" rx="30" ry="12"
          fill="none" stroke="currentColor" strokeWidth="0.7"
          style={{ animation: 'orbitSpin 14s linear infinite' }}
        />
        <circle r="1.2" fill="currentColor" opacity="0.5">
          <animateMotion dur="14s" repeatCount="indefinite" path="M40 28 A30 12 0 1 1 39.99 28" />
        </circle>
        <circle cx="40" cy="40" r="2" fill="currentColor" opacity="0.4" />
      </svg>

      {/* Additional orbital — mid-right */}
      <svg
        className="absolute top-[45%] right-[5%] w-14 h-14 text-primary opacity-[0.04] dark:opacity-[0.06]"
        viewBox="0 0 80 80"
      >
        <ellipse
          cx="40" cy="40" rx="32" ry="10"
          fill="none" stroke="currentColor" strokeWidth="0.5"
          strokeDasharray="2 4"
          style={{ animation: 'orbitSpin 20s linear infinite reverse' }}
        />
        <ellipse
          cx="40" cy="40" rx="32" ry="10"
          fill="none" stroke="currentColor" strokeWidth="0.4"
          transform="rotate(90 40 40)"
          style={{ animation: 'orbitSpin 16s linear infinite' }}
        />
        <circle cx="40" cy="40" r="1.5" fill="currentColor" opacity="0.3" />
      </svg>

      {/* Subtle floating geometric shapes */}
      <svg
        className="absolute top-[35%] left-[2%] w-10 h-10 text-muted-foreground opacity-[0.06]"
        viewBox="0 0 40 40"
        style={{ animation: 'gentleFloat 7s ease-in-out infinite' }}
      >
        <rect x="8" y="8" width="24" height="24" rx="2" fill="none" stroke="currentColor" strokeWidth="0.8" transform="rotate(15 20 20)" />
      </svg>

      <svg
        className="absolute top-[60%] right-[3%] w-8 h-8 text-muted-foreground opacity-[0.05]"
        viewBox="0 0 40 40"
        style={{ animation: 'gentleFloat 9s ease-in-out infinite 2s' }}
      >
        <polygon points="20,6 34,34 6,34" fill="none" stroke="currentColor" strokeWidth="0.8" />
      </svg>

      <svg
        className="absolute bottom-[30%] right-[15%] w-6 h-6 text-primary opacity-[0.05]"
        viewBox="0 0 24 24"
        style={{ animation: 'gentleFloat 11s ease-in-out infinite 4s' }}
      >
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="3 3" />
      </svg>

      {/* Floating hexagon — tech feel */}
      <svg
        className="absolute top-[20%] left-[8%] w-8 h-8 text-primary opacity-[0.04] dark:opacity-[0.06]"
        viewBox="0 0 40 40"
        style={{ animation: 'gentleFloat 13s ease-in-out infinite 1s' }}
      >
        <polygon points="20,4 35,12 35,28 20,36 5,28 5,12" fill="none" stroke="currentColor" strokeWidth="0.6" />
        <polygon points="20,10 29,15 29,25 20,30 11,25 11,15" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.5" />
      </svg>

      {/* Plus/cross marks — scientific notation feel */}
      <svg
        className="absolute top-[75%] left-[25%] w-5 h-5 text-muted-foreground opacity-[0.04]"
        viewBox="0 0 20 20"
        style={{ animation: 'gentleFloat 8s ease-in-out infinite 3s' }}
      >
        <line x1="10" y1="3" x2="10" y2="17" stroke="currentColor" strokeWidth="0.8" />
        <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="0.8" />
      </svg>

      <svg
        className="absolute top-[15%] right-[30%] w-4 h-4 text-muted-foreground opacity-[0.035]"
        viewBox="0 0 20 20"
        style={{ animation: 'gentleFloat 10s ease-in-out infinite 5s' }}
      >
        <line x1="10" y1="3" x2="10" y2="17" stroke="currentColor" strokeWidth="0.8" />
        <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="0.8" />
      </svg>

      {/* Grid dot pattern — very subtle */}
      <svg
        className="absolute top-0 left-0 w-full h-full opacity-[0.02] dark:opacity-[0.03]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="academicGrid" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
            <circle cx="25" cy="25" r="0.6" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#academicGrid)" className="text-foreground" />
      </svg>

      {/* Inline keyframes */}
      <style>{`
        @keyframes ambientPulse {
          0%, 100% { transform: scale(1); opacity: inherit; }
          50% { transform: scale(1.12); opacity: calc(inherit * 1.4); }
        }
        @keyframes orbitSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes gentleFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-8px) rotate(1.5deg); }
          50% { transform: translateY(-4px) rotate(-0.5deg); }
          75% { transform: translateY(-6px) rotate(1deg); }
        }
      `}</style>
    </div>
  );
};

export default AcademicAmbient;
