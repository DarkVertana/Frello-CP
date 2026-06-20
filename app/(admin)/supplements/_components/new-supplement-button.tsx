"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "../../_components/modal";
import { SupplementForm } from "./supplement-form";

type GroupedLabels = Record<
  string,
  { label: string; disease: string; healthy: boolean }[]
>;

export function NewSupplementButton({
  groupedLabels,
}: {
  groupedLabels: GroupedLabels;
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
        New supplement
      </button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        size="lg"
        title="New supplement"
        description="Recommended product surfaced on the mobile diagnosis card."
      >
        <SupplementForm
          groupedLabels={groupedLabels}
          onSuccess={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
