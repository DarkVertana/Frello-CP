import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

/**
 * Better Auth's catch-all route. Handles sign-in, sign-up, sign-out, session,
 * magic-link verification — every `authClient.*` call hits here.
 */
export const { POST, GET } = toNextJsHandler(auth);
