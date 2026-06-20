import type { NextRequest } from "next/server";
import { APIError, ok, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import {
  broadcastDiff,
  computeRecipientCount,
  getBroadcastById,
  sendBroadcast,
} from "@/lib/data/broadcasts";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/broadcasts/[id]/send
 *
 * Sends a broadcast immediately. Resolves the recipient count from the
 * segment config, marks the row `sent`, and writes a stats.sent total.
 *
 * Actual Expo Push / FCM delivery is a TODO — slotted in once device tokens
 * are stored on the user table from the mobile app's onboarding.
 */
export function POST(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const { id } = await context.params;
    const current = await getBroadcastById(id);
    if (!current) throw new APIError("NOT_FOUND", "Broadcast not found.");

    const recipients = await computeRecipientCount(
      current.segment,
      current.segmentParams,
    );

    const { before, after } = await sendBroadcast({
      id,
      recipientCount: recipients.count,
    });

    await recordAudit({
      actorId: user.id,
      action: "broadcast.send",
      entityType: "broadcast",
      entityId: id,
      diff: {
        ...broadcastDiff(before, after),
        recipients: { count: recipients.count, approximate: recipients.approximate },
      },
    });

    // TODO: dispatch to Expo Push / FCM here once device tokens are available.
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[Plant+ broadcast] "${after.title}" → ${recipients.count} recipients`,
      );
    }

    return ok({ ...after, recipients });
  });
}
