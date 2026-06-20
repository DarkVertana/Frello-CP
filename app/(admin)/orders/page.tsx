import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isAdmin } from "@/lib/rbac";
import { listOrders, type OrderSortField } from "@/lib/data/orders";
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
import { OrderStatusBadge } from "./_components/order-status-badge";
import { formatAmount, formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

const SORTABLE: readonly OrderSortField[] = [
  "createdAt",
  "updatedAt",
  "total",
  "status",
];
const PER_PAGE = 25;

type SearchParams = {
  page?: string;
  search?: string;
  status?: string;
  paymentKind?: string;
  userId?: string;
  from?: string;
  to?: string;
  sort?: string;
};

export default async function OrdersPage({
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
  const status = sp.status && /^[a-z_]+$/.test(sp.status) ? sp.status : undefined;
  const paymentKind =
    sp.paymentKind === "card" || sp.paymentKind === "upi"
      ? sp.paymentKind
      : undefined;
  const userId = sp.userId?.trim() || undefined;
  const from = sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : undefined;
  const to = sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : undefined;

  const rawSort = sp.sort ?? "";
  const direction = rawSort.startsWith("-") ? "desc" : "asc";
  const sortField = rawSort.replace(/^-/, "") as OrderSortField;
  const sort = SORTABLE.includes(sortField)
    ? { field: sortField, direction: direction as "asc" | "desc" }
    : { field: "createdAt" as const, direction: "desc" as const };

  const { rows, meta } = await listOrders({
    page,
    perPage: PER_PAGE,
    search,
    sort,
    filters: {
      status: status as never,
      paymentKind: paymentKind as never,
      userId,
      from,
      to,
    },
  });

  function urlFor(overrides: Record<string, string | number | null>): string {
    const next = new URLSearchParams();
    const carry = {
      search,
      status,
      paymentKind,
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
    return query ? `/orders?${query}` : "/orders";
  }

  const sortHrefFor = (sortValue: string | null) =>
    urlFor({ sort: sortValue, page: 1 });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Orders
          </h1>
          <p className="text-sm text-muted">
            Every order placed from the mobile app. Click a row to advance
            status, set tracking, or refund.
          </p>
        </div>
        <span className="rounded-full bg-tint-soft px-3 py-1 text-xs font-medium text-tint-dark">
          {meta.total} {meta.total === 1 ? "order" : "orders"}
        </span>
      </header>

      <Filters currentSort={sp.sort ?? null} />

      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <THead>
              <TR>
                <TH>Order</TH>
                <TH>Customer</TH>
                <SortHeader
                  label="Status"
                  field="status"
                  currentField={sort.field}
                  currentDirection={sort.direction}
                  hrefFor={sortHrefFor}
                />
                <TH>Items</TH>
                <SortHeader
                  label="Total"
                  field="total"
                  currentField={sort.field}
                  currentDirection={sort.direction}
                  hrefFor={sortHrefFor}
                />
                <SortHeader
                  label="Placed"
                  field="createdAt"
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
                  colSpan={7}
                  title="No matching orders"
                  hint="Adjust filters, or run a checkout in the mobile app to seed one."
                />
              ) : (
                rows.map((row) => (
                  <TR key={row.id}>
                    <TD>
                      <Link
                        href={`/orders/${row.id}`}
                        className="font-medium text-foreground hover:text-tint-dark"
                      >
                        <code className="text-xs">{row.id.slice(0, 8)}</code>
                      </Link>
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
                      <OrderStatusBadge status={row.status} />
                    </TD>
                    <TD className="text-muted">{row.itemCount}</TD>
                    <TD className="font-medium text-foreground tabular-nums">
                      {formatAmount(row.total)}
                    </TD>
                    <TD className="text-muted">{formatRelative(row.createdAt)}</TD>
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
