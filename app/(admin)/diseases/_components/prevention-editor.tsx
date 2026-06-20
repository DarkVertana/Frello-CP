"use client";

import { GripVertical, Plus, X } from "lucide-react";
import { fieldInputClass } from "@/app/(auth)/_components/field";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
};

/**
 * Edit a prevention array as a list of one-line bullets. Keeps the order
 * stable; adds at the bottom. No drag-and-drop yet — preventions rarely need
 * reordering and the array is short.
 */
export function PreventionEditor({ value, onChange }: Props) {
  function update(index: number, text: string) {
    const next = [...value];
    next[index] = text;
    onChange(next);
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...value, ""]);
  }

  return (
    <div className="space-y-2">
      {value.length === 0 ? (
        <p className="rounded-input bg-background px-3 py-3 text-sm text-muted">
          No prevention steps yet. Add the first one below.
        </p>
      ) : null}

      <ul className="space-y-2">
        {value.map((step, index) => (
          <li key={index} className="flex items-center gap-2">
            <span aria-hidden="true" className="text-muted">
              <GripVertical className="size-4" />
            </span>
            <input
              type="text"
              value={step}
              onChange={(event) => update(index, event.currentTarget.value)}
              placeholder={`Step ${index + 1}`}
              className={fieldInputClass}
            />
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label={`Remove step ${index + 1}`}
              className="flex size-9 shrink-0 items-center justify-center rounded-input text-muted transition hover:bg-danger-soft hover:text-danger"
            >
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 rounded-input border border-dashed border-border px-3 py-2 text-sm font-medium text-muted transition hover:border-tint/40 hover:bg-tint-soft hover:text-foreground"
      >
        <Plus className="size-4" aria-hidden="true" />
        Add step
      </button>
    </div>
  );
}
