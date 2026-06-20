import { z } from "zod";

/**
 * Confidence bands surface in the list filter dropdown. Reviewers usually
 * start with `low` (potential misclassifications).
 */
export const confidenceBandEnum = z.enum(["high", "medium", "low"]);
export type ConfidenceBand = z.infer<typeof confidenceBandEnum>;

export const CONFIDENCE_BANDS: { value: ConfidenceBand; label: string }[] = [
  { value: "high", label: "High (≥ 90%)" },
  { value: "medium", label: "Medium (60–90%)" },
  { value: "low", label: "Low (< 60%)" },
];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

export const scanListFiltersSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  confidence: confidenceBandEnum.optional(),
  flagged: z.enum(["true", "false"]).optional(),
  userId: z.string().min(1).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});

/**
 * Mobile app records a leaf-disease scan. The three infection fields are the
 * core payload (mapped into the frozen `diagnosisSnapshot`); the rest is
 * optional scan metadata. `prevention` accepts an array or a newline-separated
 * string and is normalised to a string array.
 */
export const scanCreateSchema = z.object({
  photoUrl: z.string().trim().min(1, "Photo is required.").max(2000),
  infectionTitle: z.string().trim().min(1, "Infection title is required.").max(200),
  infectionDetail: z
    .string()
    .trim()
    .min(1, "Infection detail is required.")
    .max(5000),
  infectionPrevention: z
    .union([
      z.array(z.string().trim().min(1).max(1000)).max(50),
      z.string().trim().min(1).max(5000),
    ])
    .transform((v) =>
      Array.isArray(v) ? v : v.split("\n").map((s) => s.trim()).filter(Boolean),
    ),
  crop: z.string().trim().max(120).optional(),
  /** Defaults to the infection title when omitted. */
  predictedLabel: z.string().trim().max(120).optional(),
  confidence: z.coerce.number().min(0).max(1).optional(),
  healthy: z.boolean().optional(),
  severity: z.enum(["low", "medium", "high"]).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export const scanFlagSchema = z.object({
  flagged: z.boolean(),
});

export const scanUpdateSchema = z.object({
  reviewerNotes: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .optional()
    .or(z.literal("")),
});

export type ScanCreateInput = z.infer<typeof scanCreateSchema>;
export type ScanListFilters = z.infer<typeof scanListFiltersSchema>;
export type ScanFlagInput = z.infer<typeof scanFlagSchema>;
export type ScanUpdateInput = z.infer<typeof scanUpdateSchema>;

export function confidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 0.9) return "high";
  if (confidence >= 0.6) return "medium";
  return "low";
}
