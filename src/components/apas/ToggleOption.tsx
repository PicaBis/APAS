import React from 'react';

interface ToggleOptionProps {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}

const ToggleOption: React.FC<ToggleOptionProps> = ({ label, active, onClick, icon }) => {
  return (
    <button onClick={onClick}
      className={`group w-full text-xs font-medium py-2 px-3 rounded flex items-center justify-center gap-1.5 transition-all duration-200 ${active ? 'text-primary-foreground bg-primary border border-primary/50 shadow-md' : 'text-foreground border border-border hover:border-foreground/30 hover:bg-secondary hover:shadow-md'}`}>
      <span className="transition-transform duration-200 group-hover:scale-110">{icon}</span>
      {label}
    </button>
  );
};

export default React.memo(ToggleOption);
