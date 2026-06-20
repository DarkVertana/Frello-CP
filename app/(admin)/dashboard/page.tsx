import type { Metadata } from "next";
import { Suspense } from "react";
import {
  IndianRupee,
  LifeBuoy,
  ShoppingCart,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card } from "../_components/card";
import { SkeletonRows } from "../_components/skeleton";
import {
  getKpiSnapshot,
  getRevenue30d,
  getTopDiseases7d,
  getTopProducts,
} from "@/lib/data/analytics";
import { formatAmount } from "@/lib/format";
import { RevenueChart } from "./_components/revenue-chart";
import { TopDiseasesChart } from "./_components/top-diseases-chart";
import { TopProductsChart } from "./_components/top-products-chart";
import { RecentOrdersList } from "./_components/recent-orders-list";
import { RecentScansList } from "./_components/recent-scans-list";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [kpis, revenue30d, topDiseases, topProducts] = await Promise.all([
    getKpiSnapshot(),
    getRevenue30d(),
    getTopDiseases7d(),
    getTopProducts(),
  ]);

  const kpiCards: KpiCardProps[] = [
    {
      label: "Total users",
      value: kpis.totalUsers.toLocaleString("en-IN"),
      delta: `+${kpis.signUpsToday} today · ${kpis.mau7d} MAU (7d)`,
      icon: Users,
    },
    {
      label: "Today's orders",
      value: kpis.ordersToday.toLocaleString("en-IN"),
      delta: `${formatAmount(kpis.revenueToday)} revenue today`,
      icon: ShoppingCart,
    },
    {
      label: "30-day revenue",
      value: formatAmount(kpis.revenue30d),
      icon: IndianRupee,
    },
    {
      label: "Open tickets",
      value: kpis.openTickets.toLocaleString("en-IN"),
      delta: `${kpis.scans7d} scans (7d)`,
      icon: LifeBuoy,
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted">
          A snapshot of today and the last 30 days. All metrics refresh on
          load — no client polling yet.
        </p>
      </header>

      <section
        aria-label="Key performance indicators"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {kpiCards.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="Revenue trend"
          subtitle="Last 30 days · settled orders only"
          action={
            <span className="inline-flex items-center gap-1 text-xs font-medium text-tint-dark">
              <TrendingUp className="size-3.5" aria-hidden="true" />
              {formatAmount(kpis.revenue30d)}
            </span>
          }
        >
          <RevenueChart data={revenue30d} />
        </Card>
        <Card title="Top detected diseases" subtitle="Scans · last 7 days">
          <TopDiseasesChart data={topDiseases} />
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Top products" subtitle="Units sold across all completed orders">
          <TopProductsChart data={topProducts} />
        </Card>
        <Card title="Recent activity" subtitle="Latest scans submitted">
          <Suspense fallback={<SkeletonRows />}>
            <RecentScansList />
          </Suspense>
        </Card>
      </section>

      <section>
        <Card title="Recent orders" subtitle="Newest 5 across all statuses">
          <Suspense fallback={<SkeletonRows />}>
            <RecentOrdersList />
          </Suspense>
        </Card>
      </section>
    </div>
  );
}

type KpiCardProps = {
  label: string;
  value: string;
  delta?: string;
  icon: LucideIcon;
};

function KpiCard({ label, value, delta, icon: Icon }: KpiCardProps) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
          {delta ? <p className="mt-1 text-xs text-muted">{delta}</p> : null}
        </div>
        <div className="flex size-10 items-center justify-center rounded-input bg-tint-soft text-tint-dark">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
    </Card>
  );
}
