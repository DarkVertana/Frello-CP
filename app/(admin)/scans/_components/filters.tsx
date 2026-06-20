"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

type LabelOption = { label: string; count: number };

type Props = {
  labels: LabelOption[];
};

export function Filters({ labels }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const label = params.get("label") ?? "";
  const confidence = params.get("confidence") ?? "";
  const flagged = params.get("flagged") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  function pushWith(updates: Record<string, string | null>) {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries({
      label,
      confidence,
      flagged,
      from,
      to,
      ...updates,
    })) {
      if (value) next.set(key, value);
    }
    next.delete("page");
    startTransition(() => router.push(`/scans?${next.toString()}`));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    pushWith({
      from: String(form.get("from") ?? "") || null,
      to: String(form.get("to") ?? "") || null,
    });
  }

  const hasFilters = Boolean(label || confidence || flagged || from || to);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-card p-3 shadow-card"
    >
      <select
        value={label}
        onChange={(event) => pushWith({ label: event.currentTarget.value || null })}
        aria-label="Filter by predicted label"
        className="h-10 min-w-[180px] rounded-input border border-border bg-card px-3 text-sm text-foreground"
      >
        <option value="">All labels</option>
        {labels.map((option) => (
          <option key={option.label} value={option.label}>
            {option.label} · {option.count}
          </option>
        ))}
      </select>

      <select
        value={confidence}
        onChange={(event) =>
          pushWith({ confidence: event.currentTarget.value || null })
        }
        aria-label="Filter by confidence band"
        className="h-10 rounded-input border border-border bg-card px-3 text-sm text-foreground"
      >
        <option value="">All confidence</option>
        <option value="high">High (≥ 90%)</option>
        <option value="medium">Medium (60–90%)</option>
        <option value="low">Low (&lt; 60%)</option>
      </select>

      <select
        value={flagged}
        onChange={(event) => pushWith({ flagged: event.currentTarget.value || null })}
        aria-label="Filter by flagged state"
        className="h-10 rounded-input border border-border bg-card px-3 text-sm text-foreground"
      >
        <option value="">All scans</option>
        <option value="true">Flagged only</option>
        <option value="false">Unflagged only</option>
      </select>

      <label className="flex items-center gap-1 text-xs text-muted">
        From
        <input
          type="date"
          name="from"
          defaultValue={from}
          className="h-10 rounded-input border border-border bg-card px-2 text-sm text-foreground"
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-muted">
        To
        <input
          type="date"
          name="to"
          defaultValue={to}
          className="h-10 rounded-input border border-border bg-card px-2 text-sm text-foreground"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center gap-1.5 rounded-input bg-tint px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90 disabled:opacity-60"
      >
        <Search className="size-4" aria-hidden="true" />
        {pending ? "Applying…" : "Apply"}
      </button>

      {hasFilters ? (
        <button
          type="button"
          onClick={() =>
            pushWith({
              label: null,
              confidence: null,
              flagged: null,
              from: null,
              to: null,
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
