import React from 'react';
import { Slider } from '@/components/ui/slider';
import { playClick, playSliderChange } from '@/utils/sound';

interface ParamInputWithUnitProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  isRTL?: boolean;
  unitKey: string;
  selectedUnit: string;
  units: { key: string; label: string; labelAr: string; factor: number }[];
  lang: string;
  onUnitChange: (unit: string) => void;
  tooltip?: string;
  muted?: boolean;
}

const ParamInputWithUnit: React.FC<ParamInputWithUnitProps> = ({
  label, value, onChange, min, max, step, unitKey, selectedUnit, units, lang, onUnitChange, tooltip, muted = false,
}) => {
  return (
    <div className="mb-4">
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block" title={tooltip}>
        {label}
        {tooltip && <span className="ml-1 text-[10px] text-muted-foreground/60 cursor-help" title={tooltip}>(?)</span>}
      </label>
      <div className="flex items-center gap-2 mb-2 min-w-0">
        <input
          type="number"
          value={Number((value ?? 0).toFixed(4))}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min} max={max} step={step}
          className="flex-1 min-w-0 w-28 max-w-[120px] text-right text-sm font-mono !py-1 rounded border border-border bg-background px-2"
          dir="ltr"
        />
        <select
          value={selectedUnit}
          onChange={(e) => { onUnitChange(e.target.value); playClick(muted); }}
          className="text-[10px] font-mono bg-secondary/50 border border-border rounded text-muted-foreground cursor-pointer hover:text-foreground transition-colors px-2 py-1 min-w-[60px]"
          dir="ltr"
          title={lang === 'ar' ? 'تغيير الوحدة' : 'Change unit'}
        >
          {units.map(u => (
            <option key={u.key} value={u.key}>{lang === 'ar' ? u.labelAr : u.label}</option>
          ))}
        </select>
      </div>
      <div className="px-1">
        <Slider
          value={[value ?? 0]}
          min={min}
          max={max}
          step={step}
          onValueChange={([v]) => {
            if (unitKey === 'gravity' && v < 0.1) {
              onChange(0.1);
            } else {
              onChange(v);
            }
            playSliderChange(muted);
          }}
          className="h-4"
        />
      </div>
    </div>
  );
};

export default React.memo(ParamInputWithUnit);
