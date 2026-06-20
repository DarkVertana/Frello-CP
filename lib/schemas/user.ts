import { z } from "zod";

/** Two roles only: full access vs read-only. */
export const roleEnum = z.enum(["admin", "viewer"]);

export const statusEnum = z.enum(["active", "banned"]);

export type Role = z.infer<typeof roleEnum>;
export type Status = z.infer<typeof statusEnum>;

/** Trim + lowercase before validating, so emails are stored canonically. */
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

/**
 * Create a staff/customer account from the admin Users page. Unlike sign-up,
 * `role` is admin-settable here (the route gates on `canManage`). Mirrors Better
 * Auth's `minPasswordLength: 8` so the validation error is clean.
 */
export const userCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  email,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password is too long."),
  role: roleEnum.default("viewer"),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
});

/** Free-form update of common user fields. */
export const userUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
});

export const setRoleSchema = z.object({
  role: roleEnum,
});

export const banSchema = z.object({
  /** Optional reason recorded in the audit entry. */
  reason: z.string().trim().max(280).optional(),
});

/** Query parameters for the list page filters. */
export const userListFiltersSchema = z.object({
  role: roleEnum.optional(),
  status: statusEnum.optional(),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type SetRoleInput = z.infer<typeof setRoleSchema>;
export type BanInput = z.infer<typeof banSchema>;
export type UserListFilters = z.infer<typeof userListFiltersSchema>;
