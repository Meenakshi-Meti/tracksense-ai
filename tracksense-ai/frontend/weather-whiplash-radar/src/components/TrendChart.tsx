import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Reading } from "@/lib/track-analysis";

export function TrendChart({ readings }: { readings: Reading[] }) {
  const data = readings.map((r, i) => ({
    lap: `F${i + 1}`,
    wetness: r.wetnessIndex,
    condition: r.condition,
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-md border border-border bg-asphalt">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Awaiting first frame — telemetry offline
        </p>
      </div>
    );
  }

  return (
    <div className="h-64 rounded-md border border-border bg-asphalt p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: -18 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="4 6" vertical={false} />
          <XAxis
            dataKey="lap"
            stroke="var(--muted-foreground)"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
          />
          <YAxis
            domain={[0, 100]}
            stroke="var(--muted-foreground)"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--muted-foreground)" }}
            formatter={(value: number, _n, item) => [
              `${value} · ${(item?.payload as { condition?: string })?.condition ?? ""}`,
              "Wetness index",
            ]}
          />
          <Line
            type="monotone"
            dataKey="wetness"
            stroke="var(--chart-1)"
            strokeWidth={3}
            dot={{ r: 4, fill: "var(--chart-1)", stroke: "var(--background)", strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
