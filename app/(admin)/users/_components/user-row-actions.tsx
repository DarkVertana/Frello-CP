"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Pencil, ShieldBan, ShieldCheck, Trash2 } from "lucide-react";
import type { UserRow } from "@/lib/data/users";
import { UserModal } from "./user-modal";

type Props = {
  user: UserRow;
  currentUserId: string;
  canManage: boolean;
  isSuperAdmin: boolean;
};

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "viewer", label: "Viewer" },
];

export function UserRowActions({
  user,
  currentUserId,
  canManage,
  isSuperAdmin,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "role" | "ban" | "delete">(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();

  const isSelf = user.id === currentUserId;
  const banned = user.status === "banned";

  async function call(
    label: typeof busy,
    init: { method: "POST" | "DELETE" | "PATCH"; url: string; body?: unknown },
  ) {
    setBusy(label);
    setError(null);
    const response = await fetch(init.url, {
      method: init.method,
      headers: init.body ? { "content-type": "application/json" } : undefined,
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    setBusy(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Action failed.");
      return false;
    }
    startTransition(() => router.refresh());
    return true;
  }

  async function handleRoleChange(role: string) {
    if (role === user.role) return;
    await call("role", {
      method: "POST",
      url: `/api/v1/users/${user.id}/role`,
      body: { role },
    });
  }

  async function handleBanToggle() {
    if (banned) {
      await call("ban", { method: "DELETE", url: `/api/v1/users/${user.id}/ban` });
    } else {
      if (!window.confirm(`Ban ${user.name}? Their sessions will be revoked.`)) return;
      await call("ban", { method: "POST", url: `/api/v1/users/${user.id}/ban` });
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ${user.name}? This permanently removes their account.`))
      return;
    await call("delete", { method: "DELETE", url: `/api/v1/users/${user.id}` });
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {canManage ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Edit ${user.name}`}
          title="Edit user"
          className="flex size-8 items-center justify-center rounded-input text-muted transition hover:bg-tint-soft hover:text-foreground"
        >
          <Pencil className="size-4" aria-hidden="true" />
        </button>
      ) : null}

      {isSuperAdmin && !isSelf ? (
        <div className="relative">
          <select
            value={user.role}
            onChange={(event) => handleRoleChange(event.currentTarget.value)}
            aria-label={`Change role for ${user.name}`}
            disabled={busy === "role"}
            className="h-8 appearance-none rounded-input border border-border bg-card pl-2 pr-7 text-xs text-foreground"
          >
            {ROLES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
        </div>
      ) : null}

      {canManage && !isSelf ? (
        <>
          <button
            type="button"
            onClick={handleBanToggle}
            disabled={busy === "ban"}
            aria-label={banned ? `Unban ${user.name}` : `Ban ${user.name}`}
            title={banned ? "Unban user" : "Ban user"}
            className={`flex size-8 items-center justify-center rounded-input transition disabled:opacity-50 ${
              banned
                ? "text-tint-dark hover:bg-tint-soft"
                : "text-muted hover:bg-danger-soft hover:text-danger"
            }`}
          >
            {banned ? (
              <ShieldCheck className="size-4" aria-hidden="true" />
            ) : (
              <ShieldBan className="size-4" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={busy === "delete"}
            aria-label={`Delete ${user.name}`}
            title="Delete user"
            className="flex size-8 items-center justify-center rounded-input text-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </>
      ) : null}

      {error ? (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      ) : null}

      {canManage ? (
        <UserModal open={editing} onOpenChange={setEditing} user={user} />
      ) : null}
    </div>
  );
}
