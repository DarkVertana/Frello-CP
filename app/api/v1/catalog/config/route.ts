import { ok, withErrorHandling } from "@/lib/api/response";
import { getPublicConfig } from "@/lib/data/settings";

/**
 * GET /api/v1/catalog/config — PUBLIC (no auth).
 *
 * Store-wide config the mobile app reads to render prices and branding:
 *   { currency, appName }
 * The app formats all catalog prices (returned as integer minor units) in this
 * currency.
 */
export function GET() {
  return withErrorHandling(async () => {
    const config = await getPublicConfig();
    return ok(config);
  });
}
