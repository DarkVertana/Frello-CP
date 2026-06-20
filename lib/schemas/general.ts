import { z } from "zod";

/** Setting key under which the General tab persists its JSON blob. */
export const GENERAL_SETTINGS_KEY = "general";

export const CURRENCIES = ["INR", "USD", "EUR", "GBP"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

/** Symbol for a currency code, falling back to the code itself. */
export function currencySymbol(code: string): string {
  return (CURRENCY_SYMBOLS as Record<string, string>)[code] ?? code;
}

export const generalSettingsSchema = z.object({
  appName: z.string().trim().min(1, "App name is required.").max(80),
  supportEmail: z.union([
    z.literal(""),
    z.email("Enter a valid email address.").max(160),
  ]),
  currency: z.enum(CURRENCIES),
  maintenanceMode: z.boolean(),
});

export type GeneralSettings = z.infer<typeof generalSettingsSchema>;

export const defaultGeneralSettings: GeneralSettings = {
  appName: "Frello",
  supportEmail: "",
  currency: "INR",
  maintenanceMode: false,
};

/**
 * Coerce an unknown stored JSON value into a complete GeneralSettings, filling
 * any missing/invalid field from the defaults so the form always renders.
 */
export function parseGeneralSettings(value: unknown): GeneralSettings {
  const base =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    appName:
      typeof base.appName === "string" && base.appName.trim()
        ? base.appName
        : defaultGeneralSettings.appName,
    supportEmail:
      typeof base.supportEmail === "string"
        ? base.supportEmail
        : defaultGeneralSettings.supportEmail,
    currency: (CURRENCIES as readonly string[]).includes(base.currency as string)
      ? (base.currency as Currency)
      : defaultGeneralSettings.currency,
    maintenanceMode:
      typeof base.maintenanceMode === "boolean"
        ? base.maintenanceMode
        : defaultGeneralSettings.maintenanceMode,
  };
}
