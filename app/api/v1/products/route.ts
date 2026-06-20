import type { NextRequest } from "next/server";
import { created, list, withErrorHandling } from "@/lib/api/response";
import { parseListParams } from "@/lib/api/list-params";
import { requireRole, requireSession } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import {
  type ProductSortField,
  createProduct,
  listProducts,
} from "@/lib/data/products";
import { productCreateSchema, productListFiltersSchema } from "@/lib/schemas/product";

const SORTABLE = [
  "name",
  "price",
  "rating",
  "stock",
  "createdAt",
  "updatedAt",
] as const satisfies readonly ProductSortField[];

export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireSession();
    const params = parseListParams(new URL(request.url), {
      sortable: SORTABLE,
      defaultSort: { field: "updatedAt", direction: "desc" },
      filters: (raw) =>
        productListFiltersSchema.parse({
          categoryId: raw.categoryId || undefined,
          isActive:
            raw.isActive === "true" || raw.isActive === "false"
              ? raw.isActive
              : undefined,
          lowStock: raw.lowStock === "true" ? "true" : undefined,
        }),
    });
    const { rows, meta } = await listProducts(params);
    return list(rows, meta);
  });
}

export function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const input = productCreateSchema.parse(await request.json());
    const row = await createProduct(input);

    await recordAudit({
      actorId: user.id,
      action: "product.create",
      entityType: "product",
      entityId: row.id,
      diff: { after: { name: row.name, slug: row.slug, price: row.price } },
    });

    return created(row);
  });
}
