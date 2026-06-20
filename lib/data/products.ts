import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  lt,
  or,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  products,
  type Category,
  type Product,
} from "@/db/schema";
import { APIError, type ListMeta } from "@/lib/api/response";
import type {
  ProductCreateInput,
  ProductListFilters,
  ProductUpdateInput,
} from "@/lib/schemas/product";
import { LOW_STOCK_THRESHOLD } from "@/lib/schemas/product";

export type ProductSortField =
  | "name"
  | "price"
  | "rating"
  | "stock"
  | "createdAt"
  | "updatedAt";

export type ProductListParams = {
  page: number;
  perPage: number;
  search?: string;
  sort: { field: ProductSortField; direction: "asc" | "desc" };
  filters: ProductListFilters;
};

const orderColumn = {
  name: products.name,
  price: products.price,
  rating: products.rating,
  stock: products.stock,
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
} as const satisfies Record<ProductSortField, unknown>;

function buildWhere(params: ProductListParams): SQL | undefined {
  const clauses: SQL[] = [];
  if (params.search) {
    const like = `%${params.search}%`;
    const match = or(ilike(products.name, like), ilike(products.slug, like));
    if (match) clauses.push(match);
  }
  if (params.filters.categoryId)
    clauses.push(eq(products.categoryId, params.filters.categoryId));
  if (params.filters.isActive)
    clauses.push(eq(products.isActive, params.filters.isActive === "true"));
  if (params.filters.lowStock === "true")
    clauses.push(lt(products.stock, LOW_STOCK_THRESHOLD));

  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return and(...clauses);
}

/** A product joined with its category — used by the list rendering. */
export type ProductWithCategory = Product & {
  category: { id: string; name: string; slug: string } | null;
};

