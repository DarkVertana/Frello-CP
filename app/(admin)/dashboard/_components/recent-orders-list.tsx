import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { getRecentOrders } from "@/lib/data/analytics";
import { OrderStatusBadge } from "../../orders/_components/order-status-badge";
import { formatAmount, formatRelative } from "@/lib/format";

export async function RecentOrdersList() {
  const rows = await getRecentOrders(5);

  if (rows.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-input bg-background px-4 py-6 text-sm text-muted">
        <ShoppingCart className="size-5 text-tint-dark" aria-hidden="true" />
        No orders yet — run a checkout in the mobile app to seed one.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => (
        <li key={row.id}>
          <Link
            href={`/orders/${row.id}`}
            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:bg-tint-soft/40"
          >
            <div className="flex items-center gap-3">
              <OrderStatusBadge status={row.status} />
              <div className="text-sm">
                <code className="text-xs text-muted">{row.id.slice(0, 8)}</code>
                <div className="text-xs text-muted">
                  {row.customerName ?? "—"}
                </div>
              </div>
            </div>
            <div className="text-right text-sm">
              <div className="font-medium tabular-nums text-foreground">
                {formatAmount(row.total)}
              </div>
              <div className="text-xs text-muted">
                {formatRelative(row.createdAt)}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
