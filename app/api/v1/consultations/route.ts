import type { NextRequest } from "next/server";
import { created, list, withErrorHandling } from "@/lib/api/response";
import { parseListParams } from "@/lib/api/list-params";
import { requireRole, requireSession } from "@/lib/api/auth";
import { isAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import {
  createConsultation,
  listConsultations,
  type ConsultationSortField,
} from "@/lib/data/consultations";
import {
  consultationCreateSchema,
  consultationListFiltersSchema,
} from "@/lib/schemas/consultation";

const SORTABLE = [
  "createdAt",
  "visitDate",
  "status",
  "fullName",
] as const satisfies readonly ConsultationSortField[];

/**
 * GET /api/v1/consultations — admin list of consultation requests.
 *
 * Query: page, perPage, search (name/phone/location), sort, filter[status],
 * filter[mainCrop]. Admin shell only.
 */
export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireRole(isAdmin);

    const params = parseListParams(new URL(request.url), {
      sortable: SORTABLE,
      defaultSort: { field: "createdAt", direction: "desc" },
      filters: (raw) =>
        consultationListFiltersSchema.parse({
          status: raw.status || undefined,
          mainCrop: raw.mainCrop || undefined,
        }),
    });

    const { rows, meta } = await listConsultations(params);
    return list(rows, meta);
  });
}

/**
 * POST /api/v1/consultations — submit a consultation request (mobile app).
 *
 * Any signed-in user (cookie or bearer). The request is tied to their account
 * via the session; `userId` is never read from the body.
 *
 * Body: { fullName, phone, location, farmSize, mainCrop, visitDate, message? }
 */
export function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user } = await requireSession();
    const input = consultationCreateSchema.parse(await request.json());

    const row = await createConsultation({ ...input, userId: user.id });

    await recordAudit({
      actorId: user.id,
      action: "consultation.create",
      entityType: "consultation",
      entityId: row.id,
      diff: { mainCrop: row.mainCrop, location: row.location },
    });

    return created(row);
  });
}
