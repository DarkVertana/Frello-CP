import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canManage, isAdmin } from "@/lib/rbac";
import { getPaymentMethods } from "@/lib/data/payment-methods";
import { PaymentMethodsList } from "./_components/payment-methods-list";

export const metadata: Metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const session = await getSession();
  if (!session) return null;
  if (!isAdmin(session.user.role)) redirect("/");

  const methods = await getPaymentMethods();
  const writable = canManage(session.user.role);
  const activeCount = methods.filter((m) => m.status === "active").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Payment methods
          </h1>
          <p className="text-sm text-muted">
            Which payment options the storefront accepts at checkout. Cash on
            Delivery is live; flip others to “Active” as they’re ready.
          </p>
        </div>
        <span className="rounded-full bg-tint-soft px-3 py-1 text-xs font-medium text-tint-dark">
          {activeCount} active
        </span>
      </header>

      <PaymentMethodsList methods={methods} canManage={writable} />
    </div>
  );
}
