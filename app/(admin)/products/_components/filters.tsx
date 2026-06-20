"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

type CategoryOption = { id: string; name: string };

type Props = {
  categories: CategoryOption[];
  currentSort: string | null;
};

export function Filters({ categories, currentSort }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const search = params.get("search") ?? "";
  const categoryId = params.get("categoryId") ?? "";
  const isActive = params.get("isActive") ?? "";
  const lowStock = params.get("lowStock") ?? "";

  function pushWith(updates: Record<string, string | null>) {
    const next = new URLSearchParams();
    if (currentSort) next.set("sort", currentSort);
    for (const [key, value] of Object.entries({
      search,
      categoryId,
      isActive,
      lowStock,
      ...updates,
    })) {
      if (value) next.set(key, value);
    }
    next.delete("page");
    startTransition(() => router.push(`/products?${next.toString()}`));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    pushWith({ search: String(form.get("search") ?? "") });
  }

  const hasFilters = Boolean(search || categoryId || isActive || lowStock);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-card p-3 shadow-card"
    >
      <label className="flex flex-1 min-w-[220px] items-center gap-2 rounded-input bg-background px-3 py-2 ring-1 ring-border focus-within:ring-tint">
        <Search className="size-4 text-muted" aria-hidden="true" />
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="Search name or slug…"
          aria-label="Search products"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </label>

      <select
        value={categoryId}
        onChange={(event) => pushWith({ categoryId: event.currentTarget.value || null })}
        aria-label="Filter by category"
        className="h-10 rounded-input border border-border bg-card px-3 text-sm text-foreground"
      >
        <option value="">All categories</option>
        {categories.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>

      <select
        value={isActive}
        onChange={(event) => pushWith({ isActive: event.currentTarget.value || null })}
        aria-label="Filter by status"
        className="h-10 rounded-input border border-border bg-card px-3 text-sm text-foreground"
      >
        <option value="">Active & inactive</option>
        <option value="true">Active only</option>
        <option value="false">Inactive only</option>
      </select>

      <label className="inline-flex items-center gap-1.5 rounded-input border border-border bg-card px-3 py-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={lowStock === "true"}
          onChange={(event) =>
            pushWith({ lowStock: event.currentTarget.checked ? "true" : null })
          }
          className="size-4 rounded border-border text-tint focus:ring-tint"
        />
        Low stock
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center rounded-input bg-tint px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90 disabled:opacity-60"
      >
        {pending ? "Applying…" : "Apply"}
      </button>

      {hasFilters ? (
        <button
          type="button"
          onClick={() =>
            pushWith({
              search: null,
              categoryId: null,
              isActive: null,
              lowStock: null,
            })
          }
          className="inline-flex h-10 items-center gap-1.5 rounded-input px-3 text-sm font-medium text-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
          Clear
        </button>
      ) : null}
    </form>
  );
}
