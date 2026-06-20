import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { blogStatus } from "./enums";

/**
 * Blog posts. `content` holds rich HTML authored in the admin editor and is
 * rendered as-is by the mobile app (authors are staff, so it's trusted). Only
 * `published` posts are exposed through the public catalog API.
 */
export const blogs = pgTable(
  "blogs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    /** Short plain-text summary for list cards / previews. */
    excerpt: text("excerpt"),
    /** Body as HTML. */
    content: text("content").notNull().default(""),
    featuredImageUrl: text("featured_image_url"),
    tags: text("tags").array().notNull().default([]),
    status: blogStatus("status").notNull().default("draft"),
    /** Better Auth user.id of the author. */
    authorId: text("author_id"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("blogs_slug_idx").on(table.slug)],
);

export type Blog = typeof blogs.$inferSelect;
export type NewBlog = typeof blogs.$inferInsert;
