import "server-only";
import {
  aliasedTable,
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNull,
  or,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  ticketReplies,
  tickets,
  user,
  type Ticket,
  type TicketReply,
  type TicketAttachment,
} from "@/db/schema";
import { APIError, type ListMeta } from "@/lib/api/response";
import {
  canTransitionTicket,
  type TicketStatusValue,
} from "@/lib/tickets/transitions";
import type {
  TicketAssignInput,
  TicketListFilters,
  TicketUpdateInput,
} from "@/lib/schemas/ticket";

export type TicketSortField =
  | "createdAt"
  | "updatedAt"
  | "priority"
  | "status";

export type TicketListParams = {
  page: number;
  perPage: number;
  search?: string;
  sort: { field: TicketSortField; direction: "asc" | "desc" };
  filters: TicketListFilters;
};

const orderColumn = {
  createdAt: tickets.createdAt,
  updatedAt: tickets.updatedAt,
  priority: tickets.priority,
  status: tickets.status,
} as const satisfies Record<TicketSortField, unknown>;

function buildWhere(params: TicketListParams): SQL | undefined {
  const clauses: SQL[] = [];
  if (params.search) {
    const like = `%${params.search}%`;
    const match = or(
      ilike(tickets.subject, like),
      ilike(tickets.category, like),
      ilike(tickets.body, like),
    );
    if (match) clauses.push(match);
  }
  if (params.filters.status) clauses.push(eq(tickets.status, params.filters.status));
  if (params.filters.priority)
    clauses.push(eq(tickets.priority, params.filters.priority));
  if (params.filters.category)
    clauses.push(eq(tickets.category, params.filters.category));
  if (params.filters.unassigned === "true") {
    clauses.push(isNull(tickets.assigneeId));
  } else if (params.filters.assigneeId) {
    clauses.push(eq(tickets.assigneeId, params.filters.assigneeId));
  }
  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return and(...clauses);
}

const assigneeAlias = aliasedTable(user, "assignee");

export type TicketRow = Ticket & {
  customer: { id: string; name: string; email: string } | null;
  assignee: { id: string; name: string } | null;
  replyCount: number;
};

export async function listTickets(
  params: TicketListParams,
): Promise<{ rows: TicketRow[]; meta: ListMeta }> {
  const where = buildWhere(params);
  const column = orderColumn[params.sort.field];
  const orderBy = params.sort.direction === "asc" ? asc(column) : desc(column);
  const offset = (params.page - 1) * params.perPage;

  const [rows, totals] = await Promise.all([
    db
      .select({
        ticket: tickets,
        customer: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        assignee: {
          id: assigneeAlias.id,
          name: assigneeAlias.name,
        },
        replyCount: count(ticketReplies.id),
      })
      .from(tickets)
      .leftJoin(user, eq(tickets.userId, user.id))
      .leftJoin(assigneeAlias, eq(tickets.assigneeId, assigneeAlias.id))
      .leftJoin(ticketReplies, eq(ticketReplies.ticketId, tickets.id))
      .where(where)
      .groupBy(tickets.id, user.id, assigneeAlias.id)
      .orderBy(orderBy, asc(tickets.id))
      .limit(params.perPage)
      .offset(offset),
    db.select({ value: count() }).from(tickets).where(where),
  ]);

  return {
    rows: rows.map((r) => ({
      ...r.ticket,
      customer: r.customer,
      assignee:
        r.assignee && r.assignee.id
          ? { id: r.assignee.id, name: r.assignee.name }
          : null,
      replyCount: r.replyCount,
    })),
    meta: {
      page: params.page,
      perPage: params.perPage,
      total: totals[0]?.value ?? 0,
    },
  };
}

/** Used by the Kanban board — pulls every open/in-progress/resolved ticket. */
export async function listAllTicketsForBoard(
  filters: TicketListFilters,
): Promise<TicketRow[]> {
  const params: TicketListParams = {
    page: 1,
    perPage: 500,
    sort: { field: "updatedAt", direction: "desc" },
    filters,
  };
  const { rows } = await listTickets(params);
  return rows;
}

export type TicketDetail = Ticket & {
  customer: { id: string; name: string; email: string; phone: string | null } | null;
  assignee: { id: string; name: string; email: string } | null;
  replies: (TicketReply & { author: { id: string; name: string } | null })[];
};

export async function getTicketById(id: string): Promise<TicketDetail | null> {
  const [head] = await db
    .select({
      ticket: tickets,
      customer: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      assignee: {
        id: assigneeAlias.id,
        name: assigneeAlias.name,
        email: assigneeAlias.email,
      },
    })
    .from(tickets)
    .leftJoin(user, eq(tickets.userId, user.id))
    .leftJoin(assigneeAlias, eq(tickets.assigneeId, assigneeAlias.id))
    .where(eq(tickets.id, id))
    .limit(1);

  if (!head) return null;

  const authorAlias = aliasedTable(user, "reply_author");
  const replyRows = await db
    .select({
      reply: ticketReplies,
      author: {
        id: authorAlias.id,
        name: authorAlias.name,
      },
    })
    .from(ticketReplies)
    .leftJoin(authorAlias, eq(ticketReplies.authorId, authorAlias.id))
    .where(eq(ticketReplies.ticketId, id))
    .orderBy(asc(ticketReplies.createdAt));

  return {
    ...head.ticket,
    customer: head.customer,
    assignee:
      head.assignee && head.assignee.id
        ? {
            id: head.assignee.id,
            name: head.assignee.name,
            email: head.assignee.email,
          }
        : null,
    replies: replyRows.map((row) => ({
      ...row.reply,
      author:
        row.author && row.author.id
          ? { id: row.author.id, name: row.author.name }
          : null,
    })),
  };
}

