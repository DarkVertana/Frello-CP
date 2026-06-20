"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Banner } from "@/app/(auth)/_components/banner";
import { useCurrency } from "../../../_components/currency-provider";
import { formatAmount } from "@/lib/format";
import type { CartItemRow } from "@/lib/data/cart";

type Props = {
  userId: string;
  items: CartItemRow[];
  itemCount: number;
  subtotal: number;
  canManage: boolean;
};

export function CartItems({ userId, items, itemCount, subtotal, canManage }: Props) {
  const router = useRouter();
  const currency = useCurrency();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(id: string, init: RequestInit, url: string) {
    setBusyId(id);
    setError(null);
    const response = await fetch(url, init);
    setBusyId(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Action failed.");
      return false;
    }
    router.refresh();
    return true;
  }

  function setQuantity(item: CartItemRow, quantity: number) {
    if (quantity < 1 || quantity > 999) return;
    void call(
      item.id,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quantity }),
      },
      `/api/v1/cart/${item.id}`,
    );
  }

  function remove(item: CartItemRow) {
    void call(item.id, { method: "DELETE" }, `/api/v1/cart/${item.id}`);
  }

  async function clearCart() {
    if (!window.confirm("Empty this user's cart?")) return;
    await call(
      "__clear__",
      { method: "DELETE" },
      `/api/v1/cart?userId=${encodeURIComponent(userId)}`,
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          Cart{" "}
          <span className="font-normal text-muted">
            ({itemCount} {itemCount === 1 ? "item" : "items"})
          </span>
        </h2>
        {canManage ? (
          <button
            type="button"
            onClick={clearCart}
            disabled={busyId !== null}
            className="inline-flex h-9 items-center gap-1.5 rounded-input border border-border bg-card px-3 text-sm font-medium text-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-60"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Clear cart
          </button>
        ) : null}
      </div>

      {error ? <Banner tone="error">{error}</Banner> : null}

      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 p-4">
              <Link href={`/products/${item.productId}`} className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt=""
                  loading="lazy"
                  className="size-12 rounded-input border border-border bg-background object-cover"
                />
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/products/${item.productId}`}
                  className="block truncate font-medium text-foreground hover:text-tint-dark"
                >
                  {item.name}
                </Link>
                <div className="text-xs text-muted">
                  {formatAmount(item.price, currency)} each
                  {!item.isActive ? (
                    <span className="ml-2 text-danger">inactive</span>
                  ) : null}
                </div>
              </div>

              {canManage ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQuantity(item, item.quantity - 1)}
                    disabled={busyId === item.id || item.quantity <= 1}
                    aria-label="Decrease quantity"
                    className="flex size-8 items-center justify-center rounded-input border border-border text-muted transition hover:bg-tint-soft hover:text-foreground disabled:opacity-40"
                  >
                    <Minus className="size-3.5" aria-hidden="true" />
                  </button>
                  <span className="w-8 text-center text-sm font-medium tabular-nums text-foreground">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(item, item.quantity + 1)}
                    disabled={busyId === item.id || item.quantity >= 999}
                    aria-label="Increase quantity"
                    className="flex size-8 items-center justify-center rounded-input border border-border text-muted transition hover:bg-tint-soft hover:text-foreground disabled:opacity-40"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <span className="text-sm tabular-nums text-muted">
                  × {item.quantity}
                </span>
              )}

              <div className="w-20 shrink-0 text-right text-sm font-medium tabular-nums text-foreground">
                {formatAmount(item.lineTotal, currency)}
              </div>

              {canManage ? (
                <button
                  type="button"
                  onClick={() => remove(item)}
                  disabled={busyId === item.id}
                  aria-label={`Remove ${item.name}`}
                  title="Remove"
                  className="flex size-8 shrink-0 items-center justify-center rounded-input text-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <span className="text-sm text-muted">Subtotal</span>
          <span className="text-base font-semibold tabular-nums text-foreground">
            {formatAmount(subtotal, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}
