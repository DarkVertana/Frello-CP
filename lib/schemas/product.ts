import { z } from "zod";
import { slugSchema, slugify } from "./category";

/**
 * Shared validators for Products.
 *
 * Prices flow through the API as integer paise (1 INR = 100 paise) — the
 * client form converts user-entered rupees to paise before POST/PATCH, and
 * `formatAmount` converts back for display.
 */

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Use a 6-digit hex like #138A4C.");

export const productCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  slug: slugSchema,
  categoryId: z.uuid("Pick a category."),
  /** Integer paise; min 1 paise so we can't accidentally publish ₹0 items. */
  price: z.number().int().min(1, "Price must be greater than zero."),
  originalPrice: z.number().int().min(1).nullable().optional(),
  rating: z.number().min(0, "Rating starts at 0.").max(5, "Rating maxes at 5.").default(0),
  reviewsCount: z.number().int().min(0).default(0),
  stock: z.number().int().min(0, "Stock can't be negative.").default(0),
  isActive: z.boolean().default(true),
  imageUrl: z.url("Add a product image."),
  gallery: z.array(z.url()).max(20, "Up to 20 gallery images.").default([]),
  accent: hexColor.default("#138A4C"),
  description: z.string().trim().max(8000).default(""),
});

export const productUpdateSchema = productCreateSchema.partial();

export const productBulkActivateSchema = z.object({
  ids: z.array(z.uuid()).min(1, "Pick at least one product."),
  isActive: z.boolean(),
});

export const productListFiltersSchema = z.object({
  categoryId: z.uuid().optional(),
  isActive: z.enum(["true", "false"]).optional(),
  lowStock: z.enum(["true"]).optional(),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductBulkActivateInput = z.infer<typeof productBulkActivateSchema>;
export type ProductListFilters = z.infer<typeof productListFiltersSchema>;

/** Threshold below which a product is considered low-stock. */
export const LOW_STOCK_THRESHOLD = 10;

export { slugify };
