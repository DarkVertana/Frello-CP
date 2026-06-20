import type { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { reorderCategories } from "@/lib/data/categories";
import { categoryReorderSchema } from "@/lib/schemas/category";

/**
 * POST /api/v1/categories/reorder
 *
 * Body: { ids: string[] } — new order top-to-bottom.
 */
export function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const input = categoryReorderSchema.parse(await request.json());
    await reorderCategories(input);

    await recordAudit({
      actorId: user.id,
      action: "category.reorder",
      entityType: "category",
      entityId: "*",
      diff: { ids: input.ids },
    });

    return ok({ ok: true });
  });
}
