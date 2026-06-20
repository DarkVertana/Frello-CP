"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  useDraggable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MessageSquareText } from "lucide-react";
import { Banner } from "@/app/(auth)/_components/banner";
import {
  TICKET_STATUSES,
  ticketStatusLabel,
  type TicketStatusValue,
} from "@/lib/tickets/transitions";
import { PriorityBadge } from "./badges";
import type { TicketRow } from "@/lib/data/tickets";
import { formatRelative } from "@/lib/format";

type Props = {
  tickets: TicketRow[];
  canManage: boolean;
};

export function KanbanBoard({ tickets, canManage }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(tickets);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const grouped = useMemo(() => {
    const byStatus: Record<TicketStatusValue, TicketRow[]> = {
      open: [],
      in_progress: [],
      resolved: [],
    };
    for (const ticket of items) byStatus[ticket.status].push(ticket);
    return byStatus;
  }, [items]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || !canManage) return;

    const ticketId = String(active.id);
    const targetStatus = String(over.id) as TicketStatusValue;
    if (!TICKET_STATUSES.includes(targetStatus)) return;

    const ticket = items.find((t) => t.id === ticketId);
    if (!ticket || ticket.status === targetStatus) return;

    const previous = items;
    setItems((current) =>
      current.map((row) =>
        row.id === ticketId ? { ...row, status: targetStatus } : row,
      ),
    );
    setError(null);

    const response = await fetch(`/api/v1/tickets/${ticketId}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to: targetStatus }),
    });

    if (!response.ok) {
      setItems(previous);
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Couldn't move the ticket.");
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      {error ? <Banner tone="error">{error}</Banner> : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {TICKET_STATUSES.map((status) => (
            <Column
              key={status}
              status={status}
              tickets={grouped[status]}
              canManage={canManage}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function Column({
  status,
  tickets,
  canManage,
}: {
  status: TicketStatusValue;
  tickets: TicketRow[];
  canManage: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-card border border-border bg-background/60 transition ${
        isOver ? "ring-2 ring-tint" : ""
      }`}
    >
      <header className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">
          {ticketStatusLabel(status)}
        </h2>
        <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium text-muted">
          {tickets.length}
        </span>
      </header>

      <ul className="space-y-2 px-3 pb-4 min-h-32">
        {tickets.length === 0 ? (
          <li className="grid place-items-center rounded-input border border-dashed border-border bg-card/40 px-3 py-8 text-xs text-muted">
            No tickets here
          </li>
        ) : (
          tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} canDrag={canManage} />
          ))
        )}
      </ul>
    </div>
  );
}

function TicketCard({
  ticket,
  canDrag,
}: {
  ticket: TicketRow;
  canDrag: boolean;
}) {
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({
    id: ticket.id,
    disabled: !canDrag,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : undefined,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <div
        className={`flex items-start gap-2 rounded-card border border-border bg-card p-3 shadow-card transition ${
          isDragging ? "ring-2 ring-tint" : ""
        }`}
      >
        {canDrag ? (
          <button
            type="button"
            aria-label="Drag to change status"
            className="mt-0.5 cursor-grab text-muted active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" aria-hidden="true" />
          </button>
        ) : null}

        <div className="min-w-0 flex-1 space-y-1.5">
          <Link
            href={`/tickets/${ticket.id}`}
            className="block text-sm font-semibold text-foreground hover:text-tint-dark"
          >
            {ticket.subject}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={ticket.priority} />
            <span className="text-xs text-muted">{ticket.category}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              {ticket.customer?.name ?? "—"}
              {ticket.assignee ? (
                <>
                  {" · "}
                  <span className="text-tint-dark">
                    @{ticket.assignee.name.split(" ")[0]}
                  </span>
                </>
              ) : (
                <span className="ml-1 text-amber-700">· unassigned</span>
              )}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquareText className="size-3" aria-hidden="true" />
              {ticket.replyCount}
              <span className="ml-2">{formatRelative(ticket.updatedAt)}</span>
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}
