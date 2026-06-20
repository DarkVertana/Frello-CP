import type { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { broadcastDiff, cancelBroadcast } from "@/lib/data/broadcasts";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/v1/broadcasts/[id]/cancel — terminal. */
export function POST(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const { id } = await context.params;
    const { before, after } = await cancelBroadcast(id);

    await recordAudit({
      actorId: user.id,
      action: "broadcast.cancel",
      entityType: "broadcast",
      entityId: id,
      diff: broadcastDiff(before, after),
    });

    return ok(after);
  });
}
