"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

export function SearchBar({ currentSort }: { currentSort: string | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const search = params.get("search") ?? "";

  function push(value: string | null) {
    const next = new URLSearchParams();
    if (currentSort) next.set("sort", currentSort);
    if (value) next.set("search", value);
    next.delete("page");
    startTransition(() => router.push(`/supplements?${next.toString()}`));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    push(String(form.get("search") ?? "") || null);
  }

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
          placeholder="Search by name or brand…"
          aria-label="Search supplements"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center rounded-input bg-tint px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90 disabled:opacity-60"
      >
        {pending ? "Applying…" : "Apply"}
      </button>
      {search ? (
        <button
          type="button"
          onClick={() => push(null)}
          className="inline-flex h-10 items-center gap-1.5 rounded-input px-3 text-sm font-medium text-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
          Clear
        </button>
      ) : null}
    </form>
  );
}
