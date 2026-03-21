import React from 'react';
import { Slider } from '@/components/ui/slider';

interface ParamInputWithUnitProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  isRTL: boolean;
  unitKey: string;
  selectedUnit: string;
  units: { key: string; label: string; labelAr: string; factor: number }[];
  lang: 'ar' | 'en' | 'fr';
  onUnitChange: (unit: string) => void;
}

const ParamInputWithUnit: React.FC<ParamInputWithUnitProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  isRTL,
  unitKey,
  selectedUnit,
  units,
  lang,
  onUnitChange,
}) => {
  const getUnitLabel = () => {
    const unit = units.find(u => u.key === selectedUnit);
    if (!unit) return '';
    if (lang === 'ar') return unit.labelAr;
    if (lang === 'fr') return (unit as { labelFr?: string }).labelFr || unit.label;
    return unit.label;
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <span className="text-xs text-muted-foreground">
          {getUnitLabel()}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Slider
            value={[value]}
            min={min}
            max={max}
            step={step}
            onValueChange={([v]) => onChange(v)}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-1">
          <select
            value={selectedUnit}
            onChange={(e) => onUnitChange(e.target.value)}
            className="text-xs bg-background border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-foreground/20"
          >
            {units.map(unit => (
              <option key={unit.key} value={unit.key}>
                {lang === 'ar' ? unit.labelAr : unit.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="text-right">
        <span className="text-xs font-mono text-foreground">
          {typeof value === 'number' ? 
            (Math.abs(value) >= 1000 ? value.toExponential(1) : value.toFixed(2)) 
            : value
          }
        </span>
      </div>
    </div>
  );
};

export default ParamInputWithUnit;
