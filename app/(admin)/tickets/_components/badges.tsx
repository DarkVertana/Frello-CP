import {
  ticketStatusLabel,
  type TicketStatusValue,
} from "@/lib/tickets/transitions";

const statusTone: Record<TicketStatusValue, string> = {
  open: "border-blue-500/20 bg-blue-50 text-blue-700",
  in_progress: "border-amber-500/20 bg-amber-50 text-amber-800",
  resolved: "border-tint/30 bg-tint-soft text-tint-dark",
};

const statusDot: Record<TicketStatusValue, string> = {
  open: "bg-blue-500",
  in_progress: "bg-amber-500",
  resolved: "bg-tint",
};

export function TicketStatusBadge({ status }: { status: TicketStatusValue }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusTone[status]}`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${statusDot[status]}`} />
      {ticketStatusLabel(status)}
    </span>
  );
}

const priorityTone: Record<string, string> = {
  low: "border-zinc-300/60 bg-zinc-100 text-zinc-700",
  normal: "border-blue-500/20 bg-blue-50 text-blue-700",
  high: "border-danger/20 bg-danger-soft text-danger",
};

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${priorityTone[priority] ?? priorityTone.normal}`}
    >
      {priority}
    </span>
  );
}
