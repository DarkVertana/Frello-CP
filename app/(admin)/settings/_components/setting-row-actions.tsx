"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import type { Setting } from "@/db/schema";
import { SettingModal } from "./setting-modal";

/**
 * Per-row actions for the Settings list card: Edit (opens a modal) + Delete.
 * Self-contained client component so the list page can stay a server component.
 */
export function SettingRowActions({ setting }: { setting: Setting }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete "${setting.key}"? Code that reads this key will fall back to its default.`,
      )
    )
      return;
    setDeleting(true);
    setError(null);
    const response = await fetch(
      `/api/v1/settings/${encodeURIComponent(setting.key)}`,
      { method: "DELETE" },
    );
    setDeleting(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Couldn't delete that setting.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-1">
      {error ? (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Edit ${setting.key}`}
        className="flex size-8 items-center justify-center rounded-input text-muted transition hover:bg-tint-soft hover:text-foreground"
      >
        <Pencil className="size-4" />
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        aria-label={`Delete ${setting.key}`}
        className="flex size-8 items-center justify-center rounded-input text-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
      >
        <Trash2 className="size-4" />
      </button>
      <SettingModal open={open} onOpenChange={setOpen} setting={setting} />
    </div>
  );
}
