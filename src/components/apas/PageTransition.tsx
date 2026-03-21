import React, { useEffect, useState } from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * Wraps page content with a smooth fade-slide-scale entrance animation.
 * Mounts with opacity 0 + translateY + slight scale, then animates in.
 */
const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [transitionDone, setTransitionDone] = useState(false);

  useEffect(() => {
    // Small delay to ensure the DOM is ready before triggering animation
    const raf = requestAnimationFrame(() => setVisible(true));
    // Remove transform after animation completes so position:fixed works
    // correctly inside this container (CSS transform creates a new
    // containing block that breaks fixed positioning).
    const timer = setTimeout(() => setTransitionDone(true), 600);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, []);

  return (
    <div
      className={`page-transition ${visible ? 'page-transition-active' : ''} ${transitionDone ? 'page-transition-done' : ''}`}
    >
      {children}
    </div>
  );
};

export default PageTransition;
