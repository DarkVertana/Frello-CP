import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { getSession } from "@/lib/session";
import { canManage, isAdmin } from "@/lib/rbac";
import {
  getDiseaseWithSupplement,
  listSupplementOptions,
} from "@/lib/data/diseases";
import { Card } from "../../_components/card";
import { EditDiseaseButton } from "../_components/edit-disease-button";
import { HealthyBadge, SeverityBadge } from "../_components/severity-badge";
import { DeleteDiseaseButton } from "../_components/delete-disease-button";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Disease" };
export const dynamic = "force-dynamic";

export default async function DiseaseDetailPage({
  params,
}: {
  params: Promise<{ label: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  if (!isAdmin(session.user.role)) redirect("/");

  const { label: raw } = await params;
  const label = decodeURIComponent(raw);
  const writable = canManage(session.user.role);

  // Supplement options only needed when the user can open the edit modal.
  const [data, supplements] = await Promise.all([
    getDiseaseWithSupplement(label),
    writable ? listSupplementOptions() : Promise.resolve([]),
  ]);
  if (!data) notFound();

  const { disease, supplement } = data;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/diseases"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to Disease KB
      </Link>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <code className="text-xs text-muted">{disease.label}</code>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {disease.crop} · {disease.disease}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <HealthyBadge healthy={disease.healthy} />
              <SeverityBadge severity={disease.severity} />
              <span className="text-xs text-muted">
                Last updated {formatDateTime(disease.updatedAt)}
              </span>
            </div>
            {supplement ? (
              <p className="text-sm text-muted">
                Linked supplement:{" "}
                <Link
                  href={`/supplements/${supplement.id}`}
                  className="font-medium text-tint-dark hover:text-tint"
                >
                  {supplement.name}
                </Link>
                {disease.buyLink ? (
                  <>
                    {" · "}
                    <a
                      href={disease.buyLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-tint-dark hover:text-tint"
                    >
                      Buy link
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>

          {writable ? (
            <div className="flex items-center gap-2">
              <EditDiseaseButton disease={disease} supplements={supplements} />
              <DeleteDiseaseButton label={disease.label} />
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        <section>
          <h2 className="text-sm font-semibold text-foreground">Description</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-muted">
            {disease.description || "No description yet."}
          </p>
        </section>
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-foreground">Prevention</h2>
          {disease.prevention.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              No prevention steps recorded.
            </p>
          ) : (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
              {disease.prevention.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ul>
          )}
        </section>
      </Card>
    </div>
  );
}
