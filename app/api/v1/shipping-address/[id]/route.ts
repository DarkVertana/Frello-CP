import type { NextRequest } from "next/server";
import { APIError, noContent, ok, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canManage, isAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import {
  addressDiff,
  deleteAddress,
  getAddressById,
  updateAddress,
} from "@/lib/data/addresses";
import { shippingAddressUpdateSchema } from "@/lib/schemas/shipping-address";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/v1/shipping-address/[id] — a single address. */
export function GET(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    await requireRole(isAdmin);
    const { id } = await context.params;
    const row = await getAddressById(id);
    if (!row) throw new APIError("NOT_FOUND", "Address not found.");
    return ok(row);
  });
}

/** PATCH /api/v1/shipping-address/[id] — edit an address (partial). */
export function PATCH(request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user: actor } = await requireRole(canManage);
    const { id } = await context.params;
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

/** DELETE /api/v1/shipping-address/[id] — remove an address. */
export function DELETE(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user: actor } = await requireRole(canManage);
    const { id } = await context.params;

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
