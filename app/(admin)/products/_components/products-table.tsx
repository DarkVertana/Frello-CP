"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  CheckSquare2,
  Pencil,
  Square,
  XSquare,
} from "lucide-react";
import type { ProductWithCategory, ProductSortField } from "@/lib/data/products";
import { LOW_STOCK_THRESHOLD } from "@/lib/schemas/product";
import { ActiveBadge } from "./active-badge";
import { ProductModal } from "./product-modal";
import { Banner } from "@/app/(auth)/_components/banner";
import { useCurrency } from "../../_components/currency-provider";
import { formatAmount, formatRelative } from "@/lib/format";

type CategoryOption = { id: string; name: string; slug: string };

type Props = {
  rows: ProductWithCategory[];
  sort: { field: ProductSortField; direction: "asc" | "desc" };
  canManage: boolean;
  /** Required when canManage=true so the edit modal has the category options. */
  categories: CategoryOption[];
};

const SORTABLE_FIELDS: ProductSortField[] = [
  "name",
  "price",
  "rating",
  "stock",
  "createdAt",
  "updatedAt",
];

export function ProductsTable({ rows, sort, canManage, categories }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const currency = useCurrency();
  const [, startTransition] = useTransition();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<ProductWithCategory | null>(null);
  const [busy, setBusy] = useState<null | "activate" | "deactivate">(null);
  const [error, setError] = useState<string | null>(null);

  const allIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allSelected = selected.size > 0 && allIds.every((id) => selected.has(id));

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  }

  function toggleRow(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function buildSortHref(field: ProductSortField): string {
    const active = sort.field === field;
    const nextValue = !active
      ? `-${field}` // first click = desc (newest / largest first)
      : sort.direction === "desc"
        ? field
        : null;
    const next = new URLSearchParams(params);
    if (nextValue) next.set("sort", nextValue);
    else next.delete("sort");
    next.delete("page");
    const query = next.toString();
    return query ? `/products?${query}` : "/products";
  }

  async function handleBulk(activate: boolean) {
    if (selected.size === 0) return;
    setError(null);
    setBusy(activate ? "activate" : "deactivate");
    const response = await fetch("/api/v1/products/bulk-activate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: [...selected], isActive: activate }),
    });
    setBusy(null);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Bulk update failed.");
      return;
    }
    setSelected(new Set());
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      {error ? <Banner tone="error">{error}</Banner> : null}

      {canManage && selected.size > 0 ? (
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-card border border-tint/30 bg-tint-soft px-4 py-2.5 shadow-card">
          <p className="text-sm text-tint-dark">
            <span className="font-semibold">{selected.size}</span>{" "}
            {selected.size === 1 ? "product" : "products"} selected
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleBulk(true)}
              disabled={busy !== null}
              className="inline-flex h-9 items-center gap-1.5 rounded-input bg-tint px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90 disabled:opacity-60"
            >
              <CheckSquare2 className="size-4" aria-hidden="true" />
              {busy === "activate" ? "Activating…" : "Activate"}
            </button>
            <button
              type="button"
              onClick={() => handleBulk(false)}
              disabled={busy !== null}
              className="inline-flex h-9 items-center gap-1.5 rounded-input border border-border bg-card px-3 text-sm font-medium text-foreground transition hover:bg-card disabled:opacity-60"
            >
              <XSquare className="size-4" aria-hidden="true" />
              {busy === "deactivate" ? "Deactivating…" : "Deactivate"}
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-sm font-medium text-tint-dark/80 hover:text-tint-dark"
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead className="border-b border-border bg-background/70">
              <tr>
                {canManage ? (
                  <th className="w-10 px-4 py-3 text-left">
                    <button
                      type="button"
                      onClick={toggleAll}
                      aria-label={allSelected ? "Clear selection" : "Select all"}
                      className="text-muted hover:text-foreground"
                    >
                      {allSelected ? (
                        <CheckSquare2 className="size-4 text-tint-dark" />
                      ) : (
                        <Square className="size-4" />
                      )}
                    </button>
                  </th>
                ) : null}
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">
                  Image
                </th>
                <SortableTh
                  field="name"
                  label="Name"
                  sort={sort}
                  hrefFor={buildSortHref}
                />
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">
                  Category
                </th>
                <SortableTh
                  field="price"
                  label="Price"
                  sort={sort}
                  hrefFor={buildSortHref}
                  className="text-right"
                />
                <SortableTh
                  field="stock"
                  label="Stock"
                  sort={sort}
                  hrefFor={buildSortHref}
                  className="text-right"
                />
                <SortableTh
                  field="rating"
                  label="Rating"
                  sort={sort}
                  hrefFor={buildSortHref}
                  className="text-right"
                />
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">
                  Status
                </th>
                <SortableTh
                  field="updatedAt"
                  label="Updated"
                  sort={sort}
                  hrefFor={buildSortHref}
                />
                {canManage ? (
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted">
                    Edit
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage ? 10 : 8}
                    className="px-4 py-16 text-center"
                  >
                    <p className="text-sm font-semibold text-foreground">
                      No products yet
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {canManage
                        ? "Click ‘New product’ above, or import a CSV."
                        : "Ask a manager to add the first one."}
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isSelected = selected.has(row.id);
                  const lowStock = row.stock < LOW_STOCK_THRESHOLD;
                  return (
                    <tr
                      key={row.id}
                      className={
                        isSelected
                          ? "bg-tint-soft/50"
                          : "transition hover:bg-tint-soft/40"
                      }
                    >
                      {canManage ? (
                        <td className="w-10 px-4 py-3">
                          <button
                            type="button"
                            onClick={() => toggleRow(row.id)}
                            aria-label={`Select ${row.name}`}
                            className="text-muted hover:text-foreground"
                          >
                            {isSelected ? (
                              <CheckSquare2 className="size-4 text-tint-dark" />
                            ) : (
                              <Square className="size-4" />
                            )}
                          </button>
                        </td>
                      ) : null}
                      <td className="px-4 py-3">
                        <Link
                          href={`/products/${row.id}`}
                          aria-label={`View ${row.name}`}
                          className="inline-block"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={row.imageUrl}
                            alt=""
                            loading="lazy"
                            className="size-12 rounded-input border border-border bg-background object-cover"
                          />
                        </Link>
                      </td>
                      <td className="px-4 py-3 align-middle text-sm">
                        <Link
                          href={`/products/${row.id}`}
                          className="block font-medium text-foreground hover:text-tint-dark"
                        >
                          {row.name}
                        </Link>
                        <code className="text-xs text-muted">/{row.slug}</code>
                      </td>
                      <td className="px-4 py-3 align-middle text-sm text-muted">
                        {row.category?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right align-middle text-sm">
                        <div className="font-medium text-foreground">
                          {formatAmount(row.price, currency)}
                        </div>
                        {row.originalPrice ? (
                          <div className="text-xs text-muted line-through">
                            {formatAmount(row.originalPrice, currency)}
                          </div>
                        ) : null}
                      </td>
                      <td
                        className={`px-4 py-3 text-right align-middle text-sm tabular-nums ${
                          lowStock ? "text-danger" : "text-foreground"
                        }`}
                      >
                        {row.stock}
                        {lowStock ? (
                          <span className="ml-1 text-xs">low</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right align-middle text-sm tabular-nums text-foreground">
                        {row.rating.toFixed(1)}
                        <span className="text-xs text-muted">
                          {" "}
                          ({row.reviewsCount})
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <ActiveBadge active={row.isActive} />
                      </td>
                      <td className="px-4 py-3 align-middle text-sm text-muted">
                        {formatRelative(row.updatedAt)}
                      </td>
                      {canManage ? (
                        <td className="px-4 py-3 text-right align-middle">
                          <button
                            type="button"
                            onClick={() => setEditing(row)}
                            aria-label={`Edit ${row.name}`}
                            className="inline-flex size-9 items-center justify-center rounded-input text-muted transition hover:bg-tint-soft hover:text-foreground"
                          >
                            <Pencil className="size-4" />
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {canManage ? (
        <ProductModal
          open={editing !== null}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          product={editing ?? undefined}
          categories={categories}
        />
      ) : null}
    </div>
  );
}

function SortableTh({
  label,
  field,
  sort,
  hrefFor,
  className = "",
}: {
  label: string;
  field: ProductSortField;
  sort: { field: ProductSortField; direction: "asc" | "desc" };
  hrefFor: (field: ProductSortField) => string;
  className?: string;
}) {
  if (!SORTABLE_FIELDS.includes(field)) return null;
  const active = sort.field === field;
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted ${className}`}
    >
      <Link
        href={hrefFor(field)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        {!active ? (
          <ChevronsUpDown className="size-3.5 opacity-50" aria-hidden="true" />
        ) : sort.direction === "asc" ? (
          <ChevronUp className="size-3.5 text-tint-dark" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-3.5 text-tint-dark" aria-hidden="true" />
        )}
      </Link>
    </th>
  );
}
