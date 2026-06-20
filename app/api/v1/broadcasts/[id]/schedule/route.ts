import type { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { broadcastDiff, scheduleBroadcast } from "@/lib/data/broadcasts";
import { broadcastScheduleSchema } from "@/lib/schemas/broadcast";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/broadcasts/[id]/schedule
 *
 * Body: { scheduleAt: ISO8601 }
 *
 * Flips status to "scheduled" with the supplied timestamp. Actual fire is
 * handled by a cron job (not yet provisioned) — until then, send manually.
 */
export function POST(request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const { id } = await context.params;
    const { scheduleAt } = broadcastScheduleSchema.parse(await request.json());
    const { before, after } = await scheduleBroadcast({
      id,
      scheduleAt: new Date(scheduleAt),
    });

    await recordAudit({
      actorId: user.id,
      action: "broadcast.schedule",
      entityType: "broadcast",
      entityId: id,
      diff: broadcastDiff(before, after),
    });

    return ok(after);
  });
}
