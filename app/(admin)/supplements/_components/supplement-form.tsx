"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, fieldInputClass } from "@/app/(auth)/_components/field";
import { Banner } from "@/app/(auth)/_components/banner";
import { SpinnerIcon } from "@/app/_components/icons";
import { DiseaseLabelPicker } from "./disease-label-picker";
import { supplementCreateSchema } from "@/lib/schemas/supplement";
import type { Supplement } from "@/db/schema";

type Props = {
  supplement?: Supplement;
  groupedLabels: Record<
    string,
    { label: string; disease: string; healthy: boolean }[]
  >;
  onSuccess?: () => void;
};

type FormState = {
  name: string;
  brand: string;
  imageUrl: string;
  buyLink: string;
  description: string;
  mappedDiseaseLabels: string[];
};

function initialState(supplement?: Supplement): FormState {
  return {
    name: supplement?.name ?? "",
    brand: supplement?.brand ?? "",
    imageUrl: supplement?.imageUrl ?? "",
    buyLink: supplement?.buyLink ?? "",
    description: supplement?.description ?? "",
    mappedDiseaseLabels: supplement?.mappedDiseaseLabels ?? [],
  };
}

export function SupplementForm({ supplement, groupedLabels, onSuccess }: Props) {
  const router = useRouter();
  const isEdit = !!supplement;

  const [state, setState] = useState(() => initialState(supplement));
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
      name: state.name.trim(),
      brand: state.brand.trim() || null,
      imageUrl: state.imageUrl.trim(),
      buyLink: state.buyLink.trim(),
      description: state.description.trim() || null,
      mappedDiseaseLabels: state.mappedDiseaseLabels,
    };

    const parsed = supplementCreateSchema.safeParse(payload);
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
      ? `/api/v1/supplements/${supplement.id}`
      : "/api/v1/supplements";
    const method = isEdit ? "PATCH" : "POST";
    const response = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    setPending(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      if (body?.error?.fields) setFieldErrors(body.error.fields);
      setError(body?.error?.message ?? "Couldn't save the supplement.");
      return;
    }
    if (onSuccess) {
      onSuccess();
      router.refresh();
      return;
    }
    router.push("/supplements");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {error ? <Banner tone="error">{error}</Banner> : null}

      <Section title="Identity">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Field
              label="Name"
              id="name"
              name="name"
              value={state.name}
              onChange={(event) => update("name", event.currentTarget.value)}
              placeholder="Neem Oil Concentrate"
              required
              autoFocus
            />
            {fieldErrors.name ? <FieldError>{fieldErrors.name}</FieldError> : null}
          </div>
          <div>
            <Field
              label="Brand"
              id="brand"
              name="brand"
              value={state.brand}
              onChange={(event) => update("brand", event.currentTarget.value)}
              placeholder="Plant+"
            />
            {fieldErrors.brand ? <FieldError>{fieldErrors.brand}</FieldError> : null}
          </div>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-foreground"
          >
            Description
          </label>
          <textarea
            id="description"
            value={state.description}
            onChange={(event) => update("description", event.currentTarget.value)}
            rows={3}
            placeholder="What it does, when to apply, dosage…"
            className={`mt-1.5 ${fieldInputClass}`}
          />
          {fieldErrors.description ? (
            <FieldError>{fieldErrors.description}</FieldError>
          ) : null}
        </div>
      </Section>

      <Section
        title="Image"
        description="Paste a hosted URL for now. Direct upload to S3/MinIO ships with Products."
      >
        <div className="flex items-start gap-4">
          <div className="size-24 shrink-0 overflow-hidden rounded-card border border-border bg-background">
            {state.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.imageUrl}
                alt=""
                className="size-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.opacity = "0.2";
                }}
              />
            ) : (
              <div className="grid size-full place-items-center text-xs text-muted">
                Preview
              </div>
            )}
          </div>
          <div className="flex-1 space-y-1.5">
            <Field
              label="Image URL"
              id="imageUrl"
              name="imageUrl"
              type="url"
              value={state.imageUrl}
              onChange={(event) => update("imageUrl", event.currentTarget.value)}
              placeholder="https://…"
              required
            />
            {fieldErrors.imageUrl ? (
              <FieldError>{fieldErrors.imageUrl}</FieldError>
            ) : null}
          </div>
        </div>
      </Section>

      <Section title="Buy link">
        <Field
          label="Buy URL"
          id="buyLink"
          name="buyLink"
          type="url"
          value={state.buyLink}
          onChange={(event) => update("buyLink", event.currentTarget.value)}
          placeholder="https://example.com/product"
          required
        />
        {fieldErrors.buyLink ? <FieldError>{fieldErrors.buyLink}</FieldError> : null}
      </Section>

      <Section
        title="Mapped diseases"
        description="Disease labels this supplement is recommended for. Picked from the Disease KB."
      >
        <DiseaseLabelPicker
          value={state.mappedDiseaseLabels}
          onChange={(next) => update("mappedDiseaseLabels", next)}
          grouped={groupedLabels}
        />
        {fieldErrors.mappedDiseaseLabels ? (
          <FieldError>{fieldErrors.mappedDiseaseLabels}</FieldError>
        ) : null}
      </Section>

      <div className="flex items-center gap-3 border-t border-border pt-5">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-input bg-tint px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? <SpinnerIcon className="size-4 animate-spin" /> : null}
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create supplement"}
        </button>
        <Link
          href="/supplements"
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
