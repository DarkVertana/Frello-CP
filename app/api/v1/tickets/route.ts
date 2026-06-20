import type { NextRequest } from "next/server";
import { list, withErrorHandling } from "@/lib/api/response";
import { parseListParams } from "@/lib/api/list-params";
import { requireRole } from "@/lib/api/auth";
import { canSupport } from "@/lib/rbac";
import { listTickets, type TicketSortField } from "@/lib/data/tickets";
import { ticketListFiltersSchema } from "@/lib/schemas/ticket";

const SORTABLE = [
  "createdAt",
  "updatedAt",
  "priority",
  "status",
] as const satisfies readonly TicketSortField[];

/**
 * GET /api/v1/tickets — staff with support privileges and above.
 *
 * Mobile customers fetch their own tickets via a separate endpoint
 * (`/api/v1/tickets/mine` — not built yet); this endpoint is for staff.
 */
export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireRole(canSupport);
    const params = parseListParams(new URL(request.url), {
      sortable: SORTABLE,
      defaultSort: { field: "updatedAt", direction: "desc" },
      filters: (raw) =>
        ticketListFiltersSchema.parse({
          status: raw.status || undefined,
          priority: raw.priority || undefined,
          category: raw.category || undefined,
          assigneeId: raw.assigneeId || undefined,
          unassigned: raw.unassigned === "true" ? "true" : undefined,
        }),
    });
    const { rows, meta } = await listTickets(params);
    return list(rows, meta);
  });
}
