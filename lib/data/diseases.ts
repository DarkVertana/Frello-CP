import "server-only";
import { and, asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { diseases, supplements, type Disease, type Supplement } from "@/db/schema";
import { APIError, type ListMeta } from "@/lib/api/response";
import type {
  DiseaseCreateInput,
  DiseaseListFilters,
  DiseaseUpdateInput,
} from "@/lib/schemas/disease";

export type DiseaseSortField = "label" | "crop" | "severity" | "updatedAt";

export type DiseaseListParams = {
  page: number;
  perPage: number;
  search?: string;
  sort: { field: DiseaseSortField; direction: "asc" | "desc" };
  filters: DiseaseListFilters;
};

const orderColumn = {
  label: diseases.label,
  crop: diseases.crop,
  severity: diseases.severity,
  updatedAt: diseases.updatedAt,
} as const satisfies Record<DiseaseSortField, unknown>;

function buildWhere(params: DiseaseListParams): SQL | undefined {
  const clauses: SQL[] = [];
  if (params.search) {
    const like = `%${params.search}%`;
    const match = or(
      ilike(diseases.label, like),
      ilike(diseases.crop, like),
      ilike(diseases.disease, like),
    );
    if (match) clauses.push(match);
  }
  if (params.filters.crop) clauses.push(eq(diseases.crop, params.filters.crop));
  if (params.filters.severity)
    clauses.push(eq(diseases.severity, params.filters.severity));
  if (params.filters.healthy) {
    clauses.push(eq(diseases.healthy, params.filters.healthy === "true"));
  }
  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return and(...clauses);
}

export async function listDiseases(
  params: DiseaseListParams,
): Promise<{ rows: Disease[]; meta: ListMeta }> {
  const where = buildWhere(params);
  const column = orderColumn[params.sort.field];
  const orderBy = params.sort.direction === "asc" ? asc(column) : desc(column);

  const offset = (params.page - 1) * params.perPage;

  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(diseases)
      .where(where)
      .orderBy(orderBy, asc(diseases.label))
      .limit(params.perPage)
      .offset(offset),
    db.select({ value: count() }).from(diseases).where(where),
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

/** Distinct crop strings, ordered alphabetically — powers the crop filter dropdown. */
export async function listCrops(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ crop: diseases.crop })
    .from(diseases)
    .orderBy(asc(diseases.crop));
  return rows.map((row) => row.crop);
}

export async function getDiseaseByLabel(label: string): Promise<Disease | null> {
  const [row] = await db
    .select()
    .from(diseases)
    .where(eq(diseases.label, label))
    .limit(1);
  return row ?? null;
}

/** Disease + supplement joined in one query — used by the detail page. */
export async function getDiseaseWithSupplement(
  label: string,
): Promise<{ disease: Disease; supplement: Supplement | null } | null> {
  const row = await db
    .select({
      disease: diseases,
      supplement: supplements,
    })
    .from(diseases)
    .leftJoin(supplements, eq(diseases.supplementId, supplements.id))
    .where(eq(diseases.label, label))
    .limit(1);

  const result = row[0];
  if (!result) return null;
  return { disease: result.disease, supplement: result.supplement };
}

/** Lightweight list of all supplements for the disease form's select. */
export async function listSupplementOptions(): Promise<
  Pick<Supplement, "id" | "name" | "brand">[]
> {
  return db
    .select({
      id: supplements.id,
      name: supplements.name,
      brand: supplements.brand,
    })
    .from(supplements)
    .orderBy(asc(supplements.name));
}

export async function createDisease(input: DiseaseCreateInput): Promise<Disease> {
  const clash = await getDiseaseByLabel(input.label);
  if (clash) {
    throw new APIError("CONFLICT", "A disease with that label already exists.", {
      label: "Already in use.",
    });
  }

  const [row] = await db
    .insert(diseases)
    .values({
      label: input.label,
      crop: input.crop,
      disease: input.disease,
      healthy: input.healthy,
      description: input.description,
      prevention: input.prevention,
      supplementId: input.supplementId ?? null,
      buyLink: input.buyLink ? input.buyLink : null,
      severity: input.severity,
    })
    .returning();

  if (!row) throw new APIError("INTERNAL", "Failed to create disease.");
  return row;
}

export async function updateDisease(
  label: string,
  patch: DiseaseUpdateInput,
): Promise<{ before: Disease; after: Disease }> {
  const before = await getDiseaseByLabel(label);
  if (!before) throw new APIError("NOT_FOUND", "Disease not found.");

  const next: Partial<typeof diseases.$inferInsert> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };
  if (patch.crop !== undefined) next.crop = patch.crop;
  if (patch.disease !== undefined) next.disease = patch.disease;
  if (patch.healthy !== undefined) next.healthy = patch.healthy;
  if (patch.description !== undefined) next.description = patch.description;
  if (patch.prevention !== undefined) next.prevention = patch.prevention;
  if (patch.supplementId !== undefined) next.supplementId = patch.supplementId;
  if (patch.buyLink !== undefined) next.buyLink = patch.buyLink || null;
  if (patch.severity !== undefined) next.severity = patch.severity;

  const [after] = await db
    .update(diseases)
    .set(next)
    .where(eq(diseases.label, label))
    .returning();

  if (!after) throw new APIError("INTERNAL", "Failed to update disease.");
  return { before, after };
}

export async function deleteDisease(label: string): Promise<Disease> {
  const before = await getDiseaseByLabel(label);
  if (!before) throw new APIError("NOT_FOUND", "Disease not found.");

  // The scans table references predictedLabel by string, not FK, so deleting
  // a disease label leaves old scans referencing a now-missing label. Their
  // diagnosisSnapshot column still holds the frozen text the user saw.
  const [deleted] = await db
    .delete(diseases)
    .where(eq(diseases.label, label))
    .returning();
  if (!deleted) throw new APIError("INTERNAL", "Failed to delete disease.");
  return deleted;
}

export async function countDiseases(): Promise<number> {
  const [{ value }] = (await db.select({ value: count() }).from(diseases)) as [
    { value: number },
  ];
  return value;
}

export function diseaseDiff(
  before: Disease,
  after: Disease,
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  const keys: (keyof Disease)[] = [
    "crop",
    "disease",
    "healthy",
    "description",
    "supplementId",
    "buyLink",
    "severity",
  ];
  for (const key of keys) {
    if (before[key] !== after[key]) {
      diff[key] = { from: before[key], to: after[key] };
    }
  }
  // Arrays compare by reference; serialise to detect prevention edits.
  const beforePrev = JSON.stringify(before.prevention);
  const afterPrev = JSON.stringify(after.prevention);
  if (beforePrev !== afterPrev) {
    diff.prevention = { from: before.prevention, to: after.prevention };
  }
  return diff;
}

