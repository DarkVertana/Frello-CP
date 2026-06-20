import type { NextRequest } from "next/server";
import { APIError, noContent, ok, withErrorHandling } from "@/lib/api/response";
import { requireRole, requireSession } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import {
  deleteProduct,
  getProductById,
  productDiff,
  updateProduct,
} from "@/lib/data/products";
import { productUpdateSchema } from "@/lib/schemas/product";

type RouteContext = { params: Promise<{ id: string }> };

export function GET(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    await requireSession();
    const { id } = await context.params;
    const row = await getProductById(id);
    if (!row) throw new APIError("NOT_FOUND", "Product not found.");
    return ok(row);
  });
}

export function PATCH(request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const { id } = await context.params;
    const patch = productUpdateSchema.parse(await request.json());
    const { before, after } = await updateProduct(id, patch);

    await recordAudit({
      actorId: user.id,
      action: "product.update",
      entityType: "product",
      entityId: id,
      diff: productDiff(before, after),
    });

    return ok(after);
  });
}

export function DELETE(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const { id } = await context.params;
    const deleted = await deleteProduct(id);

    await recordAudit({
      actorId: user.id,
      action: "product.delete",
      entityType: "product",
      entityId: id,
      diff: { before: { name: deleted.name, slug: deleted.slug } },
    });

    return noContent();
  });
}
