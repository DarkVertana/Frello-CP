"use client";

import { Modal } from "../../_components/modal";
import { ProductForm } from "./product-form";
import type { Product } from "@/db/schema";

type CategoryOption = { id: string; name: string; slug: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
  categories: CategoryOption[];
};

export function ProductModal({ open, onOpenChange, product, categories }: Props) {
  const isEdit = !!product;
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={isEdit ? "Edit product" : "New product"}
      description={
        isEdit
          ? "Changes go live in the mobile shop on its next refresh."
          : "Catalog entry shown in the mobile shop. Hero image is required; gallery is optional."
      }
    >
      <ProductForm
        product={product}
        categories={categories}
        onSuccess={() => onOpenChange(false)}
      />
    </Modal>
  );
}
