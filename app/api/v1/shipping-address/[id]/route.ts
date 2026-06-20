import type { NextRequest } from "next/server";
import { APIError, noContent, ok, withErrorHandling } from "@/lib/api/response";
import { requireSession } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import {
  addressDiff,
  deleteAddress,
  getAddressById,
  updateAddress,
  type Address,
} from "@/lib/data/addresses";
import { shippingAddressUpdateSchema } from "@/lib/schemas/shipping-address";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Load an address and authorize the caller: the owner, or an admin, may touch
 * it. Anyone else gets 404 (don't leak which ids exist to other users).
 */
async function requireOwnedAddress(
  id: string,
  actor: { id: string; role?: string | null },
): Promise<Address> {
  const address = await getAddressById(id);
  if (!address) throw new APIError("NOT_FOUND", "Address not found.");
  if (address.userId !== actor.id && !canManage(actor.role)) {
    throw new APIError("NOT_FOUND", "Address not found.");
  }
  return address;
}

/** GET /api/v1/shipping-address/[id] — a single address (owner or admin). */
export function GET(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireSession();
    const { id } = await context.params;
    const address = await requireOwnedAddress(id, user);
    return ok(address);
  });
}

/** PATCH /api/v1/shipping-address/[id] — edit an address (owner or admin). */
export function PATCH(request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user: actor } = await requireSession();
    const { id } = await context.params;
    await requireOwnedAddress(id, actor);

    const patch = shippingAddressUpdateSchema.parse(await request.json());
    const { before, after } = await updateAddress(id, patch);

    await recordAudit({
      actorId: actor.id,
      action: "address.update",
      entityType: "address",
      entityId: id,
      diff: addressDiff(before, after),
    });

    return ok(after);
  });
}

/** DELETE /api/v1/shipping-address/[id] — remove an address (owner or admin). */
export function DELETE(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user: actor } = await requireSession();
    const { id } = await context.params;
    await requireOwnedAddress(id, actor);

    const deleted = await deleteAddress(id);

    await recordAudit({
      actorId: actor.id,
      action: "address.delete",
      entityType: "address",
      entityId: id,
      diff: { before: { userId: deleted.userId, label: deleted.label, city: deleted.city } },
    });

    return noContent();
  });
}
