import { Slider } from "@/components/ui/slider";

interface ControlPanelProps {
  v0: number;
  angle: number;
  h0: number;
  onV0Change: (v: number) => void;
  onAngleChange: (a: number) => void;
  onH0Change: (h: number) => void;
}

function ParamControl({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-mono text-lg text-primary glow-text">
          {value.toFixed(step < 1 ? 1 : 0)}
          <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
      />
      <div className="flex justify-between text-xs text-muted-foreground font-mono">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export default function ControlPanel({
  v0, angle, h0,
  onV0Change, onAngleChange, onH0Change,
}: ControlPanelProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-6 glow-primary">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          متغيرات الإطلاق
        </h2>
      </div>

      <ParamControl
        label="السرعة الابتدائية (v₀)"
        value={v0}
        unit="m/s"
        min={1}
        max={100}
        step={1}
        onChange={onV0Change}
      />
      <ParamControl
        label="زاوية الإطلاق (θ)"
        value={angle}
        unit="°"
        min={0}
        max={90}
        step={1}
        onChange={onAngleChange}
      />
      <ParamControl
        label="الارتفاع الابتدائي (h₀)"
        value={h0}
        unit="m"
        min={0}
        max={50}
        step={0.5}
        onChange={onH0Change}
      />
    </div>
  );
}