/** Staff who can be assigned tickets — only admin role has write access. */
export async function listAgents(): Promise<
  { id: string; name: string; role: string }[]
> {
  return db
    .select({
      id: user.id,
      name: user.name,
      role: user.role,
    })
    .from(user)
    .where(eq(user.role, "admin"))
    .orderBy(asc(user.name));
}

/** Distinct ticket categories for the filter dropdown. */
export async function listTicketCategories(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ category: tickets.category })
    .from(tickets)
    .orderBy(asc(tickets.category));
  return rows.map((row) => row.category);
}

export async function updateTicketMeta(
  id: string,
  patch: TicketUpdateInput,
): Promise<{ before: Ticket; after: Ticket }> {
  const [before] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  if (!before) throw new APIError("NOT_FOUND", "Ticket not found.");

  const next: Partial<typeof tickets.$inferInsert> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };
  if (patch.subject !== undefined) next.subject = patch.subject;
  if (patch.category !== undefined) next.category = patch.category;
  if (patch.priority !== undefined) next.priority = patch.priority;

  const [after] = await db
    .update(tickets)
    .set(next)
    .where(eq(tickets.id, id))
    .returning();
  if (!after) throw new APIError("INTERNAL", "Failed to update ticket.");
  return { before, after };
}

export async function transitionTicketStatus(input: {
  id: string;
  to: TicketStatusValue;
}): Promise<{ before: Ticket; after: Ticket }> {
  const [before] = await db.select().from(tickets).where(eq(tickets.id, input.id)).limit(1);
  if (!before) throw new APIError("NOT_FOUND", "Ticket not found.");
  if (before.status === input.to) {
    return { before, after: before };
  }
  if (!canTransitionTicket(before.status, input.to)) {
    throw new APIError(
      "CONFLICT",
      `Can't move a ticket from "${before.status}" to "${input.to}".`,
    );
  }

  const [after] = await db
    .update(tickets)
    .set({ status: input.to, updatedAt: new Date() })
    .where(eq(tickets.id, input.id))
    .returning();
  if (!after) throw new APIError("INTERNAL", "Failed to update ticket.");
  return { before, after };
}

export async function assignTicket(
  id: string,
  input: TicketAssignInput,
): Promise<{ before: Ticket; after: Ticket }> {
  const [before] = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  if (!before) throw new APIError("NOT_FOUND", "Ticket not found.");

  // Confirm the assignee exists if non-null.
  if (input.assigneeId) {
    const [agent] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, input.assigneeId))
      .limit(1);
    if (!agent) throw new APIError("BAD_REQUEST", "That user no longer exists.");
  }

  const [after] = await db
    .update(tickets)
    .set({ assigneeId: input.assigneeId, updatedAt: new Date() })
    .where(eq(tickets.id, id))
    .returning();
  if (!after) throw new APIError("INTERNAL", "Failed to assign ticket.");
  return { before, after };
}

export async function addTicketReply(input: {
  ticketId: string;
  authorId: string;
  fromAgent: boolean;
  body: string;
  attachments: TicketAttachment[];
  isInternal: boolean;
}): Promise<TicketReply> {
  // Confirm the ticket exists so we don't add orphan replies.
  const [ticket] = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(eq(tickets.id, input.ticketId))
    .limit(1);
  if (!ticket) throw new APIError("NOT_FOUND", "Ticket not found.");

  return db.transaction(async (tx) => {
    const [reply] = await tx
      .insert(ticketReplies)
      .values({
        ticketId: input.ticketId,
        authorId: input.authorId,
        fromAgent: input.fromAgent,
        body: input.body,
        attachments: input.attachments,
        isInternal: input.isInternal,
      })
      .returning();
    if (!reply) throw new APIError("INTERNAL", "Failed to add reply.");

    // Bump the ticket's updatedAt so the list view sorts the right way.
    await tx
      .update(tickets)
      .set({ updatedAt: new Date() })
      .where(eq(tickets.id, input.ticketId));

    return reply;
  });
}

/** Tickets for a single customer — feeds the user detail "Tickets" tab. */
export async function listTicketsForUser(userId: string): Promise<TicketRow[]> {
  const rows = await db
    .select({
      ticket: tickets,
      assignee: {
        id: assigneeAlias.id,
        name: assigneeAlias.name,
      },
      replyCount: count(ticketReplies.id),
    })
    .from(tickets)
    .leftJoin(assigneeAlias, eq(tickets.assigneeId, assigneeAlias.id))
    .leftJoin(ticketReplies, eq(ticketReplies.ticketId, tickets.id))
    .where(eq(tickets.userId, userId))
    .groupBy(tickets.id, assigneeAlias.id)
    .orderBy(desc(tickets.updatedAt));

  return rows.map((r) => ({
    ...r.ticket,
    customer: null,
    assignee:
      r.assignee && r.assignee.id
        ? { id: r.assignee.id, name: r.assignee.name }
        : null,
    replyCount: r.replyCount,
  }));
}

export function ticketDiff(
  before: Ticket,
  after: Ticket,
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  const keys: (keyof Ticket)[] = [
    "subject",
    "category",
    "status",
    "priority",
    "assigneeId",
  ];
  for (const key of keys) {
    if (before[key] !== after[key]) {
      diff[key] = { from: before[key], to: after[key] };
    }
  }
  return diff;
}
