"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Modal } from "../../_components/modal";
import { ProductForm } from "./product-form";

type CategoryOption = { id: string; name: string; slug: string };

export function NewProductButton({ categories }: { categories: CategoryOption[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-input bg-tint px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90"
      >
        <Plus className="size-4" aria-hidden="true" />
        New product
      </button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        size="xl"
        title="New product"
        description="Catalog entry shown in the mobile shop. Hero image is required; gallery is optional."
      >
        {categories.length === 0 ? (
          <p className="text-sm text-foreground">
            Create at least one{" "}
            <Link
              href="/categories"
              className="font-medium text-tint-dark hover:text-tint"
              onClick={() => setOpen(false)}
            >
              category
            </Link>{" "}
            first — every product needs one.
          </p>
        ) : (
          <ProductForm categories={categories} onSuccess={() => setOpen(false)} />
        )}
      </Modal>
    </>
  );
}
