import type { NextRequest } from "next/server";
import { created, list, withErrorHandling } from "@/lib/api/response";
import { parseListParams } from "@/lib/api/list-params";
import { requireRole, requireSession } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import {
  type DiseaseSortField,
  createDisease,
  listDiseases,
} from "@/lib/data/diseases";
import { diseaseCreateSchema, diseaseListFiltersSchema } from "@/lib/schemas/disease";

const SORTABLE = ["label", "crop", "severity", "updatedAt"] as const satisfies readonly DiseaseSortField[];

/**
 * GET /api/v1/diseases
 *
 * Open to any signed-in user (the mobile app's diagnosis screen reads it).
 */
export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireSession();
    const params = parseListParams(new URL(request.url), {
      sortable: SORTABLE,
      defaultSort: { field: "label", direction: "asc" },
      filters: (raw) =>
        diseaseListFiltersSchema.parse({
          crop: raw.crop || undefined,
          healthy: raw.healthy === "true" || raw.healthy === "false" ? raw.healthy : undefined,
          severity:
            raw.severity === "low" || raw.severity === "medium" || raw.severity === "high"
              ? raw.severity
              : undefined,
        }),
    });
    const { rows, meta } = await listDiseases(params);
    return list(rows, meta);
  });
}

export function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const input = diseaseCreateSchema.parse(await request.json());
    const row = await createDisease(input);

    await recordAudit({
      actorId: user.id,
      action: "disease.create",
      entityType: "disease",
      entityId: row.label,
      diff: { after: { crop: row.crop, disease: row.disease, severity: row.severity } },
    });

    return created(row);
  });
}
