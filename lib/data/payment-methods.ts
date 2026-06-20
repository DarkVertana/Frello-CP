import "server-only";
import { getSettingByKey, upsertSetting } from "@/lib/data/settings";
import {
  buildPaymentMethods,
  DEFAULT_PAYMENT_STATUSES,
  PAYMENT_METHODS_KEY,
  type PaymentMethodKey,
  type PaymentMethodOption,
  type PaymentMethodStatus,
} from "@/lib/schemas/payment-method";

/**
 * Merchant-accepted payment methods. Stored as a single JSON blob in the
 * settings table (key `payment_methods`) mapping method → status. Falls back to
 * defaults (COD active, the rest "coming soon") when unset.
 */

export async function getPaymentMethods(): Promise<PaymentMethodOption[]> {
  const row = await getSettingByKey(PAYMENT_METHODS_KEY);
  return buildPaymentMethods(row?.value);
}

/** Active methods only — what the checkout can actually charge. */
export async function getActivePaymentMethods(): Promise<PaymentMethodOption[]> {
  return (await getPaymentMethods()).filter((m) => m.status === "active");
}

/**
 * Merge a partial status update over the current config and persist it.
 * Returns the full, updated option list.
 */
export async function updatePaymentMethods(
  statuses: Partial<Record<PaymentMethodKey, PaymentMethodStatus>>,
  actorId: string,
): Promise<PaymentMethodOption[]> {
  const current = await getPaymentMethods();
  const merged: Record<PaymentMethodKey, PaymentMethodStatus> = {
    ...DEFAULT_PAYMENT_STATUSES,
  };
  for (const method of current) merged[method.key] = method.status;
  for (const [key, status] of Object.entries(statuses)) {
    if (status) merged[key as PaymentMethodKey] = status;
  }

  await upsertSetting({
    key: PAYMENT_METHODS_KEY,
    value: merged,
    description: "Merchant-accepted payment methods (status per method).",
    actorId,
  });

  return buildPaymentMethods(merged);
}
