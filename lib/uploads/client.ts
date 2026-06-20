"use client";

/**
 * Client-side helper that exchanges a file for a public URL by getting a
 * presigned PUT from /api/v1/uploads/presign and PUTting the body directly
 * to object storage. The file body never proxies through Next.
 *
 * Throws on any failure — callers wrap with try/catch to surface to the UI.
 */
export async function uploadImage(
  file: File,
  prefix: "products" | "supplements" | "scans" | "tickets",
): Promise<string> {
  const presign = await fetch("/api/v1/uploads/presign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      prefix,
      filename: file.name,
      contentType: file.type,
    }),
  });

  if (!presign.ok) {
    const body = await presign.json().catch(() => null);
    throw new Error(body?.error?.message ?? "Couldn't get an upload URL.");
  }

  const { data } = (await presign.json()) as {
    data: { uploadUrl: string; publicUrl: string; key: string };
  };

  const put = await fetch(data.uploadUrl, {
    method: "PUT",
    headers: { "content-type": file.type },
    body: file,
  });

  if (!put.ok) {
    throw new Error(`Upload failed (${put.status}).`);
  }

  return data.publicUrl;
}
