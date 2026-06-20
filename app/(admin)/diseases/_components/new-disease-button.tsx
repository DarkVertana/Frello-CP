"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "../../_components/modal";
import { DiseaseForm } from "./disease-form";

type SupplementOption = { id: string; name: string; brand: string | null };

export function NewDiseaseButton({
  supplements,
}: {
  supplements: SupplementOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-input bg-tint px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90"
      >
        <Plus className="size-4" aria-hidden="true" />
        New disease
      </button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        size="xl"
        title="New disease"
        description="The label is the key the mobile classifier uses to find this record."
      >
        <DiseaseForm
          supplements={supplements}
          onSuccess={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
