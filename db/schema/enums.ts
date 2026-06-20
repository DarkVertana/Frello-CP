import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Domain enums for Plant+. Better Auth manages its own user/session/account/
 * verification tables; `user_status` documents the two values stored in the
 * auth `user.status` text column (Better Auth's `additionalFields` stays as
 * `string` for runtime flexibility). `user.role` is similarly text, with two
 * allowed values (`admin` / `viewer`) enforced by Zod on every write — the
 * old `user_role` pgEnum was dropped after collapsing the 5 legacy roles.
 */

export const userStatus = pgEnum("user_status", ["active", "banned"]);

export const orderStatus = pgEnum("order_status", [
  "pending",
  "paid",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "refunded",
]);

export const ticketStatus = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "resolved",
]);

export const ticketPriority = pgEnum("ticket_priority", ["low", "normal", "high"]);

export const addressLabel = pgEnum("address_label", [
  "home",
  "work",
  "farm",
  "other",
]);

export const paymentMethodKind = pgEnum("payment_method_kind", ["card", "upi"]);

export const broadcastSegment = pgEnum("broadcast_segment", [
  "all",
  "role",
  "region",
  "crop",
  "user_ids",
]);

export const broadcastStatus = pgEnum("broadcast_status", [
  "draft",
  "scheduled",
  "sent",
  "cancelled",
]);

export const diseaseSeverity = pgEnum("disease_severity", ["low", "medium", "high"]);
