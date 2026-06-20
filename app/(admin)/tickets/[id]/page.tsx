import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ChevronLeft,
  Lock,
  Mail,
  Paperclip,
  Phone,
  Shield,
  User as UserIcon,
} from "lucide-react";
import { getSession } from "@/lib/session";
import { canSupport } from "@/lib/rbac";
import { getTicketById, listAgents } from "@/lib/data/tickets";
import { Card } from "../../_components/card";
import { PriorityBadge, TicketStatusBadge } from "../_components/badges";
import { TicketActions } from "../_components/ticket-actions";
import { ReplyForm } from "../_components/reply-form";
import { formatDateTime, formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Ticket detail" };
export const dynamic = "force-dynamic";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  if (!canSupport(session.user.role)) redirect("/");

  const { id } = await params;
  const [ticket, agents] = await Promise.all([getTicketById(id), listAgents()]);
  if (!ticket) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/tickets"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to tickets
      </Link>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {ticket.subject}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <TicketStatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <span className="rounded-full bg-tint-soft px-2.5 py-0.5 text-xs font-medium text-tint-dark">
                {ticket.category}
              </span>
              <span className="text-xs text-muted">
                Opened {formatDateTime(ticket.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title={`Thread (${ticket.replies.length + 1})`}>
            <div className="space-y-5">
              <InitialMessage
                authorName={ticket.customer?.name ?? "Customer"}
                body={ticket.body}
                createdAt={ticket.createdAt.toISOString()}
              />

              {ticket.replies.map((reply) => (
                <ReplyMessage
                  key={reply.id}
                  authorName={reply.author?.name ?? "Unknown"}
                  fromAgent={reply.fromAgent}
                  isInternal={reply.isInternal}
                  body={reply.body}
                  createdAt={reply.createdAt.toISOString()}
                  attachments={reply.attachments}
                />
              ))}
            </div>
          </Card>

          <Card title="Reply">
            <ReplyForm ticketId={ticket.id} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Customer">
            {ticket.customer ? (
              <div className="space-y-2 text-sm">
                <Link
                  href={`/users/${ticket.customer.id}`}
                  className="inline-flex items-center gap-1.5 font-medium text-tint-dark hover:text-tint"
                >
                  <UserIcon className="size-3.5" aria-hidden="true" />
                  {ticket.customer.name}
                </Link>
                <p className="inline-flex items-center gap-1.5 text-muted">
                  <Mail className="size-3.5" aria-hidden="true" />
                  {ticket.customer.email}
                </p>
                {ticket.customer.phone ? (
                  <p className="inline-flex items-center gap-1.5 text-muted">
                    <Phone className="size-3.5" aria-hidden="true" />
                    {ticket.customer.phone}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted">Customer no longer exists.</p>
            )}
          </Card>

          <Card title="Actions">
            <TicketActions
              ticketId={ticket.id}
              status={ticket.status}
              assigneeId={ticket.assigneeId}
              currentUserId={session.user.id}
              agents={agents.map(({ id, name }) => ({ id, name }))}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

function InitialMessage({
  authorName,
  body,
  createdAt,
}: {
  authorName: string;
  body: string;
  createdAt: string;
}) {
  return (
    <article className="rounded-card border border-border bg-card p-4">
      <header className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700">
            {initials(authorName)}
          </span>
          <span className="text-sm font-medium text-foreground">
            {authorName}{" "}
            <span className="text-xs font-normal text-muted">(customer)</span>
          </span>
        </div>
        <span className="text-xs text-muted">{formatRelative(createdAt)}</span>
      </header>
      <p className="whitespace-pre-line text-sm text-foreground">{body}</p>
    </article>
  );
}

function ReplyMessage({
  authorName,
  fromAgent,
  isInternal,
  body,
  createdAt,
  attachments,
}: {
  authorName: string;
  fromAgent: boolean;
  isInternal: boolean;
  body: string;
  createdAt: string;
  attachments: { url: string; filename: string }[];
}) {
  if (isInternal) {
    return (
      <article className="rounded-card border border-amber-500/30 bg-amber-50 p-4">
        <header className="mb-2 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-amber-900">
            <Lock className="size-3.5" aria-hidden="true" />
            Internal note — {authorName}
          </div>
          <span className="text-xs text-amber-900/80">
            {formatRelative(createdAt)}
          </span>
        </header>
        <p className="whitespace-pre-line text-sm text-amber-950">{body}</p>
        {attachments.length > 0 ? (
          <AttachmentList items={attachments} tone="amber" />
        ) : null}
      </article>
    );
  }

  return (
    <article
      className={`rounded-card border p-4 ${
        fromAgent ? "border-tint/30 bg-tint-soft/40" : "border-border bg-card"
      }`}
    >
      <header className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${
              fromAgent ? "bg-tint text-white" : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {initials(authorName)}
          </span>
          <span className="text-sm font-medium text-foreground">
            {authorName}{" "}
            <span className="text-xs font-normal text-muted">
              ({fromAgent ? "agent" : "customer"})
            </span>
            {fromAgent ? (
              <Shield
                className="ml-1 inline size-3 align-baseline text-tint-dark"
                aria-hidden="true"
              />
            ) : null}
          </span>
        </div>
        <span className="text-xs text-muted">{formatRelative(createdAt)}</span>
      </header>
      <p className="whitespace-pre-line text-sm text-foreground">{body}</p>
      {attachments.length > 0 ? <AttachmentList items={attachments} /> : null}
    </article>
  );
}

function AttachmentList({
  items,
  tone = "default",
}: {
  items: { url: string; filename: string }[];
  tone?: "default" | "amber";
}) {
  return (
    <ul className="mt-3 space-y-1.5">
      {items.map((item) => (
        <li key={item.url}>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-1.5 text-xs font-medium underline-offset-2 hover:underline ${
              tone === "amber" ? "text-amber-900" : "text-tint-dark"
            }`}
          >
            <Paperclip className="size-3" aria-hidden="true" />
            {item.filename}
          </a>
        </li>
      ))}
    </ul>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

