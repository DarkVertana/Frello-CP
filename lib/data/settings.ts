import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { settings, type Setting } from "@/db/schema";
import { APIError } from "@/lib/api/response";
import {
  GENERAL_SETTINGS_KEY,
  parseGeneralSettings,
  type Currency,
} from "@/lib/schemas/general";

export async function listSettings(): Promise<Setting[]> {
  return db.select().from(settings).orderBy(asc(settings.key));
}

export async function getSettingByKey(key: string): Promise<Setting | null> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return row ?? null;
}

/** Store-wide currency from General settings (defaults to INR). */
export async function getActiveCurrency(): Promise<Currency> {
  const row = await getSettingByKey(GENERAL_SETTINGS_KEY);
  return parseGeneralSettings(row?.value).currency;
}

/** Public config the mobile app reads (no auth) to render prices/branding. */
export async function getPublicConfig(): Promise<{
  currency: Currency;
  appName: string;
}> {
  const row = await getSettingByKey(GENERAL_SETTINGS_KEY);
  const general = parseGeneralSettings(row?.value);
  return { currency: general.currency, appName: general.appName };
}

/**
 * Insert-or-update on the primary key. `value` is the already-parsed JSON
 * value (any shape). The caller (REST handler) is responsible for parsing
 * the string payload before calling us.
 */
export async function upsertSetting(input: {
  key: string;
  value: unknown;
  description: string | null;
  actorId: string;
}): Promise<{ before: Setting | null; after: Setting }> {
  const before = await getSettingByKey(input.key);

  const [after] = await db
    .insert(settings)
    .values({
      key: input.key,
      value: input.value,
      description: input.description,
      updatedBy: input.actorId,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: input.value,
        description: input.description,
        updatedBy: input.actorId,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!after) throw new APIError("INTERNAL", "Failed to save setting.");
  return { before, after };
}

export async function deleteSetting(key: string): Promise<Setting> {
  const before = await getSettingByKey(key);
  if (!before) throw new APIError("NOT_FOUND", "Setting not found.");
  const [deleted] = await db.delete(settings).where(eq(settings.key, key)).returning();
  if (!deleted) throw new APIError("INTERNAL", "Failed to delete setting.");
  return deleted;
}

export function settingDiff(
  before: Setting | null,
  after: Setting,
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  if (!before) {
    diff.value = { from: null, to: after.value };
    if (after.description) diff.description = { from: null, to: after.description };
    return diff;
  }
  if (JSON.stringify(before.value) !== JSON.stringify(after.value)) {
    diff.value = { from: before.value, to: after.value };
  }
  if (before.description !== after.description) {
    diff.description = { from: before.description, to: after.description };
  }
  return diff;
}
