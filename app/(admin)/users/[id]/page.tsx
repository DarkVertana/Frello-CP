import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Mail, Phone } from "lucide-react";
import { getSession } from "@/lib/session";
import { canManage, isAdmin, isSuperAdmin as isSuperAdminFn } from "@/lib/rbac";
import { countActiveSessions, getUserById } from "@/lib/data/users";
import { Card } from "../../_components/card";
import { RoleBadge } from "../_components/role-badge";
import { StatusBadge } from "../_components/status-badge";
import { UserRowActions } from "../_components/user-row-actions";
import { formatDateTime, formatRelative } from "@/lib/format";
import { TabNav, parseTab } from "./_components/tab-nav";
import { ActivityFeed } from "./_components/activity-feed";
import { OrdersTab } from "./_components/orders-tab";
import { TicketsTab } from "./_components/tickets-tab";
import { ScansTab } from "./_components/scans-tab";

export const metadata: Metadata = { title: "User detail" };
export const dynamic = "force-dynamic";

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  if (!isAdmin(session.user.role)) redirect("/");

  const { id } = await params;
  const sp = await searchParams;
  const tab = parseTab(sp.tab);
  const target = await getUserById(id);
  if (!target) notFound();

  const sessions = await countActiveSessions(id);

  return (
    <div className="space-y-6">
      <Link
        href="/users"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to users
      </Link>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-full bg-tint-soft text-base font-semibold text-tint-dark">
              {initials(target.name)}
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {target.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-3.5" aria-hidden="true" />
                  {target.email}
                </span>
                {target.phone ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="size-3.5" aria-hidden="true" />
                    {target.phone}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <RoleBadge role={target.role} />
                <StatusBadge status={target.status} />
              </div>
            </div>
          </div>

          <UserRowActions
            user={target}
            currentUserId={session.user.id}
            canManage={canManage(session.user.role)}
            isSuperAdmin={isSuperAdminFn(session.user.role)}
          />
        </div>
      </Card>

      <TabNav userId={id} active={tab} />

      {tab === "overview" ? (
        <Overview user={target} sessions={sessions} />
      ) : tab === "activity" ? (
        <ActivityFeed userId={id} />
      ) : tab === "orders" ? (
        <OrdersTab userId={id} />
      ) : tab === "tickets" ? (
        <TicketsTab userId={id} />
      ) : tab === "scans" ? (
        <ScansTab userId={id} />
      ) : (
        <Placeholder tab={tab} />
      )}
    </div>
  );
}

function Overview({
  user,
  sessions,
}: {
  user: Awaited<ReturnType<typeof getUserById>>;
  sessions: number;
}) {
  if (!user) return null;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Account details">
        <dl className="grid grid-cols-3 gap-y-3 text-sm">
          <Row label="User ID" value={<code className="text-xs">{user.id}</code>} />
          <Row label="Email verified" value={user.emailVerified ? "Yes" : "No"} />
          <Row label="Joined" value={formatDateTime(user.createdAt)} />
          <Row label="Last seen" value={formatRelative(user.lastSeenAt)} />
          <Row label="Active sessions" value={String(sessions)} />
        </dl>
      </Card>

      <Card title="Roles & permissions">
        <p className="text-sm text-muted">
          This account is a <RoleBadge role={user.role} />. Role changes are
          Super-Admin-only and bumped from the actions menu above.
        </p>
        <p className="mt-3 text-sm text-muted">
          Status: <StatusBadge status={user.status} />. Banning revokes every
          session immediately.
        </p>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="col-span-1 text-muted">{label}</dt>
      <dd className="col-span-2 text-foreground">{value}</dd>
    </>
  );
}

function Placeholder({ tab }: { tab: string }) {
  return (
    <Card>
      <div className="grid place-items-center py-16 text-center">
        <p className="text-sm font-semibold text-foreground">
          {label(tab)} coming soon
        </p>
        <p className="mt-1 text-sm text-muted">
          Lights up when the {label(tab).toLowerCase()} entity ships.
        </p>
      </div>
    </Card>
  );
}

function label(tab: string): string {
  switch (tab) {
    case "orders":
      return "Orders";
    case "addresses":
      return "Addresses";
    case "payment-methods":
      return "Payment methods";
    case "tickets":
      return "Tickets";
    case "scans":
      return "Scans";
    default:
      return tab;
  }
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
