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

export type ScanListFilters = z.infer<typeof scanListFiltersSchema>;
export type ScanFlagInput = z.infer<typeof scanFlagSchema>;
export type ScanUpdateInput = z.infer<typeof scanUpdateSchema>;

export function confidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 0.9) return "high";
  if (confidence >= 0.6) return "medium";
  return "low";
}
