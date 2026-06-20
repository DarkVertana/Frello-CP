import { z } from "zod";

export const ticketStatusEnum = z.enum(["open", "in_progress", "resolved"]);
export const ticketPriorityEnum = z.enum(["low", "normal", "high"]);

export type TicketStatusValue = z.infer<typeof ticketStatusEnum>;
export type TicketPriorityValue = z.infer<typeof ticketPriorityEnum>;

/** Admin-editable subset of the ticket row. */
export const ticketUpdateSchema = z.object({
  subject: z.string().trim().min(1).max(200).optional(),
  category: z.string().trim().min(1).max(60).optional(),
  priority: ticketPriorityEnum.optional(),
});

export const ticketStatusSchema = z.object({
  to: ticketStatusEnum,
});

export const ticketAssignSchema = z.object({
  /** `null` clears the assignee. */
  assigneeId: z.string().nullable(),
});

export const ticketReplySchema = z.object({
  body: z.string().trim().min(1, "Type a reply.").max(8000),
  /** Internal notes are visible to staff only and never emailed. */
  isInternal: z.boolean().default(false),
  /** Pre-uploaded attachments (URLs from /api/v1/uploads/presign). */
  attachments: z
    .array(
      z.object({
        url: z.url(),
        mimeType: z.string().min(1),
        filename: z.string().min(1),
        size: z.number().int().nonnegative(),
      }),
    )
    .max(10)
    .default([]),
});

export const ticketListFiltersSchema = z.object({
  status: ticketStatusEnum.optional(),
  priority: ticketPriorityEnum.optional(),
  category: z.string().trim().min(1).max(60).optional(),
  assigneeId: z.string().min(1).optional(),
  /** "unassigned" carries no value — handled via separate flag in the URL. */
  unassigned: z.enum(["true"]).optional(),
});

export type TicketUpdateInput = z.infer<typeof ticketUpdateSchema>;
export type TicketStatusInput = z.infer<typeof ticketStatusSchema>;
export type TicketAssignInput = z.infer<typeof ticketAssignSchema>;
export type TicketReplyInput = z.infer<typeof ticketReplySchema>;
export type TicketListFilters = z.infer<typeof ticketListFiltersSchema>;
