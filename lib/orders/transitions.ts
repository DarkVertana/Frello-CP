import type { orderStatus } from "@/db/schema/enums";

/**
 * Plant+ order status state machine.
 *
 *   pending ─► paid ─► packed ─► out_for_delivery ─► delivered
 *      │        │        │              │                │
 *      ▼        ▼        ▼              ▼                ▼
 *   cancelled (any of the first four) │ refunded (from paid/packed/delivered)
 *
 * Both `cancelled` and `refunded` are terminal.
 *
 * Enforced server-side by `transitionOrderStatus` in `lib/data/orders.ts` —
 * the admin UI only offers buttons for valid next states, and the REST API
 * rejects illegal jumps with a 409 CONFLICT.
 */

export type OrderStatusValue = (typeof orderStatus.enumValues)[number];

const TRANSITIONS: Record<OrderStatusValue, OrderStatusValue[]> = {
  pending: ["paid", "cancelled"],
  paid: ["packed", "cancelled", "refunded"],
  packed: ["out_for_delivery", "cancelled", "refunded"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

const LABELS: Record<OrderStatusValue, string> = {
  pending: "Pending",
  paid: "Paid",
  packed: "Packed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export function allowedTransitions(from: OrderStatusValue): OrderStatusValue[] {
  return TRANSITIONS[from] ?? [];
}

export function canTransition(
  from: OrderStatusValue,
  to: OrderStatusValue,
): boolean {
  return allowedTransitions(from).includes(to);
}

export function isTerminal(status: OrderStatusValue): boolean {
  return status === "cancelled" || status === "refunded";
}

export function statusLabel(status: OrderStatusValue): string {
  return LABELS[status] ?? status;
}
