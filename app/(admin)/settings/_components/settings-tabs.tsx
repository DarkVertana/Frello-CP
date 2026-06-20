import Link from "next/link";

export type SettingsTab = "general" | "api-keys" | "advanced";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "api-keys", label: "API keys" },
  { id: "advanced", label: "Advanced" },
];

export function SettingsTabs({ active }: { active: SettingsTab }) {
  return (
    <nav
      role="tablist"
      aria-label="Settings sections"
      className="flex overflow-x-auto border-b border-border"
    >
      {TABS.map((tab) => {
        const href = tab.id === "general" ? "/settings" : `/settings?tab=${tab.id}`;
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

export function parseSettingsTab(raw: string | undefined): SettingsTab {
  const ids: SettingsTab[] = ["general", "api-keys", "advanced"];
  return (ids as string[]).includes(raw ?? "") ? (raw as SettingsTab) : "general";
}
