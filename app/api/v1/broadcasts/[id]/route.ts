import type { NextRequest } from "next/server";
import { APIError, noContent, ok, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canManage, isAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import {
  broadcastDiff,
  deleteBroadcast,
  getBroadcastById,
  updateBroadcast,
} from "@/lib/data/broadcasts";
import { broadcastUpdateSchema } from "@/lib/schemas/broadcast";

type RouteContext = { params: Promise<{ id: string }> };

export function GET(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    await requireRole(isAdmin);
    const { id } = await context.params;
    const row = await getBroadcastById(id);
    if (!row) throw new APIError("NOT_FOUND", "Broadcast not found.");
    return ok(row);
  });
}

export function PATCH(request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const { id } = await context.params;
    const patch = broadcastUpdateSchema.parse(await request.json());
    const { before, after } = await updateBroadcast(id, patch);

    await recordAudit({
      actorId: user.id,
      action: "broadcast.update",
      entityType: "broadcast",
      entityId: id,
      diff: broadcastDiff(before, after),
    });

    return ok(after);
  });
}

export function DELETE(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const { id } = await context.params;
    const deleted = await deleteBroadcast(id);

    await recordAudit({
      actorId: user.id,
      action: "broadcast.delete",
      entityType: "broadcast",
      entityId: id,
      diff: { before: { title: deleted.title, segment: deleted.segment } },
    });

    return noContent();
  });
}
