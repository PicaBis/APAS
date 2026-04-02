import { ProjectileResults, formatNumber } from "@/lib/physics";

interface ResultsPanelProps {
  results: ProjectileResults;
}

function ResultItem({
  label,
  value,
  unit,
  color = "text-primary",
}: {
  label: string;
  value: string;
  unit: string;
  color?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-secondary/50 p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`font-mono text-xl font-semibold ${color} glow-text`}>
        {value}
        <span className="ml-1 text-xs text-muted-foreground font-normal">{unit}</span>
      </p>
    </div>
  );
}

export default function ResultsPanel({ results }: ResultsPanelProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4 glow-primary">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-2 w-2 rounded-full bg-accent" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          النتائج
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ResultItem
          label="أقصى ارتفاع"
          value={formatNumber(results.maxHeight)}
          unit="m"
          color="text-data-green"
        />
        <ResultItem
          label="المدى الأفقي"
          value={formatNumber(results.range)}
          unit="m"
          color="text-data-amber"
        />
        <ResultItem
          label="زمن الطيران"
          value={formatNumber(results.timeOfFlight)}
          unit="s"
          color="text-primary"
        />
        <ResultItem
          label="زمن أقصى ارتفاع"
          value={formatNumber(results.timeToMaxHeight)}
          unit="s"
        />
        <ResultItem
          label="سرعة الاصطدام"
          value={formatNumber(results.impactSpeed)}
          unit="m/s"
          color="text-data-rose"
        />
        <ResultItem
          label="زاوية الاصطدام"
          value={formatNumber(results.impactAngle)}
          unit="°"
          color="text-data-rose"
        />
      </div>

      {/* Equations reference */}
      <div className="mt-4 rounded-md border border-border bg-muted/30 p-3 space-y-1">
        <p className="text-xs text-muted-foreground font-semibold mb-2">المعادلات المستخدمة:</p>
        <p className="font-mono text-xs text-muted-foreground" dir="ltr">x(t) = v₀·cos(θ)·t</p>
        <p className="font-mono text-xs text-muted-foreground" dir="ltr">y(t) = h₀ + v₀·sin(θ)·t − ½g·t²</p>
        <p className="font-mono text-xs text-muted-foreground" dir="ltr">T = (v₀·sin(θ) + √(v₀²sin²θ + 2gh₀)) / g</p>
      </div>
    </div>
  );
}
