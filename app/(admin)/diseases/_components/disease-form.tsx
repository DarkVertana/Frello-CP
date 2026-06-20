"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, fieldInputClass } from "@/app/(auth)/_components/field";
import { Banner } from "@/app/(auth)/_components/banner";
import { SpinnerIcon } from "@/app/_components/icons";
import { PreventionEditor } from "./prevention-editor";
import { diseaseCreateSchema } from "@/lib/schemas/disease";
import type { Disease } from "@/db/schema";

type SupplementOption = { id: string; name: string; brand: string | null };

type Props = {
  disease?: Disease;
  supplements: SupplementOption[];
  onSuccess?: () => void;
};

type FormState = {
  label: string;
  crop: string;
  disease: string;
  healthy: boolean;
  description: string;
  prevention: string[];
  supplementId: string;
  buyLink: string;
  severity: "low" | "medium" | "high";
};

function initialState(disease?: Disease): FormState {
  return {
    label: disease?.label ?? "",
    crop: disease?.crop ?? "",
    disease: disease?.disease ?? "",
    healthy: disease?.healthy ?? false,
    description: disease?.description ?? "",
    prevention: disease?.prevention ?? [],
    supplementId: disease?.supplementId ?? "",
    buyLink: disease?.buyLink ?? "",
    severity: (disease?.severity as FormState["severity"]) ?? "medium",
  };
}

export function DiseaseForm({ disease, supplements, onSuccess }: Props) {
  const router = useRouter();
  const isEdit = !!disease;

  const [state, setState] = useState(() => initialState(disease));
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

    const payload = {
      label: state.label.trim(),
      crop: state.crop.trim(),
      disease: state.disease.trim(),
      healthy: state.healthy,
      description: state.description.trim(),
      prevention: state.prevention.map((step) => step.trim()).filter(Boolean),
      supplementId: state.supplementId || null,
      buyLink: state.buyLink.trim() || null,
      severity: state.severity,
    };

    const parsed = diseaseCreateSchema.safeParse(payload);
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
    const url = isEdit
      ? `/api/v1/diseases/${encodeURIComponent(disease.label)}`
      : "/api/v1/diseases";
    const method = isEdit ? "PATCH" : "POST";
    // On edit the label is the URL key — strip it from the body.
    const body = isEdit ? { ...parsed.data, label: undefined } : parsed.data;

    const response = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setPending(false);

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      if (result?.error?.fields) setFieldErrors(result.error.fields);
      setError(result?.error?.message ?? "Couldn't save the disease.");
      return;
    }

    if (onSuccess) {
      onSuccess();
      router.refresh();
      return;
    }
    router.push("/diseases");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {error ? <Banner tone="error">{error}</Banner> : null}

      <Section title="Identity" description="The label is the primary key — keep it identical to the ML classifier's output string.">
        <div>
          <Field
            label="Label"
            id="label"
            name="label"
            value={state.label}
            onChange={(event) => update("label", event.currentTarget.value)}
            placeholder="Tomato___Early_blight"
            required
            disabled={isEdit}
          />
          {isEdit ? (
            <p className="mt-1.5 text-xs text-muted">
              Labels are immutable after creation — changing one would orphan existing scans.
            </p>
          ) : null}
          {fieldErrors.label ? <FieldError>{fieldErrors.label}</FieldError> : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Field
              label="Crop"
              id="crop"
              name="crop"
              value={state.crop}
              onChange={(event) => update("crop", event.currentTarget.value)}
              placeholder="Tomato"
              required
            />
            {fieldErrors.crop ? <FieldError>{fieldErrors.crop}</FieldError> : null}
          </div>
          <div>
            <Field
              label="Condition"
              id="disease"
              name="disease"
              value={state.disease}
              onChange={(event) => update("disease", event.currentTarget.value)}
              placeholder="Early blight"
              required
            />
            {fieldErrors.disease ? <FieldError>{fieldErrors.disease}</FieldError> : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-input border border-border bg-card px-3 py-2.5 text-sm text-foreground">
            <input
              type="checkbox"
              checked={state.healthy}
              onChange={(event) => update("healthy", event.currentTarget.checked)}
              className="size-4 rounded border-border text-tint focus:ring-tint"
            />
            This label represents a healthy plant
          </label>

          <div>
            <label
              htmlFor="severity"
              className="block text-sm font-medium text-foreground"
            >
              Severity
            </label>
            <select
              id="severity"
              value={state.severity}
              onChange={(event) =>
                update("severity", event.currentTarget.value as FormState["severity"])
              }
              className={`mt-1.5 ${fieldInputClass}`}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            {fieldErrors.severity ? <FieldError>{fieldErrors.severity}</FieldError> : null}
          </div>
        </div>
      </Section>

      <Section
        title="Description"
        description="Markdown supported. Shown on the mobile app's diagnosis card."
      >
        <textarea
          value={state.description}
          onChange={(event) => update("description", event.currentTarget.value)}
          rows={6}
          placeholder="A short summary of the condition, how to spot it, and what causes it."
          className={fieldInputClass}
        />
        {fieldErrors.description ? <FieldError>{fieldErrors.description}</FieldError> : null}
      </Section>

      <Section
        title="Prevention steps"
        description="One actionable line per item. The mobile app renders them as a bulleted list."
      >
        <PreventionEditor
          value={state.prevention}
          onChange={(next) => update("prevention", next)}
        />
        {fieldErrors.prevention ? <FieldError>{fieldErrors.prevention}</FieldError> : null}
      </Section>

      <Section
        title="Recommended supplement"
        description="Optional. Links the diagnosis to a product the user can buy."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="supplement"
              className="block text-sm font-medium text-foreground"
            >
              Supplement
            </label>
            <select
              id="supplement"
              value={state.supplementId}
              onChange={(event) => update("supplementId", event.currentTarget.value)}
              className={`mt-1.5 ${fieldInputClass}`}
            >
              <option value="">None</option>
              {supplements.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                  {option.brand ? ` · ${option.brand}` : ""}
                </option>
              ))}
            </select>
            {fieldErrors.supplementId ? (
              <FieldError>{fieldErrors.supplementId}</FieldError>
            ) : null}
          </div>

          <div>
            <Field
              label="Buy link (optional)"
              id="buyLink"
              name="buyLink"
              type="url"
              value={state.buyLink}
              onChange={(event) => update("buyLink", event.currentTarget.value)}
              placeholder="https://example.com/product"
            />
            {fieldErrors.buyLink ? <FieldError>{fieldErrors.buyLink}</FieldError> : null}
          </div>
        </div>
      </Section>

      <div className="flex items-center gap-3 border-t border-border pt-5">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-input bg-tint px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? <SpinnerIcon className="size-4 animate-spin" /> : null}
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create disease"}
        </button>
        <Link
          href="/diseases"
          className="text-sm font-medium text-muted hover:text-foreground"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-t border-border pt-5 first:border-t-0 first:pt-0">
      <header>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? <p className="text-xs text-muted">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-danger">{children}</p>;
}
