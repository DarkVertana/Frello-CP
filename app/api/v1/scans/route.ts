import type { NextRequest } from "next/server";
import { list, withErrorHandling } from "@/lib/api/response";
import { parseListParams } from "@/lib/api/list-params";
import { requireRole } from "@/lib/api/auth";
import { canSupport } from "@/lib/rbac";
import { listScans, type ScanSortField } from "@/lib/data/scans";
import { scanListFiltersSchema } from "@/lib/schemas/scan";

const SORTABLE = [
  "createdAt",
  "confidence",
  "predictedLabel",
] as const satisfies readonly ScanSortField[];

/**
 * GET /api/v1/scans — support+ only.
 *
 * Filters: label, confidence (high|medium|low), flagged, userId, from, to.
 */
export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireRole(canSupport);
    const params = parseListParams(new URL(request.url), {
      sortable: SORTABLE,
      defaultSort: { field: "createdAt", direction: "desc" },
      filters: (raw) =>
        scanListFiltersSchema.parse({
          label: raw.label || undefined,
          confidence:
            raw.confidence === "high" ||
            raw.confidence === "medium" ||
            raw.confidence === "low"
              ? raw.confidence
              : undefined,
          flagged:
            raw.flagged === "true" || raw.flagged === "false"
              ? raw.flagged
              : undefined,
          userId: raw.userId || undefined,
          from: raw.from || undefined,
          to: raw.to || undefined,
        }),
    });
    const { rows, meta } = await listScans(params);
    return list(rows, meta);
  });
}
