import Link from "next/link";
import { Heart } from "lucide-react";
import { listSavedByUser } from "@/lib/data/saved-products";
import { Card } from "../../../_components/card";
import { ActiveBadge } from "../../../products/_components/active-badge";
import { UnsaveButton } from "./unsave-button";
import { formatAmount, formatRelative } from "@/lib/format";

/**
 * "Saved" tab — the products this user has favourited. Server component; admins
 * can remove an entry, which the mobile app does for its own user via the same
 * /api/v1/saved-products endpoint.
 */
export async function SavedTab({
  userId,
  canManage,
}: {
  userId: string;
  canManage: boolean;
}) {
  const rows = await listSavedByUser(userId);

  if (rows.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Heart className="size-6 text-muted" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">
            No saved products yet
          </p>
          <p className="text-sm text-muted">
            Products this user favourites in the app will appear here.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card title={`Saved products (${rows.length})`}>
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
          >
            <Link href={`/products/${row.productId}`} className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={row.imageUrl}
                alt=""
                loading="lazy"
                className="size-12 rounded-input border border-border bg-background object-cover"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/products/${row.productId}`}
                className="block truncate font-medium text-foreground hover:text-tint-dark"
              >
                {row.name}
              </Link>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                <span className="tabular-nums">{formatAmount(row.price)}</span>
                <span aria-hidden="true">·</span>
                <span>Saved {formatRelative(row.savedAt)}</span>
              </div>
            </div>
            <ActiveBadge active={row.isActive} />
            {canManage ? <UnsaveButton savedId={row.id} name={row.name} /> : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
