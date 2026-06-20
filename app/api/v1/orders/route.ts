import type { NextRequest } from "next/server";
import { list, withErrorHandling } from "@/lib/api/response";
import { parseListParams } from "@/lib/api/list-params";
import { requireRole } from "@/lib/api/auth";
import { isAdmin } from "@/lib/rbac";
import { listOrders, type OrderSortField } from "@/lib/data/orders";
import { orderListFiltersSchema } from "@/lib/schemas/order";

const SORTABLE = [
  "createdAt",
  "updatedAt",
  "total",
  "status",
] as const satisfies readonly OrderSortField[];

/**
 * GET /api/v1/orders — staff-only.
 *
 * Query: page, perPage, search (order-id prefix), sort,
 *        filter[status], filter[userId], filter[paymentKind],
 *        filter[from] (YYYY-MM-DD), filter[to] (YYYY-MM-DD)
 */
export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireRole(isAdmin);
    const params = parseListParams(new URL(request.url), {
      sortable: SORTABLE,
      defaultSort: { field: "createdAt", direction: "desc" },
      filters: (raw) =>
        orderListFiltersSchema.parse({
          status: raw.status || undefined,
          userId: raw.userId || undefined,
          paymentKind:
            raw.paymentKind === "card" || raw.paymentKind === "upi"
              ? raw.paymentKind
              : undefined,
          from: raw.from || undefined,
          to: raw.to || undefined,
        }),
    });
    const { rows, meta } = await listOrders(params);
    return list(rows, meta);
  });
}
