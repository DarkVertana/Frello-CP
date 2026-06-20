import { z } from "zod";

/** Mirrors the `address_label` pg enum in db/schema/enums.ts. */
export const addressLabelEnum = z.enum(["home", "work", "farm", "other"]);
export type AddressLabel = z.infer<typeof addressLabelEnum>;

/** Labels in display order for selects. */
export const ADDRESS_LABELS: AddressLabel[] = ["home", "work", "farm", "other"];

const line2 = z.string().trim().max(200).optional().or(z.literal(""));

/**
 * Create a shipping address for a user. A user can have many; setting
 * `isDefault` demotes any existing default (enforced in the data layer).
 */
export const shippingAddressCreateSchema = z.object({
  userId: z.string().trim().min(1, "User is required."),
  label: addressLabelEnum.default("home"),
  name: z.string().trim().min(1, "Recipient name is required.").max(120),
  line1: z.string().trim().min(1, "Address line 1 is required.").max(200),
  line2,
  city: z.string().trim().min(1, "City is required.").max(80),
  state: z.string().trim().min(1, "State is required.").max(80),
  postal: z.string().trim().min(1, "Postal code is required.").max(20),
  country: z.string().trim().min(2).max(2).default("IN"),
  phone: z.string().trim().min(1, "Phone is required.").max(40),
  isDefault: z.boolean().default(false),
});

/** Partial update — send only what changed. `userId` can't be reassigned. */
export const shippingAddressUpdateSchema = z
  .object({
    label: addressLabelEnum.optional(),
    name: z.string().trim().min(1).max(120).optional(),
    line1: z.string().trim().min(1).max(200).optional(),
    line2,
    city: z.string().trim().min(1).max(80).optional(),
    state: z.string().trim().min(1).max(80).optional(),
    postal: z.string().trim().min(1).max(20).optional(),
    country: z.string().trim().min(2).max(2).optional(),
    phone: z.string().trim().min(1).max(40).optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Provide at least one field to update.",
  });

export type ShippingAddressCreateInput = z.infer<typeof shippingAddressCreateSchema>;
export type ShippingAddressUpdateInput = z.infer<typeof shippingAddressUpdateSchema>;
