import type { NextRequest } from "next/server";
import { created, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canSupport } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { addTicketReply } from "@/lib/data/tickets";
import { ticketReplySchema } from "@/lib/schemas/ticket";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/tickets/[id]/replies
 *
 * Adds a staff reply. The `fromAgent` flag is set true automatically for
 * canSupport calls. Customer-side replies use a separate endpoint (not built
 * yet — that's mobile-app side).
 *
 * Email-to-customer dispatch on non-internal replies is queued for the email
 * follow-up. For now the reply lands in the DB and the mobile app picks it
 * up on next refresh.
 */
export function POST(request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canSupport);
    const { id } = await context.params;
    const input = ticketReplySchema.parse(await request.json());

    const reply = await addTicketReply({
      ticketId: id,
      authorId: user.id,
      fromAgent: true,
      body: input.body,
      attachments: input.attachments,
      isInternal: input.isInternal,
    });

    await recordAudit({
      actorId: user.id,
      action: input.isInternal ? "ticket.note" : "ticket.reply",
      entityType: "ticket",
      entityId: id,
      diff: { length: input.body.length, hasAttachments: input.attachments.length > 0 },
    });

    // TODO: when Resend is wired, send `input.body` to the customer email if
    // `!input.isInternal`. The author + ticket subject power the template.
    if (!input.isInternal && process.env.NODE_ENV !== "production") {
      console.log(`[Plant+ ticket reply] would email customer for ticket ${id}`);
    }

    return created(reply);
  });
}
