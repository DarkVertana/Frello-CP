"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

export function Filters({ currentSort }: { currentSort: string | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const search = params.get("search") ?? "";
  const status = params.get("status") ?? "";

  function pushWith(updates: Record<string, string | null>) {
    const next = new URLSearchParams();
    if (currentSort) next.set("sort", currentSort);
    for (const [key, value] of Object.entries({ search, status, ...updates })) {
      if (value) next.set(key, value);
    }
    next.delete("page");
    startTransition(() => router.push(`/broadcasts?${next.toString()}`));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    pushWith({ search: String(form.get("search") ?? "") });
  }

  const hasFilters = Boolean(search || status);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-card p-3 shadow-card"
    >
      <label className="flex flex-1 min-w-[200px] items-center gap-2 rounded-input bg-background px-3 py-2 ring-1 ring-border focus-within:ring-tint">
        <Search className="size-4 text-muted" aria-hidden="true" />
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="Search title or body…"
          aria-label="Search broadcasts"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </label>

      <select
        value={status}
        onChange={(event) => pushWith({ status: event.currentTarget.value || null })}
        aria-label="Filter by status"
        className="h-10 rounded-input border border-border bg-card px-3 text-sm text-foreground"
      >
        <option value="">All statuses</option>
        <option value="draft">Draft</option>
        <option value="scheduled">Scheduled</option>
        <option value="sent">Sent</option>
        <option value="cancelled">Cancelled</option>
      </select>

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
          onClick={() => pushWith({ search: null, status: null })}
          className="inline-flex h-10 items-center gap-1.5 rounded-input px-3 text-sm font-medium text-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
          Clear
        </button>
      ) : null}
    </form>
  );
}
