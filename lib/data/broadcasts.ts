import "server-only";
import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  ilike,
  inArray,
  or,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  addresses,
  broadcasts,
  user,
  type Broadcast,
  type BroadcastSegmentParams,
} from "@/db/schema";
import { APIError, type ListMeta } from "@/lib/api/response";
import {
  canTransitionBroadcast,
  type BroadcastStatusValue,
} from "@/lib/broadcasts/transitions";
import type {
  BroadcastCreateInput,
  BroadcastUpdateInput,
} from "@/lib/schemas/broadcast";

export type BroadcastSortField = "createdAt" | "scheduleAt" | "sentAt" | "status";

export type BroadcastListParams = {
  page: number;
  perPage: number;
  search?: string;
  sort: { field: BroadcastSortField; direction: "asc" | "desc" };
  filters: { status?: BroadcastStatusValue };
};

const orderColumn = {
  createdAt: broadcasts.createdAt,
  scheduleAt: broadcasts.scheduleAt,
  sentAt: broadcasts.sentAt,
  status: broadcasts.status,
} as const satisfies Record<BroadcastSortField, unknown>;

function buildWhere(params: BroadcastListParams): SQL | undefined {
  const clauses: SQL[] = [];
  if (params.search) {
    const like = `%${params.search}%`;
    const match = or(ilike(broadcasts.title, like), ilike(broadcasts.body, like));
    if (match) clauses.push(match);
  }
  if (params.filters.status) {
    clauses.push(eq(broadcasts.status, params.filters.status));
  }
  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return and(...clauses);
}

export async function listBroadcasts(
  params: BroadcastListParams,
): Promise<{ rows: Broadcast[]; meta: ListMeta }> {
  const where = buildWhere(params);
  const column = orderColumn[params.sort.field];
  const orderBy = params.sort.direction === "asc" ? asc(column) : desc(column);
  const offset = (params.page - 1) * params.perPage;

  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(broadcasts)
      .where(where)
      .orderBy(orderBy, asc(broadcasts.id))
      .limit(params.perPage)
      .offset(offset),
    db.select({ value: count() }).from(broadcasts).where(where),
  ]);

  return {
    rows,
    meta: {
      page: params.page,
      perPage: params.perPage,
      total: totals[0]?.value ?? 0,
    },
  };
}

export async function getBroadcastById(id: string): Promise<Broadcast | null> {
  const [row] = await db
    .select()
    .from(broadcasts)
    .where(eq(broadcasts.id, id))
    .limit(1);
  return row ?? null;
}

export async function createBroadcast(input: BroadcastCreateInput): Promise<Broadcast> {
  const [row] = await db
    .insert(broadcasts)
    .values({
      title: input.title,
      body: input.body,
      segment: input.segment,
      segmentParams: input.segmentParams as BroadcastSegmentParams,
      status: "draft",
    })
    .returning();
  if (!row) throw new APIError("INTERNAL", "Failed to create broadcast.");
  return row;
}

export async function updateBroadcast(
  id: string,
  patch: BroadcastUpdateInput,
): Promise<{ before: Broadcast; after: Broadcast }> {
  const before = await getBroadcastById(id);
  if (!before) throw new APIError("NOT_FOUND", "Broadcast not found.");
  if (before.status !== "draft") {
    throw new APIError("CONFLICT", "Only drafts can be edited.");
  }

  const next: Partial<typeof broadcasts.$inferInsert> = {};
  if (patch.title !== undefined) next.title = patch.title;
  if (patch.body !== undefined) next.body = patch.body;
  if (patch.segment !== undefined) next.segment = patch.segment;
  if (patch.segmentParams !== undefined) {
    next.segmentParams = patch.segmentParams as BroadcastSegmentParams;
  }

  const [after] = await db
    .update(broadcasts)
    .set(next)
    .where(eq(broadcasts.id, id))
    .returning();
  if (!after) throw new APIError("INTERNAL", "Failed to update broadcast.");
  return { before, after };
}

export async function deleteBroadcast(id: string): Promise<Broadcast> {
  const before = await getBroadcastById(id);
  if (!before) throw new APIError("NOT_FOUND", "Broadcast not found.");
  if (before.status !== "draft") {
    throw new APIError(
      "CONFLICT",
      "Sent or scheduled broadcasts are kept for history — cancel instead.",
    );
  }
  const [deleted] = await db
    .delete(broadcasts)
    .where(eq(broadcasts.id, id))
    .returning();
  if (!deleted) throw new APIError("INTERNAL", "Failed to delete broadcast.");
  return deleted;
}

