import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Star } from "lucide-react";
import { getSession } from "@/lib/session";
import { canManage, isAdmin } from "@/lib/rbac";
import {
  getProductWithCategoryById,
  listCategoryOptions,
} from "@/lib/data/products";
import { getActiveCurrency } from "@/lib/data/settings";
import { LOW_STOCK_THRESHOLD } from "@/lib/schemas/product";
import { formatAmount, formatDateTime } from "@/lib/format";
import { Card } from "../../_components/card";
import { ActiveBadge } from "../_components/active-badge";
import { EditProductButton } from "../_components/edit-product-button";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductWithCategoryById(id);
  return { title: product?.name ?? "Product" };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) return null;
  if (!isAdmin(session.user.role)) redirect("/");

  const { id } = await params;
  const product = await getProductWithCategoryById(id);
  if (!product) notFound();

  const writable = canManage(session.user.role);
  const [categories, currency] = await Promise.all([
    writable ? listCategoryOptions() : Promise.resolve([]),
    getActiveCurrency(),
  ]);

  const lowStock = product.stock < LOW_STOCK_THRESHOLD;
  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) * 100,
        )
      : null;

  return (
    <div className="space-y-6">
      <Link
        href="/products"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted transition hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Products
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {product.name}
            </h1>
            <ActiveBadge active={product.isActive} />
          </div>
          <p className="text-sm text-muted">
            <code className="text-xs">/{product.slug}</code>
            {product.category ? (
              <>
                {" · "}
                <Link
                  href={`/products?categoryId=${product.category.id}`}
                  className="hover:text-foreground"
                >
                  {product.category.name}
                </Link>
              </>
            ) : null}
          </p>
        </div>
        {writable ? (
          <EditProductButton product={product} categories={categories} />
        ) : null}
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        {/* Media */}
        <div className="space-y-3">
          <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.imageUrl}
              alt={product.name}
              className="aspect-square w-full object-cover"
            />
          </div>
          {product.gallery.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {product.gallery.map((url, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-input border border-border bg-card"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Details */}
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-end gap-3">
              <span className="text-3xl font-semibold tracking-tight text-foreground">
                {formatAmount(product.price, currency)}
              </span>
              {product.originalPrice ? (
                <span className="text-lg text-muted line-through">
                  {formatAmount(product.originalPrice, currency)}
                </span>
              ) : null}
              {discount ? (
                <span className="rounded-full bg-tint-soft px-2.5 py-1 text-xs font-semibold text-tint-dark">
                  {discount}% off
                </span>
              ) : null}
            </div>
          </Card>

          <Card>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
              <Stat label="Stock">
                <span
                  className={`tabular-nums ${lowStock ? "text-danger" : "text-foreground"}`}
                >
                  {product.stock}
                </span>
                {lowStock ? (
                  <span className="ml-1 text-xs text-danger">low</span>
                ) : null}
              </Stat>
              <Stat label="Rating">
                <span className="inline-flex items-center gap-1 text-foreground">
                  <Star
                    className="size-4 fill-tint text-tint"
                    aria-hidden="true"
                  />
                  <span className="tabular-nums">{product.rating.toFixed(1)}</span>
                </span>
                <span className="ml-1 text-xs text-muted">
                  ({product.reviewsCount})
                </span>
              </Stat>
              <Stat label="Serves / person">
                {product.servesPerPerson ?? "—"}
              </Stat>
              <Stat label="Category">
                {product.category?.name ?? "—"}
              </Stat>
              <Stat label="Accent">
                <span className="inline-flex items-center gap-2">
                  <span
                    className="size-4 rounded-full border border-border"
                    style={{ backgroundColor: product.accent }}
                  />
                  <code className="text-xs uppercase">{product.accent}</code>
                </span>
              </Stat>
              <Stat label="Status">
                {product.isActive ? "Active" : "Hidden"}
              </Stat>
            </dl>
          </Card>

          <Card title="Description">
            {product.description ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {product.description}
              </p>
            ) : (
              <p className="text-sm text-muted">No description yet.</p>
            )}
          </Card>

          <p className="text-xs text-muted">
            Created {formatDateTime(product.createdAt)} · Updated{" "}
            {formatDateTime(product.updatedAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium">{children}</dd>
    </div>
  );
}
