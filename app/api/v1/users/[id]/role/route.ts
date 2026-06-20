import type { NextRequest } from "next/server";
import { APIError, ok, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { isSuperAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { setUserRole, userDiff } from "@/lib/data/users";
import { setRoleSchema } from "@/lib/schemas/user";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/users/[id]/role — Super-Admin-only.
 *
 * Role downgrades from Super Admin to anything else are allowed only on other
 * users — never on yourself, so you can't lock the team out.
 */
export function POST(request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user: actor } = await requireRole(isSuperAdmin);
    const { id } = await context.params;
    if (id === actor.id) {
      throw new APIError("BAD_REQUEST", "You can't change your own role here.");
    }

    const { role } = setRoleSchema.parse(await request.json());
    const { before, after } = await setUserRole(id, role);

    await recordAudit({
      actorId: actor.id,
      action: "user.role.update",
      entityType: "user",
      entityId: id,
      diff: userDiff(before, after),
    });

    return ok(after);
  });
}
