import type { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { bulkSetActive } from "@/lib/data/products";
import { productBulkActivateSchema } from "@/lib/schemas/product";

/**
 * POST /api/v1/products/bulk-activate
 *
 * Body: { ids: string[], isActive: boolean }
 * Toggles `isActive` on every product in `ids`. One audit row per call,
 * with the id list in the diff for traceability.
 */
export function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const input = productBulkActivateSchema.parse(await request.json());
    const updated = await bulkSetActive(input.ids, input.isActive);

    await recordAudit({
      actorId: user.id,
      action: input.isActive ? "product.bulk_activate" : "product.bulk_deactivate",
      entityType: "product",
      entityId: "*",
      diff: { ids: input.ids, count: updated, isActive: input.isActive },
    });

    return ok({ updated });
  });
}
