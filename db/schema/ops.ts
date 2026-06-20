import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { broadcastSegment, broadcastStatus } from "./enums";

export type BroadcastSegmentParams = {
  /** Used when segment = "role" */
  role?: string;
  /** Used when segment = "region" (state/country/etc.) */
  region?: string;
  /** Used when segment = "crop" */
  crop?: string;
  /** Used when segment = "user_ids" */
  userIds?: string[];
};

export type BroadcastStats = {
  sent: number;
  opened: number;
};

export const broadcasts = pgTable("broadcasts", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  segment: broadcastSegment("segment").notNull().default("all"),
  segmentParams: jsonb("segment_params")
    .$type<BroadcastSegmentParams>()
    .notNull()
    .default({}),
  /** Null = send immediately; otherwise scheduled for this time. */
  scheduleAt: timestamp("schedule_at", { withTimezone: true }),
  status: broadcastStatus("status").notNull().default("draft"),
  stats: jsonb("stats")
    .$type<BroadcastStats>()
    .notNull()
    .default({ sent: 0, opened: 0 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
});

/**
 * Key/value app settings. Values are JSON so each key can hold any shape
 * (e.g. `featureFlags: { newScanFlow: true }`).
 */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  description: text("description"),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Append-only audit log. Every server mutation should write one entry via the
 * `recordAudit()` helper (added in Phase 0b).
 */
export const auditEntries = pgTable(
  "audit_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: text("actor_id").notNull(),
    /** Dot-notation action key, e.g. "product.create", "order.refund". */
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    /** Shallow JSON diff of changed fields, or arbitrary action payload. */
    diff: jsonb("diff").notNull().default({}),
    at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("audit_actor_idx").on(table.actorId),
    index("audit_entity_idx").on(table.entityType, table.entityId),
    index("audit_at_idx").on(table.at),
  ],
);

/**
 * API keys for programmatic access. Only a SHA-256 hash of the full key is
 * stored — the plaintext is shown to the admin exactly once at creation time.
 * `prefix` + `lastFour` are kept so the UI can display a recognisable masked
 * value. Revoking sets `revokedAt` (soft) so the key history survives.
 */
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    /** Human-recognisable leading segment, e.g. "frlo_live". */
    prefix: text("prefix").notNull(),
    /** Last 4 chars of the secret, for masked display. */
    lastFour: text("last_four").notNull(),
    /** SHA-256 hex of the full key. Lookups hash the presented key + compare. */
    hashedKey: text("hashed_key").notNull().unique(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [index("api_keys_hashed_idx").on(table.hashedKey)],
);

export type Broadcast = typeof broadcasts.$inferSelect;
export type NewBroadcast = typeof broadcasts.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
export type AuditEntry = typeof auditEntries.$inferSelect;
export type NewAuditEntry = typeof auditEntries.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
