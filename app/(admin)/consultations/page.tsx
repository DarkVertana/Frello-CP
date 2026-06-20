import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canManage, isAdmin } from "@/lib/rbac";
import {
  listConsultations,
  type ConsultationSortField,
} from "@/lib/data/consultations";
import { consultationListFiltersSchema } from "@/lib/schemas/consultation";
import { Pagination } from "../_components/pagination";
import { Filters } from "./_components/filters";
import { ConsultationsTable } from "./_components/consultations-table";

export const metadata: Metadata = { title: "Consultations" };
export const dynamic = "force-dynamic";

const SORTABLE: readonly ConsultationSortField[] = [
  "createdAt",
  "visitDate",
  "status",
  "fullName",
];
const PER_PAGE = 20;

type SearchParams = {
  page?: string;
  search?: string;
  status?: string;
  mainCrop?: string;
  sort?: string;
};

export default async function ConsultationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session) return null;
  if (!isAdmin(session.user.role)) redirect("/");

  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const search = sp.search?.trim() || undefined;

  const filters = consultationListFiltersSchema.parse({
    status: sp.status || undefined,
    mainCrop: sp.mainCrop || undefined,
  });

  const rawSort = sp.sort ?? "";
  const direction = rawSort.startsWith("-") ? "desc" : "asc";
  const sortField = rawSort.replace(/^-/, "") as ConsultationSortField;
  const sort = SORTABLE.includes(sortField)
    ? { field: sortField, direction: direction as "asc" | "desc" }
    : { field: "createdAt" as const, direction: "desc" as const };

  const { rows, meta } = await listConsultations({
    page,
    perPage: PER_PAGE,
    search,
    sort,
    filters,
  });

  const writable = canManage(session.user.role);

  function urlFor(overrides: Record<string, string | number | null>): string {
    const next = new URLSearchParams();
    const carry = {
      search,
      status: filters.status,
      mainCrop: filters.mainCrop,
      sort: sp.sort,
      page,
    } as Record<string, string | number | undefined>;
    for (const [key, value] of Object.entries({ ...carry, ...overrides })) {
      if (value === null || value === undefined || value === "") continue;
      next.set(key, String(value));
    }
    const query = next.toString();
    return query ? `/consultations?${query}` : "/consultations";
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Consultations
          </h1>
          <p className="text-sm text-muted">
            On-farm visit requests submitted by users from the app.
          </p>
        </div>
        <span className="rounded-full bg-tint-soft px-3 py-1 text-xs font-medium text-tint-dark">
          {meta.total} {meta.total === 1 ? "request" : "requests"}
        </span>
      </header>

      <Filters currentSort={sp.sort ?? null} />

      {rows.length === 0 ? (
        <div className="rounded-card border border-dashed border-border bg-card p-10 text-center">
          <h3 className="text-base font-semibold text-foreground">
            No consultation requests
          </h3>
          <p className="mt-1 text-sm text-muted">
            Requests submitted from the app will show up here.
          </p>
        </div>
      ) : (
        <ConsultationsTable rows={rows} canManage={writable} />
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
