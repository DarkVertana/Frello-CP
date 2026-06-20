import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getSession } from "@/lib/session";
import { canManage, isAdmin } from "@/lib/rbac";
import {
  listDiseaseLabelsGroupedByCrop,
  listSupplements,
  type SupplementSortField,
} from "@/lib/data/supplements";
import {
  THead,
  TBody,
  TR,
  TH,
  TD,
  SortHeader,
  TableEmpty,
} from "../_components/table";
import { Pagination } from "../_components/pagination";
import { SearchBar } from "./_components/search-bar";
import { NewSupplementButton } from "./_components/new-supplement-button";
import { formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Supplements" };
export const dynamic = "force-dynamic";

const SORTABLE: readonly SupplementSortField[] = [
  "name",
  "brand",
  "createdAt",
  "updatedAt",
];
const PER_PAGE = 20;

type SearchParams = {
  page?: string;
  search?: string;
  sort?: string;
};

export default async function SupplementsPage({
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

  const rawSort = sp.sort ?? "";
  const direction = rawSort.startsWith("-") ? "desc" : "asc";
  const sortField = rawSort.replace(/^-/, "") as SupplementSortField;
  const sort = SORTABLE.includes(sortField)
    ? { field: sortField, direction: direction as "asc" | "desc" }
    : { field: "name" as const, direction: "asc" as const };

  const [{ rows, meta }, groupedLabels] = await Promise.all([
    listSupplements({ page, perPage: PER_PAGE, search, sort }),
    canManage(session.user.role)
      ? listDiseaseLabelsGroupedByCrop()
      : Promise.resolve({}),
  ]);

  const writable = canManage(session.user.role);

  function urlFor(overrides: Record<string, string | number | null>): string {
    const next = new URLSearchParams();
    const carry = { search, sort: sp.sort, page } as Record<
      string,
      string | number | undefined
    >;
    for (const [key, value] of Object.entries({ ...carry, ...overrides })) {
      if (value === null || value === undefined || value === "") continue;
      next.set(key, String(value));
    }
    const query = next.toString();
    return query ? `/supplements?${query}` : "/supplements";
  }

  const sortHrefFor = (sortValue: string | null) =>
    urlFor({ sort: sortValue, page: 1 });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Supplements
          </h1>
          <p className="text-sm text-muted">
            Products recommended on the diagnosis card. Linked to disease labels
            so the mobile app can show a single buy-now CTA.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-tint-soft px-3 py-1 text-xs font-medium text-tint-dark">
            {meta.total} {meta.total === 1 ? "supplement" : "supplements"}
          </span>
          {writable ? <NewSupplementButton groupedLabels={groupedLabels} /> : null}
        </div>
      </header>

      <SearchBar currentSort={sp.sort ?? null} />

      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <THead>
              <TR>
                <TH>Image</TH>
                <SortHeader
                  label="Name"
                  field="name"
                  currentField={sort.field}
                  currentDirection={sort.direction}
                  hrefFor={sortHrefFor}
                />
                <SortHeader
                  label="Brand"
                  field="brand"
                  currentField={sort.field}
                  currentDirection={sort.direction}
                  hrefFor={sortHrefFor}
                />
                <TH>Mapped diseases</TH>
                <TH>Buy</TH>
                <SortHeader
                  label="Updated"
                  field="updatedAt"
                  currentField={sort.field}
                  currentDirection={sort.direction}
                  hrefFor={sortHrefFor}
                />
              </TR>
            </THead>
            <TBody>
              {rows.length === 0 ? (
                <TableEmpty
                  colSpan={6}
                  title="No supplements yet"
                  hint={
                    writable
                      ? "Add the first one to recommend it from a diagnosis."
                      : "Ask a manager to add the first one."
                  }
                />
              ) : (
                rows.map((row) => (
                  <TR key={row.id}>
                    <TD>
                      <Link
                        href={`/supplements/${row.id}`}
                        aria-label={`Open ${row.name}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={row.imageUrl}
                          alt=""
                          loading="lazy"
                          className="size-12 rounded-input border border-border bg-background object-cover"
                        />
                      </Link>
                    </TD>
                    <TD>
                      <Link
                        href={`/supplements/${row.id}`}
                        className="font-medium text-foreground hover:text-tint-dark"
                      >
                        {row.name}
                      </Link>
                    </TD>
                    <TD className="text-muted">{row.brand ?? "—"}</TD>
                    <TD className="text-muted">
                      {row.mappedDiseaseLabels.length === 0
                        ? "—"
                        : `${row.mappedDiseaseLabels.length} ${
                            row.mappedDiseaseLabels.length === 1 ? "label" : "labels"
                          }`}
                    </TD>
                    <TD>
                      <a
                        href={row.buyLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-tint-dark hover:text-tint"
                      >
                        Open
                        <ExternalLink className="size-3" aria-hidden="true" />
                      </a>
                    </TD>
                    <TD className="text-muted">{formatRelative(row.updatedAt)}</TD>
                  </TR>
                ))
              )}
            </TBody>
          </table>
        </div>
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
