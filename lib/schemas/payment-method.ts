import { z } from "zod";

/** Settings key under which the merchant's accepted-method config is stored. */
export const PAYMENT_METHODS_KEY = "payment_methods";

export const paymentMethodKeyEnum = z.enum([
  "cod",
  "card",
  "upi",
  "netbanking",
  "wallet",
]);
export type PaymentMethodKey = z.infer<typeof paymentMethodKeyEnum>;

/** active = selectable now · coming_soon = shown but not selectable · disabled = hidden. */
export const paymentMethodStatusEnum = z.enum([
  "active",
  "coming_soon",
  "disabled",
]);
export type PaymentMethodStatus = z.infer<typeof paymentMethodStatusEnum>;

/** Fixed catalog of payment methods the storefront knows how to render. */
export const PAYMENT_METHODS: {
  key: PaymentMethodKey;
  label: string;
  description: string;
}[] = [
  { key: "cod", label: "Cash on Delivery", description: "Pay in cash when the order arrives." },
  { key: "card", label: "Credit / Debit Card", description: "Visa, Mastercard, RuPay." },
  { key: "upi", label: "UPI", description: "Google Pay, PhonePe, Paytm, BHIM." },
  { key: "netbanking", label: "Net Banking", description: "All major banks." },
  { key: "wallet", label: "Wallet", description: "Paytm, Amazon Pay, and more." },
];

/** COD is live; everything else is "coming soon" until the merchant enables it. */
export const DEFAULT_PAYMENT_STATUSES: Record<
  PaymentMethodKey,
  PaymentMethodStatus
> = {
  cod: "active",
  card: "coming_soon",
  upi: "coming_soon",
  netbanking: "coming_soon",
  wallet: "coming_soon",
};

export type PaymentMethodOption = {
  key: PaymentMethodKey;
  label: string;
  description: string;
  status: PaymentMethodStatus;
};

/** Merge a stored statuses blob over the defaults into a complete option list. */
export function buildPaymentMethods(value: unknown): PaymentMethodOption[] {
  const stored =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return PAYMENT_METHODS.map((method) => {
    const raw = stored[method.key];
    const parsed = paymentMethodStatusEnum.safeParse(raw);
    return {
      ...method,
      status: parsed.success ? parsed.data : DEFAULT_PAYMENT_STATUSES[method.key],
    };
  });
}

/** Admin update — a partial map of method → status. */
export const paymentMethodsUpdateSchema = z.object({
  statuses: z
    .object({
      cod: paymentMethodStatusEnum.optional(),
      card: paymentMethodStatusEnum.optional(),
      upi: paymentMethodStatusEnum.optional(),
      netbanking: paymentMethodStatusEnum.optional(),
      wallet: paymentMethodStatusEnum.optional(),
    })
    .refine((v) => Object.keys(v).length > 0, {
      message: "Provide at least one status to update.",
    }),
});

export type PaymentMethodsUpdateInput = z.infer<typeof paymentMethodsUpdateSchema>;

export function statusLabel(status: PaymentMethodStatus): string {
  if (status === "active") return "Active";
  if (status === "coming_soon") return "Coming soon";
  return "Disabled";
}
