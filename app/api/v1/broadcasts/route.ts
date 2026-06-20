import type { NextRequest } from "next/server";
import { created, list, withErrorHandling } from "@/lib/api/response";
import { parseListParams } from "@/lib/api/list-params";
import { requireRole } from "@/lib/api/auth";
import { canManage, isAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import {
  type BroadcastSortField,
  createBroadcast,
  listBroadcasts,
} from "@/lib/data/broadcasts";
import {
  broadcastCreateSchema,
  broadcastStatusEnum,
} from "@/lib/schemas/broadcast";

const SORTABLE = [
  "createdAt",
  "scheduleAt",
  "sentAt",
  "status",
] as const satisfies readonly BroadcastSortField[];

export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireRole(isAdmin);
    const params = parseListParams(new URL(request.url), {
      sortable: SORTABLE,
      defaultSort: { field: "createdAt", direction: "desc" },
      filters: (raw) => {
        const status = broadcastStatusEnum.safeParse(raw.status);
        return { status: status.success ? status.data : undefined };
      },
    });
    const { rows, meta } = await listBroadcasts(params);
    return list(rows, meta);
  });
}

export function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const input = broadcastCreateSchema.parse(await request.json());
    const row = await createBroadcast(input);

    await recordAudit({
      actorId: user.id,
      action: "broadcast.create",
      entityType: "broadcast",
      entityId: row.id,
      diff: { after: { title: row.title, segment: row.segment } },
    });

    return created(row);
  });
}
