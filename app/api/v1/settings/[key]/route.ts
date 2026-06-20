import type { NextRequest } from "next/server";
import { APIError, noContent, ok, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canManage, isAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import {
  deleteSetting,
  getSettingByKey,
  settingDiff,
  upsertSetting,
} from "@/lib/data/settings";
import { settingUpdateSchema } from "@/lib/schemas/setting";

type RouteContext = { params: Promise<{ key: string }> };

export function GET(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    await requireRole(isAdmin);
    const { key: raw } = await context.params;
    const key = decodeURIComponent(raw);
    const row = await getSettingByKey(key);
    if (!row) throw new APIError("NOT_FOUND", "Setting not found.");
    return ok(row);
  });
}

/**
 * PUT /api/v1/settings/[key] — update an existing setting. Errors with 404
 * if the key doesn't exist (use POST `/settings` to create).
 */
export function PUT(request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const { key: raw } = await context.params;
    const key = decodeURIComponent(raw);

    const before = await getSettingByKey(key);
    if (!before) throw new APIError("NOT_FOUND", "Setting not found.");

    const input = settingUpdateSchema.parse(await request.json());
    const value = JSON.parse(input.valueJson);

    const { after } = await upsertSetting({
      key,
      value,
      description: input.description ? input.description : null,
      actorId: user.id,
    });

    await recordAudit({
      actorId: user.id,
      action: "setting.update",
      entityType: "setting",
      entityId: key,
      diff: settingDiff(before, after),
    });

    return ok(after);
  });
}

export function DELETE(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const { key: raw } = await context.params;
    const key = decodeURIComponent(raw);
    const deleted = await deleteSetting(key);

    await recordAudit({
      actorId: user.id,
      action: "setting.delete",
      entityType: "setting",
      entityId: key,
      diff: { before: { value: deleted.value, description: deleted.description } },
    });

    return noContent();
  });
}
