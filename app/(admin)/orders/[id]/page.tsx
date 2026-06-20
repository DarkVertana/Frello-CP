import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, MapPin, Phone, User } from "lucide-react";
import { getSession } from "@/lib/session";
import { canManage, isAdmin } from "@/lib/rbac";
import { getOrderById } from "@/lib/data/orders";
import { Card } from "../../_components/card";
import { OrderStatusBadge } from "../_components/order-status-badge";
import { Timeline } from "../_components/timeline";
import { OrderActions } from "../_components/order-actions";
import { formatAmount, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Order detail" };
export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  if (!isAdmin(session.user.role)) redirect("/");

  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const writable = canManage(session.user.role);

  return (
    <div className="space-y-6">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to orders
      </Link>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <code className="text-xs text-muted">{order.id}</code>
              <OrderStatusBadge status={order.status} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {formatAmount(order.total)}
            </h1>
            <p className="text-xs text-muted">
              Placed {formatDateTime(order.createdAt)} · Updated{" "}
              {formatDateTime(order.updatedAt)}
              {order.trackingNumber ? (
                <> · Tracking <code className="text-foreground">{order.trackingNumber}</code></>
              ) : null}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title={`Items (${order.items.length})`}>
            {order.items.length === 0 ? (
              <p className="text-sm text-muted">No items recorded.</p>
            ) : (
              <ul className="divide-y divide-border">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted">
                        {item.qty} × {formatAmount(item.priceAtOrder)}
                      </p>
                    </div>
                    <p className="text-sm font-medium tabular-nums text-foreground">
                      {formatAmount(item.qty * item.priceAtOrder)}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <dl className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
              <Row label="Subtotal" value={formatAmount(order.subtotal)} />
              <Row label="Shipping" value={formatAmount(order.shipping)} />
              <Row label="Tax" value={formatAmount(order.tax)} />
              <Row label="Total" value={formatAmount(order.total)} bold />
            </dl>
          </Card>

          <Card title="Timeline">
            <Timeline entries={order.timeline} />
          </Card>

          {order.notes ? (
            <Card title="Internal notes">
              <p className="whitespace-pre-line text-sm text-foreground">
                {order.notes}
              </p>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card title="Customer">
            {order.customer ? (
              <div className="space-y-2 text-sm">
                <Link
                  href={`/users/${order.customer.id}`}
                  className="inline-flex items-center gap-1.5 font-medium text-tint-dark hover:text-tint"
                >
                  <User className="size-3.5" aria-hidden="true" />
                  {order.customer.name}
                </Link>
                <p className="text-muted">{order.customer.email}</p>
                {order.customer.phone ? (
                  <p className="inline-flex items-center gap-1.5 text-muted">
                    <Phone className="size-3.5" aria-hidden="true" />
                    {order.customer.phone}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted">Customer no longer exists.</p>
            )}
          </Card>

          <Card title="Shipping & payment">
            <div className="space-y-2 text-sm">
              <p className="inline-flex items-center gap-1.5 text-muted">
                <MapPin className="size-3.5" aria-hidden="true" />
                {order.shippingAddressId ? (
                  <code className="text-xs">{order.shippingAddressId}</code>
                ) : (
                  "Address pending"
                )}
              </p>
              <p className="text-muted">
                Payment: {order.paymentMethodRef ?? "—"}
              </p>
              <p className="text-muted">Currency: {order.currency}</p>
            </div>
          </Card>

          {writable ? (
            <Card title="Actions">
              <OrderActions
                orderId={order.id}
                status={order.status}
                trackingNumber={order.trackingNumber}
                notes={order.notes}
              />
            </Card>
          ) : (
            <Card>
              <p className="text-xs text-muted">
                Viewer access — actions are restricted to Manager and Super Admin.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={bold ? "font-medium text-foreground" : "text-muted"}>
        {label}
      </dt>
      <dd
        className={
          bold
            ? "font-semibold tabular-nums text-foreground"
            : "tabular-nums text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}
