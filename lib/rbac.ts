/**
 * Plant+ role-based access control.
 *
 * The role lives on Better Auth's `user.role` column (defined in `lib/auth.ts`
 * via `additionalFields`). There are exactly two values:
 *
 *   - "admin"  — full read + write access
 *   - "viewer" — read-only across the admin shell
 *
 * Older snapshots had `super_admin / manager / support_agent / customer`. The
 * one-off migration in `db/migrate-roles.ts` collapses them to admin / viewer.
 */

export type Role = "admin" | "viewer";

/** Both roles are allowed inside the admin shell. */
export const STAFF_ROLES = ["admin", "viewer"] as const satisfies readonly Role[];

/** Predicate used by the admin layout to gate the entire shell. */
export function isAdmin(role: string | null | undefined): role is Role {
  return role === "admin" || role === "viewer";
}

/** Write access: create / update / delete / state transitions / replies. */
export function canManage(role: string | null | undefined): boolean {
  return role === "admin";
}

/** Same as `canManage` — kept for back-compat with ticket/scan routes. */
export function canSupport(role: string | null | undefined): boolean {
  return role === "admin";
}

/** Role changes on the Users page. With only one writable role, equivalent to canManage. */
export function isSuperAdmin(role: string | null | undefined): boolean {
  return role === "admin";
}
