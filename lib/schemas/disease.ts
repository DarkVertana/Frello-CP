import { z } from "zod";

export const severityEnum = z.enum(["low", "medium", "high"]);
export type Severity = z.infer<typeof severityEnum>;

/**
 * PlantVillage labels look like `<Crop>___<Condition>` (triple underscore).
 * We allow anything else too — custom strains and non-PlantVillage diseases
 * can land here — but trim and bound length so it stays manageable as a PK.
 */
export const labelSchema = z
  .string()
  .trim()
  .min(2, "Label is required.")
  .max(120, "Label is too long.")
  .regex(/^[A-Za-z0-9_(),\- ]+$/, "Use letters, numbers, spaces, and _-(),.");

export const diseaseCreateSchema = z.object({
  label: labelSchema,
  crop: z.string().trim().min(1, "Crop is required.").max(60),
  disease: z.string().trim().min(1, "Condition is required.").max(120),
  healthy: z.boolean().default(false),
  description: z.string().trim().max(8000).default(""),
  /** One short sentence per array item. */
  prevention: z
    .array(z.string().trim().min(1).max(280))
    .max(20, "Keep prevention to 20 steps or fewer.")
    .default([]),
  supplementId: z.uuid().nullable().optional(),
  buyLink: z.url("Use a full URL (https://…).").nullable().optional().or(z.literal("")),
  severity: severityEnum.default("medium"),
});

// Labels are the primary key — once set, they can't change without breaking
// every existing scan's `predictedLabel`. Edit excludes it.
export const diseaseUpdateSchema = diseaseCreateSchema.omit({ label: true }).partial();

export const diseaseListFiltersSchema = z.object({
  crop: z.string().trim().min(1).max(60).optional(),
  healthy: z.enum(["true", "false"]).optional(),
  severity: severityEnum.optional(),
});

export type DiseaseCreateInput = z.infer<typeof diseaseCreateSchema>;
export type DiseaseUpdateInput = z.infer<typeof diseaseUpdateSchema>;
export type DiseaseListFilters = z.infer<typeof diseaseListFiltersSchema>;
