import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ExternalLink, Mail, MapPin, Phone, User as UserIcon } from "lucide-react";
import { getSession } from "@/lib/session";
import { canSupport } from "@/lib/rbac";
import { getScanById } from "@/lib/data/scans";
import { Card } from "../../_components/card";
import { ConfidenceBar } from "../_components/confidence-bar";
import { FlagPill } from "../_components/flag-pill";
import { FlagToggle } from "../_components/flag-toggle";
import { ReviewerNotesForm } from "../_components/reviewer-notes-form";
import { HealthyBadge, SeverityBadge } from "../../diseases/_components/severity-badge";
import { formatDateTime } from "@/lib/format";
import type { DiagnosisSnapshot } from "@/db/schema";

export const metadata: Metadata = { title: "Scan detail" };
export const dynamic = "force-dynamic";

export default async function ScanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  if (!canSupport(session.user.role)) redirect("/");

  const { id } = await params;
  const scan = await getScanById(id);
  if (!scan) notFound();

  const snapshot = scan.diagnosisSnapshot as DiagnosisSnapshot;

  return (
    <div className="space-y-6">
      <Link
        href="/scans"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to scans
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Photo */}
        <Card>
          <div className="relative overflow-hidden rounded-input border border-border bg-background">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={scan.photoUrl}
              alt=""
              className="aspect-square w-full object-contain"
              onError={(event) => {
                event.currentTarget.style.opacity = "0.2";
              }}
            />
            {scan.flagged ? (
              <div className="absolute left-3 top-3">
                <FlagPill />
              </div>
            ) : null}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted">
            <span>{formatDateTime(scan.createdAt)}</span>
            <a
              href={scan.photoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-tint-dark hover:text-tint"
            >
              Open original
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </div>
        </Card>

        {/* Diagnosis snapshot — frozen at scan time */}
        <Card>
          <header className="space-y-2 border-b border-border pb-4">
            <code className="text-xs text-muted">{scan.predictedLabel}</code>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {snapshot.crop} · {snapshot.disease}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <HealthyBadge healthy={snapshot.healthy} />
              <SeverityBadge severity={snapshot.severity} />
              {scan.disease ? (
                <Link
                  href={`/diseases/${encodeURIComponent(snapshot.label)}`}
                  className="text-xs font-medium text-tint-dark hover:text-tint"
                >
                  Open KB entry →
                </Link>
              ) : (
                <span className="text-xs text-amber-700">
                  No KB entry — label may be stale
                </span>
              )}
            </div>
          </header>

          <section className="mt-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Confidence
            </h2>
            <div className="mt-2">
              <ConfidenceBar confidence={scan.confidence} />
            </div>
          </section>

          <section className="mt-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Description (snapshot)
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm text-foreground">
              {snapshot.description || "—"}
            </p>
          </section>

          {snapshot.prevention.length > 0 ? (
            <section className="mt-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                Prevention (snapshot)
              </h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
                {snapshot.prevention.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {snapshot.supplement ? (
            <section className="mt-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                Recommended supplement (snapshot)
              </h2>
              <Link
                href={`/supplements/${snapshot.supplement.id}`}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-tint-dark hover:text-tint"
              >
                {snapshot.supplement.name}
                <ExternalLink className="size-3" aria-hidden="true" />
              </Link>
            </section>
          ) : null}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Customer">
          {scan.customer ? (
            <div className="space-y-2 text-sm">
              <Link
                href={`/users/${scan.customer.id}`}
                className="inline-flex items-center gap-1.5 font-medium text-tint-dark hover:text-tint"
              >
                <UserIcon className="size-3.5" aria-hidden="true" />
                {scan.customer.name}
              </Link>
              <p className="inline-flex items-center gap-1.5 text-muted">
                <Mail className="size-3.5" aria-hidden="true" />
                {scan.customer.email}
              </p>
              {scan.customer.phone ? (
                <p className="inline-flex items-center gap-1.5 text-muted">
                  <Phone className="size-3.5" aria-hidden="true" />
                  {scan.customer.phone}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted">Customer no longer exists.</p>
          )}
        </Card>

        <Card title="Location">
          {scan.latitude !== null && scan.longitude !== null ? (
            <div className="space-y-2 text-sm">
              <p className="inline-flex items-center gap-1.5 font-mono text-foreground">
                <MapPin className="size-3.5 text-muted" aria-hidden="true" />
                {scan.latitude.toFixed(4)}, {scan.longitude.toFixed(4)}
              </p>
              <a
                href={`https://www.openstreetmap.org/?mlat=${scan.latitude}&mlon=${scan.longitude}#map=14/${scan.latitude}/${scan.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-tint-dark hover:text-tint"
              >
                Open in map
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted">No location captured.</p>
          )}
        </Card>

        <Card title="Misclassified?">
          <FlagToggle scanId={scan.id} flagged={scan.flagged} />
        </Card>
      </div>

      <Card
        title="Reviewer notes"
        subtitle="Visible to staff. Captured alongside the scan in the retrain export."
      >
        <ReviewerNotesForm scanId={scan.id} initial={scan.reviewerNotes} />
      </Card>
    </div>
  );
}
