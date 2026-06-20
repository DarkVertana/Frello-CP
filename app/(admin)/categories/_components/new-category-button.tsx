"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { CategoryModal } from "./category-modal";

export function NewCategoryButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-input bg-tint px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90"
      >
        <Plus className="size-4" aria-hidden="true" />
        New category
      </button>
      <CategoryModal open={open} onOpenChange={setOpen} />
    </>
  );
}
