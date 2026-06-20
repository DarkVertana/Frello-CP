import "server-only";
import { asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { diseases, supplements, type Disease, type Supplement } from "@/db/schema";
import { APIError, type ListMeta } from "@/lib/api/response";
import type {
  SupplementCreateInput,
  SupplementUpdateInput,
} from "@/lib/schemas/supplement";

export type SupplementSortField = "name" | "brand" | "createdAt" | "updatedAt";

export type SupplementListParams = {
  page: number;
  perPage: number;
  search?: string;
  sort: { field: SupplementSortField; direction: "asc" | "desc" };
};

const orderColumn = {
  name: supplements.name,
  brand: supplements.brand,
  createdAt: supplements.createdAt,
  updatedAt: supplements.updatedAt,
} as const satisfies Record<SupplementSortField, unknown>;

function buildWhere(params: SupplementListParams): SQL | undefined {
  if (!params.search) return undefined;
  const like = `%${params.search}%`;
  return or(ilike(supplements.name, like), ilike(supplements.brand, like)) ?? undefined;
}

export async function listSupplements(
  params: SupplementListParams,
): Promise<{ rows: Supplement[]; meta: ListMeta }> {
  const where = buildWhere(params);
  const column = orderColumn[params.sort.field];
  const orderBy = params.sort.direction === "asc" ? asc(column) : desc(column);

  const offset = (params.page - 1) * params.perPage;

  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(supplements)
      .where(where)
      .orderBy(orderBy, asc(supplements.name))
      .limit(params.perPage)
      .offset(offset),
    db.select({ value: count() }).from(supplements).where(where),
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

export async function getSupplementById(id: string): Promise<Supplement | null> {
  const [row] = await db
    .select()
    .from(supplements)
    .where(eq(supplements.id, id))
    .limit(1);
  return row ?? null;
}

/** All disease labels grouped by crop — feeds the form's label picker. */
export async function listDiseaseLabelsGroupedByCrop(): Promise<
  Record<string, { label: string; disease: string; healthy: boolean }[]>
> {
  const rows = await db
    .select({
      label: diseases.label,
      crop: diseases.crop,
      disease: diseases.disease,
      healthy: diseases.healthy,
    })
    .from(diseases)
    .orderBy(asc(diseases.crop), asc(diseases.disease));

  const grouped: Record<string, { label: string; disease: string; healthy: boolean }[]> = {};
  for (const row of rows) {
    if (!grouped[row.crop]) grouped[row.crop] = [];
    grouped[row.crop]!.push({
      label: row.label,
      disease: row.disease,
      healthy: row.healthy,
    });
  }
  return grouped;
}

/** Diseases whose primary supplementId points at this supplement. */
export async function listDiseasesUsingSupplement(
  supplementId: string,
): Promise<Disease[]> {
  return db
    .select()
    .from(diseases)
    .where(eq(diseases.supplementId, supplementId))
    .orderBy(asc(diseases.crop), asc(diseases.disease));
}

export async function createSupplement(
  input: SupplementCreateInput,
): Promise<Supplement> {
  const [row] = await db
    .insert(supplements)
    .values({
      name: input.name,
      brand: input.brand || null,
      imageUrl: input.imageUrl,
      buyLink: input.buyLink,
      description: input.description || null,
      mappedDiseaseLabels: input.mappedDiseaseLabels,
    })
    .returning();
  if (!row) throw new APIError("INTERNAL", "Failed to create supplement.");
  return row;
}

export async function updateSupplement(
  id: string,
  patch: SupplementUpdateInput,
): Promise<{ before: Supplement; after: Supplement }> {
  const before = await getSupplementById(id);
  if (!before) throw new APIError("NOT_FOUND", "Supplement not found.");

  const next: Partial<typeof supplements.$inferInsert> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };
  if (patch.name !== undefined) next.name = patch.name;
  if (patch.brand !== undefined) next.brand = patch.brand || null;
  if (patch.imageUrl !== undefined) next.imageUrl = patch.imageUrl;
  if (patch.buyLink !== undefined) next.buyLink = patch.buyLink;
  if (patch.description !== undefined) next.description = patch.description || null;
  if (patch.mappedDiseaseLabels !== undefined)
    next.mappedDiseaseLabels = patch.mappedDiseaseLabels;

  const [after] = await db
    .update(supplements)
    .set(next)
    .where(eq(supplements.id, id))
    .returning();
  if (!after) throw new APIError("INTERNAL", "Failed to update supplement.");
  return { before, after };
}

export async function deleteSupplement(id: string): Promise<Supplement> {
  const before = await getSupplementById(id);
  if (!before) throw new APIError("NOT_FOUND", "Supplement not found.");

  // Diseases pointing at this supplement have `onDelete: "set null"` configured
  // in the schema, so the delete cascades cleanly without orphaning rows.
  const [deleted] = await db
    .delete(supplements)
    .where(eq(supplements.id, id))
    .returning();
  if (!deleted) throw new APIError("INTERNAL", "Failed to delete supplement.");
  return deleted;
}

export function supplementDiff(
  before: Supplement,
  after: Supplement,
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  const keys: (keyof Supplement)[] = [
    "name",
    "brand",
    "imageUrl",
    "buyLink",
    "description",
  ];
  for (const key of keys) {
    if (before[key] !== after[key]) {
      diff[key] = { from: before[key], to: after[key] };
    }
  }
  const beforeLabels = JSON.stringify(before.mappedDiseaseLabels);
  const afterLabels = JSON.stringify(after.mappedDiseaseLabels);
  if (beforeLabels !== afterLabels) {
    diff.mappedDiseaseLabels = {
      from: before.mappedDiseaseLabels,
      to: after.mappedDiseaseLabels,
    };
  }
  return diff;
}
