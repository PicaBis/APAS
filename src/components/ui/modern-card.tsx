import React from 'react';
import { cn } from '@/lib/utils';

interface ModernCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'gradient' | 'elevated';
  children: React.ReactNode;
}

const ModernCard = React.forwardRef<HTMLDivElement, ModernCardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'card-modern bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02]',
      glass: 'glass rounded-3xl hover:glass-dark transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] border border-white/20',
      gradient: 'gradient-bg-subtle rounded-3xl border border-primary/20 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02]',
      elevated: 'bg-card rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-3 hover:scale-[1.03] border border-border/50'
    };

    return (
      <div
        ref={ref}
        className={cn(
          variants[variant],
          'p-6 relative overflow-hidden group',
          'before:absolute before:inset-0 before:bg-gradient-to-br before:from-transparent before:via-white/5 before:to-transparent before:opacity-0 before:transition-opacity before:duration-500 group-hover:before:opacity-100',
          className
        )}
        {...props}
      >
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );
  }
);

ModernCard.displayName = 'ModernCard';

export default ModernCard;
