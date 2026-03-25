import React from 'react';

/**
 * FooterRobot — A sleek, modern AI assistant robot with a spherical head,
 * capsule body, floating hover base, and holographic APAS display.
 * Completely new design: rounded silhouette, visor eyes, energy rings.
 * Visible in both light and dark modes.
 */
const FooterRobot: React.FC = () => {
  return (
    <div className="relative inline-flex flex-col items-center justify-end select-none" aria-hidden="true"
      style={{ width: '240px' }}>

      {/* School logo — centered above robot head, no animations */}
      <div className="flex justify-center mb-2" style={{ zIndex: 3 }}>
        <img
          src="/ensl-logo.jpg"
          alt=""
          className="rounded-xl border border-border/30"
          style={{
            width: '64px',
            height: '64px',
            objectFit: 'contain',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.06)',
          }}
          draggable={false}
        />
      </div>

      {/* Robot SVG — uses CSS class to adapt colors in dark mode */}
      <svg
        viewBox="0 0 260 220"
        className="relative footer-robot-svg"
        style={{ width: '240px', height: '180px', zIndex: 2 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Body gradient — white/silver metallic */}
          <linearGradient id="rbBody" x1="0" y1="0" x2="0.2" y2="1">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="35%" stopColor="#e2e8f0" />
            <stop offset="70%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          {/* Head gradient — glossy white sphere */}
          <radialGradient id="rbHead" cx="0.35" cy="0.3" r="0.65">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#f1f5f9" />
            <stop offset="60%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </radialGradient>
          {/* Visor gradient — dark glass */}
          <linearGradient id="rbVisor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="40%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
          {/* Visor reflection */}
          <linearGradient id="rbVisorShine" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#fff" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          {/* Eye glow — cyan */}
          <radialGradient id="rbEyeGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="60%" stopColor="#6b7db5" />
            <stop offset="100%" stopColor="#0891b2" />
          </radialGradient>
          {/* Core energy gradient */}
          <radialGradient id="rbCore" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#e0e7ff" />
            <stop offset="40%" stopColor="#a5b4fc" />
            <stop offset="100%" stopColor="#6366f1" />
          </radialGradient>
          {/* Hover glow */}
          <radialGradient id="rbHover" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#818cf8" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
          </radialGradient>
          {/* Ambient glow */}
          <radialGradient id="rbAmbient" cx="0.5" cy="0.55" r="0.5">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.1" />
            <stop offset="70%" stopColor="#818cf8" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
          </radialGradient>
          {/* Hologram screen */}
          <linearGradient id="rbHoloScreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0e7ff" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#c7d2fe" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0.65" />
          </linearGradient>
          {/* Arm gradient — metallic */}
          <linearGradient id="rbArm" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          {/* Filters */}
          <filter id="rbShadow">
            <feDropShadow dx="1" dy="2.5" stdDeviation="2" floodColor="#334155" floodOpacity="0.15" />
          </filter>
          <filter id="rbGlow">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="rbSoftGlow">
            <feGaussianBlur stdDeviation="1.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Clip for visor face area */}
          <clipPath id="rbVisorClip">
            <path d="M82 85 Q85 75 115 73 Q145 75 148 85 L148 102 Q145 112 115 114 Q85 112 82 102 Z" />
          </clipPath>
        </defs>

        {/* ===== CSS Animations ===== */}
        <style>{`
          @keyframes rbFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
          }
          @keyframes rbEyePulse {
            0%, 100% { opacity: 0.9; }
            50% { opacity: 0.55; }
          }
          @keyframes rbEyeBlink {
            0%, 40%, 46%, 100% { transform: scaleY(1); }
            43% { transform: scaleY(0.08); }
          }
          @keyframes rbCorePulse {
            0%, 100% { opacity: 0.5; r: 4; }
            50% { opacity: 1; r: 5.5; }
          }
          @keyframes rbCoreRing {
            0%, 100% { r: 10; opacity: 0.06; }
            50% { r: 14; opacity: 0.15; }
          }
          @keyframes rbCoreRing2 {
            0%, 100% { r: 16; opacity: 0.03; }
            50% { r: 20; opacity: 0.08; }
          }
          @keyframes rbHoverGlow {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.7; }
          }
          @keyframes rbHoverRing {
            0%, 100% { rx: 28; ry: 4; opacity: 0.12; }
            50% { rx: 32; ry: 5; opacity: 0.25; }
          }
          @keyframes rbAntennaGlow {
            0%, 75%, 100% { opacity: 0.3; }
            80%, 90% { opacity: 1; }
          }
          @keyframes rbAntennaWave {
            0%, 75%, 100% { r: 3; opacity: 0.08; }
            80%, 90% { r: 6; opacity: 0.2; }
          }
          @keyframes rbVisorTextSlide {
            0% { transform: translateX(-40px); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateX(40px); opacity: 0; }
          }
          @keyframes rbVisorCycle {
            0%, 55% { opacity: 1; }
            60%, 95% { opacity: 0; }
            100% { opacity: 1; }
          }
          @keyframes rbVisorCycleInv {
            0%, 55% { opacity: 0; }
            60%, 95% { opacity: 1; }
            100% { opacity: 0; }
          }
          @keyframes rbParticle {
            0% { opacity: 0; transform: translateY(0) scale(0.4); }
            20% { opacity: 0.45; transform: translateY(-4px) scale(1); }
            80% { opacity: 0.2; transform: translateY(-18px) scale(0.7); }
            100% { opacity: 0; transform: translateY(-24px) scale(0.2); }
          }
          @keyframes rbBreath {
            0%, 100% { opacity: 0.05; }
            50% { opacity: 0.12; }
          }
          .rb-float { animation: rbFloat 4s ease-in-out infinite; }
          .rb-eye-pulse { animation: rbEyePulse 3s ease-in-out infinite; }
          .rb-eye-blink { animation: rbEyeBlink 5s ease-in-out infinite; transform-origin: center; }
          .rb-core-pulse { animation: rbCorePulse 2.5s ease-in-out infinite; }
          .rb-core-ring { animation: rbCoreRing 3s ease-in-out infinite; }
          .rb-core-ring2 { animation: rbCoreRing2 3.5s ease-in-out infinite 0.5s; }
          .rb-hover-glow { animation: rbHoverGlow 2s ease-in-out infinite; }
          .rb-hover-ring { animation: rbHoverRing 2s ease-in-out infinite; }
          .rb-antenna-glow { animation: rbAntennaGlow 3.5s ease-in-out infinite; }
          .rb-antenna-wave { animation: rbAntennaWave 3.5s ease-in-out infinite; }
          .rb-visor-text-slide { animation: rbVisorTextSlide 5s ease-in-out infinite; }
          .rb-visor-cycle { animation: rbVisorCycle 10s ease-in-out infinite; }
          .rb-visor-cycle-inv { animation: rbVisorCycleInv 10s ease-in-out infinite; }
          .rb-particle-1 { animation: rbParticle 3s ease-in-out infinite; }
          .rb-particle-2 { animation: rbParticle 3.5s ease-in-out infinite 0.7s; }
          .rb-particle-3 { animation: rbParticle 4s ease-in-out infinite 1.4s; }
          .rb-particle-4 { animation: rbParticle 3.2s ease-in-out infinite 2.1s; }
          .rb-breath { animation: rbBreath 4s ease-in-out infinite; }
          @keyframes rbLogoOrbit {
            0% { transform: rotate(0deg); transform-origin: center; }
            100% { transform: rotate(360deg); transform-origin: center; }
          }
          @keyframes rbLogoOrbitReverse {
            0% { transform: rotate(360deg); transform-origin: center; }
            100% { transform: rotate(0deg); transform-origin: center; }
          }
          @keyframes rbLogoPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0), 0 4px 12px rgba(0,0,0,0.08); }
            50% { box-shadow: 0 0 12px 2px rgba(99,102,241,0.12), 0 4px 12px rgba(0,0,0,0.08); }
          }
          .rb-logo-orbit { animation: rbLogoOrbit 12s linear infinite; transform-origin: 54px 54px; }
          .rb-logo-orbit-reverse { animation: rbLogoOrbitReverse 16s linear infinite; transform-origin: 54px 54px; }
          .rb-logo-pulse { animation: rbLogoPulse 3s ease-in-out infinite; }

          /* Dark mode: brighten the robot so it's visible on dark backgrounds */
          :root.dark .footer-robot-svg {
            filter: brightness(1.3) drop-shadow(0 0 10px rgba(129, 140, 248, 0.35));
          }
          :root.dark .footer-robot-svg .rb-float rect[fill="url(#rbBody)"] {
            filter: brightness(1.4);
          }
        `}</style>

        {/* Ambient glow behind robot */}
        <ellipse cx="130" cy="130" rx="75" ry="65" fill="url(#rbAmbient)" className="rb-breath" />

        {/* === Shadow under the robot === */}
        <ellipse cx="115" cy="212" rx="42" ry="6" fill="#1e293b" opacity="0.10" />
        <ellipse cx="115" cy="212" rx="30" ry="4" fill="#334155" opacity="0.08" />

        {/* Energy particles floating around */}
        <circle cx="90" cy="75" r="1.3" fill="#818cf8" className="rb-particle-1" />
        <circle cx="165" cy="60" r="1" fill="#6366f1" className="rb-particle-2" />
        <circle cx="110" cy="55" r="0.9" fill="#a5b4fc" className="rb-particle-3" />
        <circle cx="155" cy="90" r="1.1" fill="#818cf8" className="rb-particle-4" />

        {/* === Main robot group — gentle floating animation === */}
        <g className="rb-float" filter="url(#rbShadow)">

          {/* --- Hover base — floating disc with energy glow --- */}
          <ellipse cx="115" cy="198" rx="30" ry="6" fill="#e2e8f0" />
          <ellipse cx="115" cy="198" rx="26" ry="4.5" fill="#f1f5f9" />
          {/* Hover energy ring */}
          <ellipse cx="115" cy="198" fill="none" stroke="#6366f1" strokeWidth="0.6" className="rb-hover-ring" />
          {/* Hover glow underneath */}
          <ellipse cx="115" cy="204" rx="22" ry="5" fill="url(#rbHover)" className="rb-hover-glow" />
          {/* Ground reflection */}
          <ellipse cx="115" cy="210" rx="35" ry="4" fill="#94a3b8" opacity="0.04" />

          {/* --- Body — smooth capsule/pill shape --- */}
          <rect x="85" y="120" width="60" height="75" rx="25" fill="url(#rbBody)" />
          {/* Body highlight — left edge */}
          <rect x="89" y="128" width="6" height="58" rx="3" fill="#fff" opacity="0.12" />
          {/* Body subtle shadow — right edge */}
          <rect x="135" y="128" width="6" height="58" rx="3" fill="#64748b" opacity="0.06" />
          {/* Horizontal accent line */}
          <line x1="95" y1="150" x2="135" y2="150" stroke="#6366f1" strokeWidth="0.5" opacity="0.15" />

          {/* Chest energy core — with pulsing rings */}
          <circle cx="115" cy="160" r="8" fill="#1e1b4b" opacity="0.08" />
          <circle cx="115" cy="160" className="rb-core-pulse" fill="url(#rbCore)" />
          <circle cx="115" cy="160" className="rb-core-ring" fill="none" stroke="#818cf8" strokeWidth="0.5" />
          <circle cx="115" cy="160" className="rb-core-ring2" fill="none" stroke="#a5b4fc" strokeWidth="0.3" />
          {/* Core highlight */}
          <circle cx="114" cy="158.5" r="1.5" fill="#fff" opacity="0.5" />

          {/* Small accent dots on body */}
          <circle cx="100" cy="140" r="1.5" fill="#6366f1" opacity="0.15" />
          <circle cx="130" cy="140" r="1.5" fill="#6366f1" opacity="0.15" />
          <circle cx="100" cy="175" r="1.2" fill="#6366f1" opacity="0.1" />
          <circle cx="130" cy="175" r="1.2" fill="#6366f1" opacity="0.1" />

          {/* --- Left arm — reaching back toward logo --- */}
          <path d="M85 142 Q72 152 58 165" stroke="url(#rbArm)" strokeWidth="8" fill="none" strokeLinecap="round" />
          {/* Shoulder joint ring */}
          <circle cx="85" cy="142" r="5.5" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="0.8" />
          <circle cx="85" cy="142" r="2" fill="#6366f1" opacity="0.2" />
          {/* Left hand — sphere */}
          <circle cx="56" cy="167" r="6" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="0.6" />
          <circle cx="55" cy="166" r="2" fill="#f8fafc" opacity="0.4" />

          {/* --- Right arm — extending to hold hologram display --- */}
          <path d="M145 140 Q158 130 170 118" stroke="url(#rbArm)" strokeWidth="8" fill="none" strokeLinecap="round" />
          {/* Shoulder joint ring */}
          <circle cx="145" cy="140" r="5.5" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="0.8" />
          <circle cx="145" cy="140" r="2" fill="#6366f1" opacity="0.2" />
          {/* Right hand — sphere */}
          <circle cx="172" cy="116" r="5.5" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="0.6" />
          <circle cx="171" cy="115" r="1.8" fill="#f8fafc" opacity="0.4" />

          {/* --- Head — large glossy sphere --- */}
          <circle cx="115" cy="95" r="35" fill="url(#rbHead)" />
          {/* Head top highlight — glossy reflection */}
          <ellipse cx="105" cy="75" rx="18" ry="10" fill="#fff" opacity="0.15" />
          {/* Head subtle rim */}
          <circle cx="115" cy="95" r="35" fill="none" stroke="#cbd5e1" strokeWidth="0.5" opacity="0.4" />

          {/* --- Visor — dark curved band across face --- */}
          <path d="M82 85 Q85 75 115 73 Q145 75 148 85 L148 102 Q145 112 115 114 Q85 112 82 102 Z"
            fill="url(#rbVisor)" />
          {/* Visor glass reflection */}
          <path d="M86 82 Q90 76 115 74 Q140 76 144 82 L142 88 Q135 80 115 78 Q95 80 88 88 Z"
            fill="url(#rbVisorShine)" />
          {/* Visor border — subtle glow line */}
          <path d="M82 85 Q85 75 115 73 Q145 75 148 85" fill="none" stroke="#6366f1" strokeWidth="0.5" opacity="0.3" />
          <path d="M82 102 Q85 112 115 114 Q145 112 148 102" fill="none" stroke="#6366f1" strokeWidth="0.5" opacity="0.2" />

          {/* Visor face content — sliding APAS text alternating with blinking eyes */}
          <g clipPath="url(#rbVisorClip)">
            {/* Phase 1: Sliding APAS text (billboard style) */}
            <g className="rb-visor-cycle">
              <text className="rb-visor-text-slide" x="115" y="97" textAnchor="middle" fontSize="13" fontWeight="900"
                fill="#22d3ee" letterSpacing="2"
                filter="url(#rbSoftGlow)"
                style={{ fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}>
                APAS
              </text>
            </g>
            {/* Phase 2: Blinking eyes */}
            <g className="rb-visor-cycle-inv">
              <g className="rb-eye-blink">
                <circle cx="101" cy="92" r="5" fill="url(#rbEyeGlow)" className="rb-eye-pulse" filter="url(#rbSoftGlow)" />
                <circle cx="129" cy="92" r="5" fill="url(#rbEyeGlow)" className="rb-eye-pulse" filter="url(#rbSoftGlow)" />
              </g>
              {/* Eye highlights */}
              <circle cx="103" cy="90" r="1.8" fill="#fff" opacity="0.8" />
              <circle cx="131" cy="90" r="1.8" fill="#fff" opacity="0.8" />
              <circle cx="99.5" cy="94" r="0.8" fill="#fff" opacity="0.3" />
              <circle cx="127.5" cy="94" r="0.8" fill="#fff" opacity="0.3" />
              {/* Small indicator between eyes */}
              <circle cx="115" cy="95" r="1.2" fill="#6366f1" opacity="0.3" />
            </g>
          </g>

          {/* --- Antenna — top of head --- */}
          <line x1="115" y1="60" x2="115" y2="48" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
          <circle cx="115" cy="46" r="3.5" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="0.5" />
          <circle cx="115" cy="46" r="2" fill="#a5b4fc" className="rb-antenna-glow" />
          <circle cx="115" cy="46" fill="none" stroke="#818cf8" strokeWidth="0.4" className="rb-antenna-wave" />
          {/* Antenna tip highlight */}
          <circle cx="114" cy="45" r="0.8" fill="#fff" opacity="0.5" />

          {/* Side head accents — small circular vents */}
          <circle cx="79" cy="95" r="3" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="0.5" />
          <circle cx="79" cy="95" r="1.2" fill="#94a3b8" opacity="0.3" />
          <circle cx="151" cy="95" r="3" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="0.5" />
          <circle cx="151" cy="95" r="1.2" fill="#94a3b8" opacity="0.3" />
        </g>

        {/* === Energy connection line from robot to logo area === */}
        <path d="M62 168 Q50 175 40 178" stroke="#818cf8" strokeWidth="0.6" fill="none" opacity="0.12"
          strokeDasharray="3 4">
          <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="2s" repeatCount="indefinite" />
        </path>
        <path d="M56 172 Q44 180 35 183" stroke="#a5b4fc" strokeWidth="0.4" fill="none" opacity="0.08"
          strokeDasharray="2 5">
          <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="3s" repeatCount="indefinite" />
        </path>

      </svg>
    </div>
  );
};

export default FooterRobot;
