import { z } from "zod";

/**
 * Setting key — dotted lowercase paths are fine (`featureFlags.newScanFlow`,
 * `appstoreLinks.ios`). Must start with a letter; the rest can be letters,
 * digits, dot, dash, or underscore.
 */
export const settingKeySchema = z
  .string()
  .trim()
  .min(1, "Key is required.")
  .max(80)
  .regex(
    /^[a-zA-Z][a-zA-Z0-9_.-]*$/,
    "Use letters, digits, dot, dash, or underscore — start with a letter.",
  );

/** Raw JSON-parseable string. We validate parseability on the server. */
const valueJsonSchema = z
  .string()
  .min(1, "Value is required.")
  .max(64_000, "Value is too long.")
  .superRefine((raw, ctx) => {
    try {
      JSON.parse(raw);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Value must be valid JSON.",
      });
    }
  });

export const settingCreateSchema = z.object({
  key: settingKeySchema,
  /** JSON string — parsed and stored as a JSONB value. */
  valueJson: valueJsonSchema,
  description: z.string().trim().max(280).nullable().optional().or(z.literal("")),
});

export const settingUpdateSchema = z.object({
  valueJson: valueJsonSchema,
  description: z.string().trim().max(280).nullable().optional().or(z.literal("")),
});

export type SettingCreateInput = z.infer<typeof settingCreateSchema>;
export type SettingUpdateInput = z.infer<typeof settingUpdateSchema>;

/**
 * Render any JSON value as a stable, pretty-printed string. Used by the form
 * to populate the textarea on edit.
 */
export function jsonToString(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
