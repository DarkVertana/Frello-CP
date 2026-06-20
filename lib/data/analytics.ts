import "server-only";
import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  not,
  notInArray,
  sql,
  sum,
} from "drizzle-orm";
import { db } from "@/db";
import {
  diseases,
  orderItems,
  orders,
  products,
  scans,
  session,
  tickets,
  user,
} from "@/db/schema";

/**
 * Dashboard analytics. Each function runs a single tight query — the
 * dashboard page fires them in parallel with `Promise.all`.
 *
 * Buckets and windows are computed in app code (Date math) so the same query
 * compiles cleanly across Postgres versions and Drizzle adapters.
 */

function startOfTodayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function daysAgoUTC(days: number): Date {
  const d = startOfTodayUTC();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

/** Headline KPI strip on the dashboard. */
export type KpiSnapshot = {
  totalUsers: number;
  mau7d: number;
  signUpsToday: number;
  ordersToday: number;
  revenueToday: number;
  revenue30d: number;
  openTickets: number;
  scans7d: number;
};

export async function getKpiSnapshot(): Promise<KpiSnapshot> {
  const today = startOfTodayUTC();
  const sevenDaysAgo = daysAgoUTC(7);
  const thirtyDaysAgo = daysAgoUTC(30);

  // Orders that don't count toward revenue. Plain mutable array —
  // Drizzle's `notInArray` rejects readonly tuples.
  const settledStatus: ("cancelled" | "refunded")[] = ["cancelled", "refunded"];

  const [
    totalUsersRow,
    mauRow,
    signUpsRow,
    ordersTodayRow,
    revenueTodayRow,
    revenue30dRow,
    openTicketsRow,
    scans7dRow,
  ] = await Promise.all([
    db.select({ value: count() }).from(user),
    db
      .select({ value: countDistinct(session.userId) })
      .from(session)
      .where(gte(session.createdAt, sevenDaysAgo)),
    db
      .select({ value: count() })
      .from(user)
      .where(gte(user.createdAt, today)),
    db
      .select({ value: count() })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, today),
          notInArray(orders.status, settledStatus),
        ),
      ),
    db
      .select({ value: sum(orders.total) })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, today),
          notInArray(orders.status, settledStatus),
        ),
      ),
    db
      .select({ value: sum(orders.total) })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, thirtyDaysAgo),
          notInArray(orders.status, settledStatus),
        ),
      ),
    db
      .select({ value: count() })
      .from(tickets)
      .where(eq(tickets.status, "open")),
    db
      .select({ value: count() })
      .from(scans)
      .where(gte(scans.createdAt, sevenDaysAgo)),
  ]);

  const toInt = (raw: unknown): number => {
    if (raw === null || raw === undefined) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  };

  return {
    totalUsers: toInt(totalUsersRow[0]?.value),
    mau7d: toInt(mauRow[0]?.value),
    signUpsToday: toInt(signUpsRow[0]?.value),
    ordersToday: toInt(ordersTodayRow[0]?.value),
    revenueToday: toInt(revenueTodayRow[0]?.value),
    revenue30d: toInt(revenue30dRow[0]?.value),
    openTickets: toInt(openTicketsRow[0]?.value),
    scans7d: toInt(scans7dRow[0]?.value),
  };
}

/**
 * 30-day revenue line — daily buckets, ascending. Days with no settled
 * orders are filled with zero so the chart x-axis is continuous.
 */
export async function getRevenue30d(): Promise<
  { date: string; revenue: number }[]
> {
  const start = daysAgoUTC(29); // 30 buckets including today
  const rows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'YYYY-MM-DD')`,
      revenue: sum(orders.total),
    })
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, start),
        not(eq(orders.status, "cancelled")),
        not(eq(orders.status, "refunded")),
      ),
    )
    .groupBy(sql`date_trunc('day', ${orders.createdAt})`);

  const lookup = new Map<string, number>();
  for (const row of rows) {
    lookup.set(row.day, Number(row.revenue ?? 0));
  }

  const series: { date: string; revenue: number }[] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const day = daysAgoUTC(i).toISOString().slice(0, 10);
    series.push({ date: day, revenue: lookup.get(day) ?? 0 });
  }
  return series;
}

/** Top 5 detected diseases over the last 7 days, joined to the KB entry. */
export async function getTopDiseases7d(): Promise<
  { label: string; crop: string; disease: string; count: number }[]
> {
  const sevenDaysAgo = daysAgoUTC(7);
  const rows = await db
    .select({
      label: scans.predictedLabel,
      crop: diseases.crop,
      disease: diseases.disease,
      count: count(),
    })
    .from(scans)
    .leftJoin(diseases, eq(scans.predictedLabel, diseases.label))
    .where(gte(scans.createdAt, sevenDaysAgo))
    .groupBy(scans.predictedLabel, diseases.crop, diseases.disease)
    .orderBy(desc(count()))
    .limit(5);

  return rows.map((row) => ({
    label: row.label,
    crop: row.crop ?? "Unknown",
    disease: row.disease ?? row.label,
    count: row.count,
  }));
}

/** Top 5 products by units sold (orders not cancelled/refunded). */
export async function getTopProducts(): Promise<
  { productId: string; name: string; units: number }[]
> {
  const rows = await db
    .select({
      productId: orderItems.productId,
      name: products.name,
      units: sum(orderItems.qty),
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .leftJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        not(eq(orders.status, "cancelled")),
        not(eq(orders.status, "refunded")),
      ),
    )
    .groupBy(orderItems.productId, products.name)
    .orderBy(desc(sum(orderItems.qty)))
    .limit(5);

  return rows.map((row) => ({
    productId: row.productId,
    name: row.name ?? "(deleted)",
    units: Number(row.units ?? 0),
  }));
}

/** Newest 5 orders for the recent-orders panel. */
export async function getRecentOrders(limit = 5) {
  return db
    .select({
      id: orders.id,
      status: orders.status,
      total: orders.total,
      createdAt: orders.createdAt,
      customerName: user.name,
    })
    .from(orders)
    .leftJoin(user, eq(orders.userId, user.id))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

/** Newest 5 scans for the recent-scans panel. */
export async function getRecentScans(limit = 5) {
  return db
    .select({
      id: scans.id,
      photoUrl: scans.photoUrl,
      predictedLabel: scans.predictedLabel,
      confidence: scans.confidence,
      flagged: scans.flagged,
      createdAt: scans.createdAt,
      customerName: user.name,
    })
    .from(scans)
    .leftJoin(user, eq(scans.userId, user.id))
    .orderBy(desc(scans.createdAt))
    .limit(limit);
}
