"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

type ActorOption = { id: string; name: string; email: string; count: number };

type Props = {
  actors: ActorOption[];
  entityTypes: string[];
};

export function Filters({ actors, entityTypes }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const actorId = params.get("actorId") ?? "";
  const entityType = params.get("entityType") ?? "";
  const action = params.get("action") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";

  function pushWith(updates: Record<string, string | null>) {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries({
      actorId,
      entityType,
      action,
      from,
      to,
      ...updates,
    })) {
      if (value) next.set(key, value);
    }
    next.delete("page");
    startTransition(() => router.push(`/audit?${next.toString()}`));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    pushWith({
      action: String(form.get("action") ?? "") || null,
      from: String(form.get("from") ?? "") || null,
      to: String(form.get("to") ?? "") || null,
    });
  }

  const hasFilters = Boolean(actorId || entityType || action || from || to);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-card p-3 shadow-card"
    >
      <select
        value={actorId}
        onChange={(event) => pushWith({ actorId: event.currentTarget.value || null })}
        aria-label="Filter by actor"
        className="h-10 min-w-[200px] rounded-input border border-border bg-card px-3 text-sm text-foreground"
      >
        <option value="">All actors</option>
        {actors.map((actor) => (
          <option key={actor.id} value={actor.id}>
            {actor.name} · {actor.count}
          </option>
        ))}
      </select>

      <select
        value={entityType}
        onChange={(event) =>
          pushWith({ entityType: event.currentTarget.value || null })
        }
        aria-label="Filter by entity"
        className="h-10 rounded-input border border-border bg-card px-3 text-sm text-foreground"
      >
        <option value="">All entities</option>
        {entityTypes.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <label className="flex flex-1 min-w-[180px] items-center gap-2 rounded-input bg-background px-3 py-2 ring-1 ring-border focus-within:ring-tint">
        <Search className="size-4 text-muted" aria-hidden="true" />
        <input
          type="search"
          name="action"
          defaultValue={action}
          placeholder="Action contains… e.g. transition, refund"
          aria-label="Search actions"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </label>

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
        className="inline-flex h-10 items-center rounded-input bg-tint px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90 disabled:opacity-60"
      >
        {pending ? "Applying…" : "Apply"}
      </button>

      {hasFilters ? (
        <button
          type="button"
          onClick={() =>
            pushWith({
              actorId: null,
              entityType: null,
              action: null,
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
