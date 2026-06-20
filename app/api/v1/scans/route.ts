import type { NextRequest } from "next/server";
import { created, list, withErrorHandling } from "@/lib/api/response";
import { parseListParams } from "@/lib/api/list-params";
import { requireSession } from "@/lib/api/auth";
import { canSupport } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { createScan, listScans, type ScanSortField } from "@/lib/data/scans";
import { scanCreateSchema, scanListFiltersSchema } from "@/lib/schemas/scan";

const SORTABLE = [
  "createdAt",
  "confidence",
  "predictedLabel",
] as const satisfies readonly ScanSortField[];

/**
 * GET /api/v1/scans — scan history.
 *
 * Admins/support see everyone's (with the full filter set: label, confidence,
 * flagged, userId, from, to). Any other signed-in user sees only their own.
 */
export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user } = await requireSession();
    const admin = canSupport(user.role);

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

    // Non-admins are locked to their own history regardless of any userId filter.
    const filters = admin
      ? params.filters
      : { ...params.filters, userId: user.id };

    const { rows, meta } = await listScans({ ...params, filters });
    return list(rows, meta);
  });
}

/**
 * POST /api/v1/scans — record a leaf-disease scan (mobile app).
 *
 * Any signed-in user; the scan is tied to their account via the session.
 *
 * Body: { photoUrl, infectionTitle, infectionDetail, infectionPrevention,
 *         crop?, predictedLabel?, confidence?, healthy?, severity?, lat?, lng? }
 */
export function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user } = await requireSession();
    const input = scanCreateSchema.parse(await request.json());

    const row = await createScan({ ...input, userId: user.id });

    await recordAudit({
      actorId: user.id,
      action: "scan.create",
      entityType: "scan",
      entityId: row.id,
      diff: { predictedLabel: row.predictedLabel, confidence: row.confidence },
    });

    return created(row);
  });
}
