const tone: Record<string, string> = {
  low: "border-tint/30 bg-tint-soft text-tint-dark",
  medium: "border-amber-500/20 bg-amber-50 text-amber-800",
  high: "border-danger/20 bg-danger-soft text-danger",
};

const dot: Record<string, string> = {
  low: "bg-tint",
  medium: "bg-amber-500",
  high: "bg-danger",
};

export function SeverityBadge({ severity }: { severity: string }) {
  const colour = tone[severity] ?? tone.medium;
  const dotColour = dot[severity] ?? dot.medium;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${colour}`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${dotColour}`} />
      {severity}
    </span>
  );
}

export function HealthyBadge({ healthy }: { healthy: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        healthy
          ? "border-tint/30 bg-tint-soft text-tint-dark"
          : "border-zinc-300/60 bg-zinc-100 text-zinc-700"
      }`}
    >
      {healthy ? "Healthy" : "Disease"}
    </span>
  );
}
