"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteDiseaseButton({ label }: { label: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleClick() {
    if (
      !window.confirm(
        `Delete "${label}"? Past scans with this label will keep their snapshot but won't resolve to a KB entry.`,
      )
    )
      return;

    setPending(true);
    setError(null);
    const response = await fetch(`/api/v1/diseases/${encodeURIComponent(label)}`, {
      method: "DELETE",
    });
    setPending(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Couldn't delete that entry.");
      return;
    }
    startTransition(() => router.push("/diseases"));
  }

  return (
    <div className="flex items-center gap-2">
      {error ? (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      ) : null}
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-input border border-border bg-card px-3 py-2 text-sm font-medium text-danger transition hover:bg-danger-soft disabled:opacity-60"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        {pending ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}
