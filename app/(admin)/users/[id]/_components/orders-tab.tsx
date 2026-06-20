import Link from "next/link";
import { listOrdersForUser } from "@/lib/data/orders";
import { OrderStatusBadge } from "../../../orders/_components/order-status-badge";
import { Card } from "../../../_components/card";
import { formatAmount, formatRelative } from "@/lib/format";

/**
 * Renders inside the "Orders" tab of the user detail page. Server component
 * — runs a single query per request.
 */
export async function OrdersTab({ userId }: { userId: string }) {
  const rows = await listOrdersForUser(userId);

  if (rows.length === 0) {
    return (
      <Card>
        <p className="py-6 text-center text-sm text-muted">
          This customer hasn&apos;t placed any orders yet.
        </p>
      </Card>
    );
  }

  return (
    <Card title={`Orders (${rows.length})`}>
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={`/orders/${row.id}`}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:bg-tint-soft/40"
            >
              <div className="flex items-center gap-3">
                <OrderStatusBadge status={row.status} />
                <code className="text-xs text-muted">{row.id.slice(0, 8)}</code>
                <span className="text-xs text-muted">
                  {row.itemCount} {row.itemCount === 1 ? "item" : "items"}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="font-medium tabular-nums text-foreground">
                  {formatAmount(row.total)}
                </span>
                <span className="text-xs text-muted">
                  {formatRelative(row.createdAt)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
