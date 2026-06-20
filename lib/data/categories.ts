import "server-only";
import { asc, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { categories, type Category } from "@/db/schema";
import { APIError } from "@/lib/api/response";
import type { ListMeta } from "@/lib/api/response";
import type {
  CategoryCreateInput,
  CategoryReorderInput,
  CategoryUpdateInput,
} from "@/lib/schemas/category";

/**
 * Categories data layer.
 *
 * - Pure DB operations; no auth, no audit. Callers (route handlers, server
 *   actions) are responsible for both.
 * - All writes throw `APIError` on user-facing failures (CONFLICT for unique
 *   slug, NOT_FOUND for missing rows) so the API envelope is consistent.
 */

export type CategorySortField = "name" | "order" | "createdAt" | "updatedAt";

export type CategoryListParams = {
  page: number;
  perPage: number;
  search?: string;
  sort: { field: CategorySortField; direction: "asc" | "desc" };
};

const orderColumn = {
  name: categories.name,
  order: categories.order,
  createdAt: categories.createdAt,
  updatedAt: categories.updatedAt,
} as const satisfies Record<CategorySortField, unknown>;

export async function listCategories(
  params: CategoryListParams,
): Promise<{ rows: Category[]; meta: ListMeta }> {
  const where = params.search
    ? or(
        ilike(categories.name, `%${params.search}%`),
        ilike(categories.slug, `%${params.search}%`),
      )
    : undefined;

  const column = orderColumn[params.sort.field];
  const orderBy = params.sort.direction === "asc" ? asc(column) : desc(column);

  const offset = (params.page - 1) * params.perPage;

  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(categories)
      .where(where)
      .orderBy(orderBy)
      .limit(params.perPage)
      .offset(offset),
    db.select({ value: count() }).from(categories).where(where),
  ]);

  return {
    rows,
    meta: {
      page: params.page,
      perPage: params.perPage,
      total: totals[0]?.value ?? 0,
    },
  };
}

/** All categories in display order — backs the public catalog endpoint. */
export async function listCatalogCategories(): Promise<Category[]> {
  return db
    .select()
    .from(categories)
    .orderBy(asc(categories.order), asc(categories.name));
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const [row] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return row ?? null;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const [row] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function createCategory(input: CategoryCreateInput): Promise<Category> {
  // Manual uniqueness check so we can return a field-level CONFLICT instead of
  // letting the DB raise a generic unique-violation 500.
  const clash = await getCategoryBySlug(input.slug);
  if (clash) {
    throw new APIError("CONFLICT", "A category with that slug already exists.", {
      slug: "Already in use.",
    });
  }

  // Place new categories at the end of the existing order.
  const [{ value: existingCount }] = (await db
    .select({ value: count() })
    .from(categories)) as [{ value: number }];

  const [row] = await db
    .insert(categories)
    .values({ ...input, order: existingCount })
    .returning();

  if (!row) throw new APIError("INTERNAL", "Failed to create category.");
  return row;
}

export async function updateCategory(
  id: string,
  patch: CategoryUpdateInput,
): Promise<{ before: Category; after: Category }> {
  const before = await getCategoryById(id);
  if (!before) {
    throw new APIError("NOT_FOUND", "Category not found.");
  }

  if (patch.slug && patch.slug !== before.slug) {
    const clash = await getCategoryBySlug(patch.slug);
    if (clash) {
      throw new APIError("CONFLICT", "A category with that slug already exists.", {
        slug: "Already in use.",
      });
    }
  }

  const [after] = await db
    .update(categories)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(categories.id, id))
    .returning();

  if (!after) throw new APIError("INTERNAL", "Failed to update category.");
  return { before, after };
}

export async function deleteCategory(id: string): Promise<Category> {
  const before = await getCategoryById(id);
  if (!before) throw new APIError("NOT_FOUND", "Category not found.");

  try {
    const [deleted] = await db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning();
    if (!deleted) throw new APIError("INTERNAL", "Failed to delete category.");
    return deleted;
  } catch (error) {
    // Postgres foreign-key violation when products still reference the row.
    if (error instanceof Error && /foreign key/i.test(error.message)) {
      throw new APIError(
        "CONFLICT",
        "This category has products attached. Move or delete them first.",
      );
    }
    throw error;
  }
}

/**
 * Reorder categories by the provided id list. Each row's `order` becomes its
 * 0-based index in `ids`. Wrapped in a transaction so the whole update is
 * atomic — partial reorders never leak.
 */
export async function reorderCategories(input: CategoryReorderInput): Promise<void> {
  await db.transaction(async (tx) => {
    for (let index = 0; index < input.ids.length; index += 1) {
      const id = input.ids[index]!;
      await tx
        .update(categories)
        .set({ order: index, updatedAt: new Date() })
        .where(eq(categories.id, id));
    }
  });
}

/** Total row count — used by the dashboard KPI strip. */
export async function countCategories(): Promise<number> {
  const [{ value }] = (await db.select({ value: count() }).from(categories)) as [
    { value: number },
  ];
  return value;
}

/** Compute a JSON diff of changed fields for audit entries. */
export function categoryDiff(
  before: Category,
  after: Category,
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  const keys: (keyof Category)[] = ["name", "slug", "icon", "order"];
  for (const key of keys) {
    if (before[key] !== after[key]) {
      diff[key] = { from: before[key], to: after[key] };
    }
  }
  return diff;
}

