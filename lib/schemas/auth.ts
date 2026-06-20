import { z } from "zod";

/** Trim + lowercase before validating, so logins match regardless of casing. */
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

/**
 * POST /api/v1/auth/register body.
 *
 * `role`/`status` are intentionally absent — they're server-set on the user
 * table (`input: false` in lib/auth.ts), so a client can never self-promote.
 */
export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  email,
  // Mirrors Better Auth's `minPasswordLength: 8` so the 422 is clean.
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password is too long."),
});

/** POST /api/v1/auth/login body. */
export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
