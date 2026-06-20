import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { orderStatus } from "./enums";

/**
 * All monetary amounts are stored in the currency's smallest unit (paise for INR,
 * cents for USD). Convert with Intl.NumberFormat at the edge.
 */

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    /** Lucide icon name (e.g. "sprout"). */
    icon: text("icon").notNull(),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("categories_slug_idx").on(table.slug)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    categoryId: uuid("category_id")
      .references(() => categories.id, { onDelete: "restrict" })
      .notNull(),
    price: integer("price").notNull(),
    originalPrice: integer("original_price"),
    rating: real("rating").notNull().default(0),
    reviewsCount: integer("reviews_count").notNull().default(0),
    stock: integer("stock").notNull().default(0),
    /** Suggested quantity served per person, e.g. "2 plants" or "100 g". */
    servesPerPerson: text("serves_per_person"),
    isActive: boolean("is_active").notNull().default(true),
    imageUrl: text("image_url").notNull(),
    gallery: text("gallery").array().notNull().default([]),
    /** Hex color used by the mobile `ProductCard` accent strip. */
    accent: text("accent").notNull().default("#138A4C"),
    description: text("description").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("products_slug_idx").on(table.slug)],
);

export type OrderTimelineEntry = {
  status: (typeof orderStatus.enumValues)[number];
  at: string; // ISO timestamp
  byUserId?: string;
  /** Denormalised actor name — saves a join when rendering the timeline. */
  byName?: string;
  /** Optional human note ("Refunded ₹250 to UPI", "Tracking BLR-9981"). */
  note?: string;
};

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  /** FK to Better Auth's `user.id` — wired up in Phase 0b. */
  userId: text("user_id").notNull(),
  status: orderStatus("status").notNull().default("pending"),
  subtotal: integer("subtotal").notNull(),
  shipping: integer("shipping").notNull().default(0),
  tax: integer("tax").notNull().default(0),
  total: integer("total").notNull(),
  currency: text("currency").notNull().default("INR"),
  shippingAddressId: uuid("shipping_address_id"),
  /** Provider token (Stripe/Razorpay) — never raw card data. */
  paymentMethodRef: text("payment_method_ref"),
  /** Carrier tracking number — surfaced to the mobile app after `out_for_delivery`. */
  trackingNumber: text("tracking_number"),
  notes: text("notes"),
  timeline: jsonb("timeline").$type<OrderTimelineEntry[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .references(() => orders.id, { onDelete: "cascade" })
    .notNull(),
  productId: uuid("product_id")
    .references(() => products.id, { onDelete: "restrict" })
    .notNull(),
  /** Snapshot of name + price at order time, so admin edits don't rewrite history. */
  name: text("name").notNull(),
  qty: integer("qty").notNull(),
  priceAtOrder: integer("price_at_order").notNull(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

/**
 * Per-user saved / favourite products (the customer's wishlist). One row per
 * (user, product); the unique index makes saving idempotent. Deleting a product
 * cascades its saves away.
 */
export const savedProducts = pgTable(
  "saved_products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** FK to Better Auth's `user.id` (text, no DB-level FK — same as orders). */
    userId: text("user_id").notNull(),
    productId: uuid("product_id")
      .references(() => products.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("saved_products_user_product_idx").on(table.userId, table.productId),
    index("saved_products_user_idx").on(table.userId),
  ],
);

export const savedProductsRelations = relations(savedProducts, ({ one }) => ({
  product: one(products, {
    fields: [savedProducts.productId],
    references: [products.id],
  }),
}));

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type SavedProduct = typeof savedProducts.$inferSelect;
export type NewSavedProduct = typeof savedProducts.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
