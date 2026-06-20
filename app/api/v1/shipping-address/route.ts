import type { NextRequest } from "next/server";
import { APIError, created, list, withErrorHandling } from "@/lib/api/response";
import { requireSession } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { createAddress, listAddressesByUser } from "@/lib/data/addresses";
import { getUserById } from "@/lib/data/users";
import { shippingAddressCreateSchema } from "@/lib/schemas/shipping-address";

/**
 * GET /api/v1/shipping-address[?userId=<id>] — list shipping addresses.
 *
 * Any signed-in user sees their own (default first). Admins may pass `userId`
 * to read another user's; non-admins are restricted to themselves.
 */
export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user } = await requireSession();
    const requested = new URL(request.url).searchParams.get("userId")?.trim();
    const admin = canManage(user.role);

    if (requested && requested !== user.id && !admin) {
      throw new APIError("FORBIDDEN", "You can only view your own addresses.");
    }

    const userId = admin && requested ? requested : user.id;
    const rows = await listAddressesByUser(userId);
    return list(rows, { page: 1, perPage: rows.length, total: rows.length });
  });
}

/**
 * POST /api/v1/shipping-address — add a shipping address.
 *
 * Self-service callers omit `userId` (their own account is used). Admins may
 * set `userId` to add an address on another user's behalf.
 *
 * Body: { userId?, name, line1, line2?, city, state, postal, country?, phone,
 *         label?, isDefault? }
 */
export function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user: actor } = await requireSession();
    const input = shippingAddressCreateSchema.parse(await request.json());
    const admin = canManage(actor.role);

    if (input.userId && input.userId !== actor.id && !admin) {
      throw new APIError("FORBIDDEN", "You can only add your own addresses.");
    }

    const ownerId = admin && input.userId ? input.userId : actor.id;

    const owner = await getUserById(ownerId);
    if (!owner) throw new APIError("NOT_FOUND", "User not found.");

    const row = await createAddress({ ...input, userId: ownerId });

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
