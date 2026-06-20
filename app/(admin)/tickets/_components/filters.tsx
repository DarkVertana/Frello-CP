"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

type AgentOption = { id: string; name: string };

type Props = {
  categories: string[];
  agents: AgentOption[];
  /** Hide the status filter when the Kanban view is showing — columns ARE the statuses. */
  hideStatus?: boolean;
  /** Preserves current view + sort across filter changes. */
  carryParams?: Record<string, string | undefined>;
};

export function Filters({ categories, agents, hideStatus, carryParams = {} }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const search = params.get("search") ?? "";
  const status = params.get("status") ?? "";
  const priority = params.get("priority") ?? "";
  const category = params.get("category") ?? "";
  const assigneeId = params.get("assigneeId") ?? "";
  const unassigned = params.get("unassigned") ?? "";

  function pushWith(updates: Record<string, string | null>) {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(carryParams)) {
      if (value) next.set(key, value);
    }
    for (const [key, value] of Object.entries({
      search,
      status,
      priority,
      category,
      assigneeId,
      unassigned,
      ...updates,
    })) {
      if (value) next.set(key, value);
    }
    next.delete("page");
    startTransition(() => router.push(`/tickets?${next.toString()}`));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    pushWith({ search: String(form.get("search") ?? "") });
  }

  const hasFilters = Boolean(
    search || status || priority || category || assigneeId || unassigned,
  );

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
          placeholder="Search subject, body, or category…"
          aria-label="Search tickets"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </label>

      {!hideStatus ? (
        <select
          value={status}
          onChange={(event) => pushWith({ status: event.currentTarget.value || null })}
          aria-label="Filter by status"
          className="h-10 rounded-input border border-border bg-card px-3 text-sm text-foreground"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
        </select>
      ) : null}

      <select
        value={priority}
        onChange={(event) => pushWith({ priority: event.currentTarget.value || null })}
        aria-label="Filter by priority"
        className="h-10 rounded-input border border-border bg-card px-3 text-sm text-foreground"
      >
        <option value="">All priorities</option>
        <option value="high">High</option>
        <option value="normal">Normal</option>
        <option value="low">Low</option>
      </select>

      <select
        value={category}
        onChange={(event) => pushWith({ category: event.currentTarget.value || null })}
        aria-label="Filter by category"
        className="h-10 rounded-input border border-border bg-card px-3 text-sm text-foreground"
      >
        <option value="">All categories</option>
        {categories.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <select
        value={unassigned === "true" ? "__unassigned__" : assigneeId}
        onChange={(event) => {
          const value = event.currentTarget.value;
          if (value === "__unassigned__") {
            pushWith({ assigneeId: null, unassigned: "true" });
          } else {
            pushWith({ assigneeId: value || null, unassigned: null });
          }
        }}
        aria-label="Filter by assignee"
        className="h-10 rounded-input border border-border bg-card px-3 text-sm text-foreground"
      >
        <option value="">All assignees</option>
        <option value="__unassigned__">Unassigned</option>
        {agents.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
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
            pushWith({
              search: null,
              status: null,
              priority: null,
              category: null,
              assigneeId: null,
              unassigned: null,
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
