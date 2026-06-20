"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Modal } from "../../_components/modal";
import { SupplementForm } from "./supplement-form";
import type { Supplement } from "@/db/schema";

type GroupedLabels = Record<
  string,
  { label: string; disease: string; healthy: boolean }[]
>;

type Props = {
  supplement: Supplement;
  groupedLabels: GroupedLabels;
};

export function EditSupplementButton({ supplement, groupedLabels }: Props) {
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
        size="lg"
        title="Edit supplement"
        description="Changes go live in the mobile app on its next refresh."
      >
        <SupplementForm
          supplement={supplement}
          groupedLabels={groupedLabels}
          onSuccess={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
