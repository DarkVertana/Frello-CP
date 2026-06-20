"use client";

import { Modal } from "../../_components/modal";
import { SettingForm } from "./setting-form";
import type { Setting } from "@/db/schema";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setting?: Setting;
};

export function SettingModal({ open, onOpenChange, setting }: Props) {
  const isEdit = !!setting;
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={isEdit ? "Edit setting" : "New setting"}
      description={
        isEdit
          ? "Changes apply on the next request from the app."
          : "The value is stored as JSON — anything from a single string to a nested object."
      }
    >
      <SettingForm setting={setting} onSuccess={() => onOpenChange(false)} />
    </Modal>
  );
}
