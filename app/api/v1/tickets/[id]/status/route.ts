import type { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canSupport } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { transitionTicketStatus } from "@/lib/data/tickets";
import { ticketStatusSchema } from "@/lib/schemas/ticket";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/tickets/[id]/status
 *
 * Body: { to: "open" | "in_progress" | "resolved" }
 *
 * Used by the Kanban drag-drop AND the detail-page status buttons. The state
 * machine guard rejects illegal moves with 409 CONFLICT.
 */
export function POST(request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canSupport);
    const { id } = await context.params;
    const { to } = ticketStatusSchema.parse(await request.json());

    const { before, after } = await transitionTicketStatus({ id, to });

    if (before.status !== after.status) {
      await recordAudit({
        actorId: user.id,
        action: `ticket.transition.${to}`,
        entityType: "ticket",
        entityId: id,
        diff: { status: { from: before.status, to: after.status } },
      });
    }

    return ok(after);
  });
}
