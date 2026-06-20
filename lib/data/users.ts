import "server-only";
import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { auditEntries, session, user } from "@/db/schema";
import { APIError, type ListMeta } from "@/lib/api/response";
import type {
  Role,
  UserCreateInput,
  UserListFilters,
  UserUpdateInput,
} from "@/lib/schemas/user";
import type { ProfileUpdateInput } from "@/lib/schemas/profile";

/**
 * Users data layer. Operates on Better Auth's `user` table extended with our
 * `role`, `status`, `phone`, `lastSeenAt` columns (declared via
 * `additionalFields` in `lib/auth.ts`).
 *
 * - Domain tables (orders, tickets, scans, addresses, payment_methods) store
 *   `user_id` as plain text without a foreign-key constraint yet. Hard-deleting
 *   a user therefore leaves those rows in place. Phase polish will add FKs +
 *   cascading deletes.
 */

export type UserRow = typeof user.$inferSelect;

export type UserListParams = {
  page: number;
  perPage: number;
  search?: string;
  sort: { field: UserSortField; direction: "asc" | "desc" };
  filters: UserListFilters;
};

export type UserSortField =
  | "name"
  | "email"
  | "role"
  | "status"
  | "createdAt"
  | "lastSeenAt";

const orderColumn = {
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt,
  lastSeenAt: user.lastSeenAt,
} as const satisfies Record<UserSortField, unknown>;

function buildWhere(params: UserListParams): SQL | undefined {
  const clauses: SQL[] = [];
  if (params.search) {
    const like = `%${params.search}%`;
    const match = or(
      ilike(user.name, like),
      ilike(user.email, like),
      ilike(user.phone, like),
    );
    if (match) clauses.push(match);
  }
  if (params.filters.role) clauses.push(eq(user.role, params.filters.role));
  if (params.filters.status) clauses.push(eq(user.status, params.filters.status));
  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return and(...clauses);
}

export async function listUsers(
  params: UserListParams,
): Promise<{ rows: UserRow[]; meta: ListMeta }> {
  const where = buildWhere(params);
  const column = orderColumn[params.sort.field];
  const orderBy = params.sort.direction === "asc" ? asc(column) : desc(column);
  const offset = (params.page - 1) * params.perPage;

  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(user)
      .where(where)
      .orderBy(orderBy, asc(user.id))
      .limit(params.perPage)
      .offset(offset),
    db.select({ value: count() }).from(user).where(where),
  ]);

  return {
    rows,
    meta: {
      page: params.page,
      perPage: params.perPage,
      total: totals[0]?.value ?? 0,
    },
  };
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const [row] = await db.select().from(user).where(eq(user.id, id)).limit(1);
  return row ?? null;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

/**
 * Create a user from the admin panel.
 *
 * Uses Better Auth's internal adapter directly (via `auth.$context`) rather than
 * `signUpEmail` on purpose: sign-up auto-signs-in and the `nextCookies()` plugin
 * would write the *new* user's session cookie into the admin's browser, logging
 * them out of their own account. The internal adapter creates the `user` row +
 * credential `account` (hashed password) without ever issuing a session — the
 * same path Better Auth's own admin plugin uses. `role`/`status` bypass the
 * `input: false` guards here because that filtering only runs in the HTTP layer.
 */
export async function createUser(input: UserCreateInput): Promise<UserRow> {
  const email = input.email.toLowerCase();

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (existing) {
    throw new APIError("CONFLICT", "A user with that email already exists.", {
      email: "That email is already registered.",
    });
  }

  const ctx = await auth.$context;

  let created: UserRow | null = null;
  try {
    created = (await ctx.internalAdapter.createUser({
      email,
      name: input.name,
      role: input.role,
      status: "active",
      phone: input.phone ? input.phone : null,
      emailVerified: false,
    })) as UserRow;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new APIError("CONFLICT", "A user with that email already exists.", {
        email: "That email is already registered.",
      });
    }
    throw error;
  }
  if (!created) throw new APIError("INTERNAL", "Failed to create user.");

  const hashedPassword = await ctx.password.hash(input.password);
  await ctx.internalAdapter.linkAccount({
    userId: created.id,
    providerId: "credential",
    accountId: created.id,
    password: hashedPassword,
  });

  // Re-read so callers get a full, canonical `UserRow` (Date objects, every
  // column) rather than the adapter's create-time projection.
  const row = await getUserById(created.id);
  if (!row) throw new APIError("INTERNAL", "Failed to load the new user.");
  return row;
}

