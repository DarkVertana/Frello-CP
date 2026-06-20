"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, fieldInputClass } from "@/app/(auth)/_components/field";
import { Banner } from "@/app/(auth)/_components/banner";
import { SpinnerIcon } from "@/app/_components/icons";
import {
  jsonToString,
  settingCreateSchema,
} from "@/lib/schemas/setting";
import type { Setting } from "@/db/schema";

type Props = {
  setting?: Setting;
  onSuccess?: () => void;
};

export function SettingForm({ setting, onSuccess }: Props) {
  const router = useRouter();
  const isEdit = !!setting;

  const [key, setKey] = useState(setting?.key ?? "");
  const [valueJson, setValueJson] = useState(
    setting ? jsonToString(setting.value) : "",
  );
  const [description, setDescription] = useState(setting?.description ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleFormat() {
    try {
      setValueJson(jsonToString(JSON.parse(valueJson)));
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.valueJson;
        return next;
      });
    } catch {
      setFieldErrors((prev) => ({
        ...prev,
        valueJson: "Couldn't parse — fix the JSON first.",
      }));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const payload = {
      key: key.trim(),
      valueJson: valueJson.trim(),
      description: description.trim() || null,
    };

    const parsed = settingCreateSchema.safeParse(payload);
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
    const url = isEdit
      ? `/api/v1/settings/${encodeURIComponent(setting.key)}`
      : "/api/v1/settings";
    const method = isEdit ? "PUT" : "POST";
    const body = isEdit
      ? {
          valueJson: parsed.data.valueJson,
          description: parsed.data.description,
        }
      : parsed.data;

    const response = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setPending(false);

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      if (result?.error?.fields) setFieldErrors(result.error.fields);
      setError(result?.error?.message ?? "Couldn't save the setting.");
      return;
    }

    if (onSuccess) {
      onSuccess();
      router.refresh();
      return;
    }
    router.push("/settings");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error ? <Banner tone="error">{error}</Banner> : null}

      <div>
        <Field
          label="Key"
          id="key"
          name="key"
          value={key}
          onChange={(event) => setKey(event.currentTarget.value)}
          placeholder="featureFlags.newScanFlow"
          disabled={isEdit}
          required
          autoFocus={!isEdit}
        />
        {isEdit ? (
          <p className="mt-1.5 text-xs text-muted">
            Keys are immutable — delete and re-create to rename.
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-muted">
            Dotted keys like <code>featureFlags.x</code> are allowed.
          </p>
        )}
        {fieldErrors.key ? <FieldError>{fieldErrors.key}</FieldError> : null}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label
            htmlFor="valueJson"
            className="text-sm font-medium text-foreground"
          >
            Value (JSON)
          </label>
          <button
            type="button"
            onClick={handleFormat}
            className="text-xs font-medium text-tint-dark hover:text-tint"
          >
            Format JSON
          </button>
        </div>
        <textarea
          id="valueJson"
          value={valueJson}
          onChange={(event) => setValueJson(event.currentTarget.value)}
          rows={10}
          spellCheck={false}
          placeholder={'"INR"\nor\n{ "newScanFlow": true }'}
          className={`${fieldInputClass} font-mono text-xs`}
        />
        <p className="mt-1.5 text-xs text-muted">
          Strings need quotes: <code>&quot;INR&quot;</code>. Objects:{" "}
          <code>{`{ "key": "value" }`}</code>. Booleans:{" "}
          <code>true</code> / <code>false</code>.
        </p>
        {fieldErrors.valueJson ? (
          <FieldError>{fieldErrors.valueJson}</FieldError>
        ) : null}
      </div>

      <div>
        <Field
          label="Description (optional)"
          id="description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.currentTarget.value)}
          placeholder="When and where this value is read."
        />
        {fieldErrors.description ? (
          <FieldError>{fieldErrors.description}</FieldError>
        ) : null}
      </div>

      <div className="flex items-center gap-3 border-t border-border pt-5">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-input bg-tint px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? <SpinnerIcon className="size-4 animate-spin" /> : null}
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create setting"}
        </button>
        <Link
          href="/settings"
          className="text-sm font-medium text-muted hover:text-foreground"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-danger">{children}</p>;
}
