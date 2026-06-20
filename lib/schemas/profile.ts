import { z } from "zod";

/** Trim + lowercase so emails are stored/compared canonically. */
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

/**
 * Self-service profile update (the signed-in user editing their own account).
 * Every field is optional — send only what changed — but at least one must be
 * present. Unlike the admin user update, this also allows changing `email`.
 */
export const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(120).optional(),
    email: email.optional(),
    /** Mobile number. Empty string clears it. */
    phone: z.string().trim().max(40).optional().or(z.literal("")),
  })
  .refine(
    (v) => v.name !== undefined || v.email !== undefined || v.phone !== undefined,
    { message: "Provide at least one field to update." },
  );

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
