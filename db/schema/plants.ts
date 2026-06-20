import { relations } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { diseaseSeverity } from "./enums";

export const supplements = pgTable("supplements", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  brand: text("brand"),
  imageUrl: text("image_url").notNull(),
  buyLink: text("buy_link").notNull(),
  description: text("description"),
  /** PlantVillage labels this supplement is recommended for. */
  mappedDiseaseLabels: text("mapped_disease_labels").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * The 39 PlantVillage disease classes (label is the canonical key, e.g.
 * "Tomato___Early_blight"). The mobile app reads this table to render the
 * diagnosis card after an on-device scan.
 */
export const diseases = pgTable("diseases", {
  label: text("label").primaryKey(),
  crop: text("crop").notNull(),
  disease: text("disease").notNull(),
  healthy: boolean("healthy").notNull().default(false),
  description: text("description").notNull().default(""),
  prevention: text("prevention").array().notNull().default([]),
  supplementId: uuid("supplement_id").references(() => supplements.id, {
    onDelete: "set null",
  }),
  buyLink: text("buy_link"),
  severity: diseaseSeverity("severity").notNull().default("medium"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * A frozen snapshot of the diagnosis card the user saw at scan time, so KB
 * edits don't rewrite history. Shape mirrors the mobile app's LeafInfo.
 */
export type DiagnosisSnapshot = {
  label: string;
  crop: string;
  disease: string;
  healthy: boolean;
  description: string;
  prevention: string[];
  supplement?: {
    id: string;
    name: string;
    imageUrl: string;
    buyLink: string;
  };
  severity: "low" | "medium" | "high";
};

export const scans = pgTable("scans", {
  id: uuid("id").defaultRandom().primaryKey(),
  /** FK to Better Auth `user.id` — wired up in Phase 0b. */
  userId: text("user_id").notNull(),
  photoUrl: text("photo_url").notNull(),
  predictedLabel: text("predicted_label").notNull(),
  confidence: real("confidence").notNull(),
  diagnosisSnapshot: jsonb("diagnosis_snapshot").$type<DiagnosisSnapshot>().notNull(),
  flagged: boolean("flagged").notNull().default(false),
  reviewerNotes: text("reviewer_notes"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const supplementsRelations = relations(supplements, ({ many }) => ({
  diseases: many(diseases),
}));

export const diseasesRelations = relations(diseases, ({ one, many }) => ({
  supplement: one(supplements, {
    fields: [diseases.supplementId],
    references: [supplements.id],
  }),
  scans: many(scans),
}));

export const scansRelations = relations(scans, ({ one }) => ({
  disease: one(diseases, {
    fields: [scans.predictedLabel],
    references: [diseases.label],
  }),
}));

export type Supplement = typeof supplements.$inferSelect;
export type NewSupplement = typeof supplements.$inferInsert;
export type Disease = typeof diseases.$inferSelect;
export type NewDisease = typeof diseases.$inferInsert;
export type Scan = typeof scans.$inferSelect;
export type NewScan = typeof scans.$inferInsert;
