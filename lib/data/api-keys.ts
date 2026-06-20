import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys, type ApiKey } from "@/db/schema";
import { APIError } from "@/lib/api/response";
import type { ApiKeyPublic } from "@/lib/schemas/api-key";

/** Leading segment so a key is recognisable at a glance: frlo_live_<secret>. */
const KEY_PREFIX = "frlo_live";

function hashKey(fullKey: string): string {
  return createHash("sha256").update(fullKey).digest("hex");
}

/** Strip the secret hash before a row ever leaves the server. */
export function toPublicApiKey(row: ApiKey): ApiKeyPublic {
  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    lastFour: row.lastFour,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
  };
}

export async function listApiKeys(): Promise<ApiKeyPublic[]> {
  const rows = await db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
  return rows.map(toPublicApiKey);
}

/**
 * Generate a new API key. Returns the public row plus the one-time plaintext
 * secret — the caller must surface it immediately; it can never be recovered.
 */
export async function createApiKey(input: {
  name: string;
  actorId: string;
}): Promise<{ key: ApiKeyPublic; plaintext: string }> {
  const secret = randomBytes(24).toString("base64url");
  const fullKey = `${KEY_PREFIX}_${secret}`;

  const [row] = await db
    .insert(apiKeys)
    .values({
      name: input.name,
      prefix: KEY_PREFIX,
      lastFour: secret.slice(-4),
      hashedKey: hashKey(fullKey),
      createdBy: input.actorId,
    })
    .returning();

  if (!row) throw new APIError("INTERNAL", "Failed to create API key.");
  return { key: toPublicApiKey(row), plaintext: fullKey };
}

/** Soft-revoke: the row stays for history but the key stops authenticating. */
export async function revokeApiKey(id: string): Promise<ApiKeyPublic> {
  const [before] = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
  if (!before) throw new APIError("NOT_FOUND", "API key not found.");
  if (before.revokedAt) return toPublicApiKey(before);

  const [after] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(eq(apiKeys.id, id))
    .returning();
  if (!after) throw new APIError("INTERNAL", "Failed to revoke API key.");
  return toPublicApiKey(after);
}

/**
 * Resolve a presented key to its owning record, or null if unknown/revoked.
 * Touches `lastUsedAt`. Use this from any future API-key-authenticated route.
 */
export async function verifyApiKey(fullKey: string): Promise<ApiKey | null> {
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.hashedKey, hashKey(fullKey)))
    .limit(1);
  if (!row || row.revokedAt) return null;

  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, row.id));
  return row;
}
