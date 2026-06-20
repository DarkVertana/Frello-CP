import type { NextRequest } from "next/server";
import { list, withErrorHandling } from "@/lib/api/response";
import { searchProducts } from "@/lib/data/products";

/**
 * GET /api/v1/catalog/search?q=<query>&limit=<n> — PUBLIC (no auth).
 *
 * Searches ACTIVE products by name, slug, and description. Returns up to
 * `limit` results (default 20, max 50), ranked by rating. An empty/missing
 * query yields an empty list (total 0) so the client can clear results cleanly.
 */
export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10) || 20;

    const rows = q ? await searchProducts(q, limit) : [];
    return list(rows, { page: 1, perPage: rows.length, total: rows.length });
  });
}
