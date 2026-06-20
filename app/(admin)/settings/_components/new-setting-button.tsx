"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { SettingModal } from "./setting-modal";

export function NewSettingButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-input bg-tint px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90"
      >
        <Plus className="size-4" aria-hidden="true" />
        New setting
      </button>
      <SettingModal open={open} onOpenChange={setOpen} />
    </>
  );
}
