import type { NextRequest } from "next/server";
import { APIError, created, list, withErrorHandling } from "@/lib/api/response";
import { parseListParams } from "@/lib/api/list-params";
import { requireSession } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { createOrder, listOrders, type OrderSortField } from "@/lib/data/orders";
import { getActivePaymentMethods } from "@/lib/data/payment-methods";
import { orderCreateSchema, orderListFiltersSchema } from "@/lib/schemas/order";

const SORTABLE = [
  "createdAt",
  "updatedAt",
  "total",
  "status",
] as const satisfies readonly OrderSortField[];

/**
 * GET /api/v1/orders — order list.
 *
 * Admins see all orders with the full filter set; any other signed-in user
 * (mobile customer) sees only their own.
 */
export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user } = await requireSession();
    const admin = canManage(user.role);

    const params = parseListParams(new URL(request.url), {
      sortable: SORTABLE,
      defaultSort: { field: "createdAt", direction: "desc" },
      filters: (raw) =>
        orderListFiltersSchema.parse({
          status: raw.status || undefined,
          userId: raw.userId || undefined,
          paymentKind:
            raw.paymentKind === "card" || raw.paymentKind === "upi"
              ? raw.paymentKind
              : undefined,
          from: raw.from || undefined,
          to: raw.to || undefined,
        }),
    });

    const filters = admin
      ? params.filters
      : { ...params.filters, userId: user.id };

    const { rows, meta } = await listOrders({ ...params, filters });
    return list(rows, meta);
  });
}

/**
 * POST /api/v1/orders — checkout: turn the signed-in user's cart into an order.
 *
 * Body: { shippingAddressId?, paymentMethod?, notes? } (paymentMethod defaults
 * to "cod"; must be an active method). Returns the created order with items.
 */
export function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user } = await requireSession();
    const input = orderCreateSchema.parse(await request.json());

    const active = await getActivePaymentMethods();
    if (!active.some((m) => m.key === input.paymentMethod)) {
      throw new APIError(
        "BAD_REQUEST",
        "That payment method isn't available right now.",
      );
    }

    const order = await createOrder({
      userId: user.id,
      shippingAddressId: input.shippingAddressId,
      paymentMethod: input.paymentMethod,
      notes: input.notes || undefined,
      actor: { id: user.id, name: user.name },
    });

    await recordAudit({
      actorId: user.id,
      action: "order.create",
      entityType: "order",
      entityId: order.id,
      diff: { total: order.total, items: order.items.length },
    });

    return created(order);
  });
}
