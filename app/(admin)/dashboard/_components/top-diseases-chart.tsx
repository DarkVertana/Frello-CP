"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = { label: string; crop: string; disease: string; count: number };

const TICK_STYLE = { fill: "var(--color-muted)", fontSize: 11 };

export function TopDiseasesChart({ data }: { data: Row[] }) {
  if (data.length === 0) {
    return (
      <div className="grid h-48 place-items-center rounded-input bg-background text-sm text-muted">
        No scans in the last 7 days.
      </div>
    );
  }

  // Recharts horizontal bar = layout="vertical" + swap X/Y dataKey roles.
  const chartData = data.map((row) => ({
    name: `${row.crop} · ${row.disease}`,
    count: row.count,
  }));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
          <XAxis
            type="number"
            tick={TICK_STYLE}
            allowDecimals={false}
            stroke="var(--color-border)"
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={TICK_STYLE}
            width={140}
            stroke="var(--color-border)"
          />
          <Tooltip
            cursor={{ fill: "var(--color-tint-soft)" }}
            contentStyle={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              fontSize: 12,
              color: "var(--color-foreground)",
            }}
            formatter={(value) => [value, "Scans"]}
          />
          <Bar dataKey="count" fill="var(--color-tint)" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
