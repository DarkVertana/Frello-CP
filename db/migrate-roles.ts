/**
 * One-off data migration: collapse the five legacy roles into the new
 * two-role world.
 *
 *   super_admin / manager / support_agent → admin
 *   customer                              → viewer
 *   viewer                                → viewer (unchanged)
 *
 * Idempotent — safe to re-run.
 */
import "./env";
import { sql } from "drizzle-orm";
import { db } from "./index";

async function run() {
  console.log("Collapsing user roles…");

  const promoted = await db.execute(
    sql`UPDATE "user" SET role = 'admin' WHERE role IN ('super_admin', 'manager', 'support_agent')`,
  );
  const downgraded = await db.execute(
    sql`UPDATE "user" SET role = 'viewer' WHERE role = 'customer'`,
  );

  const promotedCount = (promoted as { rowCount?: number }).rowCount ?? 0;
  const downgradedCount = (downgraded as { rowCount?: number }).rowCount ?? 0;
  console.log(
    `Done. Promoted to admin: ${promotedCount}, downgraded to viewer: ${downgradedCount}.`,
  );
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
