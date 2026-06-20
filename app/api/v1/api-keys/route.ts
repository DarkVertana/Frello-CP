import type { NextRequest } from "next/server";
import { created, list, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canManage, isAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { createApiKey, listApiKeys } from "@/lib/data/api-keys";
import { apiKeyCreateSchema } from "@/lib/schemas/api-key";

/** GET /api/v1/api-keys — masked list of keys. Visible to admin shell roles. */
export function GET() {
  return withErrorHandling(async () => {
    await requireRole(isAdmin);
    const rows = await listApiKeys();
    return list(rows, { page: 1, perPage: rows.length, total: rows.length });
  });
}

/**
 * POST /api/v1/api-keys — generate a new key.
 *
 * The response includes `plaintext` — the only time the full secret is ever
 * returned. Clients must surface it immediately.
 */
export function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const input = apiKeyCreateSchema.parse(await request.json());

    const { key, plaintext } = await createApiKey({
      name: input.name,
      actorId: user.id,
    });

    await recordAudit({
      actorId: user.id,
      action: "apikey.create",
      entityType: "api_key",
      entityId: key.id,
      diff: { name: key.name },
    });

    return created({ ...key, plaintext });
  });
}
