interface VelocityDiagramProps {
  v0: number;
  angle: number;
}

export default function VelocityDiagram({ v0, angle }: VelocityDiagramProps) {
  const theta = (angle * Math.PI) / 180;
  const vx = v0 * Math.cos(theta);
  const vy = v0 * Math.sin(theta);

  // SVG dimensions and scaling
  const size = 160;
  const padding = 30;
  const maxLen = size - padding * 2;
  const scale = v0 > 0 ? maxLen / v0 : 1;

  const ox = padding;
  const oy = size - padding;

  const tipX = ox + vx * scale;
  const tipY = oy - vy * scale;
  const vxTipX = ox + vx * scale;
  const vxTipY = oy;
  const vyTipX = ox;
  const vyTipY = oy - vy * scale;

  return (
    <div className="rounded-lg border border-border bg-card p-4 glow-primary">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 w-2 rounded-full bg-data-amber" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          تحليل السرعة
        </h2>
      </div>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[200px] mx-auto">
        {/* Axes */}
        <line x1={ox} y1={oy} x2={size - 10} y2={oy} stroke="hsl(220 15% 25%)" strokeWidth={1} />
        <line x1={ox} y1={oy} x2={ox} y2={10} stroke="hsl(220 15% 25%)" strokeWidth={1} />

        {/* Vx component */}
        <line x1={ox} y1={oy} x2={vxTipX} y2={vxTipY} stroke="hsl(38 90% 55%)" strokeWidth={2} strokeDasharray="4 2" />
        {/* Vy component */}
        <line x1={ox} y1={oy} x2={vyTipX} y2={vyTipY} stroke="hsl(142 60% 50%)" strokeWidth={2} strokeDasharray="4 2" />
        {/* V0 vector */}
        <line x1={ox} y1={oy} x2={tipX} y2={tipY} stroke="hsl(187 80% 55%)" strokeWidth={2.5} />
        {/* Arrowhead */}
        <circle cx={tipX} cy={tipY} r={3} fill="hsl(187 80% 55%)" />

        {/* Angle arc */}
        {angle > 0 && (
          <path
            d={`M ${ox + 20} ${oy} A 20 20 0 0 0 ${ox + 20 * Math.cos(theta)} ${oy - 20 * Math.sin(theta)}`}
            fill="none"
            stroke="hsl(187 80% 55%)"
            strokeWidth={1}
            opacity={0.6}
          />
        )}

        {/* Labels */}
        <text x={tipX + 4} y={tipY - 4} fill="hsl(187 80% 55%)" fontSize={9} fontFamily="JetBrains Mono">
          v₀
        </text>
        <text x={(ox + vxTipX) / 2} y={oy + 14} fill="hsl(38 90% 55%)" fontSize={8} fontFamily="JetBrains Mono" textAnchor="middle">
          vₓ={vx.toFixed(1)}
        </text>
        <text x={ox - 4} y={(oy + vyTipY) / 2} fill="hsl(142 60% 50%)" fontSize={8} fontFamily="JetBrains Mono" textAnchor="end">
          vᵧ={vy.toFixed(1)}
        </text>
        <text x={ox + 24} y={oy - 4} fill="hsl(187 80% 55%)" fontSize={8} fontFamily="JetBrains Mono" opacity={0.7}>
          {angle}°
        </text>
      </svg>
    </div>
  );
}
