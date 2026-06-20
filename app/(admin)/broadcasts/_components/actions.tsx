"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Pencil, Send, Trash2, XCircle } from "lucide-react";
import { Banner } from "@/app/(auth)/_components/banner";
import { Field } from "@/app/(auth)/_components/field";
import { SpinnerIcon } from "@/app/_components/icons";
import { Modal } from "../../_components/modal";
import { BroadcastForm } from "./broadcast-form";
import type { Broadcast } from "@/db/schema";
import type { BroadcastStatusValue } from "@/lib/broadcasts/transitions";

type Props = {
  /** Full broadcast row — needed to populate the edit modal. */
  broadcast: Broadcast;
};

export function BroadcastActions({ broadcast }: Props) {
  const broadcastId = broadcast.id;
  const status: BroadcastStatusValue = broadcast.status;
  const router = useRouter();
  const [busy, setBusy] = useState<
    null | "send" | "schedule" | "cancel" | "delete"
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [scheduleAt, setScheduleAt] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [, startTransition] = useTransition();

  async function call(
    label: typeof busy,
    init: { method: string; url: string; body?: unknown },
  ): Promise<{ ok: boolean; data?: unknown }> {
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
      return { ok: false };
    }
    const json = response.status === 204 ? null : await response.json().catch(() => null);
    startTransition(() => router.refresh());
    return { ok: true, data: json };
  }

  async function handleSend() {
    if (
      !window.confirm(
        "Send this broadcast now? Status moves to Sent and can't be undone.",
      )
    )
      return;
    const result = await call("send", {
      method: "POST",
      url: `/api/v1/broadcasts/${broadcastId}/send`,
    });
    if (result.ok) {
      const recipients = (result.data as { data?: { recipients?: { count?: number; approximate?: boolean } } })
        ?.data?.recipients;
      setSuccess(
        recipients
          ? `Sent to ${recipients.count}${recipients.approximate ? " (approx.)" : ""} recipients.`
          : "Sent.",
      );
    }
  }

  async function handleSchedule() {
    if (!scheduleAt) {
      setError("Pick a date and time first.");
      return;
    }
    const iso = new Date(scheduleAt).toISOString();
    const result = await call("schedule", {
      method: "POST",
      url: `/api/v1/broadcasts/${broadcastId}/schedule`,
      body: { scheduleAt: iso },
    });
    if (result.ok) setSuccess("Scheduled.");
  }

  async function handleCancel() {
    if (!window.confirm("Cancel this broadcast?")) return;
    const result = await call("cancel", {
      method: "POST",
      url: `/api/v1/broadcasts/${broadcastId}/cancel`,
    });
    if (result.ok) setSuccess("Cancelled.");
  }

  async function handleDelete() {
    if (
      !window.confirm(
        "Delete this draft? Only drafts can be deleted — sent broadcasts are kept for history.",
      )
    )
      return;
    const result = await call("delete", {
      method: "DELETE",
      url: `/api/v1/broadcasts/${broadcastId}`,
    });
    if (result.ok) {
      startTransition(() => router.push("/broadcasts"));
    }
  }

  if (status === "sent") {
    return (
      <Banner tone="success">
        Broadcast is sent. Stats refresh as opens come in.
      </Banner>
    );
  }
  if (status === "cancelled") {
    return (
      <p className="text-sm text-muted">Cancelled — kept for history.</p>
    );
  }

  return (
    <div className="space-y-5">
      {error ? <Banner tone="error">{error}</Banner> : null}
      {success ? <Banner tone="success">{success}</Banner> : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Send now</h2>
        <button
          type="button"
          onClick={handleSend}
          disabled={busy !== null}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-input bg-tint text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90 disabled:opacity-60"
        >
          {busy === "send" ? (
            <SpinnerIcon className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" aria-hidden="true" />
          )}
          {busy === "send" ? "Sending…" : "Send now"}
        </button>
      </section>

      {status === "draft" ? (
        <section className="space-y-3 border-t border-border pt-5">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Or schedule
            </h2>
            <p className="text-xs text-muted">
              Local time. A cron worker will fire the send when the time arrives
              (worker not yet provisioned — fire manually until then).
            </p>
          </div>
          <Field
            label=""
            id="scheduleAt"
            type="datetime-local"
            value={scheduleAt}
            onChange={(event) => setScheduleAt(event.currentTarget.value)}
          />
          <button
            type="button"
            onClick={handleSchedule}
            disabled={busy !== null || !scheduleAt}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-input border border-border bg-card text-sm font-semibold text-foreground transition hover:bg-tint-soft disabled:opacity-60"
          >
            {busy === "schedule" ? (
              <SpinnerIcon className="size-4 animate-spin" />
            ) : (
              <CalendarClock className="size-4" aria-hidden="true" />
            )}
            {busy === "schedule" ? "Scheduling…" : "Schedule"}
          </button>
        </section>
      ) : null}

      <section className="space-y-2 border-t border-border pt-5">
        {status === "draft" ? (
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-input border border-border bg-card text-sm font-medium text-foreground transition hover:bg-tint-soft"
          >
            <Pencil className="size-4" aria-hidden="true" />
            Edit draft
          </button>
        ) : null}

        <button
          type="button"
          onClick={handleCancel}
          disabled={busy !== null}
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-input border border-border bg-card text-sm font-medium text-foreground transition hover:bg-tint-soft disabled:opacity-60"
        >
          {busy === "cancel" ? (
            <SpinnerIcon className="size-4 animate-spin" />
          ) : (
            <XCircle className="size-4" aria-hidden="true" />
          )}
          {busy === "cancel" ? "Cancelling…" : "Cancel broadcast"}
        </button>

        {status === "draft" ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy !== null}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-input border border-border bg-card text-sm font-medium text-danger transition hover:bg-danger-soft disabled:opacity-60"
          >
            {busy === "delete" ? (
              <SpinnerIcon className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" aria-hidden="true" />
            )}
            {busy === "delete" ? "Deleting…" : "Delete draft"}
          </button>
        ) : null}
      </section>

      <Modal
        open={editOpen}
        onOpenChange={setEditOpen}
        size="lg"
        title="Edit draft"
        description="Drafts can be edited freely. Save returns you here."
      >
        <BroadcastForm
          broadcast={broadcast}
          onSuccess={() => setEditOpen(false)}
        />
      </Modal>
    </div>
  );
}
