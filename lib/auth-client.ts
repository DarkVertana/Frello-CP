"use client";

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./auth";

/**
 * Browser-side auth client. `inferAdditionalFields` carries the role/status/
 * phone/lastSeenAt typing across to client-side `useSession()` consumers, so
 * `session.user.role` is strongly typed everywhere.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [inferAdditionalFields<typeof auth>()],
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
