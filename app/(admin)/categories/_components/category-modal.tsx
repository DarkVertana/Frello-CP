"use client";

import { Modal } from "../../_components/modal";
import { CategoryForm } from "./category-form";
import type { Category } from "@/db/schema";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category;
};

export function CategoryModal({ open, onOpenChange, category }: Props) {
  const isEdit = !!category;
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={isEdit ? "Edit category" : "New category"}
      description={
        isEdit
          ? "Changes go live in the mobile app the next time it refreshes."
          : "Categories group products in the mobile shop."
      }
    >
      <CategoryForm category={category} onSuccess={() => onOpenChange(false)} />
    </Modal>
  );
}
