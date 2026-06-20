import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, products, type CartItem } from "@/db/schema";
import { APIError } from "@/lib/api/response";

/**
 * Shopping cart data layer. One row per (user, product); adding an existing
 * product bumps quantity. Pure DB ops — callers own auth + audit.
 */

export type CartItemRow = {
  id: string;
  productId: string;
  quantity: number;
  addedAt: Date;
  updatedAt: Date;
  name: string;
  slug: string;
  imageUrl: string;
  price: number;
  isActive: boolean;
  stock: number;
  /** quantity × unit price, in minor units. */
  lineTotal: number;
};

export type CartSummary = {
  items: CartItemRow[];
  /** Total units across all lines. */
  itemCount: number;
  /** Distinct products. */
  lineCount: number;
  /** Sum of line totals, in minor units. */
  subtotal: number;
};

export async function listCartByUser(userId: string): Promise<CartSummary> {
  const rows = await db
    .select({
      id: cartItems.id,
      productId: products.id,
      quantity: cartItems.quantity,
      addedAt: cartItems.createdAt,
      updatedAt: cartItems.updatedAt,
      name: products.name,
      slug: products.slug,
      imageUrl: products.imageUrl,
      price: products.price,
      isActive: products.isActive,
      stock: products.stock,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, userId))
    .orderBy(asc(cartItems.createdAt));

  const items: CartItemRow[] = rows.map((r) => ({
    ...r,
    lineTotal: r.quantity * r.price,
  }));

  return {
    items,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    lineCount: items.length,
    subtotal: items.reduce((n, i) => n + i.lineTotal, 0),
  };
}

export async function getCartItemById(id: string): Promise<CartItem | null> {
  const [row] = await db.select().from(cartItems).where(eq(cartItems.id, id)).limit(1);
  return row ?? null;
}

/** Add a product (or increment its quantity if already in the cart). */
export async function addToCart(input: {
  userId: string;
  productId: string;
  quantity: number;
}): Promise<CartItem> {
  const [existing] = await db
    .select()
    .from(cartItems)
    .where(
      and(
        eq(cartItems.userId, input.userId),
        eq(cartItems.productId, input.productId),
      ),
    )
    .limit(1);

  if (existing) {
    const nextQty = Math.min(existing.quantity + input.quantity, 999);
    const [updated] = await db
      .update(cartItems)
      .set({ quantity: nextQty, updatedAt: new Date() })
      .where(eq(cartItems.id, existing.id))
      .returning();
    if (!updated) throw new APIError("INTERNAL", "Failed to update cart.");
    return updated;
  }

  const [row] = await db
    .insert(cartItems)
    .values({ userId: input.userId, productId: input.productId, quantity: input.quantity })
    .returning();
  if (!row) throw new APIError("INTERNAL", "Failed to add to cart.");
  return row;
}

export async function updateCartItemQuantity(
  id: string,
  quantity: number,
): Promise<{ before: CartItem; after: CartItem }> {
  const before = await getCartItemById(id);
  if (!before) throw new APIError("NOT_FOUND", "Cart item not found.");

  const [after] = await db
    .update(cartItems)
    .set({ quantity, updatedAt: new Date() })
    .where(eq(cartItems.id, id))
    .returning();
  if (!after) throw new APIError("INTERNAL", "Failed to update cart item.");
  return { before, after };
}

export async function removeCartItem(id: string): Promise<CartItem> {
  const before = await getCartItemById(id);
  if (!before) throw new APIError("NOT_FOUND", "Cart item not found.");
  const [deleted] = await db
    .delete(cartItems)
    .where(eq(cartItems.id, id))
    .returning();
  if (!deleted) throw new APIError("INTERNAL", "Failed to remove cart item.");
  return deleted;
}

/** Empty a user's cart. Returns the number of lines removed. */
export async function clearCart(userId: string): Promise<number> {
  const deleted = await db
    .delete(cartItems)
    .where(eq(cartItems.userId, userId))
    .returning({ id: cartItems.id });
  return deleted.length;
}
