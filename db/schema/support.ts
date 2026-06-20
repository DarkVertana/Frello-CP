import { relations } from "drizzle-orm";
import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  consultationStatus,
  cropType,
  ticketPriority,
  ticketStatus,
} from "./enums";

export type TicketAttachment = {
  url: string;
  mimeType: string;
  filename: string;
  size: number;
};

export const tickets = pgTable("tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  /** Customer who opened the ticket — FK to Better Auth `user.id` (Phase 0b). */
  userId: text("user_id").notNull(),
  subject: text("subject").notNull(),
  category: text("category").notNull(),
  body: text("body").notNull(),
  status: ticketStatus("status").notNull().default("open"),
  priority: ticketPriority("priority").notNull().default("normal"),
  assigneeId: text("assignee_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ticketReplies = pgTable("ticket_replies", {
  id: uuid("id").defaultRandom().primaryKey(),
  ticketId: uuid("ticket_id")
    .references(() => tickets.id, { onDelete: "cascade" })
    .notNull(),
  authorId: text("author_id").notNull(),
  /** Distinguishes staff replies from customer replies. */
  fromAgent: boolean("from_agent").notNull().default(false),
  body: text("body").notNull(),
  attachments: jsonb("attachments").$type<TicketAttachment[]>().notNull().default([]),
  /** Internal notes are visible to agents only and never emailed to the user. */
  isInternal: boolean("is_internal").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ticketsRelations = relations(tickets, ({ many }) => ({
  replies: many(ticketReplies),
}));

export const ticketRepliesRelations = relations(ticketReplies, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketReplies.ticketId],
    references: [tickets.id],
  }),
}));

/**
 * On-farm consultation requests submitted from the mobile app. Tied to the
 * requesting user via `userId`; the contact fields are captured fresh on the
 * form (they may differ from the account profile).
 */
export const consultations = pgTable("consultations", {
  id: uuid("id").defaultRandom().primaryKey(),
  /** Requesting user — FK to Better Auth `user.id`. */
  userId: text("user_id").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  /** Village / location free text. */
  location: text("location").notNull(),
  /** Farm size as entered, e.g. "2.5 acres". */
  farmSize: text("farm_size").notNull(),
  mainCrop: cropType("main_crop").notNull(),
  /** Requested visit date. */
  visitDate: timestamp("visit_date", { withTimezone: true }),
  message: text("message"),
  status: consultationStatus("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type TicketReply = typeof ticketReplies.$inferSelect;
export type NewTicketReply = typeof ticketReplies.$inferInsert;
export type Consultation = typeof consultations.$inferSelect;
export type NewConsultation = typeof consultations.$inferInsert;
