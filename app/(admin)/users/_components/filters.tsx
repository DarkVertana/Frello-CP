"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Search, X } from "lucide-react";

type Props = {
  /** Sort param to preserve across filter changes (set via the column header). */
  currentSort: string | null;
};

export function Filters({ currentSort }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const search = params.get("search") ?? "";
  const role = params.get("role") ?? "";
  const status = params.get("status") ?? "";

  function pushWith(updates: Record<string, string | null>) {
    const next = new URLSearchParams();
    if (currentSort) next.set("sort", currentSort);
    for (const [key, value] of Object.entries({ search, role, status, ...updates })) {
      if (value) next.set(key, value);
    }
    next.delete("page"); // reset to page 1 whenever filters change
    startTransition(() => router.push(`/users?${next.toString()}`));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    pushWith({ search: String(form.get("search") ?? "") });
  }

  const hasFilters = Boolean(search || role || status);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-card p-3 shadow-card"
    >
      <label className="flex flex-1 min-w-[240px] items-center gap-2 rounded-input bg-background px-3 py-2 ring-1 ring-border focus-within:ring-tint">
        <Search className="size-4 text-muted" aria-hidden="true" />
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="Search by name, email, or phone…"
          aria-label="Search users"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </label>

      <div className="relative">
        <select
          value={role}
          onChange={(event) => pushWith({ role: event.currentTarget.value || null })}
          aria-label="Filter by role"
          className="h-10 appearance-none rounded-input border border-border bg-card pl-3 pr-9 text-sm text-foreground"
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="viewer">Viewer</option>
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
      </div>

      <div className="relative">
        <select
          value={status}
          onChange={(event) => pushWith({ status: event.currentTarget.value || null })}
          aria-label="Filter by status"
          className="h-10 appearance-none rounded-input border border-border bg-card pl-3 pr-9 text-sm text-foreground"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
      </div>

      {hasFilters ? (
        <button
          type="button"
          onClick={() => pushWith({ search: null, role: null, status: null })}
          className="inline-flex h-10 items-center gap-1.5 rounded-input px-3 text-sm font-medium text-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
          Clear
        </button>
      ) : null}
    </form>
  );
}
