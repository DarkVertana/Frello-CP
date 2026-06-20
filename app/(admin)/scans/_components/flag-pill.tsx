import { Flag } from "lucide-react";

/** Small pill that highlights flagged scans in lists. */
export function FlagPill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-danger">
      <Flag className="size-2.5" aria-hidden="true" />
      Flagged
    </span>
  );
}
