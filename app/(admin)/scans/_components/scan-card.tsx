import Link from "next/link";
import type { ScanRow } from "@/lib/data/scans";
import { ConfidenceBar } from "./confidence-bar";
import { FlagPill } from "./flag-pill";
import { formatRelative } from "@/lib/format";

export function ScanCard({ scan }: { scan: ScanRow }) {
  return (
    <Link
      href={`/scans/${scan.id}`}
      className="group flex flex-col overflow-hidden rounded-card border border-border bg-card shadow-card transition hover:border-tint/40"
      aria-label={`Open scan ${scan.id}`}
    >
      <div className="relative aspect-square overflow-hidden bg-background">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={scan.photoUrl}
          alt=""
          loading="lazy"
          className="size-full object-cover transition group-hover:scale-[1.02]"
          onError={(event) => {
            event.currentTarget.style.opacity = "0.2";
          }}
        />
        {scan.flagged ? (
          <div className="absolute left-2 top-2">
            <FlagPill />
          </div>
        ) : null}
      </div>
      <div className="space-y-2 p-3">
        <div>
          {scan.disease ? (
            <p className="text-sm font-medium text-foreground">
              {scan.disease.crop} ·{" "}
              <span
                className={
                  scan.disease.disease.toLowerCase() === "healthy"
                    ? "text-tint-dark"
                    : "text-foreground"
                }
              >
                {scan.disease.disease}
              </span>
            </p>
          ) : (
            <p className="text-sm font-medium text-foreground">
              {scan.predictedLabel}
            </p>
          )}
          <code className="block truncate text-[11px] text-muted">
            {scan.predictedLabel}
          </code>
        </div>

        <ConfidenceBar confidence={scan.confidence} size="sm" />

        <div className="flex items-center justify-between text-xs text-muted">
          <span className="truncate">{scan.customer?.name ?? "—"}</span>
          <span>{formatRelative(scan.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
