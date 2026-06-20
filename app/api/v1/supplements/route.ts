import type { NextRequest } from "next/server";
import { created, list, withErrorHandling } from "@/lib/api/response";
import { parseListParams } from "@/lib/api/list-params";
import { requireRole, requireSession } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import {
  type SupplementSortField,
  createSupplement,
  listSupplements,
} from "@/lib/data/supplements";
import { supplementCreateSchema } from "@/lib/schemas/supplement";

const SORTABLE = ["name", "brand", "createdAt", "updatedAt"] as const satisfies readonly SupplementSortField[];

export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireSession();
    const params = parseListParams(new URL(request.url), {
      sortable: SORTABLE,
      defaultSort: { field: "name", direction: "asc" },
    });
    const { rows, meta } = await listSupplements(params);
    return list(rows, meta);
  });
}

export function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const input = supplementCreateSchema.parse(await request.json());
    const row = await createSupplement(input);

    await recordAudit({
      actorId: user.id,
      action: "supplement.create",
      entityType: "supplement",
      entityId: row.id,
      diff: { after: { name: row.name, brand: row.brand } },
    });

    return created(row);
  });
}
