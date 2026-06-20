import type { NextRequest } from "next/server";
import { APIError, ok, withErrorHandling } from "@/lib/api/response";
import { getCatalogProductBySlug } from "@/lib/data/products";

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * GET /api/v1/catalog/products/[slug] — PUBLIC (no auth).
 *
 * A single ACTIVE product (with its category). Inactive or missing → 404.
 */
export function GET(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { slug } = await context.params;
    const product = await getCatalogProductBySlug(slug);
    if (!product) throw new APIError("NOT_FOUND", "Product not found.");
    return ok(product);
  });
}
