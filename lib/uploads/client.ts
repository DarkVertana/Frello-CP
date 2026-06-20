"use client";

/**
 * Client-side helper that uploads a file to /api/v1/uploads (which stores it on
 * Cloudinary) and returns the permanent image URL.
 *
 * Throws on any failure — callers wrap with try/catch to surface to the UI.
 */
export async function uploadImage(
  file: File,
  prefix: "products" | "supplements" | "scans" | "tickets" | "blogs",
): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("prefix", prefix);

  const response = await fetch("/api/v1/uploads", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? "Upload failed.");
  }

  const { data } = (await response.json()) as { data: { url: string } };
  return data.url;
}
