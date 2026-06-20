import type { NextRequest } from "next/server";
import { list, withErrorHandling } from "@/lib/api/response";
import { parseListParams } from "@/lib/api/list-params";
import { requireRole } from "@/lib/api/auth";
import { isAdmin } from "@/lib/rbac";
import { listAuditEntries } from "@/lib/data/audit";
import { auditListFiltersSchema } from "@/lib/schemas/audit";

/**
 * GET /api/v1/audit — read-only feed for both admin and viewer roles.
 *
 * Filters: actorId, entityType, action (ILIKE substring), from, to.
 * Default sort is most-recent-first via the `audit_at_idx` index.
 */
export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireRole(isAdmin);
    const params = parseListParams(new URL(request.url), {
      sortable: ["at"] as const,
      defaultSort: { field: "at", direction: "desc" },
      filters: (raw) =>
        auditListFiltersSchema.parse({
          actorId: raw.actorId || undefined,
          entityType: raw.entityType || undefined,
          action: raw.action || undefined,
          from: raw.from || undefined,
          to: raw.to || undefined,
        }),
    });
    const { rows, meta } = await listAuditEntries(params);
    return list(rows, meta);
  });
}
