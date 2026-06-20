"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Banner } from "@/app/(auth)/_components/banner";
import { fieldInputClass } from "@/app/(auth)/_components/field";
import { SpinnerIcon } from "@/app/_components/icons";

type Props = {
  scanId: string;
  initial: string | null;
};

export function ReviewerNotesForm({ scanId, initial }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState(initial ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);

    const response = await fetch(`/api/v1/scans/${scanId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reviewerNotes: notes.trim() || null }),
    });
    setPending(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Couldn't save the note.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error ? <Banner tone="error">{error}</Banner> : null}
      {saved ? <Banner tone="success">Saved.</Banner> : null}

      <textarea
        value={notes}
        onChange={(event) => setNotes(event.currentTarget.value)}
        rows={4}
        placeholder="What did you observe? e.g. 'Lower leaves match Late Blight more than Early Blight.'"
        className={fieldInputClass}
      />

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center gap-2 rounded-input bg-tint px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90 disabled:opacity-60"
      >
        {pending ? (
          <SpinnerIcon className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" aria-hidden="true" />
        )}
        {pending ? "Saving…" : "Save note"}
      </button>
    </form>
  );
}
