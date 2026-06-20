import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, savedProducts, type SavedProduct } from "@/db/schema";
import { APIError } from "@/lib/api/response";

/**
 * Saved / favourite products data layer. Pure DB ops — callers own auth + audit.
 * Saving is idempotent (one row per user+product, enforced by a unique index).
 */

/** A saved entry joined with the product fields the UI/clients need. */
export type SavedProductRow = {
  id: string;
  productId: string;
  savedAt: Date;
  name: string;
  slug: string;
  imageUrl: string;
  price: number;
  isActive: boolean;
};

export async function listSavedByUser(userId: string): Promise<SavedProductRow[]> {
  return db
    .select({
      id: savedProducts.id,
      productId: products.id,
      savedAt: savedProducts.createdAt,
      name: products.name,
      slug: products.slug,
      imageUrl: products.imageUrl,
      price: products.price,
      isActive: products.isActive,
    })
    .from(savedProducts)
    .innerJoin(products, eq(savedProducts.productId, products.id))
    .where(eq(savedProducts.userId, userId))
    .orderBy(desc(savedProducts.createdAt));
}

export async function getSavedById(id: string): Promise<SavedProduct | null> {
  const [row] = await db
    .select()
    .from(savedProducts)
    .where(eq(savedProducts.id, id))
    .limit(1);
  return row ?? null;
}

/** Idempotent: returns the existing row if the product is already saved. */
export async function saveProduct(input: {
  userId: string;
  productId: string;
}): Promise<SavedProduct> {
  const [existing] = await db
    .select()
    .from(savedProducts)
    .where(
      and(
        eq(savedProducts.userId, input.userId),
        eq(savedProducts.productId, input.productId),
      ),
    )
    .limit(1);
  if (existing) return existing;

  const [row] = await db
    .insert(savedProducts)
    .values({ userId: input.userId, productId: input.productId })
    .returning();
  if (!row) throw new APIError("INTERNAL", "Failed to save product.");
  return row;
}

export async function deleteSaved(id: string): Promise<SavedProduct> {
  const before = await getSavedById(id);
  if (!before) throw new APIError("NOT_FOUND", "Saved product not found.");
  const [deleted] = await db
    .delete(savedProducts)
    .where(eq(savedProducts.id, id))
    .returning();
  if (!deleted) throw new APIError("INTERNAL", "Failed to remove saved product.");
  return deleted;
}

/** Total saved count for a user — handy for profile/KPI surfaces. */
export async function countSavedByUser(userId: string): Promise<number> {
  const rows = await db
    .select({ id: savedProducts.id })
    .from(savedProducts)
    .where(eq(savedProducts.userId, userId));
  return rows.length;
}
