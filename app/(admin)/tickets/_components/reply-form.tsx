"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock, Send } from "lucide-react";
import { Banner } from "@/app/(auth)/_components/banner";
import { fieldInputClass } from "@/app/(auth)/_components/field";
import { SpinnerIcon } from "@/app/_components/icons";

export function ReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;

    setPending(true);
    setError(null);
    const response = await fetch(`/api/v1/tickets/${ticketId}/replies`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: body.trim(), isInternal, attachments: [] }),
    });
    setPending(false);

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setError(result?.error?.message ?? "Couldn't post your reply.");
      return;
    }

    setBody("");
    setIsInternal(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error ? <Banner tone="error">{error}</Banner> : null}

      <textarea
        value={body}
        onChange={(event) => setBody(event.currentTarget.value)}
        rows={5}
        placeholder={
          isInternal
            ? "Internal note — visible to staff only."
            : "Reply to the customer."
        }
        className={fieldInputClass}
        required
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-input bg-background px-3 py-1.5 text-sm text-foreground">
          <input
            type="checkbox"
            checked={isInternal}
            onChange={(event) => setIsInternal(event.currentTarget.checked)}
            className="size-4 rounded border-border text-tint focus:ring-tint"
          />
          <Lock className="size-3.5 text-muted" aria-hidden="true" />
          Internal note (not emailed)
        </label>

        <button
          type="submit"
          disabled={pending || !body.trim()}
          className={`inline-flex h-10 items-center gap-2 rounded-input px-4 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
            isInternal ? "bg-amber-600 hover:bg-amber-700" : "bg-tint hover:bg-tint/90"
          }`}
        >
          {pending ? (
            <SpinnerIcon className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" aria-hidden="true" />
          )}
          {pending
            ? "Posting…"
            : isInternal
              ? "Post internal note"
              : "Send reply"}
        </button>
      </div>
    </form>
  );
}
