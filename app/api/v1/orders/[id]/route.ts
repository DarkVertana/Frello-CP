import type { NextRequest } from "next/server";
import { APIError, ok, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canManage, isAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { getOrderById, orderDiff, updateOrderMeta } from "@/lib/data/orders";
import { orderUpdateSchema } from "@/lib/schemas/order";

type RouteContext = { params: Promise<{ id: string }> };

export function GET(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    await requireRole(isAdmin);
    const { id } = await context.params;
    const row = await getOrderById(id);
    if (!row) throw new APIError("NOT_FOUND", "Order not found.");
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
