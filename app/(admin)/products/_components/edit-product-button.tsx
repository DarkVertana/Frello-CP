"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { ProductModal } from "./product-modal";
import type { Product } from "@/db/schema";

type CategoryOption = { id: string; name: string; slug: string };

/**
 * "Edit" action for the product detail page. Reuses the same modal + form as
 * the list; ProductForm calls router.refresh() on success, so the detail page
 * re-renders with the saved values once the modal closes.
 */
export function EditProductButton({
  product,
  categories,
}: {
  product: Product;
  categories: CategoryOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-input bg-tint px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90"
      >
        <Pencil className="size-4" aria-hidden="true" />
        Edit
      </button>
      <ProductModal
        open={open}
        onOpenChange={setOpen}
        product={product}
        categories={categories}
      />
    </>
  );
}
