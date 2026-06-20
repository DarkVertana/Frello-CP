import type { NextRequest } from "next/server";
import { APIError, noContent, ok, withErrorHandling } from "@/lib/api/response";
import { requireRole, requireSession } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import {
  deleteDisease,
  diseaseDiff,
  getDiseaseByLabel,
  updateDisease,
} from "@/lib/data/diseases";
import { diseaseUpdateSchema } from "@/lib/schemas/disease";

type RouteContext = { params: Promise<{ label: string }> };

export function GET(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    await requireSession();
    const { label } = await context.params;
    const row = await getDiseaseByLabel(decodeURIComponent(label));
    if (!row) throw new APIError("NOT_FOUND", "Disease not found.");
    return ok(row);
  });
}

export function PATCH(request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const { label: raw } = await context.params;
    const label = decodeURIComponent(raw);
    const patch = diseaseUpdateSchema.parse(await request.json());
    const { before, after } = await updateDisease(label, patch);

    await recordAudit({
      actorId: user.id,
      action: "disease.update",
      entityType: "disease",
      entityId: label,
      diff: diseaseDiff(before, after),
    });

    return ok(after);
  });
}

export function DELETE(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const { label: raw } = await context.params;
    const label = decodeURIComponent(raw);
    const deleted = await deleteDisease(label);

    await recordAudit({
      actorId: user.id,
      action: "disease.delete",
      entityType: "disease",
      entityId: label,
      diff: { before: { crop: deleted.crop, disease: deleted.disease } },
    });

    return noContent();
  });
}
