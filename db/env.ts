/**
 * Loads environment variables for standalone scripts (drizzle-kit, tsx seed).
 *
 * Mirrors Next.js's loading order: `.env.local` first (gitignored, real
 * secrets), then `.env` (committed defaults). Next.js loads these itself for
 * the dev/build server; this file is only needed for CLI entry points.
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config(); // .env fallback
