import React from 'react';
import { ChevronDown } from 'lucide-react';
import { playSectionToggle } from '@/utils/sound';

interface CollapsibleSectionProps {
  title: string;
  icon: string;
  open: boolean;
  toggle: () => void;
  children: React.ReactNode;
  miniPreview?: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, open, toggle, children, miniPreview }) => {
  return (
    <div className="border border-border/40 rounded-2xl overflow-hidden bg-card/70 backdrop-blur-sm shadow-lg shadow-black/[0.06] dark:shadow-black/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/[0.08] dark:border-border/30">
      <button onClick={() => { toggle(); playSectionToggle(false); }}
        className="w-full px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between hover:bg-primary/5 transition-all duration-300 group">
        <span className="text-base sm:text-lg font-bold text-foreground flex items-center gap-3">
          {title}
        </span>
        <div className="flex items-center gap-3">
          {!open && miniPreview && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono animate-slideDown">
              {miniPreview}
            </span>
          )}
          <div className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center group-hover:bg-primary/10 transition-all duration-300">
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>
      {open && (
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-border/30 animate-section-expand">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
};

export default React.memo(CollapsibleSection);
