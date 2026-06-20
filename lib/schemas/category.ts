import { z } from "zod";

/**
 * Shared validators for Categories. Imported by:
 *   - REST handlers (/api/v1/categories/*)
 *   - Server actions
 *   - Client forms (the same schema both produces error messages and types
 *     the form data — single source of truth).
 */

/**
 * URL-safe slug: lowercase letters, digits, hyphens. No leading/trailing
 * hyphens. 1–60 chars.
 */
export const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required.")
  .max(60, "Slug must be 60 characters or fewer.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only.");

export const categoryCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(80, "Name must be 80 characters or fewer."),
  slug: slugSchema,
  /** Short blurb shown under the category. Empty string clears it. */
  description: z
    .string()
    .trim()
    .max(280, "Description must be 280 characters or fewer.")
    .optional()
    .or(z.literal("")),
  /** Lucide icon name (e.g. "sprout"). Loose validation by design. */
  icon: z
    .string()
    .trim()
    .min(1, "Icon is required.")
    .max(40, "Icon name is too long."),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

export const categoryReorderSchema = z.object({
  /** New order of category ids, top to bottom. */
  ids: z.array(z.uuid("Each id must be a UUID.")).min(1, "Provide at least one id."),
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type CategoryReorderInput = z.infer<typeof categoryReorderSchema>;

/**
 * Slugify a free-form name. Used by the admin UI to auto-fill the slug field
 * as the user types the name, and as a server-side fallback.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
