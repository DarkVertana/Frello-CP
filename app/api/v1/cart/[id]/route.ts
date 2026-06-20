import type { NextRequest } from "next/server";
import { APIError, noContent, ok, withErrorHandling } from "@/lib/api/response";
import { requireSession } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import {
  getCartItemById,
  removeCartItem,
  updateCartItemQuantity,
} from "@/lib/data/cart";
import { cartUpdateSchema } from "@/lib/schemas/cart";
import type { CartItem } from "@/db/schema";

type RouteContext = { params: Promise<{ id: string }> };

/** Load a cart line and authorize the owner (or an admin); else 404. */
async function requireOwnedItem(
  id: string,
  actor: { id: string; role?: string | null },
): Promise<CartItem> {
  const item = await getCartItemById(id);
  if (!item) throw new APIError("NOT_FOUND", "Cart item not found.");
  if (item.userId !== actor.id && !canManage(actor.role)) {
    throw new APIError("NOT_FOUND", "Cart item not found.");
  }
  return item;
}

/** PATCH /api/v1/cart/[id] — set a line's quantity. Body: { quantity }. */
export function PATCH(request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user: actor } = await requireSession();
    const { id } = await context.params;
    await requireOwnedItem(id, actor);

    const { quantity } = cartUpdateSchema.parse(await request.json());
    const { before, after } = await updateCartItemQuantity(id, quantity);

    await recordAudit({
      actorId: actor.id,
      action: "cart.update",
      entityType: "cart_item",
      entityId: id,
      diff: { quantity: { from: before.quantity, to: after.quantity } },
    });

    return ok(after);
  });
}

/** DELETE /api/v1/cart/[id] — remove one line from the cart. */
export function DELETE(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user: actor } = await requireSession();
    const { id } = await context.params;
    const item = await requireOwnedItem(id, actor);

    await removeCartItem(id);

    await recordAudit({
      actorId: actor.id,
      action: "cart.remove",
      entityType: "cart_item",
      entityId: id,
      diff: { before: { productId: item.productId, quantity: item.quantity } },
    });

    return noContent();
  });
}
