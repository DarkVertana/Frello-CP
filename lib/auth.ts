import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";

/**
 * Plant+ auth instance.
 *
 * - Email/password is the only login path. (Magic-link + OAuth removed.)
 * - `additionalFields` extend Better Auth's `user` table with Plant+ specific
 *   columns (role, status, phone, lastSeenAt). Those columns are visible to
 *   the CLI when running `npx @better-auth/cli generate`.
 *
 * Roles: "admin" (full write access) or "viewer" (read-only). New sign-ups
 * default to "viewer" — a Super-Admin promotes via the Users page.
 */
export const auth = betterAuth({
  appName: "Plant+",
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  trustedOrigins: process.env.BETTER_AUTH_URL
    ? [process.env.BETTER_AUTH_URL]
    : undefined,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      // Role is server-set; never accepted from sign-up input.
      role: {
        type: "string",
        required: true,
        defaultValue: "viewer",
        input: false,
      },
      status: {
        type: "string",
        required: true,
        defaultValue: "active",
        input: false,
      },
      phone: {
        type: "string",
        required: false,
      },
      lastSeenAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
  plugins: [
    // Lets mobile clients authenticate with `Authorization: Bearer <token>`
    // instead of cookies. On sign-in/up the signed token is also echoed in the
    // `set-auth-token` response header; the raw `token` in the response body
    // works as a bearer too (the plugin re-signs + verifies it).
    bearer(),
    // Must be last: writes Set-Cookie headers via the Next.js cookies() API.
    nextCookies(),
  ],
});

export type Auth = typeof auth;
export type Session = Auth["$Infer"]["Session"];
