import type { NextRequest } from "next/server";
import { APIError, ok, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canSupport } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { getTicketById, ticketDiff, updateTicketMeta } from "@/lib/data/tickets";
import { ticketUpdateSchema } from "@/lib/schemas/ticket";

type RouteContext = { params: Promise<{ id: string }> };

export function GET(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    await requireRole(canSupport);
    const { id } = await context.params;
    const row = await getTicketById(id);
    if (!row) throw new APIError("NOT_FOUND", "Ticket not found.");
    return ok(row);
  });
}

export function PATCH(request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canSupport);
    const { id } = await context.params;
    const patch = ticketUpdateSchema.parse(await request.json());
    const { before, after } = await updateTicketMeta(id, patch);

    await recordAudit({
      actorId: user.id,
      action: "ticket.update",
      entityType: "ticket",
      entityId: id,
      diff: ticketDiff(before, after),
    });

    return ok(after);
  });
}
