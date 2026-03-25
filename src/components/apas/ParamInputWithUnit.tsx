import React, { useMemo, useRef, useEffect } from 'react';
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
  const valueRef = useRef<HTMLSpanElement>(null);
  const prevValueRef = useRef(value);

  // Value color based on magnitude (low=blue, mid=default, high=amber)
  const valueColorClass = useMemo(() => {
    const range = max - min;
    if (range <= 0) return 'value-mid';
    const ratio = (value - min) / range;
    if (ratio < 0.3) return 'value-low';
    if (ratio > 0.7) return 'value-high';
    return 'value-mid';
  }, [value, min, max]);

  // Snap pulse on value change
  useEffect(() => {
    if (Math.abs(value - prevValueRef.current) > step * 0.5) {
      const el = valueRef.current;
      if (el) {
        el.classList.remove('snap-pulse');
        void el.offsetWidth; // trigger reflow
        el.classList.add('snap-pulse');
      }
    }
    prevValueRef.current = value;
  }, [value, step]);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-muted-foreground" title={tooltip}>
          {label}
          {tooltip && <span className="ml-1 text-[10px] text-muted-foreground/60 cursor-help" title={tooltip}>(?)</span>}
        </label>
        <span ref={valueRef} className={`text-xs font-mono font-semibold transition-colors duration-200 ${valueColorClass}`}>
          {value.toFixed(step < 1 ? 2 : 0)}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mb-2">
        <input
          type="number"
          value={Number(value.toFixed(4))}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min} max={max} step={step}
          className="flex-1 text-sm font-mono min-w-0 !py-1"
          dir="ltr"
        />
        <select
          value={selectedUnit}
          onChange={(e) => { onUnitChange(e.target.value); playClick(muted); }}
          className="text-[10px] font-mono bg-secondary/50 border border-border rounded text-muted-foreground cursor-pointer hover:text-foreground transition-colors px-1 py-1 w-auto min-w-[48px]"
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
          value={[value]}
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
