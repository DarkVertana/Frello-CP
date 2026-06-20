"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Field, fieldInputClass } from "@/app/(auth)/_components/field";
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
  const [description, setDescription] = useState(category?.description ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "sprout");
  const [iconQuery, setIconQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const filteredIcons = useMemo(() => {
    const q = iconQuery.trim().toLowerCase();
    if (!q) return ICON_PRESET_NAMES;
    return ICON_PRESET_NAMES.filter((presetName) => presetName.includes(q));
  }, [iconQuery]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    // Slug is derived, not user-edited. New categories slugify their name;
    // existing ones keep their slug so product/catalog URLs don't break.
    const slug = isEdit ? category.slug : slugify(name.trim());

    const payload = {
      name: name.trim(),
      slug,
      description: description.trim(),
      icon,
    };
    const parsed = categoryCreateSchema.safeParse(payload);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        if (!fields[path]) fields[path] = issue.message;
      }
      setFieldErrors(fields);
      // A slug problem (collision/empty) has no visible field — surface it.
      if (fields.slug && !fields.name) setError(fields.slug);
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
          label="Title"
          id="name"
          name="name"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          placeholder="e.g. Fertilizers"
          required
          autoFocus
        />
        {fieldErrors.name ? <FieldError>{fieldErrors.name}</FieldError> : null}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-foreground">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.currentTarget.value)}
          rows={3}
          maxLength={280}
          placeholder="Short blurb shown under the category."
          className={`mt-1.5 ${fieldInputClass}`}
        />
        <p className="mt-1.5 text-xs text-muted">Optional · up to 280 characters.</p>
        {fieldErrors.description ? (
          <FieldError>{fieldErrors.description}</FieldError>
        ) : null}
      </div>

      <fieldset className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <legend className="text-sm font-medium text-foreground">Icon</legend>
          <span className="flex size-9 items-center justify-center rounded-input border border-tint/40 bg-tint-soft text-tint-dark">
            <PresetIcon name={icon} className="size-5" aria-hidden="true" />
          </span>
        </div>

        <label className="flex items-center gap-2 rounded-input bg-background px-3 py-2 ring-1 ring-border focus-within:ring-tint">
          <Search className="size-4 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={iconQuery}
            onChange={(event) => setIconQuery(event.currentTarget.value)}
            placeholder="Search icons…"
            aria-label="Search icons"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </label>

        <div className="max-h-56 overflow-y-auto rounded-input border border-border p-2">
          {filteredIcons.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-muted">
              No icons match “{iconQuery}”.
            </p>
          ) : (
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
              {filteredIcons.map((presetName) => {
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
          )}
        </div>
        <p className="text-xs text-muted">
          {ICON_PRESET_NAMES.length} icons available.
        </p>
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
