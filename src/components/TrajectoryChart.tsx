import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { ProjectileResults, formatNumber } from "@/lib/physics";

interface TrajectoryChartProps {
  results: ProjectileResults;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-card p-3 shadow-lg font-mono text-xs space-y-1">
      <p className="text-muted-foreground">t = {formatNumber(d.t)} s</p>
      <p className="text-primary">x = {formatNumber(d.x)} m</p>
      <p className="text-data-green">y = {formatNumber(d.y)} m</p>
      <p className="text-data-amber">v = {formatNumber(d.v)} m/s</p>
    </div>
  );
}

export default function TrajectoryChart({ results }: TrajectoryChartProps) {
  const { trajectory, maxHeight, range } = results;

  // Calculate nice axis domains
  const xMax = Math.ceil(range / 10) * 10 + 10;
  const yMax = Math.ceil(maxHeight / 10) * 10 + 10;

  return (
    <div className="rounded-lg border border-border bg-card p-5 glow-primary">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-2 w-2 rounded-full bg-trajectory" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          مسار المقذوف
        </h2>
      </div>
      <div className="grid-bg rounded-md p-2" style={{ direction: "ltr" }}>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(220 15% 15%)"
            />
            <XAxis
              type="number"
              dataKey="x"
              name="x"
              unit=" m"
              domain={[0, xMax]}
              tick={{ fill: "hsl(215 15% 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }}
              axisLine={{ stroke: "hsl(220 15% 20%)" }}
              label={{
                value: "المسافة الأفقية (m)",
                position: "bottom",
                fill: "hsl(215 15% 50%)",
                fontSize: 12,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="y"
              unit=" m"
              domain={[0, yMax]}
              tick={{ fill: "hsl(215 15% 50%)", fontSize: 11, fontFamily: "JetBrains Mono" }}
              axisLine={{ stroke: "hsl(220 15% 20%)" }}
              label={{
                value: "الارتفاع (m)",
                angle: -90,
                position: "insideLeft",
                fill: "hsl(215 15% 50%)",
                fontSize: 12,
              }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Max height reference */}
            <ReferenceLine
              y={maxHeight}
              stroke="hsl(142 60% 50%)"
              strokeDasharray="6 4"
              strokeOpacity={0.5}
            />
            {/* Range reference */}
            <ReferenceLine
              x={range}
              stroke="hsl(38 90% 55%)"
              strokeDasharray="6 4"
              strokeOpacity={0.5}
            />

            <Scatter
              data={trajectory}
              fill="hsl(187 80% 55%)"
              line={{ stroke: "hsl(187 80% 55%)", strokeWidth: 2 }}
              lineType="joint"
              shape={<></>}
            />
            {/* Start and end markers */}
            <Scatter
              data={[trajectory[0], trajectory[trajectory.length - 1]]}
              fill="hsl(187 80% 55%)"
              r={5}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
