import type { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canSupport } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { assignTicket, ticketDiff } from "@/lib/data/tickets";
import { ticketAssignSchema } from "@/lib/schemas/ticket";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/tickets/[id]/assign
 *
 * Body: { assigneeId: string | null }   (null clears the assignee)
 */
export function POST(request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canSupport);
    const { id } = await context.params;
    const input = ticketAssignSchema.parse(await request.json());
    const { before, after } = await assignTicket(id, input);

    await recordAudit({
      actorId: user.id,
      action: "ticket.assign",
      entityType: "ticket",
      entityId: id,
      diff: ticketDiff(before, after),
    });

    return ok(after);
  });
}
