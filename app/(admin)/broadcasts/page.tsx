import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canManage, isAdmin } from "@/lib/rbac";
import { listBroadcasts, type BroadcastSortField } from "@/lib/data/broadcasts";
import { NewBroadcastButton } from "./_components/new-broadcast-button";
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
import { BroadcastStatusBadge } from "./_components/status-badge";
import { formatRelative } from "@/lib/format";
import type { BroadcastStatusValue } from "@/lib/broadcasts/transitions";

export const metadata: Metadata = { title: "Broadcasts" };
export const dynamic = "force-dynamic";

const SORTABLE: readonly BroadcastSortField[] = [
  "createdAt",
  "scheduleAt",
  "sentAt",
  "status",
];
const PER_PAGE = 25;

type SearchParams = {
  page?: string;
  search?: string;
  status?: string;
  sort?: string;
};

export default async function BroadcastsPage({
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
  const status: BroadcastStatusValue | undefined =
    sp.status === "draft" ||
    sp.status === "scheduled" ||
    sp.status === "sent" ||
    sp.status === "cancelled"
      ? sp.status
      : undefined;

  const rawSort = sp.sort ?? "";
  const direction = rawSort.startsWith("-") ? "desc" : "asc";
  const sortField = rawSort.replace(/^-/, "") as BroadcastSortField;
  const sort = SORTABLE.includes(sortField)
    ? { field: sortField, direction: direction as "asc" | "desc" }
    : { field: "createdAt" as const, direction: "desc" as const };

  const { rows, meta } = await listBroadcasts({
    page,
    perPage: PER_PAGE,
    search,
    sort,
    filters: { status },
  });

  const writable = canManage(session.user.role);

  function urlFor(overrides: Record<string, string | number | null>): string {
    const next = new URLSearchParams();
    const carry = { search, status, sort: sp.sort, page } as Record<
      string,
      string | number | undefined
    >;
    for (const [key, value] of Object.entries({ ...carry, ...overrides })) {
      if (value === null || value === undefined || value === "") continue;
      next.set(key, String(value));
    }
    const query = next.toString();
    return query ? `/broadcasts?${query}` : "/broadcasts";
  }

  const sortHrefFor = (sortValue: string | null) =>
    urlFor({ sort: sortValue, page: 1 });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Broadcasts
          </h1>
          <p className="text-sm text-muted">
            Push messages to mobile users. Compose as a draft, then send or
            schedule from the detail page.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-tint-soft px-3 py-1 text-xs font-medium text-tint-dark">
            {meta.total} {meta.total === 1 ? "broadcast" : "broadcasts"}
          </span>
          {writable ? <NewBroadcastButton /> : null}
        </div>
      </header>

      <Filters currentSort={sp.sort ?? null} />

      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <THead>
              <TR>
                <TH>Title</TH>
                <TH>Segment</TH>
                <SortHeader
                  label="Status"
                  field="status"
                  currentField={sort.field}
                  currentDirection={sort.direction}
                  hrefFor={sortHrefFor}
                />
                <TH>Recipients</TH>
                <SortHeader
                  label="Scheduled"
                  field="scheduleAt"
                  currentField={sort.field}
                  currentDirection={sort.direction}
                  hrefFor={sortHrefFor}
                />
                <SortHeader
                  label="Sent"
                  field="sentAt"
                  currentField={sort.field}
                  currentDirection={sort.direction}
                  hrefFor={sortHrefFor}
                />
                <SortHeader
                  label="Created"
                  field="createdAt"
                  currentField={sort.field}
                  currentDirection={sort.direction}
                  hrefFor={sortHrefFor}
                />
              </TR>
            </THead>
            <TBody>
              {rows.length === 0 ? (
                <TableEmpty
                  colSpan={7}
                  title="No broadcasts yet"
                  hint={
                    writable
                      ? "Compose the first one to push an update to mobile users."
                      : "Ask an admin to compose the first one."
                  }
                />
              ) : (
                rows.map((row) => (
                  <TR key={row.id}>
                    <TD>
                      <Link
                        href={`/broadcasts/${row.id}`}
                        className="block font-medium text-foreground hover:text-tint-dark"
                      >
                        {row.title}
                      </Link>
                      <p className="truncate text-xs text-muted">{row.body}</p>
                    </TD>
                    <TD className="text-muted">
                      <span className="capitalize">
                        {row.segment.replace("_", " ")}
                      </span>
                    </TD>
                    <TD>
                      <BroadcastStatusBadge status={row.status} />
                    </TD>
                    <TD className="text-muted tabular-nums">
                      {row.stats.sent}
                    </TD>
                    <TD className="text-muted">
                      {row.scheduleAt ? formatRelative(row.scheduleAt) : "—"}
                    </TD>
                    <TD className="text-muted">
                      {row.sentAt ? formatRelative(row.sentAt) : "—"}
                    </TD>
                    <TD className="text-muted">{formatRelative(row.createdAt)}</TD>
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
