import type { NextRequest } from "next/server";
import { z } from "zod";
import { APIError, ok, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import {
  createPresignedUpload,
  isS3Configured,
  makeUploadKey,
  publicUrlFor,
} from "@/lib/storage/s3";

const bodySchema = z.object({
  prefix: z.enum(["products", "supplements", "scans", "tickets"]).default("products"),
  filename: z.string().trim().min(1).max(200),
  /** Image MIME types only — enforced both here and at the bucket policy. */
  contentType: z
    .string()
    .regex(/^image\/(png|jpe?g|webp|gif|avif)$/i, "Only image uploads are allowed."),
});

/**
 * POST /api/v1/uploads/presign
 *
 * Returns a short-lived (10 min) PUT URL the client uploads the file straight
 * to. The body is never proxied through Next — saves bandwidth and avoids
 * memory pressure for large uploads.
 */
export function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireRole(canManage);
    if (!isS3Configured()) {
      throw new APIError(
        "BAD_REQUEST",
        "Object storage isn't configured. Set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, and S3_SECRET_KEY to enable uploads.",
      );
    }

    const { prefix, filename, contentType } = bodySchema.parse(
      await request.json(),
    );
    const key = makeUploadKey({ prefix, filename });
    const uploadUrl = await createPresignedUpload({ key, contentType });

    return ok({
      key,
      uploadUrl,
      publicUrl: publicUrlFor(key),
      expiresInSeconds: 600,
    });
  });
}
