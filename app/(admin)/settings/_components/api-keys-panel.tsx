"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { Card } from "../../_components/card";
import { Modal } from "../../_components/modal";
import { Field } from "@/app/(auth)/_components/field";
import { Banner } from "@/app/(auth)/_components/banner";
import { SpinnerIcon } from "@/app/_components/icons";
import { formatDateTime, formatRelative } from "@/lib/format";
import { apiKeyCreateSchema, type ApiKeyPublic } from "@/lib/schemas/api-key";

type Props = {
  keys: ApiKeyPublic[];
  canManage: boolean;
};

export function ApiKeysPanel({ keys, canManage }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<{ name: string; plaintext: string } | null>(
    null,
  );
  const [revoking, setRevoking] = useState<string | null>(null);

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = apiKeyCreateSchema.safeParse({ name: name.trim() });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a name.");
      return;
    }

    setPending(true);
    const response = await fetch("/api/v1/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    setPending(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Couldn't generate the key.");
      return;
    }

    const body = await response.json();
    setRevealed({ name: parsed.data.name, plaintext: body.data.plaintext });
    setName("");
    setOpen(false);
    router.refresh();
  }

  async function handleRevoke(key: ApiKeyPublic) {
    if (
      !window.confirm(
        `Revoke "${key.name}"? Any client using it will immediately stop working.`,
      )
    )
      return;

    setRevoking(key.id);
    const response = await fetch(`/api/v1/api-keys/${key.id}`, { method: "DELETE" });
    setRevoking(null);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Couldn't revoke the key.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {revealed ? (
        <NewKeyReveal
          name={revealed.name}
          plaintext={revealed.plaintext}
          onDismiss={() => setRevealed(null)}
        />
      ) : null}

      <Card
        title="API keys"
        subtitle="Authenticate server-to-server requests. Send as a Bearer token."
        action={
          canManage ? (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setOpen(true);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-input bg-tint px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90"
            >
              <Plus className="size-4" aria-hidden="true" />
              Generate key
            </button>
          ) : null
        }
      >
        {error && !open ? (
          <div className="mb-4">
            <Banner tone="error">{error}</Banner>
          </div>
        ) : null}

        {keys.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <KeyRound className="size-6 text-muted" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">No API keys yet</p>
            <p className="text-sm text-muted">
              {canManage
                ? "Generate one to start making authenticated API calls."
                : "Ask an admin to generate one."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead className="border-b border-border">
                <tr>
                  <Th>Name</Th>
                  <Th>Key</Th>
                  <Th>Created</Th>
                  <Th>Last used</Th>
                  <Th>Status</Th>
                  {canManage ? <Th className="text-right">Actions</Th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {keys.map((key) => {
                  const revoked = !!key.revokedAt;
                  return (
                    <tr key={key.id}>
                      <td className="px-3 py-3 font-medium text-foreground">
                        {key.name}
                      </td>
                      <td className="px-3 py-3">
                        <code className="text-xs text-muted">
                          {key.prefix}_••••{key.lastFour}
                        </code>
                      </td>
                      <td className="px-3 py-3 text-muted">
                        {formatDateTime(key.createdAt)}
                      </td>
                      <td className="px-3 py-3 text-muted">
                        {key.lastUsedAt ? formatRelative(key.lastUsedAt) : "Never"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            revoked
                              ? "border-danger/20 bg-danger-soft text-danger"
                              : "border-tint/30 bg-tint-soft text-tint-dark"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`size-1.5 rounded-full ${
                              revoked ? "bg-danger" : "bg-tint"
                            }`}
                          />
                          {revoked ? "Revoked" : "Active"}
                        </span>
                      </td>
                      {canManage ? (
                        <td className="px-3 py-3 text-right">
                          {revoked ? (
                            <span className="text-xs text-muted">—</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRevoke(key)}
                              disabled={revoking === key.id}
                              aria-label={`Revoke ${key.name}`}
                              title="Revoke key"
                              className="inline-flex size-8 items-center justify-center rounded-input text-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                            </button>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onOpenChange={setOpen}
        size="md"
        title="Generate API key"
        description="Give the key a name so you can recognise it later."
      >
        <form onSubmit={handleGenerate} className="space-y-5" noValidate>
          {error ? <Banner tone="error">{error}</Banner> : null}
          <Field
            label="Name"
            id="apiKeyName"
            name="apiKeyName"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            placeholder="Mobile app — production"
            required
            autoFocus
          />
          <div className="flex items-center gap-3 border-t border-border pt-5">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-10 items-center gap-2 rounded-input bg-tint px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? <SpinnerIcon className="size-4 animate-spin" /> : null}
              {pending ? "Generating…" : "Generate key"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function NewKeyReveal({
  name,
  plaintext,
  onDismiss,
}: {
  name: string;
  plaintext: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(plaintext);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-card border border-tint/30 bg-tint-soft p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-tint-dark">
            Key “{name}” created
          </h3>
          <p className="mt-1 text-sm text-tint-dark/80">
            Copy it now — this is the only time the full key is shown.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-sm font-medium text-tint-dark/80 hover:text-tint-dark"
        >
          Done
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-input border border-tint/30 bg-card px-3 py-2.5 font-mono text-xs text-foreground">
          {plaintext}
        </code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-input bg-tint px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90"
        >
          {copied ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted ${className}`}
    >
      {children}
    </th>
  );
}
