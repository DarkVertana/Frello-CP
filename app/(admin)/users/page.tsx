import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canManage, isAdmin, isSuperAdmin as isSuperAdminFn } from "@/lib/rbac";
import { listUsers, type UserSortField } from "@/lib/data/users";
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
import { NewUserButton } from "./_components/new-user-button";
import { ClickableRow } from "./_components/clickable-row";
import { RoleBadge } from "./_components/role-badge";
import { StatusBadge } from "./_components/status-badge";
import { UserRowActions } from "./_components/user-row-actions";
import { formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Users" };

export const dynamic = "force-dynamic";

const SORTABLE: readonly UserSortField[] = [
  "name",
  "email",
  "role",
  "status",
  "createdAt",
  "lastSeenAt",
];

const PER_PAGE = 20;

type SearchParams = {
  page?: string;
  search?: string;
  role?: string;
  status?: string;
  sort?: string;
};

export default async function UsersPage({
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
  const role = sp.role && /^[a-z_]+$/.test(sp.role) ? sp.role : undefined;
  const status =
    sp.status === "active" || sp.status === "banned" ? sp.status : undefined;

  const rawSort = sp.sort ?? "";
  const direction = rawSort.startsWith("-") ? "desc" : "asc";
  const sortField = rawSort.replace(/^-/, "") as UserSortField;
  const sort = SORTABLE.includes(sortField)
    ? { field: sortField, direction: direction as "asc" | "desc" }
    : { field: "createdAt" as const, direction: "desc" as const };

  const { rows, meta } = await listUsers({
    page,
    perPage: PER_PAGE,
    search,
    sort,
    filters: { role: role as never, status: status as never },
  });

  /**
   * Build a /users URL preserving every search param except those overridden.
   * Pass `null` to drop a param.
   */
  function urlFor(overrides: Record<string, string | number | null>): string {
    const next = new URLSearchParams();
    const carry = { search, role, status, sort: sp.sort, page } as Record<
      string,
      string | number | undefined
    >;
    for (const [key, value] of Object.entries({ ...carry, ...overrides })) {
      if (value === null || value === undefined || value === "") continue;
      next.set(key, String(value));
    }
    const query = next.toString();
    return query ? `/users?${query}` : "/users";
  }

  const sortHrefFor = (sortValue: string | null) =>
    urlFor({ sort: sortValue, page: 1 });

  const writable = canManage(session.user.role);
  const supreme = isSuperAdminFn(session.user.role);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Users
          </h1>
          <p className="text-sm text-muted">
            Staff and customers — change roles, ban, or send sign-in links.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-tint-soft px-3 py-1 text-xs font-medium text-tint-dark">
            {meta.total} {meta.total === 1 ? "user" : "users"}
          </span>
          {writable ? <NewUserButton /> : null}
        </div>
      </header>

      <Filters currentSort={sp.sort ?? null} />

      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <THead>
              <TR>
                <SortHeader
                  label="Name"
                  field="name"
                  currentField={sort.field}
                  currentDirection={sort.direction}
                  hrefFor={sortHrefFor}
                />
                <SortHeader
                  label="Email"
                  field="email"
                  currentField={sort.field}
                  currentDirection={sort.direction}
                  hrefFor={sortHrefFor}
                />
                <SortHeader
                  label="Role"
                  field="role"
                  currentField={sort.field}
                  currentDirection={sort.direction}
                  hrefFor={sortHrefFor}
                />
                <SortHeader
                  label="Status"
                  field="status"
                  currentField={sort.field}
                  currentDirection={sort.direction}
                  hrefFor={sortHrefFor}
                />
                <SortHeader
                  label="Last seen"
                  field="lastSeenAt"
                  currentField={sort.field}
                  currentDirection={sort.direction}
                  hrefFor={sortHrefFor}
                />
                <SortHeader
                  label="Joined"
                  field="createdAt"
                  currentField={sort.field}
                  currentDirection={sort.direction}
                  hrefFor={sortHrefFor}
                />
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {rows.length === 0 ? (
                <TableEmpty
                  colSpan={7}
                  title="No users match those filters"
                  hint="Adjust the search or clear filters to see everyone."
                />
              ) : (
                rows.map((row) => (
                  <ClickableRow key={row.id} href={`/users/${row.id}`}>
                    <TD>
                      <Link
                        href={`/users/${row.id}`}
                        className="flex items-center gap-3 hover:text-tint-dark"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-tint-soft text-xs font-semibold text-tint-dark">
                          {initials(row.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium text-foreground">
                            {row.name}
                          </span>
                          {row.phone ? (
                            <span className="block text-xs text-muted">{row.phone}</span>
                          ) : null}
                        </span>
                      </Link>
                    </TD>
                    <TD className="text-muted">{row.email}</TD>
                    <TD>
                      <RoleBadge role={row.role} />
                    </TD>
                    <TD>
                      <StatusBadge status={row.status} />
                    </TD>
                    <TD className="text-muted">{formatRelative(row.lastSeenAt)}</TD>
                    <TD className="text-muted">{formatRelative(row.createdAt)}</TD>
                    <TD>
                      <UserRowActions
                        user={row}
                        currentUserId={session.user.id}
                        canManage={writable}
                        isSuperAdmin={supreme}
                      />
                    </TD>
                  </ClickableRow>
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

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
