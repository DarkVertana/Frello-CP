import type { NextRequest } from "next/server";
import { APIError, created, ok, withErrorHandling } from "@/lib/api/response";
import { requireSession } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { addToCart, clearCart, listCartByUser } from "@/lib/data/cart";
import { getProductById } from "@/lib/data/products";
import { cartAddSchema } from "@/lib/schemas/cart";

/**
 * Resolve which user's cart the caller may act on. Self for everyone; admins
 * may target another user via `targetUserId`.
 */
function resolveOwner(
  actor: { id: string; role?: string | null },
  targetUserId: string | undefined,
  action: string,
): string {
  if (targetUserId && targetUserId !== actor.id && !canManage(actor.role)) {
    throw new APIError("FORBIDDEN", `You can only ${action} your own cart.`);
  }
  return canManage(actor.role) && targetUserId ? targetUserId : actor.id;
}

/**
 * GET /api/v1/cart[?userId=] — the cart with line items + totals:
 *   { items, itemCount, lineCount, subtotal }
 * Subtotal/prices are integer minor units (format with /catalog/config currency).
 */
export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user } = await requireSession();
    const requested = new URL(request.url).searchParams.get("userId")?.trim();
    const userId = resolveOwner(user, requested || undefined, "view");
    return ok(await listCartByUser(userId));
  });
}

/**
 * POST /api/v1/cart — add a product (increments quantity if already present).
 * Body: { productId, quantity?, userId? }
 */
export function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user: actor } = await requireSession();
    const input = cartAddSchema.parse(await request.json());
    const ownerId = resolveOwner(actor, input.userId, "add to");

    const product = await getProductById(input.productId);
    if (!product) throw new APIError("NOT_FOUND", "Product not found.");

    const item = await addToCart({
      userId: ownerId,
      productId: input.productId,
      quantity: input.quantity,
    });

    await recordAudit({
      actorId: actor.id,
      action: "cart.add",
      entityType: "cart_item",
      entityId: item.id,
      diff: { userId: ownerId, productId: item.productId, quantity: item.quantity },
    });

    return created(item);
  });
}

/** DELETE /api/v1/cart[?userId=] — empty the cart. */
export function DELETE(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user: actor } = await requireSession();
    const requested = new URL(request.url).searchParams.get("userId")?.trim();
    const ownerId = resolveOwner(actor, requested || undefined, "clear");

    const cleared = await clearCart(ownerId);

    await recordAudit({
      actorId: actor.id,
      action: "cart.clear",
      entityType: "cart_item",
      entityId: ownerId,
      diff: { userId: ownerId, cleared },
    });

    return ok({ cleared });
  });
}
