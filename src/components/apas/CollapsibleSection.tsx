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
    <div className="border border-border/40 rounded-xl overflow-hidden bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-border/60">
      <button onClick={() => { toggle(); playSectionToggle(false); }}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary/5 transition-all duration-300 group">
        <span className="text-sm font-bold text-foreground flex items-center gap-2">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {!open && miniPreview && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono animate-slideDown">
              {miniPreview}
            </span>
          )}
          <div className="w-6 h-6 rounded-md bg-secondary/50 flex items-center justify-center group-hover:bg-primary/10 transition-all duration-300">
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border/30 animate-section-expand">
          <div className="pt-3">{children}</div>
        </div>
      )}
    </div>
  );
};

export default React.memo(CollapsibleSection);
