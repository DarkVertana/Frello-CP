import Link from "next/link";
import { Card } from "../../_components/card";
import { NewSettingButton } from "./new-setting-button";
import { SettingRowActions } from "./setting-row-actions";
import { formatDateTime } from "@/lib/format";
import { jsonToString } from "@/lib/schemas/setting";
import type { Setting } from "@/db/schema";

/**
 * Raw key/value config editor — the original Settings surface, now the
 * "Advanced" tab. Each row is an arbitrary JSON-valued key the app reads at
 * runtime (feature flags, store URLs, locale defaults, …).
 */
export function AdvancedSettings({
  rows,
  writable,
}: {
  rows: Setting[];
  writable: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted">
          Key / value config the app reads at runtime. Add feature flags, store
          URLs, and locale defaults here.
        </p>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-tint-soft px-3 py-1 text-xs font-medium text-tint-dark">
            {rows.length} {rows.length === 1 ? "key" : "keys"}
          </span>
          {writable ? <NewSettingButton /> : null}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-card border border-dashed border-border bg-card p-10 text-center">
          <h3 className="text-base font-semibold text-foreground">
            No settings yet
          </h3>
          <p className="mt-1 text-sm text-muted">
            {writable
              ? 'Add the first one — e.g. set `currency` to `"INR"`.'
              : "Ask an admin to add the first one."}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rows.map((row) => (
            <li key={row.key}>
              <Card>
                <header className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <code className="block text-sm font-semibold text-foreground">
                      {row.key}
                    </code>
                    {row.description ? (
                      <p className="mt-1 text-sm text-muted">{row.description}</p>
                    ) : null}
                  </div>
                  {writable ? <SettingRowActions setting={row} /> : null}
                </header>

                <pre className="mt-3 max-h-40 overflow-auto rounded-input bg-background p-3 font-mono text-[11px] leading-relaxed text-foreground">
                  {jsonToString(row.value)}
                </pre>

                <footer className="mt-3 text-xs text-muted">
                  Updated {formatDateTime(row.updatedAt)}
                  {row.updatedBy ? (
                    <>
                      {" by "}
                      <Link
                        href={`/users/${row.updatedBy}`}
                        className="font-medium text-foreground hover:text-tint-dark"
                      >
                        {row.updatedBy.slice(0, 8)}…
                      </Link>
                    </>
                  ) : null}
                </footer>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
