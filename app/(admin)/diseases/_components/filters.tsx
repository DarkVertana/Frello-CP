"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

type Props = {
  crops: string[];
  currentSort: string | null;
};

export function Filters({ crops, currentSort }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const search = params.get("search") ?? "";
  const crop = params.get("crop") ?? "";
  const healthy = params.get("healthy") ?? "";
  const severity = params.get("severity") ?? "";

  function pushWith(updates: Record<string, string | null>) {
    const next = new URLSearchParams();
    if (currentSort) next.set("sort", currentSort);
    for (const [key, value] of Object.entries({
      search,
      crop,
      healthy,
      severity,
      ...updates,
    })) {
      if (value) next.set(key, value);
    }
    next.delete("page");
    startTransition(() => router.push(`/diseases?${next.toString()}`));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    pushWith({ search: String(form.get("search") ?? "") });
  }

  const hasFilters = Boolean(search || crop || healthy || severity);

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
          placeholder="Search label, crop, or condition…"
          aria-label="Search diseases"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </label>

      <select
        value={crop}
        onChange={(event) => pushWith({ crop: event.currentTarget.value || null })}
        aria-label="Filter by crop"
        className="h-10 rounded-input border border-border bg-card px-3 text-sm text-foreground"
      >
        <option value="">All crops</option>
        {crops.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <select
        value={healthy}
        onChange={(event) => pushWith({ healthy: event.currentTarget.value || null })}
        aria-label="Filter by health"
        className="h-10 rounded-input border border-border bg-card px-3 text-sm text-foreground"
      >
        <option value="">Healthy & disease</option>
        <option value="true">Healthy only</option>
        <option value="false">Disease only</option>
      </select>

      <select
        value={severity}
        onChange={(event) => pushWith({ severity: event.currentTarget.value || null })}
        aria-label="Filter by severity"
        className="h-10 rounded-input border border-border bg-card px-3 text-sm text-foreground"
      >
        <option value="">All severities</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
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
          onClick={() =>
            pushWith({ search: null, crop: null, healthy: null, severity: null })
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
