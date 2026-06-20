import "server-only";
import { db } from "@/db";
import { auditEntries } from "@/db/schema";

/**
 * Records one immutable audit entry.
 *
 * Conventions for `action`: dot-notation with `<entity>.<verb>`, e.g.
 *   "product.create", "order.refund", "user.role.update".
 *
 * `diff` is freeform JSON — pass `{ before, after }` for updates, or the
 * action payload for non-CRUD verbs (e.g. `{ amount, reason }` for refunds).
 */
export async function recordAudit(input: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  diff?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(auditEntries).values({
    actorId: input.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    diff: input.diff ?? {},
  });
}
