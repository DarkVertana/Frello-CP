import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  lt,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import { auditEntries, user, type AuditEntry } from "@/db/schema";
import type { ListMeta } from "@/lib/api/response";
import type { AuditListFilters } from "@/lib/schemas/audit";

export type AuditSortField = "at";

export type AuditListParams = {
  page: number;
  perPage: number;
  sort: { field: AuditSortField; direction: "asc" | "desc" };
  filters: AuditListFilters;
};

function buildWhere(params: AuditListParams): SQL | undefined {
  const clauses: SQL[] = [];
  if (params.filters.actorId) {
    clauses.push(eq(auditEntries.actorId, params.filters.actorId));
  }
  if (params.filters.entityType) {
    clauses.push(eq(auditEntries.entityType, params.filters.entityType));
  }
  if (params.filters.action) {
    clauses.push(ilike(auditEntries.action, `%${params.filters.action}%`));
  }
  if (params.filters.from) {
    clauses.push(gte(auditEntries.at, new Date(params.filters.from)));
  }
  if (params.filters.to) {
    const next = new Date(params.filters.to);
    next.setUTCDate(next.getUTCDate() + 1);
    clauses.push(lt(auditEntries.at, next));
  }
  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return and(...clauses);
}

export type AuditRow = AuditEntry & {
  actor: { id: string; name: string; email: string } | null;
};

export async function listAuditEntries(
  params: AuditListParams,
): Promise<{ rows: AuditRow[]; meta: ListMeta }> {
  const where = buildWhere(params);
  const orderBy =
    params.sort.direction === "asc" ? asc(auditEntries.at) : desc(auditEntries.at);
  const offset = (params.page - 1) * params.perPage;

  const [rows, totals] = await Promise.all([
    db
      .select({
        entry: auditEntries,
        actor: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
      .from(auditEntries)
      .leftJoin(user, eq(auditEntries.actorId, user.id))
      .where(where)
      .orderBy(orderBy, asc(auditEntries.id))
      .limit(params.perPage)
      .offset(offset),
    db.select({ value: count() }).from(auditEntries).where(where),
  ]);

  return {
    rows: rows.map((r) => ({
      ...r.entry,
      actor:
        r.actor && r.actor.id
          ? { id: r.actor.id, name: r.actor.name, email: r.actor.email }
          : null,
    })),
    meta: {
      page: params.page,
      perPage: params.perPage,
      total: totals[0]?.value ?? 0,
    },
  };
}

/** Distinct entity types seen in the log — feeds the filter dropdown. */
export async function listAuditEntityTypes(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ entityType: auditEntries.entityType })
    .from(auditEntries)
    .orderBy(asc(auditEntries.entityType));
  return rows.map((row) => row.entityType);
}

/** Distinct actor ids joined to their user names — for the actor dropdown. */
export async function listAuditActors(): Promise<
  { id: string; name: string; email: string; count: number }[]
> {
  const rows = await db
    .select({
      id: auditEntries.actorId,
      name: user.name,
      email: user.email,
      count: count(),
    })
    .from(auditEntries)
    .leftJoin(user, eq(auditEntries.actorId, user.id))
    .groupBy(auditEntries.actorId, user.name, user.email)
    .orderBy(desc(count()));

  return rows.map((row) => ({
    id: row.id,
    name: row.name ?? "Unknown",
    email: row.email ?? "",
    count: row.count,
  }));
}