export async function listProducts(
  params: ProductListParams,
): Promise<{ rows: ProductWithCategory[]; meta: ListMeta }> {
  const where = buildWhere(params);
  const column = orderColumn[params.sort.field];
  const orderBy = params.sort.direction === "asc" ? asc(column) : desc(column);

  const offset = (params.page - 1) * params.perPage;

  const [rows, totals] = await Promise.all([
    db
      .select({
        product: products,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        },
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(where)
      .orderBy(orderBy, asc(products.id))
      .limit(params.perPage)
      .offset(offset),
    db.select({ value: count() }).from(products).where(where),
  ]);

  return {
    rows: rows.map((r) => ({ ...r.product, category: r.category })),
    meta: {
      page: params.page,
      perPage: params.perPage,
      total: totals[0]?.value ?? 0,
    },
  };
}

/** Used by the CSV export (no pagination). */
export async function listAllProductsForExport(): Promise<ProductWithCategory[]> {
  const rows = await db
    .select({
      product: products,
      category: {
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      },
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(asc(products.name));
  return rows.map((r) => ({ ...r.product, category: r.category }));
}

export async function getProductById(id: string): Promise<Product | null> {
  const [row] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return row ?? null;
}

/** Product joined with its category — used by the admin detail page. */
export async function getProductWithCategoryById(
  id: string,
): Promise<ProductWithCategory | null> {
  const [row] = await db
    .select({
      product: products,
      category: {
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      },
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, id))
    .limit(1);
  return row ? { ...row.product, category: row.category } : null;
}

/**
 * A single ACTIVE product by slug, joined with its category. Backs the public
 * catalog detail endpoint — inactive products are treated as not found.
 */
export async function getCatalogProductBySlug(
  slug: string,
): Promise<ProductWithCategory | null> {
  const [row] = await db
    .select({
      product: products,
      category: {
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      },
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.slug, slug), eq(products.isActive, true)))
    .limit(1);
  return row ? { ...row.product, category: row.category } : null;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const [row] = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function createProduct(input: ProductCreateInput): Promise<Product> {
  const clash = await getProductBySlug(input.slug);
  if (clash) {
    throw new APIError("CONFLICT", "A product with that slug already exists.", {
      slug: "Already in use.",
    });
  }

  const [row] = await db
    .insert(products)
    .values({
      name: input.name,
      slug: input.slug,
      categoryId: input.categoryId,
      price: input.price,
      originalPrice: input.originalPrice ?? null,
      rating: input.rating,
      reviewsCount: input.reviewsCount,
      stock: input.stock,
      servesPerPerson: input.servesPerPerson ? input.servesPerPerson : null,
      isActive: input.isActive,
      imageUrl: input.imageUrl,
      gallery: input.gallery,
      accent: input.accent,
      description: input.description,
    })
    .returning();
  if (!row) throw new APIError("INTERNAL", "Failed to create product.");
  return row;
}

export async function updateProduct(
  id: string,
  patch: ProductUpdateInput,
): Promise<{ before: Product; after: Product }> {
  const before = await getProductById(id);
  if (!before) throw new APIError("NOT_FOUND", "Product not found.");

  if (patch.slug && patch.slug !== before.slug) {
    const clash = await getProductBySlug(patch.slug);
    if (clash) {
      throw new APIError("CONFLICT", "A product with that slug already exists.", {
        slug: "Already in use.",
      });
    }
  }

  const next: Partial<typeof products.$inferInsert> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };
  if (patch.name !== undefined) next.name = patch.name;
  if (patch.slug !== undefined) next.slug = patch.slug;
  if (patch.categoryId !== undefined) next.categoryId = patch.categoryId;
  if (patch.price !== undefined) next.price = patch.price;
  if (patch.originalPrice !== undefined)
    next.originalPrice = patch.originalPrice ?? null;
  if (patch.rating !== undefined) next.rating = patch.rating;
  if (patch.reviewsCount !== undefined) next.reviewsCount = patch.reviewsCount;
  if (patch.stock !== undefined) next.stock = patch.stock;
  if (patch.servesPerPerson !== undefined)
    next.servesPerPerson = patch.servesPerPerson ? patch.servesPerPerson : null;
  if (patch.isActive !== undefined) next.isActive = patch.isActive;
  if (patch.imageUrl !== undefined) next.imageUrl = patch.imageUrl;
  if (patch.gallery !== undefined) next.gallery = patch.gallery;
  if (patch.accent !== undefined) next.accent = patch.accent;
  if (patch.description !== undefined) next.description = patch.description;

  const [after] = await db
    .update(products)
    .set(next)
    .where(eq(products.id, id))
    .returning();
  if (!after) throw new APIError("INTERNAL", "Failed to update product.");
  return { before, after };
}

export async function deleteProduct(id: string): Promise<Product> {
  const before = await getProductById(id);
  if (!before) throw new APIError("NOT_FOUND", "Product not found.");

  try {
    const [deleted] = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning();
    if (!deleted) throw new APIError("INTERNAL", "Failed to delete product.");
    return deleted;
  } catch (error) {
    if (error instanceof Error && /foreign key/i.test(error.message)) {
      // order_items reference products with `onDelete: "restrict"` — keep the
      // product around so order history doesn't break.
      throw new APIError(
        "CONFLICT",
        "This product appears in past orders. Deactivate it instead of deleting.",
      );
    }
    throw error;
  }
}

export async function bulkSetActive(
  ids: string[],
  isActive: boolean,
): Promise<number> {
  if (ids.length === 0) return 0;
  const updated = await db
    .update(products)
    .set({ isActive, updatedAt: new Date() })
    .where(inArray(products.id, ids))
    .returning({ id: products.id });
  return updated.length;
}

export async function countProducts(): Promise<number> {
  const [{ value }] = (await db.select({ value: count() }).from(products)) as [
    { value: number },
  ];
  return value;
}

/** Lightweight category list for the form's select. */
export async function listCategoryOptions(): Promise<
  Pick<Category, "id" | "name" | "slug">[]
> {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
    })
    .from(categories)
    .orderBy(asc(categories.order), asc(categories.name));
}

export function productDiff(
  before: Product,
  after: Product,
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  const keys: (keyof Product)[] = [
    "name",
    "slug",
    "categoryId",
    "price",
    "originalPrice",
    "rating",
    "reviewsCount",
    "stock",
    "servesPerPerson",
    "isActive",
    "imageUrl",
    "accent",
    "description",
  ];
  for (const key of keys) {
    if (before[key] !== after[key]) {
      diff[key] = { from: before[key], to: after[key] };
    }
  }
  const beforeGallery = JSON.stringify(before.gallery);
  const afterGallery = JSON.stringify(after.gallery);
  if (beforeGallery !== afterGallery) {
    diff.gallery = { from: before.gallery, to: after.gallery };
  }
  return diff;
}
