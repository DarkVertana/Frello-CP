"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CreditCard,
  Landmark,
  Smartphone,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Banner } from "@/app/(auth)/_components/banner";
import {
  paymentMethodStatusEnum,
  type PaymentMethodKey,
  type PaymentMethodOption,
  type PaymentMethodStatus,
} from "@/lib/schemas/payment-method";

const ICONS: Record<PaymentMethodKey, LucideIcon> = {
  cod: Banknote,
  card: CreditCard,
  upi: Smartphone,
  netbanking: Landmark,
  wallet: Wallet,
};

const STATUS_TONE: Record<PaymentMethodStatus, string> = {
  active: "border-tint/30 bg-tint-soft text-tint-dark",
  coming_soon: "border-amber-300/50 bg-amber-50 text-amber-700",
  disabled: "border-border bg-background text-muted",
};

const STATUS_LABEL: Record<PaymentMethodStatus, string> = {
  active: "Active",
  coming_soon: "Coming soon",
  disabled: "Disabled",
};

export function PaymentMethodsList({
  methods,
  canManage,
}: {
  methods: PaymentMethodOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<PaymentMethodKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function setStatus(key: PaymentMethodKey, status: PaymentMethodStatus) {
    setBusyKey(key);
    setError(null);
    setSaved(false);
    const response = await fetch("/api/v1/payment-methods", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ statuses: { [key]: status } }),
    });
    setBusyKey(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Couldn't update payment method.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error ? <Banner tone="error">{error}</Banner> : null}
      {saved ? <Banner tone="success">Payment methods updated.</Banner> : null}

      <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {methods.map((method) => {
          const Icon = ICONS[method.key];
          return (
            <li
              key={method.key}
              className="flex items-start gap-3 rounded-card border border-border bg-card p-4 shadow-card"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-input bg-tint-soft text-tint-dark">
                <Icon className="size-5" aria-hidden="true" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    {method.label}
                  </h3>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_TONE[method.status]}`}
                  >
                    {STATUS_LABEL[method.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{method.description}</p>

                {canManage ? (
                  <select
                    value={method.status}
                    onChange={(event) =>
                      setStatus(
                        method.key,
                        event.currentTarget.value as PaymentMethodStatus,
                      )
                    }
                    disabled={busyKey === method.key}
                    aria-label={`Status for ${method.label}`}
                    className="mt-3 h-9 rounded-input border border-border bg-card px-2 text-sm text-foreground disabled:opacity-60"
                  >
                    {paymentMethodStatusEnum.options.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABEL[status]}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
