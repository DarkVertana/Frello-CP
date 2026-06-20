"use client";

import { Modal } from "../../_components/modal";
import { UserForm } from "./user-form";
import type { UserRow } from "@/lib/data/users";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserRow;
};

export function UserModal({ open, onOpenChange, user }: Props) {
  const isEdit = !!user;
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={isEdit ? "Edit user" : "New user"}
      description={
        isEdit
          ? "Update the user's name and phone number."
          : "Create an account with an initial password and role."
      }
    >
      <UserForm user={user} onSuccess={() => onOpenChange(false)} />
    </Modal>
  );
}
