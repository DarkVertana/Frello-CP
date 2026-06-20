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
  addresses,
  cartItems,
  orderItems,
  orders,
  products,
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
import { getActiveCurrency } from "@/lib/data/settings";
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

/**
 * Checkout: create an order from the user's cart in one transaction —
 * snapshots item name/price, totals it, stamps the initial "pending" timeline
 * entry, and empties the cart. Prices/totals are integer minor units.
 *
 * Stock is not decremented here (no restock-on-cancel logic yet); inactive
 * products block checkout so removed items can't be ordered.
 */
export async function createOrder(input: {
  userId: string;
  shippingAddressId?: string;
  paymentMethod: string;
  notes?: string;
  actor: { id: string; name: string };
}): Promise<OrderDetail> {
  const currency = await getActiveCurrency();

  const orderId = await db.transaction(async (tx) => {
    if (input.shippingAddressId) {
      const [addr] = await tx
        .select({ userId: addresses.userId })
        .from(addresses)
        .where(eq(addresses.id, input.shippingAddressId))
        .limit(1);
      if (!addr || addr.userId !== input.userId) {
        throw new APIError("BAD_REQUEST", "Invalid shipping address.");
      }
    }

    const cart = await tx
      .select({
        productId: products.id,
        name: products.name,
        price: products.price,
        isActive: products.isActive,
        quantity: cartItems.quantity,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.userId, input.userId));

    if (cart.length === 0) {
      throw new APIError("BAD_REQUEST", "Your cart is empty.");
    }
    const gone = cart.find((c) => !c.isActive);
    if (gone) {
      throw new APIError(
        "CONFLICT",
        `"${gone.name}" is no longer available — remove it to check out.`,
      );
    }

    const subtotal = cart.reduce((n, c) => n + c.price * c.quantity, 0);
    const shipping = 0;
    const tax = 0;
    const total = subtotal + shipping + tax;

    const entry: OrderTimelineEntry = {
      status: "pending",
      at: new Date().toISOString(),
      byUserId: input.actor.id,
      byName: input.actor.name,
    };

    const [order] = await tx
      .insert(orders)
      .values({
        userId: input.userId,
        status: "pending",
        subtotal,
        shipping,
        tax,
        total,
        currency,
        shippingAddressId: input.shippingAddressId ?? null,
        paymentMethodRef: input.paymentMethod,
        notes: input.notes ? input.notes : null,
        timeline: [entry],
      })
      .returning();
    if (!order) throw new APIError("INTERNAL", "Failed to create order.");

    await tx.insert(orderItems).values(
      cart.map((c) => ({
        orderId: order.id,
        productId: c.productId,
        name: c.name,
        qty: c.quantity,
        priceAtOrder: c.price,
      })),
    );

    await tx.delete(cartItems).where(eq(cartItems.userId, input.userId));
    return order.id;
  });

  const detail = await getOrderById(orderId);
  if (!detail) throw new APIError("INTERNAL", "Failed to load the new order.");
  return detail;
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
