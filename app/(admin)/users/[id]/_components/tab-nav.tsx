import Link from "next/link";

export type TabId =
  | "overview"
  | "orders"
  | "saved"
  | "addresses"
  | "payment-methods"
  | "tickets"
  | "scans"
  | "activity";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "orders", label: "Orders" },
  { id: "saved", label: "Saved" },
  { id: "addresses", label: "Addresses" },
  { id: "payment-methods", label: "Payment methods" },
  { id: "tickets", label: "Tickets" },
  { id: "scans", label: "Scans" },
  { id: "activity", label: "Activity" },
];

export function TabNav({ userId, active }: { userId: string; active: TabId }) {
  return (
    <nav
      role="tablist"
      aria-label="User detail sections"
      className="flex overflow-x-auto border-b border-border"
    >
      {TABS.map((tab) => {
        const href = tab.id === "overview" ? `/users/${userId}` : `/users/${userId}?tab=${tab.id}`;
        const isActive = active === tab.id;
        return (
          <Link
            key={tab.id}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={
              isActive
                ? "border-b-2 border-tint px-4 py-3 text-sm font-semibold text-tint-dark"
                : "border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted transition hover:text-foreground"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function parseTab(raw: string | undefined): TabId {
  const ids: TabId[] = [
    "overview",
    "orders",
    "saved",
    "addresses",
    "payment-methods",
    "tickets",
    "scans",
    "activity",
  ];
  return (ids as string[]).includes(raw ?? "") ? (raw as TabId) : "overview";
}
