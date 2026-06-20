import { z } from "zod";

export const broadcastSegmentEnum = z.enum([
  "all",
  "role",
  "region",
  "crop",
  "user_ids",
]);

export const broadcastStatusEnum = z.enum([
  "draft",
  "scheduled",
  "sent",
  "cancelled",
]);

export type BroadcastSegmentValue = z.infer<typeof broadcastSegmentEnum>;
export type BroadcastStatusValue = z.infer<typeof broadcastStatusEnum>;

/**
 * Segment params are validated per `segment` choice in the form's transform
 * step, but for the API contract we keep the shape loose so the JSONB column
 * doesn't fight us. The data layer guards `userIds` length so we don't blow
 * up sending to half a million ids.
 */
export const broadcastSegmentParamsSchema = z.object({
  role: z.enum(["admin", "viewer"]).optional(),
  region: z.string().trim().min(1).max(60).optional(),
  crop: z.string().trim().min(1).max(60).optional(),
  userIds: z.array(z.string().min(1)).max(5000).optional(),
});

export const broadcastCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(120),
  body: z.string().trim().min(1, "Body is required.").max(2000),
  segment: broadcastSegmentEnum.default("all"),
  segmentParams: broadcastSegmentParamsSchema.default({}),
});

export const broadcastUpdateSchema = broadcastCreateSchema.partial();

const isoDateTime = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Use an ISO timestamp.",
  });

export const broadcastScheduleSchema = z.object({
  /** ISO datetime — must be in the future. The data layer re-checks. */
  scheduleAt: isoDateTime,
});

export type BroadcastCreateInput = z.infer<typeof broadcastCreateSchema>;
export type BroadcastUpdateInput = z.infer<typeof broadcastUpdateSchema>;
export type BroadcastScheduleInput = z.infer<typeof broadcastScheduleSchema>;
export type BroadcastSegmentParamsInput = z.infer<typeof broadcastSegmentParamsSchema>;

export const SEGMENT_OPTIONS: { value: BroadcastSegmentValue; label: string; hint: string }[] = [
  { value: "all", label: "Everyone", hint: "Every signed-in user." },
  { value: "role", label: "By role", hint: "Only users with a given role." },
  { value: "region", label: "By region", hint: "Users with a saved address in this state." },
  { value: "crop", label: "By crop", hint: "Coming soon — needs a user-crops table." },
  { value: "user_ids", label: "Specific users", hint: "Paste user ids (one per line)." },
];
