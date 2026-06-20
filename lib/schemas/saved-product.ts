import { z } from "zod";

/** Product UUID — matches the format used elsewhere for product ids. */
const productId = z
  .string()
  .trim()
  .regex(/^[0-9a-f-]{36}$/i, "Enter a valid product id.");

/**
 * Save (favourite) a product. Self-service callers omit `userId` (their own
 * account is used); admins may set it to save on another user's behalf. The
 * route resolves + authorizes the final owner.
 */
export const savedProductCreateSchema = z.object({
  userId: z.string().trim().min(1).optional(),
  productId,
});

export type SavedProductCreateInput = z.infer<typeof savedProductCreateSchema>;
