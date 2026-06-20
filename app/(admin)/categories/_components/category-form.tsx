"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field } from "@/app/(auth)/_components/field";
import { Banner } from "@/app/(auth)/_components/banner";
import { SpinnerIcon } from "@/app/_components/icons";
import { ICON_PRESET_NAMES, PresetIcon } from "@/lib/icons";
import { categoryCreateSchema, slugify } from "@/lib/schemas/category";
import type { Category } from "@/db/schema";

type Props = {
  /** When provided, the form is in edit mode and PATCHes this row. */
  category?: Category;
  /**
   * Called after a successful save. When set, the form does NOT navigate —
   * the parent (typically a modal) controls what happens next.
   */
  onSuccess?: () => void;
};

export function CategoryForm({ category, onSuccess }: Props) {
  const router = useRouter();
  const isEdit = !!category;

  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugDirty, setSlugDirty] = useState(false);
  const [icon, setIcon] = useState(category?.icon ?? "sprout");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function onNameChange(value: string) {
    setName(value);
    // Auto-fill the slug while the user hasn't touched it. In edit mode we
    // leave the existing slug alone so renames don't break product URLs.
    if (!slugDirty && !isEdit) setSlug(slugify(value));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const payload = { name: name.trim(), slug: slug.trim(), icon };
    const parsed = categoryCreateSchema.safeParse(payload);
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
    const url = isEdit ? `/api/v1/categories/${category.id}` : "/api/v1/categories";
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
      setError(body?.error?.message ?? "Couldn't save the category.");
      return;
    }

    if (onSuccess) {
      onSuccess();
      router.refresh();
      return;
    }
    router.push("/categories");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error ? <Banner tone="error">{error}</Banner> : null}

      <div>
        <Field
          label="Name"
          id="name"
          name="name"
          value={name}
          onChange={(event) => onNameChange(event.currentTarget.value)}
          placeholder="e.g. Fertilizers"
          required
          autoFocus
        />
        {fieldErrors.name ? <FieldError>{fieldErrors.name}</FieldError> : null}
      </div>

      <div>
        <Field
          label="Slug"
          id="slug"
          name="slug"
          value={slug}
          onChange={(event) => {
            setSlugDirty(true);
            setSlug(event.currentTarget.value);
          }}
          placeholder="fertilizers"
          required
        />
        <p className="mt-1.5 text-xs text-muted">
          URL-safe identifier. Lowercase letters, numbers, and hyphens.
        </p>
        {fieldErrors.slug ? <FieldError>{fieldErrors.slug}</FieldError> : null}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Icon</legend>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-9">
          {ICON_PRESET_NAMES.map((presetName) => {
            const selected = icon === presetName;
            return (
              <button
                key={presetName}
                type="button"
                onClick={() => setIcon(presetName)}
                aria-pressed={selected}
                title={presetName}
                className={
                  selected
                    ? "flex aspect-square items-center justify-center rounded-input border-2 border-tint bg-tint-soft text-tint-dark"
                    : "flex aspect-square items-center justify-center rounded-input border border-border text-muted transition hover:border-tint/40 hover:bg-tint-soft hover:text-foreground"
                }
              >
                <PresetIcon name={presetName} className="size-5" aria-hidden="true" />
              </button>
            );
          })}
        </div>
        <input type="hidden" name="icon" value={icon} />
        {fieldErrors.icon ? <FieldError>{fieldErrors.icon}</FieldError> : null}
      </fieldset>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-input bg-tint px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? <SpinnerIcon className="size-4 animate-spin" /> : null}
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create category"}
        </button>
        <Link
          href="/categories"
          className="text-sm font-medium text-muted hover:text-foreground"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-danger">{children}</p>;
}
