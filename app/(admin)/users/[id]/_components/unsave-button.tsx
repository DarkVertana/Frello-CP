"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

/** Removes one saved product, then refreshes the server-rendered list. */
export function UnsaveButton({ savedId, name }: { savedId: string; name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!window.confirm(`Remove "${name}" from saved products?`)) return;
    setPending(true);
    setError(null);
    const response = await fetch(`/api/v1/saved-products/${savedId}`, {
      method: "DELETE",
    });
    setPending(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Couldn't remove that.");
      return;
    }
    router.refresh();
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
        aria-label={`Remove ${name} from saved`}
        title="Remove from saved"
        className="flex size-8 items-center justify-center rounded-input text-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
