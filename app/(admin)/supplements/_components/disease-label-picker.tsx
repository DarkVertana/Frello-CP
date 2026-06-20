"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

type GroupedLabels = Record<
  string,
  { label: string; disease: string; healthy: boolean }[]
>;

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  grouped: GroupedLabels;
};

/**
 * Multi-select for disease labels, grouped by crop with a search filter.
 * Selected labels also appear as chips above for quick removal.
 */
export function DiseaseLabelPicker({ value, onChange, grouped }: Props) {
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(() => new Set(value), [value]);

  function toggle(label: string) {
    if (selectedSet.has(label)) {
      onChange(value.filter((l) => l !== label));
    } else {
      onChange([...value, label]);
    }
  }

  const crops = useMemo(() => {
    const list = Object.entries(grouped).map(([crop, entries]) => ({
      crop,
      entries: entries.filter((entry) => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (
          entry.label.toLowerCase().includes(q) ||
          entry.disease.toLowerCase().includes(q) ||
          crop.toLowerCase().includes(q)
        );
      }),
    }));
    return list.filter((group) => group.entries.length > 0);
  }, [grouped, query]);

  return (
    <div className="space-y-3">
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-tint/30 bg-tint-soft px-2.5 py-0.5 text-xs font-medium text-tint-dark"
            >
              <code className="text-[11px]">{label}</code>
              <button
                type="button"
                onClick={() => toggle(label)}
                aria-label={`Remove ${label}`}
                className="text-tint-dark/70 hover:text-tint-dark"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <label className="flex items-center gap-2 rounded-input bg-background px-3 py-2 ring-1 ring-border focus-within:ring-tint">
        <Search className="size-4 text-muted" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search labels by crop or condition…"
          aria-label="Filter disease labels"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </label>

      <div className="max-h-72 overflow-y-auto rounded-input border border-border bg-background">
        {crops.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted">
            No labels match. Try a different search.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {crops.map(({ crop, entries }) => (
              <li key={crop}>
                <details open className="group">
                  <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted hover:text-foreground">
                    {crop} · {entries.length}
                  </summary>
                  <ul className="space-y-1 px-3 pb-2">
                    {entries.map((entry) => {
                      const selected = selectedSet.has(entry.label);
                      return (
                        <li key={entry.label}>
                          <label
                            className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${
                              selected
                                ? "bg-tint-soft text-tint-dark"
                                : "text-foreground hover:bg-card"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggle(entry.label)}
                              className="size-4 rounded border-border text-tint focus:ring-tint"
                            />
                            <span className="flex-1">
                              <span className="block font-medium">{entry.disease}</span>
                              <code className="block text-[11px] text-muted">
                                {entry.label}
                              </code>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted">{value.length} selected.</p>
    </div>
  );
}
