import "server-only";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { APIError } from "@/lib/api/response";
import type {
  ShippingAddressCreateInput,
  ShippingAddressUpdateInput,
} from "@/lib/schemas/shipping-address";

/**
 * Shipping addresses data layer. A user can have many addresses; at most one is
 * the default — that invariant is enforced here (not the DB), so setting a new
 * default demotes the previous one inside the same transaction.
 *
 * Pure DB ops: no auth, no audit. Callers (route handlers) own both.
 */

export type Address = typeof addresses.$inferSelect;

export async function listAddressesByUser(userId: string): Promise<Address[]> {
  return db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault), asc(addresses.createdAt));
}

export async function getAddressById(id: string): Promise<Address | null> {
  const [row] = await db.select().from(addresses).where(eq(addresses.id, id)).limit(1);
  return row ?? null;
}

export async function createAddress(
  input: ShippingAddressCreateInput & { userId: string },
): Promise<Address> {
  return db.transaction(async (tx) => {
    if (input.isDefault) {
      await tx
        .update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, input.userId));
    }

    const [row] = await tx
      .insert(addresses)
      .values({
        userId: input.userId,
        label: input.label,
        name: input.name,
        line1: input.line1,
        line2: input.line2 ? input.line2 : null,
        city: input.city,
        state: input.state,
        postal: input.postal,
        country: input.country,
        phone: input.phone,
        isDefault: input.isDefault,
      })
      .returning();

    if (!row) throw new APIError("INTERNAL", "Failed to create address.");
    return row;
  });
}

export async function updateAddress(
  id: string,
  patch: ShippingAddressUpdateInput,
): Promise<{ before: Address; after: Address }> {
  const before = await getAddressById(id);
  if (!before) throw new APIError("NOT_FOUND", "Address not found.");

  return db.transaction(async (tx) => {
    if (patch.isDefault === true) {
      await tx
        .update(addresses)
        .set({ isDefault: false })
        .where(and(eq(addresses.userId, before.userId), ne(addresses.id, id)));
    }

    const next = {
      ...(patch.label !== undefined ? { label: patch.label } : {}),
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.line1 !== undefined ? { line1: patch.line1 } : {}),
      ...(patch.line2 !== undefined ? { line2: patch.line2 ? patch.line2 : null } : {}),
      ...(patch.city !== undefined ? { city: patch.city } : {}),
      ...(patch.state !== undefined ? { state: patch.state } : {}),
      ...(patch.postal !== undefined ? { postal: patch.postal } : {}),
      ...(patch.country !== undefined ? { country: patch.country } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      ...(patch.isDefault !== undefined ? { isDefault: patch.isDefault } : {}),
      updatedAt: new Date(),
    };

    const [after] = await tx
      .update(addresses)
      .set(next)
      .where(eq(addresses.id, id))
      .returning();

    if (!after) throw new APIError("INTERNAL", "Failed to update address.");
    return { before, after };
  });
}

export async function deleteAddress(id: string): Promise<Address> {
  const before = await getAddressById(id);
  if (!before) throw new APIError("NOT_FOUND", "Address not found.");
  const [deleted] = await db.delete(addresses).where(eq(addresses.id, id)).returning();
  if (!deleted) throw new APIError("INTERNAL", "Failed to delete address.");
  return deleted;
}

export function addressDiff(
  before: Address,
  after: Address,
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  const keys: (keyof Address)[] = [
    "label",
    "name",
    "line1",
    "line2",
    "city",
    "state",
    "postal",
    "country",
    "phone",
    "isDefault",
  ];
  for (const key of keys) {
    if (before[key] !== after[key]) diff[key] = { from: before[key], to: after[key] };
  }
  return diff;
}
