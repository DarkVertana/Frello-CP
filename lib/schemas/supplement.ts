import { z } from "zod";
import { labelSchema } from "./disease";

/**
 * Shared validators for Supplements. The `mappedDiseaseLabels` field carries
 * the secondary "this supplement is recommended for these diseases" index;
 * the primary 1-to-many link is `disease.supplementId`.
 */

export const supplementCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  brand: z.string().trim().max(80).nullable().optional().or(z.literal("")),
  imageUrl: z.url("Use a full image URL (https://…)."),
  buyLink: z.url("Use a full URL (https://…)."),
  description: z.string().trim().max(8000).nullable().optional().or(z.literal("")),
  mappedDiseaseLabels: z.array(labelSchema).default([]),
});

export const supplementUpdateSchema = supplementCreateSchema.partial();

export type SupplementCreateInput = z.infer<typeof supplementCreateSchema>;
export type SupplementUpdateInput = z.infer<typeof supplementUpdateSchema>;
