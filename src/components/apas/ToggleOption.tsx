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
      className={`w-full text-xs font-medium py-2.5 px-3 rounded-lg flex items-center gap-2 transition-all duration-300 ${active ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border border-primary/50 shadow-md shadow-primary/20' : 'text-foreground hover:bg-primary/10 border border-border/50 hover:border-primary/20'}`}>
      {icon}
      {label}
    </button>
  );
};

export default React.memo(ToggleOption);
