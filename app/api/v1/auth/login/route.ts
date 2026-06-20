import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { APIError, ok, withErrorHandling } from "@/lib/api/response";
import { rethrowAuthError } from "@/lib/api/auth";
import { loginSchema } from "@/lib/schemas/auth";

/**
 * POST /api/v1/auth/login
 *
 * Email/password sign-in. On success the session Set-Cookie header is forwarded
 * for web clients and the session token is returned in the body for mobile.
 * Bad credentials surface as 401 UNAUTHORIZED via the standard error envelope.
 *
 * Body:  { email, password }
 * 200 →  { data: { user, token } }
 * 401 →  invalid email or password
 */
export function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const body = loginSchema.parse(await request.json().catch(() => null));

    const { headers, response } = await auth.api
      .signInEmail({ body, returnHeaders: true })
      .catch(rethrowAuthError);

    if (!response) {
      throw new APIError("UNAUTHORIZED", "Invalid email or password.");
    }

    const res = ok({ user: response.user, token: response.token });
    for (const cookie of headers.getSetCookie()) {
      res.headers.append("set-cookie", cookie);
    }
    return res;
  });
}
