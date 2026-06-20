import type { NextRequest } from "next/server";
import { created, list, withErrorHandling } from "@/lib/api/response";
import { parseListParams } from "@/lib/api/list-params";
import { requireRole } from "@/lib/api/auth";
import { canManage, isAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import {
  type UserSortField,
  createUser,
  listUsers,
} from "@/lib/data/users";
import { userCreateSchema, userListFiltersSchema } from "@/lib/schemas/user";

const SORTABLE = [
  "name",
  "email",
  "role",
  "status",
  "createdAt",
  "lastSeenAt",
] as const satisfies readonly UserSortField[];

/**
 * GET /api/v1/users
 *
 * Query: page, perPage, search, sort, filter[role], filter[status]
 *
 * Staff-only — customer accounts can't list other users.
 */
export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireRole(isAdmin);

    const params = parseListParams(new URL(request.url), {
      sortable: SORTABLE,
      defaultSort: { field: "createdAt", direction: "desc" },
      filters: (raw) =>
        userListFiltersSchema.parse({
          role: raw.role || undefined,
          status: raw.status || undefined,
        }),
    });

    const { rows, meta } = await listUsers(params);
    return list(rows, meta);
  });
}

/**
 * POST /api/v1/users
 *
 * Body: { name, email, password, role?, phone? }
 *
 * Admin-only — creates the account (with a credential password) without signing
 * anyone in. New users default to the "viewer" role unless an admin picks one.
 */
export function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user: actor } = await requireRole(canManage);

    const input = userCreateSchema.parse(await request.json());
    const row = await createUser(input);

    await recordAudit({
      actorId: actor.id,
      action: "user.create",
      entityType: "user",
      entityId: row.id,
      diff: { name: row.name, email: row.email, role: row.role },
    });

    return created(row);
  });
}
