import type { NextRequest } from "next/server";
import { APIError, noContent, ok, withErrorHandling } from "@/lib/api/response";
import { requireRole, requireSession } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import {
  deleteSupplement,
  getSupplementById,
  supplementDiff,
  updateSupplement,
} from "@/lib/data/supplements";
import { supplementUpdateSchema } from "@/lib/schemas/supplement";

type RouteContext = { params: Promise<{ id: string }> };

export function GET(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    await requireSession();
    const { id } = await context.params;
    const row = await getSupplementById(id);
    if (!row) throw new APIError("NOT_FOUND", "Supplement not found.");
    return ok(row);
  });
}

export function PATCH(request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const { id } = await context.params;
    const patch = supplementUpdateSchema.parse(await request.json());
    const { before, after } = await updateSupplement(id, patch);

    await recordAudit({
      actorId: user.id,
      action: "supplement.update",
      entityType: "supplement",
      entityId: id,
      diff: supplementDiff(before, after),
    });

    return ok(after);
  });
}

export function DELETE(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const { id } = await context.params;
    const deleted = await deleteSupplement(id);

    await recordAudit({
      actorId: user.id,
      action: "supplement.delete",
      entityType: "supplement",
      entityId: id,
      diff: { before: { name: deleted.name, brand: deleted.brand } },
    });

    return noContent();
  });
}
