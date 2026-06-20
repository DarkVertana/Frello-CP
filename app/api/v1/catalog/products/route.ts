import type { NextRequest } from "next/server";
import { list, withErrorHandling } from "@/lib/api/response";
import { parseListParams } from "@/lib/api/list-params";
import { getCategoryBySlug } from "@/lib/data/categories";
import { listProducts, type ProductSortField } from "@/lib/data/products";

const SORTABLE = [
  "name",
  "price",
  "rating",
  "createdAt",
] as const satisfies readonly ProductSortField[];

/**
 * GET /api/v1/catalog/products — PUBLIC (no auth).
 *
 * Query: page, perPage, search, sort, category=<slug>
 * Only ACTIVE products are returned. An unknown category slug yields an empty
 * page (total 0) rather than a 404, so clients can render "no items" cleanly.
 */
export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const url = new URL(request.url);
    const base = parseListParams(url, {
      sortable: SORTABLE,
      defaultSort: { field: "createdAt", direction: "desc" },
    });

    let categoryId: string | undefined;
    const categorySlug = url.searchParams.get("category")?.trim();
    if (categorySlug) {
      const category = await getCategoryBySlug(categorySlug);
      if (!category) {
        return list([], { page: base.page, perPage: base.perPage, total: 0 });
      }
      categoryId = category.id;
    }

    const { rows, meta } = await listProducts({
      page: base.page,
      perPage: base.perPage,
      search: base.search,
      sort: base.sort,
      filters: { categoryId, isActive: "true" },
    });
    return list(rows, meta);
  });
}