export async function updateUserProfile(
  id: string,
  patch: UserUpdateInput,
): Promise<{ before: UserRow; after: UserRow }> {
  const before = await getUserById(id);
  if (!before) throw new APIError("NOT_FOUND", "User not found.");

  const next = {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.phone !== undefined ? { phone: patch.phone || null } : {}),
    updatedAt: new Date(),
  };

  const [after] = await db.update(user).set(next).where(eq(user.id, id)).returning();
  if (!after) throw new APIError("INTERNAL", "Failed to update user.");
  return { before, after };
}

/**
 * Self-service profile update — the signed-in user editing their own name,
 * email, and phone. Unlike {@link updateUserProfile} (admin, name+phone only),
 * this also allows changing the email, enforcing case-insensitive uniqueness
 * so two accounts can never share one. Login continues to work on the new
 * email — Better Auth looks credentials up by `user.email`.
 */
export async function updateProfile(
  id: string,
  patch: ProfileUpdateInput,
): Promise<{ before: UserRow; after: UserRow }> {
  const before = await getUserById(id);
  if (!before) throw new APIError("NOT_FOUND", "Profile not found.");

  if (patch.email !== undefined && patch.email !== before.email) {
    const [clash] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, patch.email))
      .limit(1);
    if (clash && clash.id !== id) {
      throw new APIError("CONFLICT", "That email is already in use.", {
        email: "That email is already registered.",
      });
    }
  }

  const next = {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.email !== undefined ? { email: patch.email } : {}),
    ...(patch.phone !== undefined ? { phone: patch.phone || null } : {}),
    updatedAt: new Date(),
  };

  const [after] = await db.update(user).set(next).where(eq(user.id, id)).returning();
  if (!after) throw new APIError("INTERNAL", "Failed to update profile.");
  return { before, after };
}

export async function setUserRole(
  id: string,
  role: Role,
): Promise<{ before: UserRow; after: UserRow }> {
  const before = await getUserById(id);
  if (!before) throw new APIError("NOT_FOUND", "User not found.");

  const [after] = await db
    .update(user)
    .set({ role, updatedAt: new Date() })
    .where(eq(user.id, id))
    .returning();
  if (!after) throw new APIError("INTERNAL", "Failed to change role.");
  return { before, after };
}

/**
 * Mark a user banned and kill every active session so the next request from
 * any of their devices triggers a fresh login (which is then blocked by the
 * status check downstream).
 */
export async function banUser(id: string): Promise<UserRow> {
  const before = await getUserById(id);
  if (!before) throw new APIError("NOT_FOUND", "User not found.");
  if (before.status === "banned") return before;

  const [after] = await db
    .update(user)
    .set({ status: "banned", updatedAt: new Date() })
    .where(eq(user.id, id))
    .returning();
  if (!after) throw new APIError("INTERNAL", "Failed to ban user.");

  await db.delete(session).where(eq(session.userId, id));
  return after;
}

export async function unbanUser(id: string): Promise<UserRow> {
  const before = await getUserById(id);
  if (!before) throw new APIError("NOT_FOUND", "User not found.");
  if (before.status === "active") return before;

  const [after] = await db
    .update(user)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(user.id, id))
    .returning();
  if (!after) throw new APIError("INTERNAL", "Failed to unban user.");
  return after;
}

export async function deleteUser(id: string): Promise<UserRow> {
  const before = await getUserById(id);
  if (!before) throw new APIError("NOT_FOUND", "User not found.");
  const [deleted] = await db.delete(user).where(eq(user.id, id)).returning();
  if (!deleted) throw new APIError("INTERNAL", "Failed to delete user.");
  return deleted;
}

/** Recent audit entries either authored by this user or targeting them. */
export async function listUserActivity(userId: string, limit = 50) {
  return db
    .select()
    .from(auditEntries)
    .where(
      or(
        eq(auditEntries.actorId, userId),
        and(eq(auditEntries.entityType, "user"), eq(auditEntries.entityId, userId)),
      ),
    )
    .orderBy(desc(auditEntries.at))
    .limit(limit);
}

/** Quick shape used by KPI cards + the dashboard. */
export async function countUsers(): Promise<number> {
  const [{ value }] = (await db.select({ value: count() }).from(user)) as [
    { value: number },
  ];
  return value;
}

/** Distinct active sessions for a user — surfaced on the detail page. */
export async function countActiveSessions(userId: string): Promise<number> {
  const [{ value }] = (await db
    .select({ value: count() })
    .from(session)
    .where(and(eq(session.userId, userId), sql`${session.expiresAt} > now()`))) as [
    { value: number },
  ];
  return value;
}

export function userDiff(
  before: UserRow,
  after: UserRow,
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  const keys: (keyof UserRow)[] = ["name", "email", "role", "status", "phone"];
  for (const key of keys) {
    if (before[key] !== after[key]) {
      diff[key] = { from: before[key], to: after[key] };
    }
  }
  return diff;
}
