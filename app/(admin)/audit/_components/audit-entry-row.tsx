import Link from "next/link";
import { ChevronRight, User as UserIcon } from "lucide-react";
import type { AuditRow } from "@/lib/data/audit";
import { ActionChip } from "./action-chip";
import { formatDateTime, formatRelative } from "@/lib/format";

/**
 * Try to build a deep link to the entity that was changed. Falls back to the
 * raw `entityType / entityId` text when there's no admin page for that type.
 */
function entityHref(entityType: string, entityId: string): string | null {
  if (!entityId || entityId === "*") return null;
  switch (entityType) {
    case "user":
      return `/users/${entityId}`;
    case "product":
      return `/products/${entityId}/edit`;
    case "category":
      return `/categories/${entityId}/edit`;
    case "order":
      return `/orders/${entityId}`;
    case "ticket":
      return `/tickets/${entityId}`;
    case "scan":
      return `/scans/${entityId}`;
    case "disease":
      return `/diseases/${encodeURIComponent(entityId)}`;
    case "supplement":
      return `/supplements/${entityId}`;
    default:
      return null;
  }
}

export function AuditEntryRow({ entry }: { entry: AuditRow }) {
  const href = entityHref(entry.entityType, entry.entityId);
  const hasDiff = Object.keys(entry.diff as object).length > 0;
  const shortEntityId =
    entry.entityId === "*"
      ? "(bulk)"
      : entry.entityId.length > 12
        ? `${entry.entityId.slice(0, 8)}…`
        : entry.entityId;

  return (
    <li className="rounded-card border border-border bg-card p-4 shadow-card">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ActionChip action={entry.action} />
          <span className="text-sm text-muted">on</span>
          <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-foreground">
            {entry.entityType}
          </span>
          {href ? (
            <Link
              href={href}
              className="inline-flex items-center gap-1 font-mono text-xs text-tint-dark hover:text-tint"
            >
              {shortEntityId}
              <ChevronRight className="size-3" aria-hidden="true" />
            </Link>
          ) : (
            <code className="font-mono text-xs text-muted">{shortEntityId}</code>
          )}
        </div>

        <div className="text-right text-xs">
          <div className="inline-flex items-center gap-1.5 text-foreground">
            {entry.actor ? (
              <>
                <UserIcon className="size-3 text-muted" aria-hidden="true" />
                <Link
                  href={`/users/${entry.actor.id}`}
                  className="font-medium hover:text-tint-dark"
                >
                  {entry.actor.name}
                </Link>
              </>
            ) : (
              <span className="text-muted">Unknown actor</span>
            )}
          </div>
          <div className="text-muted">
            {formatRelative(entry.at)}{" "}
            <span className="text-muted/70">· {formatDateTime(entry.at)}</span>
          </div>
        </div>
      </header>

      {hasDiff ? (
        <details className="mt-3 group">
          <summary className="cursor-pointer text-xs font-medium text-muted hover:text-foreground">
            <span className="group-open:hidden">Show diff →</span>
            <span className="hidden group-open:inline">Hide diff ↓</span>
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-input bg-background p-3 text-[11px] leading-relaxed text-foreground">
            {JSON.stringify(entry.diff, null, 2)}
          </pre>
        </details>
      ) : null}
    </li>
  );
}
