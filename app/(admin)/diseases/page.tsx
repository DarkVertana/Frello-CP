import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canManage, isAdmin } from "@/lib/rbac";
import {
  listCrops,
  listDiseases,
  listSupplementOptions,
  type DiseaseSortField,
} from "@/lib/data/diseases";
import { NewDiseaseButton } from "./_components/new-disease-button";
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
import { Filters } from "./_components/filters";
import { HealthyBadge, SeverityBadge } from "./_components/severity-badge";
import { formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Disease KB" };
export const dynamic = "force-dynamic";

const SORTABLE: readonly DiseaseSortField[] = ["label", "crop", "severity", "updatedAt"];
const PER_PAGE = 20;

type SearchParams = {
  page?: string;
  search?: string;
  crop?: string;
  healthy?: string;
  severity?: string;
  sort?: string;
};

export default async function DiseasesPage({
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
  const crop = sp.crop?.trim() || undefined;
  const healthy = sp.healthy === "true" || sp.healthy === "false" ? sp.healthy : undefined;
  const severity =
    sp.severity === "low" || sp.severity === "medium" || sp.severity === "high"
      ? sp.severity
      : undefined;

  const rawSort = sp.sort ?? "";
  const direction = rawSort.startsWith("-") ? "desc" : "asc";
  const sortField = rawSort.replace(/^-/, "") as DiseaseSortField;
  const sort = SORTABLE.includes(sortField)
    ? { field: sortField, direction: direction as "asc" | "desc" }
    : { field: "label" as const, direction: "asc" as const };

  const writable = canManage(session.user.role);

  const [{ rows, meta }, crops, supplements] = await Promise.all([
    listDiseases({
      page,
      perPage: PER_PAGE,
      search,
      sort,
      filters: { crop, healthy: healthy as never, severity: severity as never },
    }),
    listCrops(),
    writable ? listSupplementOptions() : Promise.resolve([]),
  ]);

  function urlFor(overrides: Record<string, string | number | null>): string {
    const next = new URLSearchParams();
    const carry = {
      search,
      crop,
      healthy,
      severity,
      sort: sp.sort,
      page,
    } as Record<string, string | number | undefined>;
    for (const [key, value] of Object.entries({ ...carry, ...overrides })) {
      if (value === null || value === undefined || value === "") continue;
      next.set(key, String(value));
    }
    const query = next.toString();
    return query ? `/diseases?${query}` : "/diseases";
  }

  const sortHrefFor = (sortValue: string | null) =>
    urlFor({ sort: sortValue, page: 1 });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Disease KB
          </h1>
          <p className="text-sm text-muted">
            Entries here power the mobile app&apos;s diagnosis screen. Labels
            must match the on-device ML classifier output exactly.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-tint-soft px-3 py-1 text-xs font-medium text-tint-dark">
            {meta.total} {meta.total === 1 ? "entry" : "entries"}
          </span>
          {writable ? <NewDiseaseButton supplements={supplements} /> : null}
        </div>
      </header>

      <Filters crops={crops} currentSort={sp.sort ?? null} />

      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <THead>
              <TR>
                <SortHeader
                  label="Label"
                  field="label"
                  currentField={sort.field}
                  currentDirection={sort.direction}
                  hrefFor={sortHrefFor}
                />
                <SortHeader
                  label="Crop"
                  field="crop"
                  currentField={sort.field}
                  currentDirection={sort.direction}
                  hrefFor={sortHrefFor}
                />
                <TH>Condition</TH>
                <TH>Health</TH>
                <SortHeader
                  label="Severity"
                  field="severity"
                  currentField={sort.field}
                  currentDirection={sort.direction}
                  hrefFor={sortHrefFor}
                />
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
                  title="No matching diseases"
                  hint="Adjust filters or seed the full PlantVillage set via the mobile-app export."
                />
              ) : (
                rows.map((row) => (
                  <TR key={row.label}>
                    <TD>
                      <Link
                        href={`/diseases/${encodeURIComponent(row.label)}`}
                        className="font-medium text-foreground hover:text-tint-dark"
                      >
                        <code className="text-xs">{row.label}</code>
                      </Link>
                    </TD>
                    <TD className="text-muted">{row.crop}</TD>
                    <TD className="text-foreground">{row.disease}</TD>
                    <TD>
                      <HealthyBadge healthy={row.healthy} />
                    </TD>
                    <TD>
                      <SeverityBadge severity={row.severity} />
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
