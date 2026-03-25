import React from 'react';

/**
 * Professional academic ambient decorations.
 * Fixed-position elements with subtle animations.
 * Gradient mesh, fine grid lines, corner accents, and soft glows.
 * No floating/moving circles — everything is anchored and elegant.
 */
const AcademicAmbient: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">

      {/* ── Gradient mesh background ── */}
      {/* Top-right soft gradient blob — fixed position, breathing animation */}
      <div
        className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle at 40% 40%, hsl(var(--primary) / 0.06) 0%, hsl(var(--primary) / 0.02) 40%, transparent 70%)',
          animation: 'ambientBreathe 10s ease-in-out infinite',
        }}
      />

      {/* Bottom-left soft gradient blob */}
      <div
        className="absolute -bottom-16 -left-16 w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle at 60% 60%, hsl(var(--primary) / 0.05) 0%, hsl(var(--primary) / 0.015) 40%, transparent 70%)',
          animation: 'ambientBreathe 12s ease-in-out infinite 4s',
        }}
      />

      {/* ── Fine grid pattern — very subtle engineering paper feel ── */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.018] dark:opacity-[0.025]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="fineGrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="40" stroke="currentColor" strokeWidth="0.3" />
            <line x1="0" y1="0" x2="40" y2="0" stroke="currentColor" strokeWidth="0.3" />
          </pattern>
          {/* Larger grid overlay */}
          <pattern id="coarseGrid" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="200" stroke="currentColor" strokeWidth="0.5" />
            <line x1="0" y1="0" x2="200" y2="0" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#fineGrid)" className="text-foreground" />
        <rect width="100%" height="100%" fill="url(#coarseGrid)" className="text-foreground" opacity="0.4" />
      </svg>

      {/* ── Corner accent — top-left ── */}
      <svg
        className="absolute top-6 left-6 w-16 h-16 text-primary opacity-[0.06] dark:opacity-[0.08]"
        viewBox="0 0 64 64"
      >
        <line x1="0" y1="2" x2="24" y2="2" stroke="currentColor" strokeWidth="1.5" />
        <line x1="2" y1="0" x2="2" y2="24" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="2" cy="2" r="2" fill="currentColor" opacity="0.5" />
      </svg>

      {/* ── Corner accent — top-right ── */}
      <svg
        className="absolute top-6 right-6 w-16 h-16 text-primary opacity-[0.06] dark:opacity-[0.08]"
        viewBox="0 0 64 64"
      >
        <line x1="40" y1="2" x2="64" y2="2" stroke="currentColor" strokeWidth="1.5" />
        <line x1="62" y1="0" x2="62" y2="24" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="62" cy="2" r="2" fill="currentColor" opacity="0.5" />
      </svg>

      {/* ── Corner accent — bottom-left ── */}
      <svg
        className="absolute bottom-6 left-6 w-16 h-16 text-primary opacity-[0.06] dark:opacity-[0.08]"
        viewBox="0 0 64 64"
      >
        <line x1="0" y1="62" x2="24" y2="62" stroke="currentColor" strokeWidth="1.5" />
        <line x1="2" y1="40" x2="2" y2="64" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="2" cy="62" r="2" fill="currentColor" opacity="0.5" />
      </svg>

      {/* ── Corner accent — bottom-right ── */}
      <svg
        className="absolute bottom-6 right-6 w-16 h-16 text-primary opacity-[0.06] dark:opacity-[0.08]"
        viewBox="0 0 64 64"
      >
        <line x1="40" y1="62" x2="64" y2="62" stroke="currentColor" strokeWidth="1.5" />
        <line x1="62" y1="40" x2="62" y2="64" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="62" cy="62" r="2" fill="currentColor" opacity="0.5" />
      </svg>

      {/* ── Horizontal accent line — top area with scanning animation ── */}
      <div className="absolute top-[12%] left-0 right-0 h-px overflow-hidden opacity-[0.04] dark:opacity-[0.06]">
        <div
          className="h-full w-full"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary)) 30%, hsl(var(--primary)) 70%, transparent 100%)',
            animation: 'scanLine 8s ease-in-out infinite',
          }}
        />
      </div>

      {/* ── Vertical accent line — left area ── */}
      <div className="absolute top-0 bottom-0 left-[8%] w-px overflow-hidden opacity-[0.03] dark:opacity-[0.05]">
        <div
          className="w-full h-full"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, hsl(var(--primary)) 30%, hsl(var(--primary)) 70%, transparent 100%)',
            animation: 'scanLineV 10s ease-in-out infinite 2s',
          }}
        />
      </div>

      {/* ── Crosshair marker — right side ── */}
      <svg
        className="absolute top-[30%] right-[6%] w-8 h-8 text-primary opacity-[0.04] dark:opacity-[0.06]"
        viewBox="0 0 32 32"
      >
        <line x1="16" y1="4" x2="16" y2="28" stroke="currentColor" strokeWidth="0.5" />
        <line x1="4" y1="16" x2="28" y2="16" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="16" cy="16" r="1" fill="currentColor" opacity="0.4">
          <animate attributeName="opacity" values="0.2;0.6;0.2" dur="3s" repeatCount="indefinite" />
        </circle>
      </svg>

      {/* ── Small measurement tick marks — bottom edge ── */}
      <svg
        className="absolute bottom-0 left-[10%] right-[10%] h-4 text-foreground opacity-[0.025] dark:opacity-[0.04]"
        preserveAspectRatio="none"
        viewBox="0 0 1000 16"
      >
        {Array.from({ length: 21 }, (_, i) => (
          <line
            key={i}
            x1={i * 50}
            y1={i % 5 === 0 ? 0 : 6}
            x2={i * 50}
            y2={16}
            stroke="currentColor"
            strokeWidth={i % 5 === 0 ? 1 : 0.5}
          />
        ))}
      </svg>

      {/* ── Diagonal accent lines — subtle technical drawing feel ── */}
      <svg
        className="absolute top-[20%] left-[3%] w-12 h-12 text-primary opacity-[0.03] dark:opacity-[0.05]"
        viewBox="0 0 48 48"
      >
        <line x1="0" y1="48" x2="48" y2="0" stroke="currentColor" strokeWidth="0.5" />
        <line x1="8" y1="48" x2="48" y2="8" stroke="currentColor" strokeWidth="0.3" />
        <line x1="0" y1="40" x2="40" y2="0" stroke="currentColor" strokeWidth="0.3" />
      </svg>

      {/* ── Data pulse dot — subtle status indicator, top-right ── */}
      <div className="absolute top-[18%] right-[15%] flex items-center gap-1.5 opacity-[0.06] dark:opacity-[0.08]">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: 'hsl(var(--primary))',
            animation: 'dataPulse 2s ease-in-out infinite',
          }}
        />
        <div className="w-8 h-px" style={{ backgroundColor: 'hsl(var(--primary) / 0.3)' }} />
      </div>

      {/* ── Axis labels — very subtle coordinate references ── */}
      <svg
        className="absolute bottom-[8%] left-[5%] w-10 h-10 text-muted-foreground opacity-[0.03]"
        viewBox="0 0 40 40"
      >
        {/* X axis */}
        <line x1="5" y1="35" x2="38" y2="35" stroke="currentColor" strokeWidth="0.8" />
        <polygon points="38,33 38,37 42,35" fill="currentColor" />
        {/* Y axis */}
        <line x1="5" y1="35" x2="5" y2="2" stroke="currentColor" strokeWidth="0.8" />
        <polygon points="3,2 7,2 5,-2" fill="currentColor" />
      </svg>

      {/* ── Inline keyframes ── */}
      <style>{`
        @keyframes ambientBreathe {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.85; }
        }
        @keyframes scanLine {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
        @keyframes scanLineV {
          0%, 100% { transform: translateY(-100%); }
          50% { transform: translateY(100%); }
        }
        @keyframes dataPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
};

export default AcademicAmbient;
