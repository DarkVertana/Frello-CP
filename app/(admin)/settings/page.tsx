import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canManage, isAdmin } from "@/lib/rbac";
import { getSettingByKey, listSettings } from "@/lib/data/settings";
import { listApiKeys } from "@/lib/data/api-keys";
import {
  GENERAL_SETTINGS_KEY,
  parseGeneralSettings,
} from "@/lib/schemas/general";
import {
  SettingsTabs,
  parseSettingsTab,
} from "./_components/settings-tabs";
import { GeneralSettingsForm } from "./_components/general-settings";
import { ApiKeysPanel } from "./_components/api-keys-panel";
import { AdvancedSettings } from "./_components/advanced-settings";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  if (!isAdmin(session.user.role)) redirect("/");

  const sp = await searchParams;
  const tab = parseSettingsTab(sp.tab);
  const writable = canManage(session.user.role);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted">
          Manage general app config, API keys, and advanced runtime values.
        </p>
      </header>

      <SettingsTabs active={tab} />

      {tab === "general" ? (
        <GeneralSettingsForm
          initial={parseGeneralSettings(
            (await getSettingByKey(GENERAL_SETTINGS_KEY))?.value,
          )}
          canManage={writable}
        />
      ) : null}

      {tab === "api-keys" ? (
        <ApiKeysPanel keys={await listApiKeys()} canManage={writable} />
      ) : null}

      {tab === "advanced" ? (
        <AdvancedSettings rows={await listSettings()} writable={writable} />
      ) : null}
    </div>
  );
}
