"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "../../../_components/modal";
import { Banner } from "@/app/(auth)/_components/banner";
import { AddressForm } from "./address-form";
import type { Address } from "@/lib/data/addresses";

type Props = {
  userId: string;
  addresses: Address[];
  canManage: boolean;
};

export function AddressPanel({ userId, addresses, canManage }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setError(null);
    setOpen(true);
  }

  function openEdit(address: Address) {
    setEditing(address);
    setError(null);
    setOpen(true);
  }

  async function handleDelete(address: Address) {
    if (!window.confirm(`Delete this ${address.label} address? This can't be undone.`))
      return;

    setDeletingId(address.id);
    setError(null);
    const response = await fetch(`/api/v1/shipping-address/${address.id}`, {
      method: "DELETE",
    });
    setDeletingId(null);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Couldn't delete that address.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          Shipping addresses{" "}
          <span className="font-normal text-muted">({addresses.length})</span>
        </h2>
        {canManage ? (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 items-center gap-2 rounded-input bg-tint px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add address
          </button>
        ) : null}
      </div>

      {error ? <Banner tone="error">{error}</Banner> : null}

      {addresses.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-border bg-card py-12 text-center">
          <MapPin className="size-6 text-muted" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">No addresses yet</p>
          <p className="text-sm text-muted">
            {canManage
              ? "Add this user's first shipping address."
              : "This user hasn't added any addresses."}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="rounded-card border border-border bg-card p-4 shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium capitalize text-muted">
                    {address.label}
                  </span>
                  {address.isDefault ? (
                    <span className="inline-flex items-center rounded-full border border-tint/30 bg-tint-soft px-2.5 py-0.5 text-xs font-medium text-tint-dark">
                      Default
                    </span>
                  ) : null}
                </div>
                {canManage ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(address)}
                      aria-label="Edit address"
                      className="flex size-8 items-center justify-center rounded-input text-muted transition hover:bg-tint-soft hover:text-foreground"
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(address)}
                      disabled={deletingId === address.id}
                      aria-label="Delete address"
                      className="flex size-8 items-center justify-center rounded-input text-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="mt-3 space-y-0.5 text-sm">
                <p className="font-medium text-foreground">{address.name}</p>
                <p className="text-muted">{address.line1}</p>
                {address.line2 ? <p className="text-muted">{address.line2}</p> : null}
                <p className="text-muted">
                  {address.city}, {address.state} {address.postal}
                </p>
                <p className="text-muted">{address.country}</p>
                <p className="pt-1 text-muted">{address.phone}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <Modal
          open={open}
          onOpenChange={setOpen}
          size="lg"
          title={editing ? "Edit address" : "Add address"}
          description={
            editing
              ? "Update this shipping address."
              : "Add a new shipping address for this user."
          }
        >
          <AddressForm
            userId={userId}
            address={editing ?? undefined}
            onSuccess={() => setOpen(false)}
          />
        </Modal>
      ) : null}
    </div>
  );
}
