import type { NextRequest } from "next/server";
import { list, withErrorHandling } from "@/lib/api/response";
import { parseListParams } from "@/lib/api/list-params";
import { listPublishedBlogs } from "@/lib/data/blogs";

/**
 * GET /api/v1/catalog/blogs — PUBLIC (no auth).
 *
 * Published posts, newest first. Query: page, perPage, search.
 */
export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const base = parseListParams(new URL(request.url), {
      sortable: ["publishedAt"] as const,
      defaultSort: { field: "publishedAt", direction: "desc" },
    });
    const { rows, meta } = await listPublishedBlogs({
      page: base.page,
      perPage: base.perPage,
      search: base.search,
    });
    return list(rows, meta);
  });
}
