import Link from "next/link";
import { listTicketsForUser } from "@/lib/data/tickets";
import {
  PriorityBadge,
  TicketStatusBadge,
} from "../../../tickets/_components/badges";
import { Card } from "../../../_components/card";
import { formatRelative } from "@/lib/format";

export async function TicketsTab({ userId }: { userId: string }) {
  const rows = await listTicketsForUser(userId);

  if (rows.length === 0) {
    return (
      <Card>
        <p className="py-6 text-center text-sm text-muted">
          This customer hasn&apos;t opened any tickets.
        </p>
      </Card>
    );
  }

  return (
    <Card title={`Tickets (${rows.length})`}>
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={`/tickets/${row.id}`}
              className="block py-3 first:pt-0 last:pb-0 hover:bg-tint-soft/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {row.subject}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <TicketStatusBadge status={row.status} />
                    <PriorityBadge priority={row.priority} />
                    <span className="text-xs text-muted">{row.category}</span>
                    <span className="text-xs text-muted">
                      {row.replyCount}{" "}
                      {row.replyCount === 1 ? "reply" : "replies"}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-muted">
                  {formatRelative(row.updatedAt)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
