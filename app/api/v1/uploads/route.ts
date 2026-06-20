import type { NextRequest } from "next/server";
import { APIError, ok, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { isCloudinaryConfigured, uploadToCloudinary } from "@/lib/storage/cloudinary";

const ALLOWED_PREFIXES = ["products", "supplements", "scans", "tickets"] as const;
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const IMAGE_TYPE = /^image\/(png|jpe?g|webp|gif|avif)$/i;

/**
 * POST /api/v1/uploads  (multipart/form-data)
 *
 * Fields: file (the image), prefix (products|supplements|scans|tickets).
 * Uploads to Cloudinary and returns the permanent URL: { url }.
 */
export function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireRole(canManage);

    if (!isCloudinaryConfigured()) {
      throw new APIError(
        "BAD_REQUEST",
        "Image storage isn't configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    const rawPrefix = String(form.get("prefix") ?? "products");
    const prefix = (ALLOWED_PREFIXES as readonly string[]).includes(rawPrefix)
      ? rawPrefix
      : "products";

    if (!(file instanceof File)) {
      throw new APIError("BAD_REQUEST", "No file was provided.");
    }
    if (!IMAGE_TYPE.test(file.type)) {
      throw new APIError("VALIDATION", "Only PNG, JPEG, WebP, GIF, or AVIF images are allowed.");
    }
    if (file.size > MAX_BYTES) {
      throw new APIError("VALIDATION", "Image must be 10 MB or smaller.");
    }

    const url = await uploadToCloudinary(file, `frello/${prefix}`);
    return ok({ url });
  });
}
