import { z } from "zod";

const productId = z
  .string()
  .trim()
  .regex(/^[0-9a-f-]{36}$/i, "Enter a valid product id.");

/**
 * Add a product to the cart. Self-service callers omit `userId` (their own
 * account is used); admins may set it. Adding a product already in the cart
 * increments its quantity by `quantity`.
 */
export const cartAddSchema = z.object({
  userId: z.string().trim().min(1).optional(),
  productId,
  quantity: z.coerce.number().int().min(1).max(999).default(1),
});

/** Set a line's quantity to an exact value. */
export const cartUpdateSchema = z.object({
  quantity: z.coerce
    .number()
    .int()
    .min(1, "Quantity must be at least 1.")
    .max(999, "Quantity is too large."),
});

export type CartAddInput = z.infer<typeof cartAddSchema>;
export type CartUpdateInput = z.infer<typeof cartUpdateSchema>;
