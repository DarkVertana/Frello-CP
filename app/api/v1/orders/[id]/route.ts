import type { NextRequest } from "next/server";
import { APIError, ok, withErrorHandling } from "@/lib/api/response";
import { requireRole, requireSession } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { getOrderById, orderDiff, updateOrderMeta } from "@/lib/data/orders";
import { orderUpdateSchema } from "@/lib/schemas/order";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/orders/[id] — full order with items, timeline, and tracking.
 * The owner (mobile customer) or an admin may read it; anyone else gets 404.
 */
export function GET(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireSession();
    const { id } = await context.params;
    const row = await getOrderById(id);
    if (!row) throw new APIError("NOT_FOUND", "Order not found.");
    if (row.userId !== user.id && !canManage(user.role)) {
      throw new APIError("NOT_FOUND", "Order not found.");
    }
    return ok(row);
  });
}

/**
 * PATCH /api/v1/orders/[id]
 *
 * Admin-editable fields only: trackingNumber + notes. Status transitions go
 * through `/transition` so the state machine guard fires.
 */
export function PATCH(request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const { id } = await context.params;
    const patch = orderUpdateSchema.parse(await request.json());
    const { before, after } = await updateOrderMeta(id, patch);

    await recordAudit({
      actorId: user.id,
      action: "order.update",
      entityType: "order",
      entityId: id,
      diff: orderDiff(before, after),
    });

    return ok(after);
  });
}
