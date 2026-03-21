import React from 'react';
import { cn } from '@/lib/utils';

interface AcademicBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const AcademicBadge: React.FC<AcademicBadgeProps> = ({ 
  children, 
  variant = 'default', 
  size = 'md', 
  className 
}) => {
  const variants = {
    default: 'bg-gradient-to-r from-slate-600 to-gray-600 text-white shadow-academic',
    success: 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-academic',
    warning: 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-academic',
    info: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-academic'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };

  return (
    <span className={cn(
      'inline-flex items-center justify-center font-semibold rounded-full transition-all duration-300 hover-lift',
      variants[variant],
      sizes[size],
      className
    )}>
      {children}
    </span>
  );
};

export default AcademicBadge;
