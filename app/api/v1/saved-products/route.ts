import type { NextRequest } from "next/server";
import { APIError, created, list, withErrorHandling } from "@/lib/api/response";
import { requireSession } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { listSavedByUser, saveProduct } from "@/lib/data/saved-products";
import { getProductById } from "@/lib/data/products";
import { savedProductCreateSchema } from "@/lib/schemas/saved-product";

/**
 * GET /api/v1/saved-products[?userId=<id>] — a user's saved products.
 *
 * Any signed-in user gets their own; admins may pass `userId` to read another
 * user's. Non-admins are restricted to themselves.
 */
export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user } = await requireSession();
    const requested = new URL(request.url).searchParams.get("userId")?.trim();
    const admin = canManage(user.role);

    if (requested && requested !== user.id && !admin) {
      throw new APIError("FORBIDDEN", "You can only view your own saved products.");
    }

    const userId = admin && requested ? requested : user.id;
    const rows = await listSavedByUser(userId);
    return list(rows, { page: 1, perPage: rows.length, total: rows.length });
  });
}

/**
 * POST /api/v1/saved-products — save (favourite) a product.
 *
 * Self-service callers omit `userId`; admins may set it. Idempotent — saving an
 * already-saved product returns the existing entry.
 *
 * Body: { productId, userId? }
 */
export function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user: actor } = await requireSession();
    const input = savedProductCreateSchema.parse(await request.json());
    const admin = canManage(actor.role);

    if (input.userId && input.userId !== actor.id && !admin) {
      throw new APIError("FORBIDDEN", "You can only save to your own profile.");
    }

    const ownerId = admin && input.userId ? input.userId : actor.id;

    const product = await getProductById(input.productId);
    if (!product) throw new APIError("NOT_FOUND", "Product not found.");

    const row = await saveProduct({ userId: ownerId, productId: input.productId });

    await recordAudit({
      actorId: actor.id,
      action: "saved_product.create",
      entityType: "saved_product",
      entityId: row.id,
      diff: { userId: row.userId, productId: row.productId },
    });

    return created(row);
  });
}
