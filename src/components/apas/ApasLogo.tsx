import React from 'react';

interface ApasLogoProps {
  size?: number;
  animated?: boolean;
}

/**
 * High-resolution brand logo. We load the 512px asset by default and provide a
 * srcSet so high-DPI screens always get a pixel-perfect image no matter what
 * `size` is requested. The tiny 82x82 `/apas-logo-circle.png` caused visible
 * blur on the hero + auth screens (browser was upscaling an 82px PNG to 100px+).
 */
const ApasLogo: React.FC<ApasLogoProps> = ({ size = 64, animated = false }) => {
  return (
    <>
      <img
        src="/apas-logo-512.png"
        srcSet="/apas-logo-192.png 192w, /apas-logo-512.png 512w"
        sizes={`${size}px`}
        alt="APAS Logo"
        width={size}
        height={size}
        decoding="async"
        loading="eager"
        draggable={false}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          filter: 'drop-shadow(0 2px 8px rgba(26,26,62,0.35))',
          imageRendering: 'auto',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
        }}
        className={animated ? 'apas-logo-animated' : ''}
      />
      {animated && (
        <style>{`
          @keyframes apasLogoPulse {
            0%, 100% { transform: scale(1) translateZ(0); }
            50% { transform: scale(1.05) translateZ(0); }
          }
          .apas-logo-animated {
            animation: apasLogoPulse 3s ease-in-out infinite;
            will-change: transform;
          }
        `}</style>
      )}
    </>
  );
};

export default ApasLogo;
