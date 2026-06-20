import type { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canSupport } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { scanDiff, setScanFlag } from "@/lib/data/scans";
import { scanFlagSchema } from "@/lib/schemas/scan";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/scans/[id]/flag
 *
 * Body: { flagged: boolean }
 *
 * Flagged scans feed the retrain export. Each toggle writes an audit row so
 * we can reconstruct which reviewer flagged what and when.
 */
export function POST(request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canSupport);
    const { id } = await context.params;
    const { flagged } = scanFlagSchema.parse(await request.json());

    const { before, after } = await setScanFlag(id, flagged);
    if (before.flagged !== after.flagged) {
      await recordAudit({
        actorId: user.id,
        action: flagged ? "scan.flag" : "scan.unflag",
        entityType: "scan",
        entityId: id,
        diff: scanDiff(before, after),
      });
    }
    return ok(after);
  });
}
