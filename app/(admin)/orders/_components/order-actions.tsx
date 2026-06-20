"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, IndianRupee, Save, Truck } from "lucide-react";
import { Banner } from "@/app/(auth)/_components/banner";
import { Field, fieldInputClass } from "@/app/(auth)/_components/field";
import { SpinnerIcon } from "@/app/_components/icons";
import {
  allowedTransitions,
  isTerminal,
  statusLabel,
  type OrderStatusValue,
} from "@/lib/orders/transitions";

type Props = {
  orderId: string;
  status: OrderStatusValue;
  trackingNumber: string | null;
  notes: string | null;
};

/**
 * Single cohesive client component covering all admin actions on an order:
 * status transition, refund, tracking number, internal notes. Each action is
 * a fetch against its own REST route — failures surface in the local banner
 * without affecting other actions.
 */
export function OrderActions({ orderId, status, trackingNumber, notes }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "transition" | "refund" | "meta">(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [tracking, setTracking] = useState(trackingNumber ?? "");
  const [internalNotes, setInternalNotes] = useState(notes ?? "");
  const [transitionNote, setTransitionNote] = useState("");

  async function call(
    label: typeof busy,
    init: { method: string; url: string; body?: unknown },
  ): Promise<boolean> {
    setBusy(label);
    setError(null);
    setSuccess(null);
    const response = await fetch(init.url, {
      method: init.method,
      headers: init.body ? { "content-type": "application/json" } : undefined,
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    setBusy(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Action failed.");
      return false;
    }
    startTransition(() => router.refresh());
    return true;
  }

  async function handleTransition(to: OrderStatusValue) {
    const ok = await call("transition", {
      method: "POST",
      url: `/api/v1/orders/${orderId}/transition`,
      body: { to, note: transitionNote.trim() || undefined },
    });
    if (ok) {
      setSuccess(`Moved to ${statusLabel(to)}.`);
      setTransitionNote("");
    }
  }

  async function handleRefund() {
    if (
      !window.confirm(
        "Issue a full refund? Status will move to Refunded and trigger your provider's refund flow once wired.",
      )
    )
      return;
    const ok = await call("refund", {
      method: "POST",
      url: `/api/v1/orders/${orderId}/refund`,
      body: transitionNote.trim() ? { reason: transitionNote.trim() } : {},
    });
    if (ok) {
      setSuccess("Order refunded.");
      setTransitionNote("");
    }
  }

  async function handleSaveMeta() {
    const ok = await call("meta", {
      method: "PATCH",
      url: `/api/v1/orders/${orderId}`,
      body: {
        trackingNumber: tracking.trim() || null,
        notes: internalNotes.trim() || null,
      },
    });
    if (ok) setSuccess("Saved.");
  }

  const nextStates = allowedTransitions(status);
  const canRefund = nextStates.includes("refunded");
  const transitions = nextStates.filter((next) => next !== "refunded");
  const terminal = isTerminal(status);

  return (
    <div className="space-y-5">
      {error ? <Banner tone="error">{error}</Banner> : null}
      {success ? <Banner tone="success">{success}</Banner> : null}

      <section className="space-y-3">
        <header>
          <h2 className="text-sm font-semibold text-foreground">Advance status</h2>
          <p className="text-xs text-muted">
            Currently <strong className="text-foreground">{statusLabel(status)}</strong>
            . {terminal ? "Terminal — no further transitions." : "Next options:"}
          </p>
        </header>

        {!terminal ? (
          <>
            <div className="flex flex-wrap gap-2">
              {transitions.map((next) => (
                <button
                  key={next}
                  type="button"
                  onClick={() => handleTransition(next)}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1.5 rounded-input border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-tint-soft disabled:opacity-60"
                >
                  {busy === "transition" ? (
                    <SpinnerIcon className="size-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  )}
                  {statusLabel(next)}
                </button>
              ))}
              {transitions.length === 0 ? (
                <p className="text-xs text-muted">
                  No forward transitions — only refund or cancel from here.
                </p>
              ) : null}
            </div>

            <Field
              label="Note (optional)"
              id="transition-note"
              value={transitionNote}
              onChange={(event) => setTransitionNote(event.currentTarget.value)}
              placeholder="Recorded on the timeline entry."
              maxLength={280}
            />
          </>
        ) : null}
      </section>

      {canRefund ? (
        <section className="rounded-card border border-danger/20 bg-danger-soft/50 p-4">
          <header className="mb-2">
            <h2 className="text-sm font-semibold text-danger">Refund</h2>
            <p className="text-xs text-muted">
              Issues a full refund and marks the order as Refunded. Use the note
              above to record the reason.
            </p>
          </header>
          <button
            type="button"
            onClick={handleRefund}
            disabled={busy !== null}
            className="inline-flex h-10 items-center gap-2 rounded-input bg-danger px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-danger/90 disabled:opacity-60"
          >
            {busy === "refund" ? (
              <SpinnerIcon className="size-4 animate-spin" />
            ) : (
              <IndianRupee className="size-4" aria-hidden="true" />
            )}
            {busy === "refund" ? "Refunding…" : "Issue full refund"}
          </button>
        </section>
      ) : null}

      <section className="space-y-3 border-t border-border pt-5">
        <header>
          <h2 className="text-sm font-semibold text-foreground">
            Tracking & notes
          </h2>
          <p className="text-xs text-muted">
            Tracking number shows on the mobile order screen once status is{" "}
            <em>Out for delivery</em>. Notes are admin-only.
          </p>
        </header>

        <Field
          label="Tracking number"
          id="tracking"
          value={tracking}
          onChange={(event) => setTracking(event.currentTarget.value)}
          placeholder="e.g. BLR-9981234"
          trailing={<Truck className="size-4 text-muted" aria-hidden="true" />}
        />

        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-foreground"
          >
            Internal notes
          </label>
          <textarea
            id="notes"
            value={internalNotes}
            onChange={(event) => setInternalNotes(event.currentTarget.value)}
            rows={3}
            placeholder="What the support team should know about this order."
            className={`mt-1.5 ${fieldInputClass}`}
          />
        </div>

        <button
          type="button"
          onClick={handleSaveMeta}
          disabled={busy !== null}
          className="inline-flex h-10 items-center gap-2 rounded-input bg-tint px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90 disabled:opacity-60"
        >
          {busy === "meta" ? (
            <SpinnerIcon className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          {busy === "meta" ? "Saving…" : "Save tracking & notes"}
        </button>
      </section>
    </div>
  );
}
