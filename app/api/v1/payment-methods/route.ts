import type { NextRequest } from "next/server";
import { list, ok, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canManage, isAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { getPaymentMethods, updatePaymentMethods } from "@/lib/data/payment-methods";
import { paymentMethodsUpdateSchema } from "@/lib/schemas/payment-method";

/** GET /api/v1/payment-methods — full config incl. disabled (admin shell). */
export function GET() {
  return withErrorHandling(async () => {
    await requireRole(isAdmin);
    const methods = await getPaymentMethods();
    return list(methods, { page: 1, perPage: methods.length, total: methods.length });
  });
}

/**
 * PUT /api/v1/payment-methods — set method statuses (admin).
 * Body: { statuses: { cod?, card?, upi?, netbanking?, wallet? } }
 */
export function PUT(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const { statuses } = paymentMethodsUpdateSchema.parse(await request.json());

    const methods = await updatePaymentMethods(statuses, user.id);

    await recordAudit({
      actorId: user.id,
      action: "payment_methods.update",
      entityType: "setting",
      entityId: "payment_methods",
      diff: { statuses },
    });

    return ok(methods);
  });
}
