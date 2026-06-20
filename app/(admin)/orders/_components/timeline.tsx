import type { OrderTimelineEntry } from "@/db/schema";
import { OrderStatusBadge } from "./order-status-badge";
import { formatDateTime } from "@/lib/format";

/**
 * Vertical timeline of status transitions. The most recent entry sits at the
 * top, since admins land on an order to see "what happened most recently".
 */
export function Timeline({ entries }: { entries: OrderTimelineEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-input bg-background px-4 py-6 text-sm text-muted">
        No transitions recorded yet.
      </p>
    );
  }

  const ordered = [...entries].reverse();

  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {ordered.map((entry, index) => (
        <li key={`${entry.at}-${index}`} className="relative">
          <span
            aria-hidden="true"
            className="absolute -left-[26px] mt-1.5 size-2.5 rounded-full bg-tint ring-4 ring-card"
          />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <OrderStatusBadge status={entry.status} />
            <span className="text-xs text-muted">{formatDateTime(entry.at)}</span>
          </div>
          <div className="mt-1 text-sm text-muted">
            by{" "}
            <span className="font-medium text-foreground">
              {entry.byName ?? "—"}
            </span>
            {entry.note ? (
              <span className="ml-2 text-foreground/80">· {entry.note}</span>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
