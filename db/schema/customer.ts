import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { addressLabel, paymentMethodKind } from "./enums";

export const addresses = pgTable("addresses", {
  id: uuid("id").defaultRandom().primaryKey(),
  /** FK to Better Auth's `user.id` — wired up in Phase 0b. */
  userId: text("user_id").notNull(),
  label: addressLabel("label").notNull().default("home"),
  name: text("name").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  postal: text("postal").notNull(),
  country: text("country").notNull().default("IN"),
  phone: text("phone").notNull(),
  /** Enforced server-side: only one default per user. */
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  kind: paymentMethodKind("kind").notNull(),
  /** "Visa", "Mastercard", "GPay" — display only. */
  brand: text("brand").notNull(),
  /** e.g. "•••• 4242" or "user@okhdfcbank". */
  maskedDetail: text("masked_detail").notNull(),
  /** MM/YY for cards, null for UPI. */
  expiry: text("expiry"),
  /** Tokenized reference from Stripe/Razorpay — never raw card data. */
  providerRef: text("provider_ref").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type NewPaymentMethod = typeof paymentMethods.$inferInsert;
