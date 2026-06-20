import { z } from "zod";

export const orderStatusEnum = z.enum([
  "pending",
  "paid",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "refunded",
]);

export const orderUpdateSchema = z.object({
  trackingNumber: z
    .string()
    .trim()
    .max(80)
    .nullable()
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().max(2000).nullable().optional().or(z.literal("")),
});

export const orderTransitionSchema = z.object({
  to: orderStatusEnum,
  /** Optional human note recorded in the timeline entry. */
  note: z.string().trim().max(280).optional(),
});

export const orderRefundSchema = z.object({
  /** Optional reason recorded both in the audit entry and timeline. */
  reason: z.string().trim().max(280).optional(),
});

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

export const orderListFiltersSchema = z.object({
  status: orderStatusEnum.optional(),
  userId: z.string().min(1).optional(),
  paymentKind: z.enum(["card", "upi"]).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});

export type OrderUpdateInput = z.infer<typeof orderUpdateSchema>;
export type OrderTransitionInput = z.infer<typeof orderTransitionSchema>;
export type OrderRefundInput = z.infer<typeof orderRefundSchema>;
export type OrderListFilters = z.infer<typeof orderListFiltersSchema>;
