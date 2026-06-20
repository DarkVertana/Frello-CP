import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "./auth";

/**
 * Server-side session reader. Wrapped in `cache()` so multiple consumers in a
 * single request (layout, page, action) share one Better Auth call.
 */
export const getSession = cache(async () => {
  return await auth.api.getSession({ headers: await headers() });
});

export type CurrentUser = NonNullable<
  Awaited<ReturnType<typeof getSession>>
>["user"];
