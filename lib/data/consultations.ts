import "server-only";
import { and, asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { consultations, user, type Consultation } from "@/db/schema";
import { APIError, type ListMeta } from "@/lib/api/response";
import type {
  ConsultationCreateInput,
  ConsultationListFilters,
  ConsultationStatus,
} from "@/lib/schemas/consultation";

/**
 * Consultation requests data layer. Each row is tied to a requesting user via
 * `userId`; the admin list left-joins the account for a name/email to link to.
 * Pure DB ops — callers own auth + audit.
 */

export type ConsultationSortField =
  | "createdAt"
  | "visitDate"
  | "status"
  | "fullName";

export type ConsultationRow = Consultation & {
  accountName: string | null;
  accountEmail: string | null;
};

export type ConsultationListParams = {
  page: number;
  perPage: number;
  search?: string;
  sort: { field: ConsultationSortField; direction: "asc" | "desc" };
  filters: ConsultationListFilters;
};

const orderColumn = {
  createdAt: consultations.createdAt,
  visitDate: consultations.visitDate,
  status: consultations.status,
  fullName: consultations.fullName,
} as const satisfies Record<ConsultationSortField, unknown>;

function buildWhere(params: ConsultationListParams): SQL | undefined {
  const clauses: SQL[] = [];
  if (params.search) {
    const like = `%${params.search}%`;
    const match = or(
      ilike(consultations.fullName, like),
      ilike(consultations.phone, like),
      ilike(consultations.location, like),
    );
    if (match) clauses.push(match);
  }
  if (params.filters.status) clauses.push(eq(consultations.status, params.filters.status));
  if (params.filters.mainCrop) {
    clauses.push(eq(consultations.mainCrop, params.filters.mainCrop));
  }
  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return and(...clauses);
}

export async function listConsultations(
  params: ConsultationListParams,
): Promise<{ rows: ConsultationRow[]; meta: ListMeta }> {
  const where = buildWhere(params);
  const column = orderColumn[params.sort.field];
  const orderBy = params.sort.direction === "asc" ? asc(column) : desc(column);
  const offset = (params.page - 1) * params.perPage;

  const [rows, totals] = await Promise.all([
    db
      .select({
        c: consultations,
        accountName: user.name,
        accountEmail: user.email,
      })
      .from(consultations)
      .leftJoin(user, eq(consultations.userId, user.id))
      .where(where)
      .orderBy(orderBy, desc(consultations.createdAt))
      .limit(params.perPage)
      .offset(offset),
    db.select({ value: count() }).from(consultations).where(where),
  ]);

  return {
    rows: rows.map((r) => ({
      ...r.c,
      accountName: r.accountName,
      accountEmail: r.accountEmail,
    })),
    meta: {
      page: params.page,
      perPage: params.perPage,
      total: totals[0]?.value ?? 0,
    },
  };
}

export async function getConsultationById(id: string): Promise<Consultation | null> {
  const [row] = await db
    .select()
    .from(consultations)
    .where(eq(consultations.id, id))
    .limit(1);
  return row ?? null;
}

export async function createConsultation(
  input: ConsultationCreateInput & { userId: string },
): Promise<Consultation> {
  const [row] = await db
    .insert(consultations)
    .values({
      userId: input.userId,
      fullName: input.fullName,
      phone: input.phone,
      location: input.location,
      farmSize: input.farmSize,
      mainCrop: input.mainCrop,
      visitDate: input.visitDate,
      message: input.message ? input.message : null,
    })
    .returning();
  if (!row) throw new APIError("INTERNAL", "Failed to submit consultation.");
  return row;
}

export async function updateConsultationStatus(
  id: string,
  status: ConsultationStatus,
): Promise<{ before: Consultation; after: Consultation }> {
  const before = await getConsultationById(id);
  if (!before) throw new APIError("NOT_FOUND", "Consultation not found.");

  const [after] = await db
    .update(consultations)
    .set({ status, updatedAt: new Date() })
    .where(eq(consultations.id, id))
    .returning();
  if (!after) throw new APIError("INTERNAL", "Failed to update consultation.");
  return { before, after };
}

export async function deleteConsultation(id: string): Promise<Consultation> {
  const before = await getConsultationById(id);
  if (!before) throw new APIError("NOT_FOUND", "Consultation not found.");
  const [deleted] = await db
    .delete(consultations)
    .where(eq(consultations.id, id))
    .returning();
  if (!deleted) throw new APIError("INTERNAL", "Failed to delete consultation.");
  return deleted;
}

/** Count of unhandled (pending) requests — handy for a nav badge later. */
export async function countPendingConsultations(): Promise<number> {
  const [{ value }] = (await db
    .select({ value: count() })
    .from(consultations)
    .where(eq(consultations.status, "pending"))) as [{ value: number }];
  return value;
}
