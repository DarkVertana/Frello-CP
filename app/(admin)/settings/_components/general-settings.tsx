"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field, fieldInputClass } from "@/app/(auth)/_components/field";
import { Banner } from "@/app/(auth)/_components/banner";
import { SpinnerIcon } from "@/app/_components/icons";
import { Card } from "../../_components/card";
import {
  CURRENCIES,
  GENERAL_SETTINGS_KEY,
  generalSettingsSchema,
  type GeneralSettings,
} from "@/lib/schemas/general";

type Props = {
  initial: GeneralSettings;
  canManage: boolean;
};

export function GeneralSettingsForm({ initial, canManage }: Props) {
  const router = useRouter();
  const [state, setState] = useState<GeneralSettings>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function update<K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) {
    setState((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSaved(false);

    const parsed = generalSettingsSchema.safeParse(state);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        if (!fields[path]) fields[path] = issue.message;
      }
      setFieldErrors(fields);
      return;
    }

    setPending(true);
    const response = await fetch("/api/v1/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        key: GENERAL_SETTINGS_KEY,
        valueJson: JSON.stringify(parsed.data),
        description: "General app settings (edited from the General tab).",
      }),
    });
    setPending(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Couldn't save settings.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <Card
      title="General"
      subtitle="Core app details surfaced across the storefront and emails."
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error ? <Banner tone="error">{error}</Banner> : null}
        {saved ? <Banner tone="success">Settings saved.</Banner> : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Field
              label="App name"
              id="appName"
              name="appName"
              value={state.appName}
              onChange={(event) => update("appName", event.currentTarget.value)}
              placeholder="Frello"
              disabled={!canManage}
              required
            />
            {fieldErrors.appName ? (
              <FieldError>{fieldErrors.appName}</FieldError>
            ) : null}
          </div>

          <div>
            <Field
              label="Support email"
              id="supportEmail"
              name="supportEmail"
              type="email"
              value={state.supportEmail}
              onChange={(event) => update("supportEmail", event.currentTarget.value)}
              placeholder="help@frello.app"
              disabled={!canManage}
            />
            {fieldErrors.supportEmail ? (
              <FieldError>{fieldErrors.supportEmail}</FieldError>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="currency"
              className="block text-sm font-medium text-foreground"
            >
              Default currency
            </label>
            <select
              id="currency"
              value={state.currency}
              onChange={(event) =>
                update("currency", event.currentTarget.value as GeneralSettings["currency"])
              }
              disabled={!canManage}
              className={`mt-1.5 ${fieldInputClass} disabled:opacity-60`}
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-start gap-2.5 rounded-input border border-border bg-background px-3.5 py-3 text-sm text-foreground">
          <input
            type="checkbox"
            checked={state.maintenanceMode}
            onChange={(event) => update("maintenanceMode", event.currentTarget.checked)}
            disabled={!canManage}
            className="mt-0.5 size-4 rounded border-border text-tint focus:ring-tint"
          />
          <span>
            <span className="block font-medium">Maintenance mode</span>
            <span className="block text-xs text-muted">
              Temporarily take the storefront offline for shoppers.
            </span>
          </span>
        </label>

        {canManage ? (
          <div className="flex items-center gap-3 border-t border-border pt-5">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-10 items-center gap-2 rounded-input bg-tint px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? <SpinnerIcon className="size-4 animate-spin" /> : null}
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        ) : (
          <p className="border-t border-border pt-5 text-xs text-muted">
            You have read-only access — ask an admin to change these.
          </p>
        )}
      </form>
    </Card>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-danger">{children}</p>;
}
