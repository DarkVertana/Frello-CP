import "server-only";
import { isAPIError } from "better-auth/api";
import { getSession, type CurrentUser } from "@/lib/session";
import { APIError, type ApiErrorCode } from "./response";

/**
 * Require an authenticated session on a route handler. Throws an APIError
 * caught by `withErrorHandling` and returned as a 401 envelope.
 */
export async function requireSession(): Promise<{ user: CurrentUser }> {
  const session = await getSession();
  if (!session) {
    throw new APIError("UNAUTHORIZED", "Sign in to continue.");
  }
  return { user: session.user };
}

/**
 * Require the current user to satisfy `predicate` (a role guard from
 * lib/rbac.ts, e.g. `canManage`). 401 if no session, 403 if signed in but
 * not allowed.
 */
export async function requireRole(
  predicate: (role: string | null | undefined) => boolean,
): Promise<{ user: CurrentUser }> {
  const { user } = await requireSession();
  if (!predicate(user.role)) {
    throw new APIError("FORBIDDEN", "You don't have permission for that.");
  }
  return { user };
}

const AUTH_STATUS_TO_CODE: Record<number, ApiErrorCode> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "VALIDATION",
  429: "BAD_REQUEST",
};

/**
 * Re-throw a Better Auth error as the Plant+ APIError envelope. Better Auth
 * throws its own APIError class (numeric `statusCode` + `body.message`), which
 * `withErrorHandling` doesn't recognise — so without this a bad password would
 * surface as a 500 instead of a 401. Non-auth errors are re-thrown untouched.
 */
export function rethrowAuthError(error: unknown): never {
  if (isAPIError(error)) {
    const e = error as {
      statusCode?: number;
      body?: { message?: string };
      message?: string;
    };
    const code = AUTH_STATUS_TO_CODE[e.statusCode ?? 500] ?? "INTERNAL";
    throw new APIError(
      code,
      e.body?.message ?? e.message ?? "Authentication failed.",
    );
  }
  throw error;
}
