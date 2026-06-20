import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  lt,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  diseases,
  scans,
  user,
  type DiagnosisSnapshot,
  type Scan,
  type Disease,
} from "@/db/schema";
import { APIError, type ListMeta } from "@/lib/api/response";
import type {
  ScanCreateInput,
  ScanListFilters,
  ScanUpdateInput,
} from "@/lib/schemas/scan";

export type ScanSortField = "createdAt" | "confidence" | "predictedLabel";

export type ScanListParams = {
  page: number;
  perPage: number;
  sort: { field: ScanSortField; direction: "asc" | "desc" };
  filters: ScanListFilters;
};

const orderColumn = {
  createdAt: scans.createdAt,
  confidence: scans.confidence,
  predictedLabel: scans.predictedLabel,
} as const satisfies Record<ScanSortField, unknown>;

function buildWhere(params: ScanListParams): SQL | undefined {
  const clauses: SQL[] = [];
  if (params.filters.label) {
    clauses.push(eq(scans.predictedLabel, params.filters.label));
  }
  if (params.filters.confidence === "high") {
    clauses.push(gte(scans.confidence, 0.9));
  } else if (params.filters.confidence === "medium") {
    const match = and(gte(scans.confidence, 0.6), lt(scans.confidence, 0.9));
    if (match) clauses.push(match);
  } else if (params.filters.confidence === "low") {
    clauses.push(lt(scans.confidence, 0.6));
  }
  if (params.filters.flagged) {
    clauses.push(eq(scans.flagged, params.filters.flagged === "true"));
  }
  if (params.filters.userId) {
    clauses.push(eq(scans.userId, params.filters.userId));
  }
  if (params.filters.from) {
    clauses.push(gte(scans.createdAt, new Date(params.filters.from)));
  }
  if (params.filters.to) {
    const next = new Date(params.filters.to);
    next.setUTCDate(next.getUTCDate() + 1);
    clauses.push(lt(scans.createdAt, next));
  }
  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return and(...clauses);
}

export type ScanRow = Scan & {
  customer: { id: string; name: string; email: string } | null;
  disease: { label: string; crop: string; disease: string } | null;
};

export async function listScans(
  params: ScanListParams,
): Promise<{ rows: ScanRow[]; meta: ListMeta }> {
  const where = buildWhere(params);
  const column = orderColumn[params.sort.field];
  const orderBy = params.sort.direction === "asc" ? asc(column) : desc(column);
  const offset = (params.page - 1) * params.perPage;

  const [rows, totals] = await Promise.all([
    db
      .select({
        scan: scans,
        customer: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        disease: {
          label: diseases.label,
          crop: diseases.crop,
          disease: diseases.disease,
        },
      })
      .from(scans)
      .leftJoin(user, eq(scans.userId, user.id))
      .leftJoin(diseases, eq(scans.predictedLabel, diseases.label))
      .where(where)
      .orderBy(orderBy, asc(scans.id))
      .limit(params.perPage)
      .offset(offset),
    db.select({ value: count() }).from(scans).where(where),
  ]);

  return {
    rows: rows.map((r) => ({
      ...r.scan,
      customer:
        r.customer && r.customer.id
          ? { id: r.customer.id, name: r.customer.name, email: r.customer.email }
          : null,
      disease:
        r.disease && r.disease.label
          ? {
              label: r.disease.label,
              crop: r.disease.crop,
              disease: r.disease.disease,
            }
          : null,
    })),
    meta: {
      page: params.page,
      perPage: params.perPage,
      total: totals[0]?.value ?? 0,
    },
  };
}

/** All filtered rows, no pagination — used by the CSV export. */
export async function listAllScansForExport(
  filters: ScanListFilters,
): Promise<ScanRow[]> {
  const { rows } = await listScans({
    page: 1,
    perPage: 5000,
    sort: { field: "createdAt", direction: "desc" },
    filters,
  });
  return rows;
}

export type ScanDetail = Scan & {
  customer: { id: string; name: string; email: string; phone: string | null } | null;
  disease: Disease | null;
};

