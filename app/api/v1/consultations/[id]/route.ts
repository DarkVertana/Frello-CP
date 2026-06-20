import type { NextRequest } from "next/server";
import { APIError, noContent, ok, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canManage, isAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import {
  deleteConsultation,
  getConsultationById,
  updateConsultationStatus,
} from "@/lib/data/consultations";
import { consultationStatusUpdateSchema } from "@/lib/schemas/consultation";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/v1/consultations/[id] — a single request (admin). */
export function GET(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    await requireRole(isAdmin);
    const { id } = await context.params;
    const row = await getConsultationById(id);
    if (!row) throw new APIError("NOT_FOUND", "Consultation not found.");
    return ok(row);
  });
}

/** PATCH /api/v1/consultations/[id] — update the workflow status (admin). */
export function PATCH(request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user: actor } = await requireRole(canManage);
    const { id } = await context.params;
    const { status } = consultationStatusUpdateSchema.parse(await request.json());

    const { before, after } = await updateConsultationStatus(id, status);

    await recordAudit({
      actorId: actor.id,
      action: "consultation.status.update",
      entityType: "consultation",
      entityId: id,
      diff: { status: { from: before.status, to: after.status } },
    });

    return ok(after);
  });
}

/** DELETE /api/v1/consultations/[id] — remove a request (admin). */
export function DELETE(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user: actor } = await requireRole(canManage);
    const { id } = await context.params;

    const deleted = await deleteConsultation(id);

    await recordAudit({
      actorId: actor.id,
      action: "consultation.delete",
      entityType: "consultation",
      entityId: id,
      diff: { before: { fullName: deleted.fullName, mainCrop: deleted.mainCrop } },
    });

    return noContent();
  });
}
