import { confidenceBand } from "@/lib/schemas/scan";

const fill: Record<string, string> = {
  high: "bg-tint",
  medium: "bg-amber-500",
  low: "bg-danger",
};

const text: Record<string, string> = {
  high: "text-tint-dark",
  medium: "text-amber-800",
  low: "text-danger",
};

export function ConfidenceBar({
  confidence,
  size = "default",
}: {
  confidence: number;
  size?: "default" | "sm";
}) {
  const band = confidenceBand(confidence);
  const pct = Math.round(confidence * 100);
  const height = size === "sm" ? "h-1.5" : "h-2";

  return (
    <div className="space-y-0.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className={`font-semibold tabular-nums ${text[band]}`}>{pct}%</span>
        <span className="text-muted capitalize">{band}</span>
      </div>
      <div className={`overflow-hidden rounded-full bg-background ${height}`}>
        <div
          className={`h-full rounded-full transition-all ${fill[band]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
