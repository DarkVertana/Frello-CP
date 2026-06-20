"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatAmount } from "@/lib/format";

type Point = { date: string; revenue: number };

const TICK_STYLE = { fill: "var(--color-muted)", fontSize: 11 };

export function RevenueChart({ data }: { data: Point[] }) {
  const total = data.reduce((sum, point) => sum + point.revenue, 0);

  if (total === 0) {
    return (
      <div className="grid h-48 place-items-center rounded-input bg-background text-sm text-muted">
        No revenue in the last 30 days.
      </div>
    );
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-tint)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--color-tint)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="date"
            tick={TICK_STYLE}
            tickFormatter={(value) => {
              const d = new Date(value);
              return d.toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
              });
            }}
            interval="preserveStartEnd"
            stroke="var(--color-border)"
          />
          <YAxis
            tick={TICK_STYLE}
            tickFormatter={(value) =>
              value === 0 ? "0" : formatAmount(Number(value))
            }
            stroke="var(--color-border)"
            width={68}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-tint)", strokeWidth: 1 }}
            contentStyle={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              fontSize: 12,
              color: "var(--color-foreground)",
            }}
            labelFormatter={(value) =>
              new Date(value as string).toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            }
            formatter={(value) => [
              formatAmount(Number(value)),
              "Revenue",
            ]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--color-tint)"
            strokeWidth={2}
            fill="url(#revenueFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
