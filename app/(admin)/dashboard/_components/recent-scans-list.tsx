import Link from "next/link";
import { ScanLine } from "lucide-react";
import { getRecentScans } from "@/lib/data/analytics";
import { ConfidenceBar } from "../../scans/_components/confidence-bar";
import { FlagPill } from "../../scans/_components/flag-pill";
import { formatRelative } from "@/lib/format";

export async function RecentScansList() {
  const rows = await getRecentScans(5);

  if (rows.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-input bg-background px-4 py-6 text-sm text-muted">
        <ScanLine className="size-5 text-tint-dark" aria-hidden="true" />
        No scans yet — the mobile app feeds this list.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => (
        <li key={row.id}>
          <Link
            href={`/scans/${row.id}`}
            className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:bg-tint-soft/40"
          >
            <div className="relative size-12 shrink-0 overflow-hidden rounded-input bg-background">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={row.photoUrl}
                alt=""
                loading="lazy"
                className="size-full object-cover"
              />
              {row.flagged ? (
                <div className="absolute left-0.5 top-0.5">
                  <FlagPill />
                </div>
              ) : null}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm font-medium text-foreground">
                {row.predictedLabel}
              </p>
              <ConfidenceBar confidence={row.confidence} size="sm" />
              <p className="text-[11px] text-muted">
                {row.customerName ?? "—"} · {formatRelative(row.createdAt)}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
