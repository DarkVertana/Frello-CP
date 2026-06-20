import type { NextRequest } from "next/server";
import { APIError, created, list, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canManage, isAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { createAddress, listAddressesByUser } from "@/lib/data/addresses";
import { getUserById } from "@/lib/data/users";
import { shippingAddressCreateSchema } from "@/lib/schemas/shipping-address";

/**
 * GET /api/v1/shipping-address?userId=<id> — all shipping addresses for a user,
 * default first. Admin shell roles only.
 */
export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireRole(isAdmin);

    const userId = new URL(request.url).searchParams.get("userId")?.trim();
    if (!userId) {
      throw new APIError("BAD_REQUEST", "A userId query parameter is required.");
    }

    const rows = await listAddressesByUser(userId);
    return list(rows, { page: 1, perPage: rows.length, total: rows.length });
  });
}

/**
 * POST /api/v1/shipping-address — add a shipping address to a user.
 *
 * Body: { userId, name, line1, line2?, city, state, postal, country?, phone,
 *         label?, isDefault? }
 */
export function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user: actor } = await requireRole(canManage);
    const input = shippingAddressCreateSchema.parse(await request.json());

    const owner = await getUserById(input.userId);
    if (!owner) throw new APIError("NOT_FOUND", "User not found.");

    const row = await createAddress(input);

    await recordAudit({
      actorId: actor.id,
      action: "address.create",
      entityType: "address",
      entityId: row.id,
      diff: { userId: row.userId, label: row.label, city: row.city },
    });

    return created(row);
  });
}
