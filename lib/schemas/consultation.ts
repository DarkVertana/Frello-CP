import { z } from "zod";

/** Fixed crop list — mirrors the `crop_type` pg enum. */
export const cropEnum = z.enum([
  "rice",
  "wheat",
  "maize",
  "cotton",
  "sugarcane",
  "soybean",
  "groundnut",
  "pulses",
  "vegetables",
  "fruits",
  "other",
]);

export const consultationStatusEnum = z.enum([
  "pending",
  "scheduled",
  "completed",
  "cancelled",
]);

export type Crop = z.infer<typeof cropEnum>;
export type ConsultationStatus = z.infer<typeof consultationStatusEnum>;

export const CROP_OPTIONS = cropEnum.options;
export const CONSULTATION_STATUSES = consultationStatusEnum.options;

/** Title-case a crop/status slug for display. */
export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Mobile app submits this to request an on-farm consultation. `userId` is taken
 * from the session, never the body.
 */
export const consultationCreateSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required.").max(120),
  phone: z.string().trim().min(1, "Phone number is required.").max(40),
  location: z.string().trim().min(1, "Village / location is required.").max(200),
  farmSize: z.string().trim().min(1, "Farm size is required.").max(80),
  mainCrop: cropEnum,
  /** Requested visit date — ISO date/datetime string, coerced to a Date. */
  visitDate: z.coerce.date(),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

/** Admin updates the workflow status. */
export const consultationStatusUpdateSchema = z.object({
  status: consultationStatusEnum,
});

/** List filters for the admin page. */
export const consultationListFiltersSchema = z.object({
  status: consultationStatusEnum.optional(),
  mainCrop: cropEnum.optional(),
});

export type ConsultationCreateInput = z.infer<typeof consultationCreateSchema>;
export type ConsultationStatusUpdateInput = z.infer<
  typeof consultationStatusUpdateSchema
>;
export type ConsultationListFilters = z.infer<typeof consultationListFiltersSchema>;
