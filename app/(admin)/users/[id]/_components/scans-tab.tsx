import Link from "next/link";
import { listScansForUser } from "@/lib/data/scans";
import { Card } from "../../../_components/card";
import { ConfidenceBar } from "../../../scans/_components/confidence-bar";
import { FlagPill } from "../../../scans/_components/flag-pill";
import { formatRelative } from "@/lib/format";

export async function ScansTab({ userId }: { userId: string }) {
  const rows = await listScansForUser(userId);

  if (rows.length === 0) {
    return (
      <Card>
        <p className="py-6 text-center text-sm text-muted">
          This customer hasn&apos;t submitted any scans.
        </p>
      </Card>
    );
  }

  return (
    <Card title={`Scans (${rows.length})`}>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((scan) => (
          <li key={scan.id}>
            <Link
              href={`/scans/${scan.id}`}
              className="group flex items-start gap-3 rounded-input border border-border bg-card p-2 transition hover:border-tint/40"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-background">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={scan.photoUrl}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover"
                />
                {scan.flagged ? (
                  <div className="absolute left-0.5 top-0.5">
                    <FlagPill />
                  </div>
                ) : null}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {scan.disease
                    ? `${scan.disease.crop} · ${scan.disease.disease}`
                    : scan.predictedLabel}
                </p>
                <ConfidenceBar confidence={scan.confidence} size="sm" />
                <p className="text-[11px] text-muted">
                  {formatRelative(scan.createdAt)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
