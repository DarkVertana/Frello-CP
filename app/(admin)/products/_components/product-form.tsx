"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, fieldInputClass } from "@/app/(auth)/_components/field";
import { Banner } from "@/app/(auth)/_components/banner";
import { SpinnerIcon } from "@/app/_components/icons";
import { ImageUploader } from "../../_components/image-uploader";
import { GalleryEditor } from "../../_components/gallery-editor";
import { useCurrency } from "../../_components/currency-provider";
import { AccentPicker } from "./accent-picker";
import { productCreateSchema, slugify } from "@/lib/schemas/product";
import { currencySymbol } from "@/lib/schemas/general";
import type { Product } from "@/db/schema";

type CategoryOption = { id: string; name: string; slug: string };

type Props = {
  product?: Product;
  categories: CategoryOption[];
  /** When set, the form calls this on success and skips its own navigation. */
  onSuccess?: () => void;
};

type FormState = {
  name: string;
  slug: string;
  categoryId: string;
  /** Rupees as a string for sane input UX; converted to paise on submit. */
  priceRupees: string;
  originalPriceRupees: string;
  rating: string;
  reviewsCount: string;
  stock: string;
  servesPerPerson: string;
  isActive: boolean;
  imageUrl: string;
  gallery: string[];
  accent: string;
  description: string;
};

function paiseToRupees(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return "";
  return (paise / 100).toFixed(2).replace(/\.00$/, "");
}

function rupeesToPaise(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const value = Number.parseFloat(trimmed);
  if (Number.isNaN(value)) return Number.NaN;
  return Math.round(value * 100);
}

function initialState(product?: Product, categories: CategoryOption[] = []): FormState {
  return {
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    categoryId: product?.categoryId ?? categories[0]?.id ?? "",
    priceRupees: paiseToRupees(product?.price),
    originalPriceRupees: paiseToRupees(product?.originalPrice),
    rating: product ? String(product.rating) : "0",
    reviewsCount: product ? String(product.reviewsCount) : "0",
    stock: product ? String(product.stock) : "0",
    servesPerPerson: product?.servesPerPerson ?? "",
    isActive: product?.isActive ?? true,
    imageUrl: product?.imageUrl ?? "",
    gallery: product?.gallery ?? [],
    accent: product?.accent ?? "#138A4C",
    description: product?.description ?? "",
  };
}

