import React from 'react';

interface Props {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color?: string;
  badge?: string;
}

export default function MobileFeatureCard({ icon, title, description, onClick, color = 'primary', badge }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full text-start p-4 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98] transition-all duration-200 relative overflow-hidden group"
    >
      {badge && (
        <span className="absolute top-2.5 right-2.5 text-[9px] font-bold uppercase tracking-wider bg-primary/15 text-primary px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <div className={`w-11 h-11 rounded-xl bg-${color}/10 flex items-center justify-center mb-3 group-hover:bg-${color}/20 transition-colors`}>
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{description}</p>
    </button>
  );
}
