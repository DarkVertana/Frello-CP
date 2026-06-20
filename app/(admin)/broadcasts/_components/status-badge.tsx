import {
  broadcastStatusLabel,
  type BroadcastStatusValue,
} from "@/lib/broadcasts/transitions";

const tone: Record<BroadcastStatusValue, string> = {
  draft: "border-zinc-300/60 bg-zinc-100 text-zinc-700",
  scheduled: "border-amber-500/20 bg-amber-50 text-amber-800",
  sent: "border-tint/30 bg-tint-soft text-tint-dark",
  cancelled: "border-danger/20 bg-danger-soft text-danger",
};

const dot: Record<BroadcastStatusValue, string> = {
  draft: "bg-zinc-400",
  scheduled: "bg-amber-500",
  sent: "bg-tint",
  cancelled: "bg-danger",
};

export function BroadcastStatusBadge({
  status,
}: {
  status: BroadcastStatusValue;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tone[status]}`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${dot[status]}`} />
      {broadcastStatusLabel(status)}
    </span>
  );
}
