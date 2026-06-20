import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { getSession } from "@/lib/session";
import { canSupport } from "@/lib/rbac";
import {
  listScans,
  listScanLabels,
  type ScanSortField,
} from "@/lib/data/scans";
import { Pagination } from "../_components/pagination";
import { Filters } from "./_components/filters";
import { ScanCard } from "./_components/scan-card";

export const metadata: Metadata = { title: "Scans" };
export const dynamic = "force-dynamic";

const SORTABLE: readonly ScanSortField[] = [
  "createdAt",
  "confidence",
  "predictedLabel",
];
const PER_PAGE = 24;

type SearchParams = {
  page?: string;
  label?: string;
  confidence?: string;
  flagged?: string;
  userId?: string;
  from?: string;
  to?: string;
  sort?: string;
};

export default async function ScansPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session) return null;
  if (!canSupport(session.user.role)) redirect("/");

  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const label = sp.label?.trim() || undefined;
  const confidence =
    sp.confidence === "high" ||
    sp.confidence === "medium" ||
    sp.confidence === "low"
      ? sp.confidence
      : undefined;
  const flagged =
    sp.flagged === "true" || sp.flagged === "false" ? sp.flagged : undefined;
  const userId = sp.userId?.trim() || undefined;
  const from = sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : undefined;
  const to = sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : undefined;

  const rawSort = sp.sort ?? "";
  const direction = rawSort.startsWith("-") ? "desc" : "asc";
  const sortField = rawSort.replace(/^-/, "") as ScanSortField;
  const sort = SORTABLE.includes(sortField)
    ? { field: sortField, direction: direction as "asc" | "desc" }
    : { field: "createdAt" as const, direction: "desc" as const };

  const filters = {
    label,
    confidence: confidence as never,
    flagged: flagged as never,
    userId,
    from,
    to,
  };

  const [{ rows, meta }, labels] = await Promise.all([
    listScans({ page, perPage: PER_PAGE, sort, filters }),
    listScanLabels(),
  ]);

  function urlFor(overrides: Record<string, string | number | null>): string {
    const next = new URLSearchParams();
    const carry = {
      label,
      confidence,
      flagged,
      userId,
      from,
      to,
      sort: sp.sort,
      page,
    } as Record<string, string | number | undefined>;
    for (const [key, value] of Object.entries({ ...carry, ...overrides })) {
      if (value === null || value === undefined || value === "") continue;
      next.set(key, String(value));
    }
    const query = next.toString();
    return query ? `/scans?${query}` : "/scans";
  }

  /** Build the export CSV URL preserving the active filter set. */
  function exportHref(): string {
    const next = new URLSearchParams();
    if (label) next.set("filter[label]", label);
    if (confidence) next.set("filter[confidence]", confidence);
    if (flagged) next.set("filter[flagged]", flagged);
    if (userId) next.set("filter[userId]", userId);
    if (from) next.set("filter[from]", from);
    if (to) next.set("filter[to]", to);
    const query = next.toString();
    return query
      ? `/api/v1/scans/export.csv?${query}`
      : "/api/v1/scans/export.csv";
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Scans
          </h1>
          <p className="text-sm text-muted">
            On-device plant-diagnosis submissions. Flag misclassifications and
            export to feed the retrain pipeline.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-tint-soft px-3 py-1 text-xs font-medium text-tint-dark">
            {meta.total} {meta.total === 1 ? "scan" : "scans"}
          </span>
          <a
            href={exportHref()}
            className="inline-flex h-10 items-center gap-2 rounded-input border border-border bg-card px-3 text-sm font-medium text-foreground transition hover:bg-tint-soft"
          >
            <Download className="size-4" aria-hidden="true" />
            Export CSV
          </a>
        </div>
      </header>

      <Filters labels={labels} />

      {rows.length === 0 ? (
        <div className="rounded-card border border-dashed border-border bg-card p-10 text-center">
          <h3 className="text-base font-semibold text-foreground">
            No matching scans
          </h3>
          <p className="mt-1 text-sm text-muted">
            Adjust filters, or wait for the mobile app to submit new ones.
          </p>
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((row) => (
            <ScanCard key={row.id} scan={row} />
          ))}
        </section>
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
