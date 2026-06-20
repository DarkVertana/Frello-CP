import type { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { refundOrder } from "@/lib/data/orders";
import { orderRefundSchema } from "@/lib/schemas/order";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/orders/[id]/refund
 *
 * Full refund only for v1. Partial refunds need a refund-amount column +
 * provider integration — queued for the follow-up.
 *
 * Runs through the same state-machine guard as `/transition`, so refunds are
 * only valid from `paid`, `packed`, or `delivered`.
 */
export function POST(request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as unknown;
    const { reason } = orderRefundSchema.parse(body);

    const { before, after } = await refundOrder({
      id,
      actor: { id: user.id, name: user.name },
      reason,
    });

    await recordAudit({
      actorId: user.id,
      action: "order.refund",
      entityType: "order",
      entityId: id,
      diff: {
        statusFrom: before.status,
        statusTo: after.status,
        ...(reason ? { reason } : {}),
      },
    });

    return ok(after);
  });
}
