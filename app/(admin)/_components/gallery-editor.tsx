"use client";

import { useRef, useState } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { SpinnerIcon } from "@/app/_components/icons";
import { uploadImage } from "@/lib/uploads/client";

type Props = {
  prefix: "products" | "supplements" | "scans" | "tickets";
  value: string[];
  onChange: (next: string[]) => void;
  /** Max gallery size, defaults to 20 to match the API validator. */
  max?: number;
};

/**
 * Edits an ordered list of image URLs. Each tile has a remove button; an
 * "Add image" tile at the end opens the file picker (multi-select supported).
 * A URL field below lets admins paste pre-hosted images too.
 */
export function GalleryEditor({ prefix, value, onChange, max = 20 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(fileList)) {
        if (value.length + uploaded.length >= max) break;
        uploaded.push(await uploadImage(file, prefix));
      }
      onChange([...value, ...uploaded]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function addPasted() {
    const url = pasted.trim();
    if (!url) return;
    if (value.length >= max) {
      setError(`Maximum ${max} images.`);
      return;
    }
    onChange([...value, url]);
    setPasted("");
  }

  const atMax = value.length >= max;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {value.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="group relative aspect-square overflow-hidden rounded-input border border-border bg-background"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="size-full object-cover" loading="lazy" />
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label="Remove image"
              className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-card/90 text-danger opacity-0 shadow-card transition group-hover:opacity-100 focus:opacity-100"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}

        {!atMax ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square items-center justify-center rounded-input border-2 border-dashed border-border text-muted transition hover:border-tint/40 hover:bg-tint-soft hover:text-foreground disabled:opacity-60"
            aria-label="Upload images"
          >
            {uploading ? (
              <SpinnerIcon className="size-5 animate-spin" />
            ) : (
              <Plus className="size-5" />
            )}
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
        multiple
        className="hidden"
        onChange={(event) => handleFiles(event.currentTarget.files)}
      />

      <div className="flex items-center gap-2">
        <input
          type="url"
          value={pasted}
          onChange={(event) => setPasted(event.currentTarget.value)}
          placeholder="…or paste a URL"
          className="flex-1 rounded-input border border-border bg-card px-3 py-2 text-sm placeholder:text-muted focus:border-tint focus:outline-none focus:ring-2 focus:ring-tint/20"
        />
        <button
          type="button"
          onClick={addPasted}
          disabled={!pasted.trim() || atMax}
          className="inline-flex h-10 items-center gap-1.5 rounded-input border border-border bg-card px-3 text-sm font-medium text-foreground transition hover:bg-tint-soft disabled:opacity-60"
        >
          <Upload className="size-4" aria-hidden="true" />
          Add
        </button>
      </div>

      <p className="text-xs text-muted">
        {value.length} / {max} images.
      </p>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
