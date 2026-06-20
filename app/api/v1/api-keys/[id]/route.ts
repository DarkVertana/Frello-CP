import type { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { revokeApiKey } from "@/lib/data/api-keys";

type RouteContext = { params: Promise<{ id: string }> };

/** DELETE /api/v1/api-keys/[id] — revoke a key (soft; history is kept). */
export function DELETE(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const { id } = await context.params;

    const revoked = await revokeApiKey(id);

    await recordAudit({
      actorId: user.id,
      action: "apikey.revoke",
      entityType: "api_key",
      entityId: id,
      diff: { name: revoked.name },
    });

    return ok(revoked);
  });
}
