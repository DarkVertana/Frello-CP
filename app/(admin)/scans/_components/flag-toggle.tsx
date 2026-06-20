"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag, FlagOff } from "lucide-react";
import { Banner } from "@/app/(auth)/_components/banner";
import { SpinnerIcon } from "@/app/_components/icons";

type Props = {
  scanId: string;
  flagged: boolean;
};

export function FlagToggle({ scanId, flagged }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function toggle() {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/v1/scans/${scanId}/flag`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ flagged: !flagged }),
    });
    setPending(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Couldn't update the flag.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-2">
      {error ? <Banner tone="error">{error}</Banner> : null}
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-input px-4 text-sm font-semibold shadow-sm transition disabled:opacity-60 ${
          flagged
            ? "border border-tint/40 bg-tint-soft text-tint-dark hover:bg-tint-soft/70"
            : "bg-danger text-white hover:bg-danger/90"
        }`}
      >
        {pending ? (
          <SpinnerIcon className="size-4 animate-spin" />
        ) : flagged ? (
          <FlagOff className="size-4" aria-hidden="true" />
        ) : (
          <Flag className="size-4" aria-hidden="true" />
        )}
        {pending
          ? "Saving…"
          : flagged
            ? "Unflag (looks correct)"
            : "Flag as misclassified"}
      </button>
      <p className="text-xs text-muted">
        Flagged scans land in the retrain CSV export.
      </p>
    </div>
  );
}
