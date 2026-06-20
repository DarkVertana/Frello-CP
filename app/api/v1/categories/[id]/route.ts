import type { NextRequest } from "next/server";
import { ok, noContent, withErrorHandling, APIError } from "@/lib/api/response";
import { requireRole, requireSession } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import {
  categoryDiff,
  deleteCategory,
  getCategoryById,
  updateCategory,
} from "@/lib/data/categories";
import { categoryUpdateSchema } from "@/lib/schemas/category";

type RouteContext = { params: Promise<{ id: string }> };

export function GET(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    await requireSession();
    const { id } = await context.params;
    const row = await getCategoryById(id);
    if (!row) throw new APIError("NOT_FOUND", "Category not found.");
    return ok(row);
  });
}

export function PATCH(request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const { id } = await context.params;
    const patch = categoryUpdateSchema.parse(await request.json());
    const { before, after } = await updateCategory(id, patch);

    await recordAudit({
      actorId: user.id,
      action: "category.update",
      entityType: "category",
      entityId: id,
      diff: categoryDiff(before, after),
    });

    return ok(after);
  });
}

export function DELETE(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const { id } = await context.params;
    const deleted = await deleteCategory(id);

    await recordAudit({
      actorId: user.id,
      action: "category.delete",
      entityType: "category",
      entityId: id,
      diff: { before: { name: deleted.name, slug: deleted.slug } },
    });

    return noContent();
  });
}
