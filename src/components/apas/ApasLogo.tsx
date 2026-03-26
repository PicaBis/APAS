import React from 'react';

interface ApasLogoProps {
  size?: number;
  animated?: boolean;
}

const ApasLogo: React.FC<ApasLogoProps> = ({ size = 64, animated = false }) => {
  return (
    <>
      <img
        src="/apas-logo-circle.png"
        alt="APAS Logo"
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          filter: `drop-shadow(0 2px 8px rgba(26,26,62,0.35))`,
        }}
        className={animated ? 'apas-logo-animated' : ''}
      />
      {animated && (
        <style>{`
          @keyframes apasLogoPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          .apas-logo-animated {
            animation: apasLogoPulse 3s ease-in-out infinite;
          }
        `}</style>
      )}
    </>
  );
};

export default ApasLogo;
