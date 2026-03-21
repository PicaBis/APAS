import React from 'react';
import { useCountUp } from '@/hooks/useCountUp';

interface AnimatedValueProps {
  value: number;
  className?: string;
  duration?: number;
}

/** Renders a number with smooth count-up animation on change. */
const AnimatedValue: React.FC<AnimatedValueProps> = ({ value, className, duration = 600 }) => {
  const display = useCountUp(value, duration);
  return <span className={className}>{display}</span>;
};

export default AnimatedValue;
