import type { ticketStatus } from "@/db/schema/enums";

/**
 * Ticket status state machine — much looser than orders. Tickets can bounce
 * back and forth between open and in-progress, get resolved, and be reopened.
 *
 *   open ↔ in_progress → resolved
 *                          │
 *                          ▼
 *                        (reopen → open)
 */

export type TicketStatusValue = (typeof ticketStatus.enumValues)[number];

const TRANSITIONS: Record<TicketStatusValue, TicketStatusValue[]> = {
  open: ["in_progress", "resolved"],
  in_progress: ["open", "resolved"],
  resolved: ["open"],
};

const LABELS: Record<TicketStatusValue, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

export const TICKET_STATUSES = ["open", "in_progress", "resolved"] as const;

export function allowedTicketTransitions(
  from: TicketStatusValue,
): TicketStatusValue[] {
  return TRANSITIONS[from] ?? [];
}

export function canTransitionTicket(
  from: TicketStatusValue,
  to: TicketStatusValue,
): boolean {
  return allowedTicketTransitions(from).includes(to);
}

export function ticketStatusLabel(status: TicketStatusValue): string {
  return LABELS[status] ?? status;
}
