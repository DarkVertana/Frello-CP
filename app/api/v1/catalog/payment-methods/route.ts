import { list, withErrorHandling } from "@/lib/api/response";
import { getPaymentMethods } from "@/lib/data/payment-methods";

/**
 * GET /api/v1/catalog/payment-methods — PUBLIC (no auth).
 *
 * Merchant-accepted payment methods for the checkout screen. Disabled methods
 * are omitted; "coming_soon" ones are returned so the app can show them greyed
 * out. Each item: { key, label, description, status }.
 */
export function GET() {
  return withErrorHandling(async () => {
    const methods = (await getPaymentMethods()).filter(
      (m) => m.status !== "disabled",
    );
    return list(methods, { page: 1, perPage: methods.length, total: methods.length });
  });
}