export async function getScanById(id: string): Promise<ScanDetail | null> {
  const [head] = await db
    .select({
      scan: scans,
      customer: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      disease: diseases,
    })
    .from(scans)
    .leftJoin(user, eq(scans.userId, user.id))
    .leftJoin(diseases, eq(scans.predictedLabel, diseases.label))
    .where(eq(scans.id, id))
    .limit(1);

  if (!head) return null;
  return {
    ...head.scan,
    customer:
      head.customer && head.customer.id
        ? {
            id: head.customer.id,
            name: head.customer.name,
            email: head.customer.email,
            phone: head.customer.phone,
          }
        : null,
    disease: head.disease && head.disease.label ? head.disease : null,
  };
}

/**
 * Record a leaf-disease scan from the app. The infection title/detail/prevention
 * are frozen into `diagnosisSnapshot` (mirrors the diagnosis card the user saw);
 * `predictedLabel` defaults to the title and `confidence` to full certainty.
 */
export async function createScan(
  input: ScanCreateInput & { userId: string },
): Promise<Scan> {
  const label = input.predictedLabel?.trim() || input.infectionTitle;

  const snapshot: DiagnosisSnapshot = {
    label,
    crop: input.crop ?? "",
    disease: input.infectionTitle,
    healthy: input.healthy ?? false,
    description: input.infectionDetail,
    prevention: input.infectionPrevention,
    severity: input.severity ?? "medium",
  };

  const [row] = await db
    .insert(scans)
    .values({
      userId: input.userId,
      photoUrl: input.photoUrl,
      predictedLabel: label,
      confidence: input.confidence ?? 1,
      diagnosisSnapshot: snapshot,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
    })
    .returning();
  if (!row) throw new APIError("INTERNAL", "Failed to record scan.");
  return row;
}

export async function deleteScan(id: string): Promise<Scan> {
  const [before] = await db.select().from(scans).where(eq(scans.id, id)).limit(1);
  if (!before) throw new APIError("NOT_FOUND", "Scan not found.");
  const [deleted] = await db.delete(scans).where(eq(scans.id, id)).returning();
  if (!deleted) throw new APIError("INTERNAL", "Failed to delete scan.");
  return deleted;
}

export async function setScanFlag(
  id: string,
  flagged: boolean,
): Promise<{ before: Scan; after: Scan }> {
  const [before] = await db.select().from(scans).where(eq(scans.id, id)).limit(1);
  if (!before) throw new APIError("NOT_FOUND", "Scan not found.");

  const [after] = await db
    .update(scans)
    .set({ flagged })
    .where(eq(scans.id, id))
    .returning();
  if (!after) throw new APIError("INTERNAL", "Failed to flag scan.");
  return { before, after };
}

export async function updateScanNotes(
  id: string,
  patch: ScanUpdateInput,
): Promise<{ before: Scan; after: Scan }> {
  const [before] = await db.select().from(scans).where(eq(scans.id, id)).limit(1);
  if (!before) throw new APIError("NOT_FOUND", "Scan not found.");

  const next: Partial<typeof scans.$inferInsert> = {};
  if (patch.reviewerNotes !== undefined) {
    next.reviewerNotes = patch.reviewerNotes ? patch.reviewerNotes : null;
  }
  const [after] = await db
    .update(scans)
    .set(next)
    .where(eq(scans.id, id))
    .returning();
  if (!after) throw new APIError("INTERNAL", "Failed to update scan.");
  return { before, after };
}

/** Distinct predicted labels — feeds the label filter dropdown. */
export async function listScanLabels(): Promise<
  { label: string; count: number }[]
> {
  const rows = await db
    .select({
      label: scans.predictedLabel,
      count: count(),
    })
    .from(scans)
    .groupBy(scans.predictedLabel)
    .orderBy(desc(count()));
  return rows;
}

export async function listScansForUser(userId: string): Promise<ScanRow[]> {
  const { rows } = await listScans({
    page: 1,
    perPage: 100,
    sort: { field: "createdAt", direction: "desc" },
    filters: { userId },
  });
  return rows;
}

export function scanDiff(
  before: Scan,
  after: Scan,
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  const keys: (keyof Scan)[] = ["flagged", "reviewerNotes"];
  for (const key of keys) {
    if (before[key] !== after[key]) {
      diff[key] = { from: before[key], to: after[key] };
    }
  }
  return diff;
}

