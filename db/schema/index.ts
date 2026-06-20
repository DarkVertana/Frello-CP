/**
 * Single re-export point for the Drizzle schema. Imported by:
 *   - db/index.ts (the drizzle client)
 *   - drizzle.config.ts (drizzle-kit)
 *   - any feature module that needs table refs
 *
 * Better Auth's user/session/account/verification tables live in ./auth.ts and
 * are generated/refreshed by `npx @better-auth/cli generate` whenever the
 * auth config in lib/auth.ts changes (e.g. when adding `additionalFields`).
 */
export * from "./auth";
export * from "./enums";
export * from "./commerce";
export * from "./customer";
export * from "./support";
export * from "./plants";
export * from "./ops";
export * from "./blog";
