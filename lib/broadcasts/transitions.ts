import type { broadcastStatus } from "@/db/schema/enums";

/**
 * Broadcast status state machine.
 *
 *   draft ──► scheduled ──► sent
 *     │           │
 *     └─► cancelled ◄─┘
 *
 * Both `sent` and `cancelled` are terminal. Drafts can be edited and deleted;
 * scheduled broadcasts can only be cancelled or sent. Sent broadcasts are
 * read-only history.
 */

export type BroadcastStatusValue = (typeof broadcastStatus.enumValues)[number];

const TRANSITIONS: Record<BroadcastStatusValue, BroadcastStatusValue[]> = {
  draft: ["scheduled", "sent", "cancelled"],
  scheduled: ["sent", "cancelled"],
  sent: [],
  cancelled: [],
};

const LABELS: Record<BroadcastStatusValue, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  sent: "Sent",
  cancelled: "Cancelled",
};

export function allowedBroadcastTransitions(
  from: BroadcastStatusValue,
): BroadcastStatusValue[] {
  return TRANSITIONS[from] ?? [];
}

export function canTransitionBroadcast(
  from: BroadcastStatusValue,
  to: BroadcastStatusValue,
): boolean {
  return allowedBroadcastTransitions(from).includes(to);
}

export function isBroadcastTerminal(status: BroadcastStatusValue): boolean {
  return status === "sent" || status === "cancelled";
}

export function broadcastStatusLabel(status: BroadcastStatusValue): string {
  return LABELS[status] ?? status;
}