export function ProductForm({ product, categories, onSuccess }: Props) {
  const router = useRouter();
  const isEdit = !!product;
  const currency = useCurrency();
  const symbol = currencySymbol(currency);

  const [state, setState] = useState(() => initialState(product, categories));
  const [slugDirty, setSlugDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function onNameChange(value: string) {
    update("name", value);
    if (!slugDirty && !isEdit) update("slug", slugify(value));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const price = rupeesToPaise(state.priceRupees);
    const original = state.originalPriceRupees.trim()
      ? rupeesToPaise(state.originalPriceRupees)
      : null;

    const payload = {
      name: state.name.trim(),
      slug: state.slug.trim(),
      categoryId: state.categoryId,
      price: price ?? 0,
      originalPrice: original,
      rating: Number.parseFloat(state.rating || "0"),
      reviewsCount: Number.parseInt(state.reviewsCount || "0", 10) || 0,
      stock: Number.parseInt(state.stock || "0", 10) || 0,
      servesPerPerson: state.servesPerPerson.trim(),
      isActive: state.isActive,
      imageUrl: state.imageUrl.trim(),
      gallery: state.gallery,
      accent: state.accent,
      description: state.description.trim(),
    };

    const parsed = productCreateSchema.safeParse(payload);
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
    const url = isEdit ? `/api/v1/products/${product.id}` : "/api/v1/products";
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
      setError(body?.error?.message ?? "Couldn't save the product.");
      return;
    }

    if (onSuccess) {
      onSuccess();
      router.refresh();
      return;
    }
    router.push("/products");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {error ? <Banner tone="error">{error}</Banner> : null}

      <Section title="Basics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Field
              label="Name"
              id="name"
              name="name"
              value={state.name}
              onChange={(event) => onNameChange(event.currentTarget.value)}
              placeholder="Neem Oil 250 ml"
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
              value={state.slug}
              onChange={(event) => {
                setSlugDirty(true);
                update("slug", event.currentTarget.value);
              }}
              placeholder="neem-oil-250ml"
              required
            />
            {fieldErrors.slug ? <FieldError>{fieldErrors.slug}</FieldError> : null}
          </div>
        </div>

        <div>
          <label
            htmlFor="categoryId"
            className="block text-sm font-medium text-foreground"
          >
            Category
          </label>
          <select
            id="categoryId"
            value={state.categoryId}
            onChange={(event) => update("categoryId", event.currentTarget.value)}
            className={`mt-1.5 ${fieldInputClass}`}
          >
            {categories.length === 0 ? (
              <option value="">No categories — create one first</option>
            ) : null}
            {categories.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          {fieldErrors.categoryId ? (
            <FieldError>{fieldErrors.categoryId}</FieldError>
          ) : null}
        </div>
      </Section>

      <Section
        title="Price & stock"
        description={`Prices are in ${currency}. Stored in the smallest unit on the server.`}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Field
              label={`Price (${symbol})`}
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              value={state.priceRupees}
              onChange={(event) => update("priceRupees", event.currentTarget.value)}
              placeholder="299"
              required
            />
            {fieldErrors.price ? <FieldError>{fieldErrors.price}</FieldError> : null}
          </div>
          <div>
            <Field
              label={`Original price (${symbol}, optional)`}
              id="originalPrice"
              name="originalPrice"
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              value={state.originalPriceRupees}
              onChange={(event) =>
                update("originalPriceRupees", event.currentTarget.value)
              }
              placeholder="399"
            />
            {fieldErrors.originalPrice ? (
              <FieldError>{fieldErrors.originalPrice}</FieldError>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Field
              label="Stock"
              id="stock"
              name="stock"
              type="number"
              min="0"
              step="1"
              value={state.stock}
              onChange={(event) => update("stock", event.currentTarget.value)}
              placeholder="100"
            />
            {fieldErrors.stock ? <FieldError>{fieldErrors.stock}</FieldError> : null}
          </div>
          <div>
            <Field
              label="Rating (0–5)"
              id="rating"
              name="rating"
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={state.rating}
              onChange={(event) => update("rating", event.currentTarget.value)}
            />
            {fieldErrors.rating ? <FieldError>{fieldErrors.rating}</FieldError> : null}
          </div>
          <div>
            <Field
              label="Reviews"
              id="reviewsCount"
              name="reviewsCount"
              type="number"
              min="0"
              step="1"
              value={state.reviewsCount}
              onChange={(event) => update("reviewsCount", event.currentTarget.value)}
            />
            {fieldErrors.reviewsCount ? (
              <FieldError>{fieldErrors.reviewsCount}</FieldError>
            ) : null}
          </div>
        </div>

        <div>
          <Field
            label="Serves per person (optional)"
            id="servesPerPerson"
            name="servesPerPerson"
            value={state.servesPerPerson}
            onChange={(event) => update("servesPerPerson", event.currentTarget.value)}
            placeholder="e.g. 2 plants"
          />
          {fieldErrors.servesPerPerson ? (
            <FieldError>{fieldErrors.servesPerPerson}</FieldError>
          ) : null}
        </div>

        <label className="mt-2 inline-flex items-center gap-2 rounded-input border border-border bg-card px-3 py-2.5 text-sm text-foreground">
          <input
            type="checkbox"
            checked={state.isActive}
            onChange={(event) => update("isActive", event.currentTarget.checked)}
            className="size-4 rounded border-border text-tint focus:ring-tint"
          />
          Active — visible in the shop
        </label>
      </Section>

      <Section
        title="Hero image"
        description="Shown in the product card and at the top of the detail page."
      >
        <ImageUploader
          prefix="products"
          value={state.imageUrl}
          onChange={(value) => update("imageUrl", value)}
          required
        />
        {fieldErrors.imageUrl ? <FieldError>{fieldErrors.imageUrl}</FieldError> : null}
      </Section>

      <Section title="Gallery" description="Additional images on the product detail page.">
        <GalleryEditor
          prefix="products"
          value={state.gallery}
          onChange={(value) => update("gallery", value)}
        />
        {fieldErrors.gallery ? <FieldError>{fieldErrors.gallery}</FieldError> : null}
      </Section>

      <Section
        title="Accent colour"
        description="Used as the card's brand strip in the mobile shop."
      >
        <AccentPicker
          value={state.accent}
          onChange={(value) => update("accent", value)}
        />
        {fieldErrors.accent ? <FieldError>{fieldErrors.accent}</FieldError> : null}
      </Section>

      <Section title="Description" description="Markdown supported.">
        <textarea
          value={state.description}
          onChange={(event) => update("description", event.currentTarget.value)}
          rows={6}
          placeholder="Highlights, ingredients, application instructions…"
          className={fieldInputClass}
        />
        {fieldErrors.description ? (
          <FieldError>{fieldErrors.description}</FieldError>
        ) : null}
      </Section>

      <div className="flex items-center gap-3 border-t border-border pt-5">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-input bg-tint px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? <SpinnerIcon className="size-4 animate-spin" /> : null}
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create product"}
        </button>
        <Link
          href="/products"
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
