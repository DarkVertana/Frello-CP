import "server-only";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

/**
 * Single S3 client reused across requests. Compatible with AWS S3, Cloudflare
 * R2, Backblaze B2, MinIO, etc. — the env vars in `.env.example` cover the
 * common providers.
 */
declare global {
  var __plantplusS3: S3Client | undefined;
}

function makeClient(): S3Client {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT || undefined,
    region: process.env.S3_REGION || "auto",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? "",
      secretAccessKey: process.env.S3_SECRET_KEY ?? "",
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  });
}

export function s3(): S3Client {
  if (!globalThis.__plantplusS3) {
    globalThis.__plantplusS3 = makeClient();
  }
  return globalThis.__plantplusS3;
}

export function isS3Configured(): boolean {
  return Boolean(
    process.env.S3_ENDPOINT &&
      process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY &&
      process.env.S3_SECRET_KEY,
  );
}

/**
 * Generates an object key under a namespaced prefix. The UUID prevents
 * filename collisions without exposing user-supplied paths to the bucket root.
 */
export function makeUploadKey({
  prefix,
  filename,
}: {
  prefix: string;
  filename: string;
}): string {
  const safeName = filename
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${prefix}/${randomUUID()}/${safeName}`;
}

/** Constructs the path-style public URL for a key. */
export function publicUrlFor(key: string): string {
  const endpoint = (process.env.S3_ENDPOINT ?? "").replace(/\/$/, "");
  const bucket = process.env.S3_BUCKET ?? "";
  return `${endpoint}/${bucket}/${key}`;
}

export async function createPresignedUpload({
  key,
  contentType,
  expiresInSeconds = 600,
}: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3(), command, { expiresIn: expiresInSeconds });
}
