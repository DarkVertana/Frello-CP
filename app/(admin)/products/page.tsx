import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { getSession } from "@/lib/session";
import { canManage, isAdmin } from "@/lib/rbac";
import {
  listCategoryOptions,
  listProducts,
  type ProductSortField,
} from "@/lib/data/products";
import { Pagination } from "../_components/pagination";
import { Filters } from "./_components/filters";
import { ProductsTable } from "./_components/products-table";
import { NewProductButton } from "./_components/new-product-button";

export const metadata: Metadata = { title: "Products" };
export const dynamic = "force-dynamic";

const SORTABLE: readonly ProductSortField[] = [
  "name",
  "price",
  "rating",
  "stock",
  "createdAt",
  "updatedAt",
];
const PER_PAGE = 25;

type SearchParams = {
  page?: string;
  search?: string;
  categoryId?: string;
  isActive?: string;
  lowStock?: string;
  sort?: string;
};

export default async function ProductsPage({
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
  const categoryId =
    sp.categoryId && /^[0-9a-f-]{36}$/i.test(sp.categoryId)
      ? sp.categoryId
      : undefined;
  const isActive =
    sp.isActive === "true" || sp.isActive === "false" ? sp.isActive : undefined;
  const lowStock = sp.lowStock === "true" ? "true" : undefined;

  const rawSort = sp.sort ?? "";
  const direction = rawSort.startsWith("-") ? "desc" : "asc";
  const sortField = rawSort.replace(/^-/, "") as ProductSortField;
  const sort = SORTABLE.includes(sortField)
    ? { field: sortField, direction: direction as "asc" | "desc" }
    : { field: "updatedAt" as const, direction: "desc" as const };

  const [{ rows, meta }, categories] = await Promise.all([
    listProducts({
      page,
      perPage: PER_PAGE,
      search,
      sort,
      filters: { categoryId, isActive: isActive as never, lowStock: lowStock as never },
    }),
    listCategoryOptions(),
  ]);

  const writable = canManage(session.user.role);

  function urlFor(overrides: Record<string, string | number | null>): string {
    const next = new URLSearchParams();
    const carry = {
      search,
      categoryId,
      isActive,
      lowStock,
      sort: sp.sort,
      page,
    } as Record<string, string | number | undefined>;
    for (const [key, value] of Object.entries({ ...carry, ...overrides })) {
      if (value === null || value === undefined || value === "") continue;
      next.set(key, String(value));
    }
    const query = next.toString();
    return query ? `/products?${query}` : "/products";
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Products
          </h1>
          <p className="text-sm text-muted">
            Catalog for the mobile shop. Bulk-activate from the toolbar that
            appears when rows are selected.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-tint-soft px-3 py-1 text-xs font-medium text-tint-dark">
            {meta.total} {meta.total === 1 ? "product" : "products"}
          </span>
          {writable ? (
            <>
              <a
                href="/api/v1/products/export.csv"
                className="inline-flex h-10 items-center gap-2 rounded-input border border-border bg-card px-3 text-sm font-medium text-foreground transition hover:bg-tint-soft"
              >
                <Download className="size-4" aria-hidden="true" />
                Export CSV
              </a>
              <NewProductButton categories={categories} />
            </>
          ) : null}
        </div>
      </header>

      <Filters
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        currentSort={sp.sort ?? null}
      />

      <ProductsTable
        rows={rows}
        sort={sort}
        canManage={writable}
        categories={categories}
      />

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
