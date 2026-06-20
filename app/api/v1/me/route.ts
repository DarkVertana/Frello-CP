import type { NextRequest } from "next/server";
import { APIError, ok, withErrorHandling } from "@/lib/api/response";
import { requireSession } from "@/lib/api/auth";
import { recordAudit } from "@/lib/audit";
import {
  getUserById,
  updateProfile,
  userDiff,
  type UserRow,
} from "@/lib/data/users";
import { profileUpdateSchema } from "@/lib/schemas/profile";

/** Public-facing profile shape — the `user` row has no secrets, but we curate. */
function toProfile(row: UserRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    image: row.image,
    role: row.role,
    status: row.status,
    emailVerified: row.emailVerified,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastSeenAt: row.lastSeenAt,
  };
}

/**
 * GET /api/v1/me — the signed-in user's own profile.
 *
 * Auth: any valid session — cookie (web) or `Authorization: Bearer <token>`
 * (mobile, via the bearer plugin).
 */
export function GET() {
  return withErrorHandling(async () => {
    const { user } = await requireSession();
    const row = await getUserById(user.id);
    if (!row) throw new APIError("NOT_FOUND", "Profile not found.");
    return ok(toProfile(row));
  });
}

/**
 * PATCH /api/v1/me — update your own full name, email, and/or mobile number.
 *
 * Body: { name?, email?, phone? } — send only what changed.
 * 200 → updated profile · 409 → email already in use · 422 → validation.
 */
export function PATCH(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user } = await requireSession();
    const patch = profileUpdateSchema.parse(await request.json());

    const { before, after } = await updateProfile(user.id, patch);

    await recordAudit({
      actorId: user.id,
      action: "profile.update",
      entityType: "user",
      entityId: user.id,
      diff: userDiff(before, after),
    });

    return ok(toProfile(after));
  });
}
