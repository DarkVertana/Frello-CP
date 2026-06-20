"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, UserCheck, UserX } from "lucide-react";
import { Banner } from "@/app/(auth)/_components/banner";
import { SpinnerIcon } from "@/app/_components/icons";
import {
  allowedTicketTransitions,
  ticketStatusLabel,
  type TicketStatusValue,
} from "@/lib/tickets/transitions";
import { fieldInputClass } from "@/app/(auth)/_components/field";

type Agent = { id: string; name: string };

type Props = {
  ticketId: string;
  status: TicketStatusValue;
  assigneeId: string | null;
  currentUserId: string;
  agents: Agent[];
};

export function TicketActions({
  ticketId,
  status,
  assigneeId,
  currentUserId,
  agents,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "status" | "assign">(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function call(
    label: typeof busy,
    init: { method: string; url: string; body: unknown },
  ): Promise<boolean> {
    setBusy(label);
    setError(null);
    const response = await fetch(init.url, {
      method: init.method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(init.body),
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

  async function handleStatus(to: TicketStatusValue) {
    await call("status", {
      method: "POST",
      url: `/api/v1/tickets/${ticketId}/status`,
      body: { to },
    });
  }

  async function handleAssign(id: string | null) {
    await call("assign", {
      method: "POST",
      url: `/api/v1/tickets/${ticketId}/assign`,
      body: { assigneeId: id },
    });
  }

  const next = allowedTicketTransitions(status);
  const isAssignedToMe = assigneeId === currentUserId;

  return (
    <div className="space-y-5">
      {error ? <Banner tone="error">{error}</Banner> : null}

      <section>
        <h2 className="text-sm font-semibold text-foreground">Status</h2>
        <p className="mt-1 text-xs text-muted">
          Currently <strong className="text-foreground">{ticketStatusLabel(status)}</strong>.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {next.map((target) => (
            <button
              key={target}
              type="button"
              onClick={() => handleStatus(target)}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-input border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-tint-soft disabled:opacity-60"
            >
              {busy === "status" ? (
                <SpinnerIcon className="size-3.5 animate-spin" />
              ) : (
                <ArrowRight className="size-3.5" aria-hidden="true" />
              )}
              {ticketStatusLabel(target)}
            </button>
          ))}
        </div>
      </section>

      <section className="border-t border-border pt-5">
        <h2 className="text-sm font-semibold text-foreground">Assignee</h2>
        <p className="mt-1 text-xs text-muted">
          Tickets without an assignee show up in the &quot;Unassigned&quot; filter.
        </p>
        <select
          value={assigneeId ?? ""}
          onChange={(event) => handleAssign(event.currentTarget.value || null)}
          disabled={busy !== null}
          className={`mt-2 ${fieldInputClass}`}
        >
          <option value="">Unassigned</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
              {agent.id === currentUserId ? " (you)" : ""}
            </option>
          ))}
        </select>

        <div className="mt-2 flex flex-wrap gap-2">
          {!isAssignedToMe ? (
            <button
              type="button"
              onClick={() => handleAssign(currentUserId)}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-input border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-tint-soft disabled:opacity-60"
            >
              <UserCheck className="size-3.5" aria-hidden="true" />
              Assign to me
            </button>
          ) : null}
          {assigneeId ? (
            <button
              type="button"
              onClick={() => handleAssign(null)}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-input border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-tint-soft hover:text-foreground disabled:opacity-60"
            >
              <UserX className="size-3.5" aria-hidden="true" />
              Unassign
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
