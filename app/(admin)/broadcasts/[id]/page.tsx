import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Users } from "lucide-react";
import { getSession } from "@/lib/session";
import { canManage, isAdmin } from "@/lib/rbac";
import {
  computeRecipientCount,
  getBroadcastById,
} from "@/lib/data/broadcasts";
import { Card } from "../../_components/card";
import { BroadcastStatusBadge } from "../_components/status-badge";
import { BroadcastActions } from "../_components/actions";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Broadcast" };
export const dynamic = "force-dynamic";

export default async function BroadcastDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  if (!isAdmin(session.user.role)) redirect("/");

  const { id } = await params;
  const broadcast = await getBroadcastById(id);
  if (!broadcast) notFound();

  const recipients = await computeRecipientCount(
    broadcast.segment,
    broadcast.segmentParams,
  );

  const writable = canManage(session.user.role);

  return (
    <div className="space-y-6">
      <Link
        href="/broadcasts"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to broadcasts
      </Link>

      <Card>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <BroadcastStatusBadge status={broadcast.status} />
            <span className="rounded-full bg-tint-soft px-2.5 py-0.5 text-xs font-medium text-tint-dark capitalize">
              Segment: {broadcast.segment.replace("_", " ")}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Users className="size-3.5" aria-hidden="true" />
              {recipients.count}
              {recipients.approximate ? " (approx.)" : ""} recipients
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {broadcast.title}
          </h1>
          <p className="text-xs text-muted">
            Created {formatDateTime(broadcast.createdAt)}
            {broadcast.scheduleAt
              ? ` · Scheduled for ${formatDateTime(broadcast.scheduleAt)}`
              : ""}
            {broadcast.sentAt
              ? ` · Sent at ${formatDateTime(broadcast.sentAt)}`
              : ""}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Message">
            <p className="whitespace-pre-line text-sm text-foreground">
              {broadcast.body}
            </p>
          </Card>

          <Card title="Segment params">
            {Object.keys(broadcast.segmentParams).length === 0 ? (
              <p className="text-sm text-muted">No params — targets everyone.</p>
            ) : (
              <pre className="overflow-auto rounded-input bg-background p-3 font-mono text-xs text-foreground">
                {JSON.stringify(broadcast.segmentParams, null, 2)}
              </pre>
            )}
          </Card>

          {broadcast.status === "sent" ? (
            <Card title="Delivery stats">
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-muted">Recipients (intent)</dt>
                <dd className="font-medium tabular-nums text-foreground">
                  {broadcast.stats.sent}
                </dd>
                <dt className="text-muted">Opens recorded</dt>
                <dd className="font-medium tabular-nums text-foreground">
                  {broadcast.stats.opened}
                </dd>
              </dl>
              <p className="mt-3 text-xs text-muted">
                Open counts update when the mobile app reports impressions —
                wired separately from the admin shell.
              </p>
            </Card>
          ) : null}
        </div>

        <div>
          {writable ? (
            <Card title="Actions">
              <BroadcastActions broadcast={broadcast} />
            </Card>
          ) : (
            <Card>
              <p className="text-xs text-muted">
                Viewer access — actions are restricted to admins.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
