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
    <div className="border border-border/50 rounded-xl overflow-hidden bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
      <button onClick={() => { toggle(); playSectionToggle(false); }}
        className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-primary/5 transition-all duration-300">
        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {!open && miniPreview && (
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono animate-slideDown">
              {miniPreview}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
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
