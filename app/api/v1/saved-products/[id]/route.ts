import type { NextRequest } from "next/server";
import { APIError, noContent, withErrorHandling } from "@/lib/api/response";
import { requireSession } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { deleteSaved, getSavedById } from "@/lib/data/saved-products";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * DELETE /api/v1/saved-products/[id] — unsave a product.
 *
 * The owner (or an admin) may remove it; anyone else gets 404 so saved ids
 * aren't leaked across users.
 */
export function DELETE(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user: actor } = await requireSession();
    const { id } = await context.params;

    const saved = await getSavedById(id);
    if (!saved) throw new APIError("NOT_FOUND", "Saved product not found.");
    if (saved.userId !== actor.id && !canManage(actor.role)) {
      throw new APIError("NOT_FOUND", "Saved product not found.");
    }

    await deleteSaved(id);

    await recordAudit({
      actorId: actor.id,
      action: "saved_product.delete",
      entityType: "saved_product",
      entityId: id,
      diff: { before: { userId: saved.userId, productId: saved.productId } },
    });

    return noContent();
  });
}
