import type { NextRequest } from "next/server";
import { APIError, ok, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canSupport } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { getScanById, scanDiff, updateScanNotes } from "@/lib/data/scans";
import { scanUpdateSchema } from "@/lib/schemas/scan";

type RouteContext = { params: Promise<{ id: string }> };

export function GET(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    await requireRole(canSupport);
    const { id } = await context.params;
    const row = await getScanById(id);
    if (!row) throw new APIError("NOT_FOUND", "Scan not found.");
    return ok(row);
  });
}

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
