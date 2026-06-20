import type { NextRequest } from "next/server";
import { APIError, ok, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { banUser, unbanUser } from "@/lib/data/users";
import { banSchema } from "@/lib/schemas/user";

type RouteContext = { params: Promise<{ id: string }> };

/** Ban a user (revokes every active session). */
export function POST(request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user: actor } = await requireRole(canManage);
    const { id } = await context.params;
    if (id === actor.id) {
      throw new APIError("BAD_REQUEST", "You can't ban yourself.");
    }

    const body = (await request.json().catch(() => ({}))) as unknown;
    const { reason } = banSchema.parse(body);
    const after = await banUser(id);

    await recordAudit({
      actorId: actor.id,
      action: "user.ban",
      entityType: "user",
      entityId: id,
      diff: reason ? { reason } : {},
    });

    return ok(after);
  });
}

/** Unban a user (restores their ability to sign in). */
export function DELETE(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user: actor } = await requireRole(canManage);
    const { id } = await context.params;
    const after = await unbanUser(id);

    await recordAudit({
      actorId: actor.id,
      action: "user.unban",
      entityType: "user",
      entityId: id,
    });

    return ok(after);
  });
}
