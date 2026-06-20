"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field, fieldInputClass } from "@/app/(auth)/_components/field";
import { Banner } from "@/app/(auth)/_components/banner";
import { SpinnerIcon } from "@/app/_components/icons";
import {
  ADDRESS_LABELS,
  shippingAddressCreateSchema,
  shippingAddressUpdateSchema,
} from "@/lib/schemas/shipping-address";
import type { Address } from "@/lib/data/addresses";

type Props = {
  userId: string;
  address?: Address;
  onSuccess: () => void;
};

type FormState = {
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal: string;
  country: string;
  isDefault: boolean;
};

function initialState(address?: Address): FormState {
  return {
    label: address?.label ?? "home",
    name: address?.name ?? "",
    phone: address?.phone ?? "",
    line1: address?.line1 ?? "",
    line2: address?.line2 ?? "",
    city: address?.city ?? "",
    state: address?.state ?? "",
    postal: address?.postal ?? "",
    country: address?.country ?? "IN",
    isDefault: address?.isDefault ?? false,
  };
}

export function AddressForm({ userId, address, onSuccess }: Props) {
  const router = useRouter();
  const isEdit = !!address;

  const [state, setState] = useState(() => initialState(address));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const fields = {
      label: state.label,
      name: state.name.trim(),
      phone: state.phone.trim(),
      line1: state.line1.trim(),
      line2: state.line2.trim(),
      city: state.city.trim(),
      state: state.state.trim(),
      postal: state.postal.trim(),
      country: state.country.trim().toUpperCase(),
      isDefault: state.isDefault,
    };

    const parsed = isEdit
      ? shippingAddressUpdateSchema.safeParse(fields)
      : shippingAddressCreateSchema.safeParse({ userId, ...fields });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        if (!errors[path]) errors[path] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setPending(true);
    const response = await fetch(
      isEdit ? `/api/v1/shipping-address/${address.id}` : "/api/v1/shipping-address",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      },
    );
    setPending(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      if (body?.error?.fields) setFieldErrors(body.error.fields);
      setError(body?.error?.message ?? "Couldn't save the address.");
      return;
    }

    onSuccess();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error ? <Banner tone="error">{error}</Banner> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="label" className="block text-sm font-medium text-foreground">
            Label
          </label>
          <select
            id="label"
            value={state.label}
            onChange={(event) => update("label", event.currentTarget.value)}
            className={`mt-1.5 ${fieldInputClass}`}
          >
            {ADDRESS_LABELS.map((option) => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Field
            label="Recipient name"
            id="name"
            value={state.name}
            onChange={(event) => update("name", event.currentTarget.value)}
            placeholder="Jane Appleseed"
            required
            autoFocus
          />
          {fieldErrors.name ? <FieldError>{fieldErrors.name}</FieldError> : null}
        </div>
      </div>

      <div>
        <Field
          label="Address line 1"
          id="line1"
          value={state.line1}
          onChange={(event) => update("line1", event.currentTarget.value)}
          placeholder="Flat / house no., building, street"
          required
        />
        {fieldErrors.line1 ? <FieldError>{fieldErrors.line1}</FieldError> : null}
      </div>

      <div>
        <Field
          label="Address line 2 (optional)"
          id="line2"
          value={state.line2}
          onChange={(event) => update("line2", event.currentTarget.value)}
          placeholder="Area, landmark"
        />
        {fieldErrors.line2 ? <FieldError>{fieldErrors.line2}</FieldError> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Field
            label="City"
            id="city"
            value={state.city}
            onChange={(event) => update("city", event.currentTarget.value)}
            placeholder="Pune"
            required
          />
          {fieldErrors.city ? <FieldError>{fieldErrors.city}</FieldError> : null}
        </div>
        <div>
          <Field
            label="State"
            id="state"
            value={state.state}
            onChange={(event) => update("state", event.currentTarget.value)}
            placeholder="Maharashtra"
            required
          />
          {fieldErrors.state ? <FieldError>{fieldErrors.state}</FieldError> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Field
            label="Postal code"
            id="postal"
            value={state.postal}
            onChange={(event) => update("postal", event.currentTarget.value)}
            placeholder="411001"
            required
          />
          {fieldErrors.postal ? <FieldError>{fieldErrors.postal}</FieldError> : null}
        </div>
        <div>
          <Field
            label="Country"
            id="country"
            value={state.country}
            onChange={(event) => update("country", event.currentTarget.value)}
            placeholder="IN"
            maxLength={2}
            required
          />
          {fieldErrors.country ? <FieldError>{fieldErrors.country}</FieldError> : null}
        </div>
        <div>
          <Field
            label="Phone"
            id="phone"
            type="tel"
            value={state.phone}
            onChange={(event) => update("phone", event.currentTarget.value)}
            placeholder="+91 98765 43210"
            required
          />
          {fieldErrors.phone ? <FieldError>{fieldErrors.phone}</FieldError> : null}
        </div>
      </div>

      <label className="flex items-center gap-2.5 rounded-input border border-border bg-background px-3.5 py-3 text-sm text-foreground">
        <input
          type="checkbox"
          checked={state.isDefault}
          onChange={(event) => update("isDefault", event.currentTarget.checked)}
          className="size-4 rounded border-border text-tint focus:ring-tint"
        />
        Set as default shipping address
      </label>

      <div className="flex items-center gap-3 border-t border-border pt-5">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-input bg-tint px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? <SpinnerIcon className="size-4 animate-spin" /> : null}
          {pending ? "Saving…" : isEdit ? "Save changes" : "Add address"}
        </button>
      </div>
    </form>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-danger">{children}</p>;
}
