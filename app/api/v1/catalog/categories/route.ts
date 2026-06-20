import { list, withErrorHandling } from "@/lib/api/response";
import { listCatalogCategories } from "@/lib/data/categories";

/**
 * GET /api/v1/catalog/categories — PUBLIC (no auth).
 *
 * All shop categories in display order. Read-only; writes stay on the
 * admin-gated /api/v1/categories endpoints.
 */
export function GET() {
  return withErrorHandling(async () => {
    const rows = await listCatalogCategories();
    return list(rows, { page: 1, perPage: rows.length || 1, total: rows.length });
  });
}
