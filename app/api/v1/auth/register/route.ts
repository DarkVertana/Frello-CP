import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { APIError, created, withErrorHandling } from "@/lib/api/response";
import { rethrowAuthError } from "@/lib/api/auth";
import { registerSchema } from "@/lib/schemas/auth";

/**
 * POST /api/v1/auth/register
 *
 * Creates an account (role is always "viewer" — never client-set) and, since
 * `autoSignIn` is enabled in lib/auth.ts, signs the user in: the session
 * Set-Cookie header is forwarded for web clients, and the session token is
 * returned in the body for mobile clients.
 *
 * Body:  { name, email, password }
 * 201 →  { data: { user, token } }
 * 422 →  validation envelope · 409/422 → email already registered
 */
export function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const body = registerSchema.parse(await request.json().catch(() => null));

    const { headers, response } = await auth.api
      .signUpEmail({ body, returnHeaders: true })
      .catch(rethrowAuthError);

    if (!response) {
      throw new APIError("INTERNAL", "Sign-up did not return a session.");
    }

    const res = created({ user: response.user, token: response.token });
    for (const cookie of headers.getSetCookie()) {
      res.headers.append("set-cookie", cookie);
    }
    return res;
  });
}
