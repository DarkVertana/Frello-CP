import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  lt,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  orderItems,
  orders,
  user,
  type Order,
  type OrderItem,
  type OrderTimelineEntry,
} from "@/db/schema";
import { APIError, type ListMeta } from "@/lib/api/response";
import {
  canTransition,
  type OrderStatusValue,
} from "@/lib/orders/transitions";
import type {
  OrderListFilters,
  OrderUpdateInput,
} from "@/lib/schemas/order";

export type OrderSortField = "createdAt" | "updatedAt" | "total" | "status";

export type OrderListParams = {
  page: number;
  perPage: number;
  /** Prefix match against the order id; useful for support pasted-id lookups. */
  search?: string;
  sort: { field: OrderSortField; direction: "asc" | "desc" };
  filters: OrderListFilters;
};

const orderColumn = {
  createdAt: orders.createdAt,
  updatedAt: orders.updatedAt,
  total: orders.total,
  status: orders.status,
} as const satisfies Record<OrderSortField, unknown>;

function buildWhere(params: OrderListParams): SQL | undefined {
  const clauses: SQL[] = [];
  if (params.search) clauses.push(ilike(orders.id, `${params.search}%`));
  if (params.filters.status) clauses.push(eq(orders.status, params.filters.status));
  if (params.filters.userId) clauses.push(eq(orders.userId, params.filters.userId));
  if (params.filters.paymentKind)
    clauses.push(eq(orders.paymentMethodRef, params.filters.paymentKind));
  if (params.filters.from) {
    clauses.push(gte(orders.createdAt, new Date(params.filters.from)));
  }
  if (params.filters.to) {
    // Inclusive upper bound: `< (to + 1 day)`.
    const next = new Date(params.filters.to);
    next.setUTCDate(next.getUTCDate() + 1);
    clauses.push(lt(orders.createdAt, next));
  }
  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return and(...clauses);
}

export type OrderRow = Order & {
  customer: { id: string; name: string; email: string } | null;
  itemCount: number;
};

export async function listOrders(
  params: OrderListParams,
): Promise<{ rows: OrderRow[]; meta: ListMeta }> {
  const where = buildWhere(params);
  const column = orderColumn[params.sort.field];
  const orderBy = params.sort.direction === "asc" ? asc(column) : desc(column);
  const offset = (params.page - 1) * params.perPage;

  const [rows, totals] = await Promise.all([
    db
      .select({
        order: orders,
        customer: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        itemCount: count(orderItems.id),
      })
      .from(orders)
      .leftJoin(user, eq(orders.userId, user.id))
      .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(where)
      .groupBy(orders.id, user.id)
      .orderBy(orderBy, asc(orders.id))
      .limit(params.perPage)
      .offset(offset),
    db.select({ value: count() }).from(orders).where(where),
  ]);

  return {
    rows: rows.map((r) => ({
      ...r.order,
      customer: r.customer,
      itemCount: r.itemCount,
    })),
    meta: {
      page: params.page,
      perPage: params.perPage,
      total: totals[0]?.value ?? 0,
    },
  };
}

export type OrderDetail = Order & {
  customer: { id: string; name: string; email: string; phone: string | null } | null;
  items: OrderItem[];
};

export async function getOrderById(id: string): Promise<OrderDetail | null> {
  const [head] = await db
    .select({
      order: orders,
      customer: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    })
    .from(orders)
    .leftJoin(user, eq(orders.userId, user.id))
    .where(eq(orders.id, id))
    .limit(1);

  if (!head) return null;

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id))
    .orderBy(asc(orderItems.name));

  return { ...head.order, customer: head.customer, items };
}

export async function updateOrderMeta(
  id: string,
  patch: OrderUpdateInput,
): Promise<{ before: Order; after: Order }> {
  const [before] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!before) throw new APIError("NOT_FOUND", "Order not found.");

  const next: Partial<typeof orders.$inferInsert> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };
  if (patch.trackingNumber !== undefined) {
    next.trackingNumber = patch.trackingNumber ? patch.trackingNumber : null;
  }
  if (patch.notes !== undefined) {
    next.notes = patch.notes ? patch.notes : null;
  }

  const [after] = await db
    .update(orders)
    .set(next)
    .where(eq(orders.id, id))
    .returning();
  if (!after) throw new APIError("INTERNAL", "Failed to update order.");
  return { before, after };
}

/**
 * Transition an order's status. Validates the move against the state machine,
 * pushes a timeline entry recording who/when/note, and updates `status` +
 * `updatedAt` atomically.
 */
export async function transitionOrderStatus(input: {
  id: string;
  to: OrderStatusValue;
  actor: { id: string; name: string };
  note?: string;
}): Promise<{ before: Order; after: Order }> {
  const { id, to, actor, note } = input;

  return db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .for("update")
      .limit(1);

    if (!before) throw new APIError("NOT_FOUND", "Order not found.");

    if (before.status === to) {
      throw new APIError("CONFLICT", `Order is already ${to.replace(/_/g, " ")}.`);
    }

    if (!canTransition(before.status, to)) {
      throw new APIError(
        "CONFLICT",
        `Can't move an order from "${before.status}" to "${to}".`,
      );
    }

    const entry: OrderTimelineEntry = {
      status: to,
      at: new Date().toISOString(),
      byUserId: actor.id,
      byName: actor.name,
      ...(note ? { note } : {}),
    };

    const [after] = await tx
      .update(orders)
      .set({
        status: to,
        timeline: [...before.timeline, entry],
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    if (!after) throw new APIError("INTERNAL", "Failed to update order.");
    return { before, after };
  });
}

/**
 * Full refund — sets status to `refunded` via `transitionOrderStatus` so the
 * same state-machine guards apply. Returns the timeline entry that recorded
 * the move for the audit diff.
 */
export async function refundOrder(input: {
  id: string;
  actor: { id: string; name: string };
  reason?: string;
}): Promise<{ before: Order; after: Order }> {
  return transitionOrderStatus({
    id: input.id,
    to: "refunded",
    actor: input.actor,
    note: input.reason ?? "Full refund",
  });
}

/** Orders authored by a specific user — feeds the User detail "Orders" tab. */
export async function listOrdersForUser(userId: string): Promise<OrderRow[]> {
  const rows = await db
    .select({
      order: orders,
      itemCount: count(orderItems.id),
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(eq(orders.userId, userId))
    .groupBy(orders.id)
    .orderBy(desc(orders.createdAt));

  return rows.map((r) => ({
    ...r.order,
    customer: null,
    itemCount: r.itemCount,
  }));
}

export function orderDiff(
  before: Order,
  after: Order,
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  const keys: (keyof Order)[] = ["status", "trackingNumber", "notes"];
  for (const key of keys) {
    if (before[key] !== after[key]) {
      diff[key] = { from: before[key], to: after[key] };
    }
  }
  return diff;
}
