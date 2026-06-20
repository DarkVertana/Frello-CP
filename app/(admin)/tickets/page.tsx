import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canManage, canSupport } from "@/lib/rbac";
import {
  listAgents,
  listAllTicketsForBoard,
  listTicketCategories,
  listTickets,
  type TicketSortField,
} from "@/lib/data/tickets";
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
import { KanbanBoard } from "./_components/kanban-board";
import { PriorityBadge, TicketStatusBadge } from "./_components/badges";
import { ViewToggle, type TicketViewMode } from "./_components/view-toggle";
import { formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Tickets" };
export const dynamic = "force-dynamic";

const SORTABLE: readonly TicketSortField[] = [
  "createdAt",
  "updatedAt",
  "priority",
  "status",
];
const PER_PAGE = 25;

type SearchParams = {
  view?: string;
  page?: string;
  search?: string;
  status?: string;
  priority?: string;
  category?: string;
  assigneeId?: string;
  unassigned?: string;
  sort?: string;
};

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session) return null;
  if (!canSupport(session.user.role)) redirect("/");

  const sp = await searchParams;
  const view: TicketViewMode = sp.view === "table" ? "table" : "kanban";

  const search = sp.search?.trim() || undefined;
  const status =
    sp.status === "open" || sp.status === "in_progress" || sp.status === "resolved"
      ? sp.status
      : undefined;
  const priority =
    sp.priority === "low" || sp.priority === "normal" || sp.priority === "high"
      ? sp.priority
      : undefined;
  const category = sp.category?.trim() || undefined;
  const assigneeId = sp.assigneeId?.trim() || undefined;
  const unassigned = sp.unassigned === "true" ? "true" : undefined;

  const filters = {
    status: status as never,
    priority: priority as never,
    category,
    assigneeId,
    unassigned: unassigned as never,
  };

  const [agents, categories] = await Promise.all([listAgents(), listTicketCategories()]);
  const writable = canManage(session.user.role);

  function urlFor(overrides: Record<string, string | number | null>): string {
    const next = new URLSearchParams();
    const carry = {
      view: sp.view,
      search,
      status: status as string | undefined,
      priority: priority as string | undefined,
      category,
      assigneeId,
      unassigned,
      sort: sp.sort,
      page: sp.page,
    } as Record<string, string | number | undefined>;
    for (const [key, value] of Object.entries({ ...carry, ...overrides })) {
      if (value === null || value === undefined || value === "") continue;
      next.set(key, String(value));
    }
    const query = next.toString();
    return query ? `/tickets?${query}` : "/tickets";
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Tickets
          </h1>
          <p className="text-sm text-muted">
            Support inbox. Drag cards between columns to change status, or open
            a ticket to reply.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle
            mode={view}
            hrefFor={(next) => urlFor({ view: next === "kanban" ? null : next })}
          />
        </div>
      </header>

      <Filters
        categories={categories}
        agents={agents}
        hideStatus={view === "kanban"}
        carryParams={{ view: sp.view, sort: sp.sort }}
      />

      {view === "kanban" ? (
        <KanbanView filters={filters} writable={writable} />
      ) : (
        <TableView
          sp={sp}
          filters={filters}
          urlFor={urlFor}
        />
      )}
    </div>
  );
}

async function KanbanView({
  filters,
  writable,
}: {
  filters: Parameters<typeof listAllTicketsForBoard>[0];
  writable: boolean;
}) {
  const rows = await listAllTicketsForBoard(filters);
  return <KanbanBoard tickets={rows} canManage={writable} />;
}

async function TableView({
  sp,
  filters,
  urlFor,
}: {
  sp: SearchParams;
  filters: Parameters<typeof listTickets>[0]["filters"];
  urlFor: (overrides: Record<string, string | number | null>) => string;
}) {
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const rawSort = sp.sort ?? "";
  const direction = rawSort.startsWith("-") ? "desc" : "asc";
  const sortField = rawSort.replace(/^-/, "") as TicketSortField;
  const sort = SORTABLE.includes(sortField)
    ? { field: sortField, direction: direction as "asc" | "desc" }
    : { field: "updatedAt" as const, direction: "desc" as const };

  const { rows, meta } = await listTickets({
    page,
    perPage: PER_PAGE,
    search: sp.search?.trim() || undefined,
    sort,
    filters,
  });

  const sortHrefFor = (sortValue: string | null) =>
    urlFor({ sort: sortValue, page: 1 });

  return (
    <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <THead>
            <TR>
              <TH>Subject</TH>
              <TH>Customer</TH>
              <SortHeader
                label="Status"
                field="status"
                currentField={sort.field}
                currentDirection={sort.direction}
                hrefFor={sortHrefFor}
              />
              <SortHeader
                label="Priority"
                field="priority"
                currentField={sort.field}
                currentDirection={sort.direction}
                hrefFor={sortHrefFor}
              />
              <TH>Assignee</TH>
              <TH>Replies</TH>
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
                colSpan={7}
                title="No matching tickets"
                hint="Adjust filters, or wait for the next mobile support submission."
              />
            ) : (
              rows.map((row) => (
                <TR key={row.id}>
                  <TD>
                    <Link
                      href={`/tickets/${row.id}`}
                      className="block font-medium text-foreground hover:text-tint-dark"
                    >
                      {row.subject}
                    </Link>
                    <span className="text-xs text-muted">{row.category}</span>
                  </TD>
                  <TD>
                    {row.customer ? (
                      <Link
                        href={`/users/${row.customer.id}`}
                        className="block text-sm text-foreground hover:text-tint-dark"
                      >
                        {row.customer.name}
                        <span className="block text-xs text-muted">
                          {row.customer.email}
                        </span>
                      </Link>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </TD>
                  <TD>
                    <TicketStatusBadge status={row.status} />
                  </TD>
                  <TD>
                    <PriorityBadge priority={row.priority} />
                  </TD>
                  <TD className="text-muted">
                    {row.assignee ? row.assignee.name : (
                      <span className="text-amber-700">Unassigned</span>
                    )}
                  </TD>
                  <TD className="text-muted">{row.replyCount}</TD>
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
  );
}
