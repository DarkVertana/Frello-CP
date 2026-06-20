import type { NextRequest } from "next/server";
import { APIError, noContent, ok, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canManage, isAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import {
  deleteUser,
  getUserById,
  updateUserProfile,
  userDiff,
} from "@/lib/data/users";
import { userUpdateSchema } from "@/lib/schemas/user";

type RouteContext = { params: Promise<{ id: string }> };

export function GET(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    await requireRole(isAdmin);
    const { id } = await context.params;
    const row = await getUserById(id);
    if (!row) throw new APIError("NOT_FOUND", "User not found.");
    return ok(row);
  });
}

export function PATCH(request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user: actor } = await requireRole(canManage);
    const { id } = await context.params;
    const patch = userUpdateSchema.parse(await request.json());
    const { before, after } = await updateUserProfile(id, patch);

    await recordAudit({
      actorId: actor.id,
      action: "user.update",
      entityType: "user",
      entityId: id,
      diff: userDiff(before, after),
    });

    return ok(after);
  });
}

export function DELETE(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user: actor } = await requireRole(canManage);
    const { id } = await context.params;
    if (id === actor.id) {
      throw new APIError("BAD_REQUEST", "You can't delete your own account from here.");
    }

    const deleted = await deleteUser(id);
    await recordAudit({
      actorId: actor.id,
      action: "user.delete",
      entityType: "user",
      entityId: id,
      diff: { before: { name: deleted.name, email: deleted.email, role: deleted.role } },
    });
    return noContent();
  });
}
