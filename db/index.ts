import "./env";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and point it at your Postgres instance.",
  );
}

declare global {
  var __plantplusPool: Pool | undefined;
}

// Reuse one pool across Next.js dev-server hot reloads to avoid connection exhaustion.
const pool = globalThis.__plantplusPool ?? new Pool({ connectionString: url });
if (process.env.NODE_ENV !== "production") {
  globalThis.__plantplusPool = pool;
}

export const db = drizzle(pool, { schema, casing: "snake_case" });
export type DB = typeof db;
