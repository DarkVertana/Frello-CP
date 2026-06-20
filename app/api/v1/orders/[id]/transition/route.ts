import type { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { orderDiff, transitionOrderStatus } from "@/lib/data/orders";
import { orderTransitionSchema } from "@/lib/schemas/order";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/orders/[id]/transition
 *
 * Body: { to: OrderStatusValue, note?: string }
 *
 * The state-machine guard (`canTransition`) runs inside the data layer so
 * illegal moves return 409 CONFLICT with a clear message.
 */
export function POST(request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const { id } = await context.params;
    const { to, note } = orderTransitionSchema.parse(await request.json());

    const { before, after } = await transitionOrderStatus({
      id,
      to,
      actor: { id: user.id, name: user.name },
      note,
    });

    await recordAudit({
      actorId: user.id,
      action: `order.transition.${to}`,
      entityType: "order",
      entityId: id,
      diff: { ...orderDiff(before, after), ...(note ? { note } : {}) },
    });

    return ok(after);
  });
}
