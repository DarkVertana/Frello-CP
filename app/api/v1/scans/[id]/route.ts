import type { NextRequest } from "next/server";
import { APIError, noContent, ok, withErrorHandling } from "@/lib/api/response";
import { requireRole, requireSession } from "@/lib/api/auth";
import { canSupport } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import {
  deleteScan,
  getScanById,
  scanDiff,
  updateScanNotes,
} from "@/lib/data/scans";
import { scanUpdateSchema } from "@/lib/schemas/scan";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/scans/[id] — a single scan with its diagnosis.
 *
 * The owner (any signed-in user) or admin/support may read it; anyone else
 * gets 404 so scan ids aren't leaked across users.
 */
export function GET(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireSession();
    const { id } = await context.params;
    const row = await getScanById(id);
    if (!row) throw new APIError("NOT_FOUND", "Scan not found.");
    if (row.userId !== user.id && !canSupport(user.role)) {
      throw new APIError("NOT_FOUND", "Scan not found.");
    }
    return ok(row);
  });
}

/** PATCH /api/v1/scans/[id] — reviewer notes (support/admin only). */
export function PATCH(request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canSupport);
    const { id } = await context.params;
    const patch = scanUpdateSchema.parse(await request.json());
    const { before, after } = await updateScanNotes(id, patch);

    await recordAudit({
      actorId: user.id,
      action: "scan.update",
      entityType: "scan",
      entityId: id,
      diff: scanDiff(before, after),
    });

    return ok(after);
  });
}

/**
 * DELETE /api/v1/scans/[id] — remove a scan from history.
 *
 * The owner (any signed-in user) or admin/support may delete it.
 */
export function DELETE(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireSession();
    const { id } = await context.params;

    const row = await getScanById(id);
    if (!row) throw new APIError("NOT_FOUND", "Scan not found.");
    if (row.userId !== user.id && !canSupport(user.role)) {
      throw new APIError("NOT_FOUND", "Scan not found.");
    }

    await deleteScan(id);

    await recordAudit({
      actorId: user.id,
      action: "scan.delete",
      entityType: "scan",
      entityId: id,
      diff: { before: { predictedLabel: row.predictedLabel } },
    });

    return noContent();
  });
}
