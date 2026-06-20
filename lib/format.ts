/**
 * Plant+ formatting helpers. Default locale is `en-IN` (the primary market);
 * pass a different locale per-call when rendering for other regions.
 */

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const currencyFormatters = new Map<string, Intl.NumberFormat>();

function currencyFormatter(currency: string): Intl.NumberFormat {
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });
    currencyFormatters.set(currency, formatter);
  }
  return formatter;
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
}

/**
 * Format a minor-unit amount (paise/cents — 1/100 of the major unit) as a
 * localised currency string. Defaults to INR; pass the store's configured
 * currency to render in it.
 *   formatAmount(12500) → "₹125"
 *   formatAmount(12500, "USD") → "$125"
 */
export function formatAmount(amount: number, currency: string = "INR"): string {
  return currencyFormatter(currency).format(amount / 100);
}

/** Compact relative time — "2h ago", "3 days ago", "Just now". */
export function formatRelative(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return "Just now";
  if (seconds < 90) return "1 min ago";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}
