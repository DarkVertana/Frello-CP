"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal } from "../../_components/modal";
import { BroadcastForm } from "./broadcast-form";

export function NewBroadcastButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-input bg-tint px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90"
      >
        <Plus className="size-4" aria-hidden="true" />
        New broadcast
      </button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        size="lg"
        title="New broadcast"
        description="Compose a draft. You'll send or schedule it from the detail page once it's ready."
      >
        <BroadcastForm
          onSuccess={(id) => {
            setOpen(false);
            // Hop straight to the detail page where the actions panel lives.
            router.push(`/broadcasts/${id}`);
          }}
        />
      </Modal>
    </>
  );
}
