"use client";

import { useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { Field, fieldInputClass } from "@/app/(auth)/_components/field";
import { Banner } from "@/app/(auth)/_components/banner";
import { SpinnerIcon } from "@/app/_components/icons";
import { ImageUploader } from "../../_components/image-uploader";
import { RichTextEditor } from "./rich-text-editor";
import { blogCreateSchema, slugify } from "@/lib/schemas/blog";
import type { Blog } from "@/db/schema";

type Props = { blog?: Blog };

export function BlogEditor({ blog }: Props) {
  const router = useRouter();
  const isEdit = !!blog;

  const [title, setTitle] = useState(blog?.title ?? "");
  const [excerpt, setExcerpt] = useState(blog?.excerpt ?? "");
  const [content, setContent] = useState(blog?.content ?? "");
  const [featuredImageUrl, setFeaturedImageUrl] = useState(blog?.featuredImageUrl ?? "");
  const [tags, setTags] = useState<string[]>(blog?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [status, setStatus] = useState<"draft" | "published">(blog?.status ?? "draft");
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function addTag(raw: string) {
    const value = raw.trim().replace(/,$/, "").trim();
    if (!value) return;
    if (!tags.includes(value) && tags.length < 20) setTags((t) => [...t, value]);
    setTagDraft("");
  }

  function onTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(tagDraft);
    } else if (event.key === "Backspace" && !tagDraft && tags.length) {
      setTags((t) => t.slice(0, -1));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const slug = isEdit ? blog.slug : slugify(title.trim());
    const payload = {
      title: title.trim(),
      slug,
      excerpt: excerpt.trim(),
      content,
      featuredImageUrl: featuredImageUrl.trim(),
      tags,
      status,
    };

    const parsed = blogCreateSchema.safeParse(payload);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        if (!fields[path]) fields[path] = issue.message;
      }
      setFieldErrors(fields);
      if (fields.slug && !fields.title) setError(fields.slug);
      return;
    }

    setPending(true);
    const response = await fetch(isEdit ? `/api/v1/blogs/${blog.id}` : "/api/v1/blogs", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    setPending(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      if (body?.error?.fields) setFieldErrors(body.error.fields);
      setError(body?.error?.message ?? "Couldn't save the blog.");
      return;
    }

    router.push("/blogs");
    router.refresh();
  }

  async function handleDelete() {
    if (!blog) return;
    if (!window.confirm(`Delete "${blog.title}"? This can't be undone.`)) return;
    setDeleting(true);
    setError(null);
    const response = await fetch(`/api/v1/blogs/${blog.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Couldn't delete the blog.");
      return;
    }
    router.push("/blogs");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {error ? <Banner tone="error">{error}</Banner> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main */}
        <div className="space-y-5">
          <div>
            <Field
              label="Title"
              id="title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
              placeholder="How to care for your monstera"
              required
              autoFocus
            />
            {fieldErrors.title ? <FieldError>{fieldErrors.title}</FieldError> : null}
          </div>

          <div>
            <label htmlFor="excerpt" className="block text-sm font-medium text-foreground">
              Excerpt
            </label>
            <textarea
              id="excerpt"
              value={excerpt}
              onChange={(event) => setExcerpt(event.currentTarget.value)}
              rows={2}
              maxLength={300}
              placeholder="One or two lines shown on blog cards."
              className={`mt-1.5 ${fieldInputClass}`}
            />
            {fieldErrors.excerpt ? <FieldError>{fieldErrors.excerpt}</FieldError> : null}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Description
            </label>
            <RichTextEditor value={content} onChange={setContent} />
            {fieldErrors.content ? <FieldError>{fieldErrors.content}</FieldError> : null}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Status
            </label>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.currentTarget.value as "draft" | "published")
              }
              className={fieldInputClass}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Featured image
            </label>
            <ImageUploader
              prefix="blogs"
              value={featuredImageUrl}
              onChange={setFeaturedImageUrl}
            />
            {fieldErrors.featuredImageUrl ? (
              <FieldError>{fieldErrors.featuredImageUrl}</FieldError>
            ) : null}
          </div>

          <div>
            <label htmlFor="tags" className="mb-1.5 block text-sm font-medium text-foreground">
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5 rounded-input border border-border bg-card p-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-tint-soft px-2.5 py-0.5 text-xs font-medium text-tint-dark"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => setTags((cur) => cur.filter((x) => x !== t))}
                    aria-label={`Remove ${t}`}
                    className="text-tint-dark/70 hover:text-tint-dark"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                </span>
              ))}
              <input
                id="tags"
                value={tagDraft}
                onChange={(event) => setTagDraft(event.currentTarget.value)}
                onKeyDown={onTagKeyDown}
                onBlur={() => addTag(tagDraft)}
                placeholder={tags.length ? "" : "Add a tag, press Enter"}
                className="min-w-[8rem] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted"
              />
            </div>
            <p className="mt-1.5 text-xs text-muted">Press Enter or comma to add.</p>
            {fieldErrors.tags ? <FieldError>{fieldErrors.tags}</FieldError> : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-input bg-tint px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? <SpinnerIcon className="size-4 animate-spin" /> : null}
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create blog"}
        </button>
        <Link
          href="/blogs"
          className="text-sm font-medium text-muted hover:text-foreground"
        >
          Cancel
        </Link>
        {isEdit ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-input border border-border bg-card px-4 text-sm font-medium text-danger transition hover:bg-danger-soft disabled:opacity-60"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {deleting ? "Deleting…" : "Delete"}
          </button>
        ) : null}
      </div>
    </form>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-danger">{children}</p>;
}
