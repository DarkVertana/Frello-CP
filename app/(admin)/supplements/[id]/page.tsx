import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { getSession } from "@/lib/session";
import { canManage, isAdmin } from "@/lib/rbac";
import {
  getSupplementById,
  listDiseaseLabelsGroupedByCrop,
  listDiseasesUsingSupplement,
} from "@/lib/data/supplements";
import { Card } from "../../_components/card";
import { EditSupplementButton } from "../_components/edit-supplement-button";
import { DeleteSupplementButton } from "../_components/delete-supplement-button";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Supplement" };
export const dynamic = "force-dynamic";

export default async function SupplementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  if (!isAdmin(session.user.role)) redirect("/");

  const { id } = await params;
  const writable = canManage(session.user.role);

  // Only fetch the grouped-labels payload when the user can actually edit —
  // it's not used by the read-only view.
  const [supplement, primaryDiseases, groupedLabels] = await Promise.all([
    getSupplementById(id),
    listDiseasesUsingSupplement(id),
    writable ? listDiseaseLabelsGroupedByCrop() : Promise.resolve({}),
  ]);
  if (!supplement) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/supplements"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to supplements
      </Link>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="size-16 shrink-0 overflow-hidden rounded-card border border-border bg-background">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={supplement.imageUrl}
                alt=""
                className="size-full object-cover"
              />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {supplement.name}
              </h1>
              {supplement.brand ? (
                <p className="text-sm text-muted">{supplement.brand}</p>
              ) : null}
              <p className="text-xs text-muted">
                Last updated {formatDateTime(supplement.updatedAt)} ·{" "}
                <a
                  href={supplement.buyLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-tint-dark hover:text-tint"
                >
                  Buy link <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              </p>
            </div>
          </div>

          {writable ? (
            <div className="flex items-center gap-2">
              <EditSupplementButton
                supplement={supplement}
                groupedLabels={groupedLabels}
              />
              <DeleteSupplementButton id={supplement.id} name={supplement.name} />
            </div>
          ) : null}
        </div>
      </Card>

      {primaryDiseases.length > 0 ? (
        <Card
          title="Primary recommendation for"
          subtitle="Disease KB entries whose `supplementId` points here."
        >
          <ul className="flex flex-wrap gap-1.5">
            {primaryDiseases.map((disease) => (
              <li key={disease.label}>
                <Link
                  href={`/diseases/${encodeURIComponent(disease.label)}`}
                  className="inline-flex items-center gap-1 rounded-full border border-tint/30 bg-tint-soft px-2.5 py-0.5 text-xs font-medium text-tint-dark hover:bg-tint-soft/80"
                >
                  {disease.crop} · {disease.disease}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <section>
          <h2 className="text-sm font-semibold text-foreground">Description</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-muted">
            {supplement.description || "No description yet."}
          </p>
        </section>
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-foreground">
            Mapped disease labels
          </h2>
          {supplement.mappedDiseaseLabels.length === 0 ? (
            <p className="mt-2 text-sm text-muted">None.</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {supplement.mappedDiseaseLabels.map((label) => (
                <li key={label}>
                  <Link
                    href={`/diseases/${encodeURIComponent(label)}`}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-foreground hover:bg-tint-soft"
                  >
                    <code className="text-[11px]">{label}</code>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Card>
    </div>
  );
}
