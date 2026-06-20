import "server-only";
import { createHash } from "node:crypto";

/**
 * Cloudinary image storage (signed server-side uploads).
 *
 * Credentials come from the environment — never hard-code them:
 *   CLOUDINARY_CLOUD_NAME   your cloud name (in the dashboard URL)
 *   CLOUDINARY_API_KEY      the numeric API key
 *   CLOUDINARY_API_SECRET   the API secret (keep private)
 *
 * The file is uploaded from our route handler with a SHA-1 signature so the
 * secret stays on the server. Cloudinary returns a permanent `secure_url`
 * which we store on the product (a normal https URL — no schema change needed).
 */

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME && API_KEY && API_SECRET);
}

/** Sign the (sorted) params per Cloudinary's spec: sha1(sortedParams + secret). */
function signParams(params: Record<string, string>, secret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(toSign + secret).digest("hex");
}

/**
 * Upload a single image to Cloudinary under `folder` (e.g. "frello/products").
 * Returns the permanent `secure_url`. Throws on any failure.
 */
export async function uploadToCloudinary(
  file: File,
  folder: string,
): Promise<string> {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    throw new Error("Cloudinary is not configured.");
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  // Only these params are signed (file/api_key/resource_type are excluded).
  const signature = signParams({ folder, timestamp }, API_SECRET);

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", API_KEY);
  form.append("timestamp", timestamp);
  form.append("folder", folder);
  form.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: form },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(
      body?.error?.message ?? `Cloudinary upload failed (${response.status}).`,
    );
  }

  const data = (await response.json()) as { secure_url?: string };
  if (!data.secure_url) throw new Error("Cloudinary did not return a URL.");
  return data.secure_url;
}
