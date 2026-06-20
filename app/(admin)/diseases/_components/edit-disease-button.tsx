"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Modal } from "../../_components/modal";
import { DiseaseForm } from "./disease-form";
import type { Disease } from "@/db/schema";

type SupplementOption = { id: string; name: string; brand: string | null };

type Props = {
  disease: Disease;
  supplements: SupplementOption[];
};

export function EditDiseaseButton({ disease, supplements }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-1.5 rounded-input border border-border bg-card px-3 text-sm font-medium text-foreground transition hover:bg-tint-soft"
      >
        <Pencil className="size-4" aria-hidden="true" />
        Edit
      </button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        size="xl"
        title="Edit disease"
        description="Edits show on the mobile diagnosis card immediately. The label is immutable."
      >
        <DiseaseForm
          disease={disease}
          supplements={supplements}
          onSuccess={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
