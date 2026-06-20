import type { NextRequest } from "next/server";
import { created, list, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canManage, isAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { listSettings, settingDiff, upsertSetting } from "@/lib/data/settings";
import { settingCreateSchema } from "@/lib/schemas/setting";

/**
 * GET /api/v1/settings — list of all settings. Visible to admin shell roles.
 */
export function GET() {
  return withErrorHandling(async () => {
    await requireRole(isAdmin);
    const rows = await listSettings();
    return list(rows, {
      page: 1,
      perPage: rows.length,
      total: rows.length,
    });
  });
}

/**
 * POST /api/v1/settings — create a new setting. (Updates use `PUT /[key]`.)
 *
 * We accept create + update via the same upsert internally, but the public
 * surface treats them as distinct verbs so clients can tell intent apart.
 */
export function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const input = settingCreateSchema.parse(await request.json());
    const value = JSON.parse(input.valueJson);

    const { before, after } = await upsertSetting({
      key: input.key,
      value,
      description: input.description ? input.description : null,
      actorId: user.id,
    });

    await recordAudit({
      actorId: user.id,
      action: before ? "setting.update" : "setting.create",
      entityType: "setting",
      entityId: input.key,
      diff: settingDiff(before, after),
    });

    return created(after);
  });
}