function assertTransition(
  before: Broadcast,
  to: BroadcastStatusValue,
): void {
  if (!canTransitionBroadcast(before.status, to)) {
    throw new APIError(
      "CONFLICT",
      `Can't move a broadcast from "${before.status}" to "${to}".`,
    );
  }
}

export async function scheduleBroadcast(input: {
  id: string;
  scheduleAt: Date;
}): Promise<{ before: Broadcast; after: Broadcast }> {
  if (input.scheduleAt.getTime() <= Date.now() + 30_000) {
    throw new APIError("BAD_REQUEST", "Schedule at least 30 seconds in the future.");
  }
  const before = await getBroadcastById(input.id);
  if (!before) throw new APIError("NOT_FOUND", "Broadcast not found.");
  assertTransition(before, "scheduled");

  const [after] = await db
    .update(broadcasts)
    .set({ status: "scheduled", scheduleAt: input.scheduleAt })
    .where(eq(broadcasts.id, input.id))
    .returning();
  if (!after) throw new APIError("INTERNAL", "Failed to schedule broadcast.");
  return { before, after };
}

/**
 * Marks a broadcast `sent` and records the intended recipient count in
 * `stats.sent`. Actual Expo Push / FCM delivery is wired separately when
 * device tokens are available — this is the bookkeeping step.
 */
export async function sendBroadcast(input: {
  id: string;
  recipientCount: number;
}): Promise<{ before: Broadcast; after: Broadcast }> {
  const before = await getBroadcastById(input.id);
  if (!before) throw new APIError("NOT_FOUND", "Broadcast not found.");
  assertTransition(before, "sent");

  const [after] = await db
    .update(broadcasts)
    .set({
      status: "sent",
      sentAt: new Date(),
      stats: { sent: input.recipientCount, opened: 0 },
    })
    .where(eq(broadcasts.id, input.id))
    .returning();
  if (!after) throw new APIError("INTERNAL", "Failed to send broadcast.");
  return { before, after };
}

export async function cancelBroadcast(
  id: string,
): Promise<{ before: Broadcast; after: Broadcast }> {
  const before = await getBroadcastById(id);
  if (!before) throw new APIError("NOT_FOUND", "Broadcast not found.");
  assertTransition(before, "cancelled");

  const [after] = await db
    .update(broadcasts)
    .set({ status: "cancelled" })
    .where(eq(broadcasts.id, id))
    .returning();
  if (!after) throw new APIError("INTERNAL", "Failed to cancel broadcast.");
  return { before, after };
}

/**
 * Computes how many users would receive a broadcast with this segment config.
 * Best-effort — `crop` segmentation isn't supported until a user-crops table
 * exists, and `region` matches via address state.
 */
export async function computeRecipientCount(
  segment: string,
  params: BroadcastSegmentParams,
): Promise<{ count: number; approximate: boolean }> {
  if (segment === "all") {
    const [{ value }] = (await db.select({ value: count() }).from(user)) as [
      { value: number },
    ];
    return { count: value, approximate: false };
  }
  if (segment === "role" && params.role) {
    const [{ value }] = (await db
      .select({ value: count() })
      .from(user)
      .where(eq(user.role, params.role))) as [{ value: number }];
    return { count: value, approximate: false };
  }
  if (segment === "user_ids" && params.userIds) {
    if (params.userIds.length === 0) return { count: 0, approximate: false };
    const [{ value }] = (await db
      .select({ value: count() })
      .from(user)
      .where(inArray(user.id, params.userIds))) as [{ value: number }];
    return { count: value, approximate: false };
  }
  if (segment === "region" && params.region) {
    const [{ value }] = (await db
      .select({ value: countDistinct(addresses.userId) })
      .from(addresses)
      .where(eq(addresses.state, params.region))) as [{ value: number }];
    return { count: value, approximate: true };
  }
  // crop, or under-specified segments
  return { count: 0, approximate: true };
}

export function broadcastDiff(
  before: Broadcast,
  after: Broadcast,
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  const keys: (keyof Broadcast)[] = [
    "title",
    "body",
    "segment",
    "status",
    "scheduleAt",
    "sentAt",
  ];
  for (const key of keys) {
    const beforeValue = before[key] instanceof Date ? before[key]?.toISOString() : before[key];
    const afterValue = after[key] instanceof Date ? after[key]?.toISOString() : after[key];
    if (beforeValue !== afterValue) {
      diff[key] = { from: before[key], to: after[key] };
    }
  }
  if (JSON.stringify(before.segmentParams) !== JSON.stringify(after.segmentParams)) {
    diff.segmentParams = { from: before.segmentParams, to: after.segmentParams };
  }
  return diff;
}
