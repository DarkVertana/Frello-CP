import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { listAllProductsForExport } from "@/lib/data/products";

/**
 * GET /api/v1/products/export.csv
 *
 * Streams a CSV the admin can re-import after editing. Columns mirror what
 * the create/update endpoints accept so a round-trip is lossless.
 *
 *   slug,name,categorySlug,price,originalPrice,rating,reviewsCount,stock,
 *   isActive,imageUrl,gallery,accent,description
 *
 * `price`/`originalPrice` are exported as paise (integer), matching how
 * they're stored. `gallery` is a `|`-separated list (commas would clash with
 * the CSV separator and JSON quoting gets ugly fast).
 */
export function GET() {
  return withErrorHandling(async () => {
    await requireRole(canManage);
    const rows = await listAllProductsForExport();

    const header = [
      "slug",
      "name",
      "categorySlug",
      "price",
      "originalPrice",
      "rating",
      "reviewsCount",
      "stock",
      "isActive",
      "imageUrl",
      "gallery",
      "accent",
      "description",
    ];

    const lines = [header.join(",")];
    for (const row of rows) {
      lines.push(
        [
          csvField(row.slug),
          csvField(row.name),
          csvField(row.category?.slug ?? ""),
          String(row.price),
          row.originalPrice === null ? "" : String(row.originalPrice),
          String(row.rating),
          String(row.reviewsCount),
          String(row.stock),
          row.isActive ? "true" : "false",
          csvField(row.imageUrl),
          csvField(row.gallery.join("|")),
          csvField(row.accent),
          csvField(row.description),
        ].join(","),
      );
    }

    const filename = `plantplus-products-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(lines.join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  });
}

/** RFC 4180 minimal escaping — quote if the field contains `,`, `"`, or newlines. */
function csvField(value: string): string {
  if (!/[",\n\r]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}
