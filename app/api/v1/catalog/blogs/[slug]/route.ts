import type { NextRequest } from "next/server";
import { APIError, ok, withErrorHandling } from "@/lib/api/response";
import { getPublishedBlogBySlug } from "@/lib/data/blogs";

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * GET /api/v1/catalog/blogs/[slug] — PUBLIC (no auth).
 *
 * A single published post (full HTML content). Drafts/missing → 404.
 */
export function GET(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { slug } = await context.params;
    const blog = await getPublishedBlogBySlug(slug);
    if (!blog) throw new APIError("NOT_FOUND", "Blog not found.");
    return ok(blog);
  });
}
