import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isAdmin } from "@/lib/rbac";
import {
  listAuditActors,
  listAuditEntityTypes,
  listAuditEntries,
} from "@/lib/data/audit";
import { Pagination } from "../_components/pagination";
import { Filters } from "./_components/filters";
import { AuditEntryRow } from "./_components/audit-entry-row";

export const metadata: Metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

const PER_PAGE = 30;

type SearchParams = {
  page?: string;
  actorId?: string;
  entityType?: string;
  action?: string;
  from?: string;
  to?: string;
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session) return null;
  if (!isAdmin(session.user.role)) redirect("/");

  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const actorId = sp.actorId?.trim() || undefined;
  const entityType = sp.entityType?.trim() || undefined;
  const action = sp.action?.trim() || undefined;
  const from = sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : undefined;
  const to = sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : undefined;

  const filters = { actorId, entityType, action, from, to };

  const [{ rows, meta }, actors, entityTypes] = await Promise.all([
    listAuditEntries({
      page,
      perPage: PER_PAGE,
      sort: { field: "at", direction: "desc" },
      filters,
    }),
    listAuditActors(),
    listAuditEntityTypes(),
  ]);

  function urlFor(overrides: Record<string, string | number | null>): string {
    const next = new URLSearchParams();
    const carry = {
      actorId,
      entityType,
      action,
      from,
      to,
      page,
    } as Record<string, string | number | undefined>;
    for (const [key, value] of Object.entries({ ...carry, ...overrides })) {
      if (value === null || value === undefined || value === "") continue;
      next.set(key, String(value));
    }
    const query = next.toString();
    return query ? `/audit?${query}` : "/audit";
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Audit log
          </h1>
          <p className="text-sm text-muted">
            Every mutation across the admin shell. Most recent first. Read-only —
            entries can&apos;t be edited or deleted from here.
          </p>
        </div>
        <span className="rounded-full bg-tint-soft px-3 py-1 text-xs font-medium text-tint-dark">
          {meta.total} {meta.total === 1 ? "entry" : "entries"}
        </span>
      </header>

      <Filters actors={actors} entityTypes={entityTypes} />

      {rows.length === 0 ? (
        <div className="rounded-card border border-dashed border-border bg-card p-10 text-center">
          <h3 className="text-base font-semibold text-foreground">
            No entries match those filters
          </h3>
          <p className="mt-1 text-sm text-muted">
            Adjust filters or clear them to see the most recent activity.
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {rows.map((entry) => (
            <AuditEntryRow key={entry.id} entry={entry} />
          ))}
        </ol>
      )}

      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        <Pagination
          page={meta.page}
          perPage={meta.perPage}
          total={meta.total}
          hrefFor={(p) => urlFor({ page: p })}
        />
      </div>
    </div>
  );
}
