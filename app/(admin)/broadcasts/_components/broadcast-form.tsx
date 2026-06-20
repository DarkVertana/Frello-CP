"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, fieldInputClass } from "@/app/(auth)/_components/field";
import { Banner } from "@/app/(auth)/_components/banner";
import { SpinnerIcon } from "@/app/_components/icons";
import { SegmentPicker } from "./segment-picker";
import {
  broadcastCreateSchema,
  type BroadcastSegmentParamsInput,
  type BroadcastSegmentValue,
} from "@/lib/schemas/broadcast";
import type { Broadcast } from "@/db/schema";

type Props = {
  broadcast?: Broadcast;
  /**
   * Called after a successful save with the resulting broadcast id (useful
   * when the parent wants to route to the new draft's detail page).
   */
  onSuccess?: (id: string) => void;
};

export function BroadcastForm({ broadcast, onSuccess }: Props) {
  const router = useRouter();
  const isEdit = !!broadcast;

  const [title, setTitle] = useState(broadcast?.title ?? "");
  const [body, setBody] = useState(broadcast?.body ?? "");
  const [segment, setSegment] = useState<BroadcastSegmentValue>(
    (broadcast?.segment as BroadcastSegmentValue) ?? "all",
  );
  const [params, setParams] = useState<BroadcastSegmentParamsInput>(
    (broadcast?.segmentParams as BroadcastSegmentParamsInput) ?? {},
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const payload = {
      title: title.trim(),
      body: body.trim(),
      segment,
      segmentParams: params,
    };

    const parsed = broadcastCreateSchema.safeParse(payload);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        if (!fields[path]) fields[path] = issue.message;
      }
      setFieldErrors(fields);
      return;
    }

    setPending(true);
    const url = isEdit ? `/api/v1/broadcasts/${broadcast.id}` : "/api/v1/broadcasts";
    const method = isEdit ? "PATCH" : "POST";
    const response = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    setPending(false);

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      if (result?.error?.fields) setFieldErrors(result.error.fields);
      setError(result?.error?.message ?? "Couldn't save the broadcast.");
      return;
    }

    const result = await response.json();
    const id = isEdit ? broadcast.id : (result.data?.id as string);
    if (onSuccess) {
      onSuccess(id);
      router.refresh();
      return;
    }
    router.push(`/broadcasts/${id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error ? <Banner tone="error">{error}</Banner> : null}

      <div>
        <Field
          label="Title"
          id="title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
          placeholder="New scan flow rolling out today"
          required
          autoFocus
        />
        {fieldErrors.title ? <FieldError>{fieldErrors.title}</FieldError> : null}
      </div>

      <div>
        <label
          htmlFor="body"
          className="block text-sm font-medium text-foreground"
        >
          Body
        </label>
        <textarea
          id="body"
          value={body}
          onChange={(event) => setBody(event.currentTarget.value)}
          rows={6}
          placeholder="What the user reads in the push payload."
          className={`mt-1.5 ${fieldInputClass}`}
        />
        {fieldErrors.body ? <FieldError>{fieldErrors.body}</FieldError> : null}
      </div>

      <SegmentPicker
        segment={segment}
        params={params}
        onSegmentChange={setSegment}
        onParamsChange={setParams}
      />

      <div className="flex items-center gap-3 border-t border-border pt-5">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-input bg-tint px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? <SpinnerIcon className="size-4 animate-spin" /> : null}
          {pending ? "Saving…" : isEdit ? "Save draft" : "Save as draft"}
        </button>
        <Link
          href="/broadcasts"
          className="text-sm font-medium text-muted hover:text-foreground"
        >
          Cancel
        </Link>
      </div>
      <p className="text-xs text-muted">
        Drafts can be edited freely. Open the detail page to schedule or send.
      </p>
    </form>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-danger">{children}</p>;
}
