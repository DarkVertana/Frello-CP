"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Banner } from "@/app/(auth)/_components/banner";
import { formatDate, formatRelative } from "@/lib/format";
import {
  CONSULTATION_STATUSES,
  titleCase,
  type ConsultationStatus,
} from "@/lib/schemas/consultation";
import type { ConsultationRow } from "@/lib/data/consultations";

const STATUS_TONE: Record<ConsultationStatus, string> = {
  pending: "border-amber-300/50 bg-amber-50 text-amber-700",
  scheduled: "border-tint/30 bg-tint-soft text-tint-dark",
  completed: "border-zinc-300/60 bg-zinc-100 text-zinc-700",
  cancelled: "border-danger/20 bg-danger-soft text-danger",
};

export function ConsultationsTable({
  rows,
  canManage,
}: {
  rows: ConsultationRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function changeStatus(id: string, status: string) {
    setBusyId(id);
    setError(null);
    const response = await fetch(`/api/v1/consultations/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusyId(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Couldn't update status.");
      return;
    }
    startTransition(() => router.refresh());
  }

  async function handleDelete(row: ConsultationRow) {
    if (!window.confirm(`Delete the request from ${row.fullName}?`)) return;
    setBusyId(row.id);
    setError(null);
    const response = await fetch(`/api/v1/consultations/${row.id}`, {
      method: "DELETE",
    });
    setBusyId(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Couldn't delete that request.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      {error ? <Banner tone="error">{error}</Banner> : null}

      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-sm">
            <thead className="border-b border-border bg-background/70">
              <tr>
                <Th>Requester</Th>
                <Th>Location</Th>
                <Th>Crop</Th>
                <Th>Farm size</Th>
                <Th>Visit date</Th>
                <Th>Message</Th>
                <Th>Status</Th>
                <Th>Submitted</Th>
                {canManage ? <Th className="text-right">Actions</Th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id} className="align-top transition hover:bg-tint-soft/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/users/${row.userId}`}
                      className="font-medium text-foreground hover:text-tint-dark"
                    >
                      {row.fullName}
                    </Link>
                    <div className="text-xs text-muted">{row.phone}</div>
                    {row.accountEmail ? (
                      <div className="truncate text-xs text-muted">{row.accountEmail}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted">{row.location}</td>
                  <td className="px-4 py-3 text-foreground">{titleCase(row.mainCrop)}</td>
                  <td className="px-4 py-3 text-muted">{row.farmSize}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(row.visitDate)}</td>
                  <td className="max-w-[220px] px-4 py-3 text-muted">
                    {row.message ? (
                      <span className="line-clamp-2" title={row.message}>
                        {row.message}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <select
                        value={row.status}
                        onChange={(event) => changeStatus(row.id, event.currentTarget.value)}
                        disabled={busyId === row.id}
                        aria-label={`Status for ${row.fullName}`}
                        className="h-8 rounded-input border border-border bg-card px-2 text-xs text-foreground"
                      >
                        {CONSULTATION_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {titleCase(s)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_TONE[row.status as ConsultationStatus]
                        }`}
                      >
                        {titleCase(row.status)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{formatRelative(row.createdAt)}</td>
                  {canManage ? (
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        disabled={busyId === row.id}
                        aria-label={`Delete request from ${row.fullName}`}
                        title="Delete request"
                        className="inline-flex size-8 items-center justify-center rounded-input text-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted ${className}`}
    >
      {children}
    </th>
  );
}
