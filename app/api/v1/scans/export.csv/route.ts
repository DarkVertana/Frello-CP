import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canSupport } from "@/lib/rbac";
import { listAllScansForExport } from "@/lib/data/scans";
import { scanListFiltersSchema } from "@/lib/schemas/scan";

/**
 * GET /api/v1/scans/export.csv
 *
 * Streams a CSV — exactly the columns the spec calls out for the retrain
 * pipeline (label, confidence, photoUrl, flagged) plus a few helpful extras
 * (scan id, customer id, captured-at, lat/lng).
 *
 * Filters work the same as the list endpoint, so reviewers can scope the
 * export to "all flagged scans from last month" or "only low-confidence
 * Tomato" via the same query string.
 */
export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireRole(canSupport);

    const url = new URL(request.url);
    const params: Record<string, string> = {};
    for (const [key, value] of url.searchParams.entries()) {
      const match = /^filter\[(.+)\]$/.exec(key);
      if (match) params[match[1]!] = value;
    }
    const filters = scanListFiltersSchema.parse({
      label: params.label || undefined,
      confidence:
        params.confidence === "high" ||
        params.confidence === "medium" ||
        params.confidence === "low"
          ? params.confidence
          : undefined,
      flagged:
        params.flagged === "true" || params.flagged === "false"
          ? params.flagged
          : undefined,
      userId: params.userId || undefined,
      from: params.from || undefined,
      to: params.to || undefined,
    });

    const rows = await listAllScansForExport(filters);

    const header = [
      "id",
      "userId",
      "predictedLabel",
      "confidence",
      "photoUrl",
      "flagged",
      "reviewerNotes",
      "latitude",
      "longitude",
      "createdAt",
    ];

    const lines = [header.join(",")];
    for (const row of rows) {
      lines.push(
        [
          row.id,
          row.userId,
          csvField(row.predictedLabel),
          row.confidence.toFixed(4),
          csvField(row.photoUrl),
          row.flagged ? "true" : "false",
          csvField(row.reviewerNotes ?? ""),
          row.latitude === null ? "" : String(row.latitude),
          row.longitude === null ? "" : String(row.longitude),
          row.createdAt.toISOString(),
        ].join(","),
      );
    }

    const filename = `plantplus-scans-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(lines.join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  });
}

function csvField(value: string): string {
  if (!/[",\n\r]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}
