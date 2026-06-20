"use client";

import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { ImageIcon, Trash2, Upload } from "lucide-react";
import { Field } from "@/app/(auth)/_components/field";
import { uploadImage } from "@/lib/uploads/client";
import { SpinnerIcon } from "@/app/_components/icons";

type Props = {
  /** Object key prefix — separates products/supplements/etc. into folders. */
  prefix: "products" | "supplements" | "scans" | "tickets";
  /** Current URL (empty string = no image). */
  value: string;
  onChange: (next: string) => void;
  label?: string;
  required?: boolean;
};

/**
 * Single-image input that supports drag-drop, click-to-pick, and URL paste.
 * Uploads via /api/v1/uploads/presign so the file body bypasses Next.js.
 */
export function ImageUploader({
  prefix,
  value,
  onChange,
  label = "Image",
  required,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFiles(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadImage(file, prefix);
      onChange(url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files?.length) {
      void handleFiles(event.dataTransfer.files);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-4">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label={uploading ? "Uploading…" : "Upload image"}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={`relative size-28 shrink-0 cursor-pointer overflow-hidden rounded-card border-2 ${
            dragOver
              ? "border-tint bg-tint-soft"
              : "border-dashed border-border bg-background"
          } transition`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt=""
              className="size-full object-cover"
              onError={(event) => {
                event.currentTarget.style.opacity = "0.2";
              }}
            />
          ) : (
            <div className="grid size-full place-items-center text-muted">
              <ImageIcon className="size-7" aria-hidden="true" />
            </div>
          )}
          {uploading ? (
            <div className="absolute inset-0 grid place-items-center bg-card/80 text-tint-dark">
              <SpinnerIcon className="size-5 animate-spin" />
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
            className="hidden"
            onChange={(event) => handleFiles(event.currentTarget.files)}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-9 w-fit items-center gap-2 rounded-input border border-border bg-card px-3 text-sm font-medium text-foreground transition hover:bg-tint-soft disabled:opacity-60"
          >
            <Upload className="size-4" aria-hidden="true" />
            {uploading ? "Uploading…" : value ? "Replace image" : "Upload image"}
          </button>
          {value ? (
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={uploading}
              className="inline-flex h-9 w-fit items-center gap-1.5 rounded-input px-2 text-xs font-medium text-muted hover:text-danger"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Remove
            </button>
          ) : null}

          <Field
            label="…or paste a URL"
            id={`${prefix}-image-url`}
            type="url"
            value={value}
            onChange={(event) => onChange(event.currentTarget.value)}
            placeholder="https://…"
            required={required}
          />
        </div>
      </div>

      <div className="text-xs">
        <span className="text-muted">
          PNG/JPEG/WebP/AVIF/GIF up to 10 MB. Stored on Cloudinary.
        </span>
        {error ? (
          <p role="alert" className="mt-1 text-danger">
            {error}
          </p>
        ) : null}
      </div>

      <label className="sr-only" htmlFor={`${prefix}-image-url`}>
        {label}
      </label>
    </div>
  );
}
