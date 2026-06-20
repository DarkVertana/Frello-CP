import { listUserActivity } from "@/lib/data/users";
import { formatDateTime } from "@/lib/format";

/**
 * Renders the user's audit-log feed: anything they did, and anything done to
 * them. Lives inside the detail page's "Activity" tab.
 */
export async function ActivityFeed({ userId }: { userId: string }) {
  const entries = await listUserActivity(userId, 100);

  if (entries.length === 0) {
    return (
      <div className="rounded-input bg-background px-4 py-10 text-center text-sm text-muted">
        No activity recorded for this user yet.
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {entries.map((entry) => {
        const self = entry.actorId === userId;
        return (
          <li
            key={entry.id}
            className="flex items-start gap-3 rounded-input border border-border bg-card p-3"
          >
            <span
              aria-hidden="true"
              className={`mt-1.5 size-2 shrink-0 rounded-full ${
                self ? "bg-tint" : "bg-muted"
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-sm font-medium text-foreground">
                  {entry.action}
                </span>
                <span className="text-xs text-muted">
                  {formatDateTime(entry.at)}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-muted">
                {self ? "Acted as" : "Affected as"}{" "}
                <span className="font-medium text-foreground">{entry.entityType}</span>
                {entry.entityId && entry.entityId !== "*" ? (
                  <>
                    {" "}
                    · <code className="text-foreground">{entry.entityId}</code>
                  </>
                ) : null}
              </div>
              {Object.keys(entry.diff as object).length > 0 ? (
                <pre className="mt-2 max-h-32 overflow-auto rounded bg-background p-2 text-[11px] leading-snug text-muted">
                  {JSON.stringify(entry.diff, null, 2)}
                </pre>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
