"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field, fieldInputClass } from "@/app/(auth)/_components/field";
import { PasswordField } from "@/app/(auth)/_components/password-field";
import { Banner } from "@/app/(auth)/_components/banner";
import { SpinnerIcon } from "@/app/_components/icons";
import { roleEnum, userCreateSchema, userUpdateSchema } from "@/lib/schemas/user";
import type { UserRow } from "@/lib/data/users";

type Props = {
  /** When set the form edits this user; otherwise it creates a new one. */
  user?: UserRow;
  /** Called after a successful save so the parent can close the modal. */
  onSuccess: () => void;
};

type FormState = {
  name: string;
  email: string;
  password: string;
  role: string;
  phone: string;
};

function initialState(user?: UserRow): FormState {
  return {
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
    role: user?.role ?? "viewer",
    phone: user?.phone ?? "",
  };
}

export function UserForm({ user, onSuccess }: Props) {
  const router = useRouter();
  const isEdit = !!user;

  const [state, setState] = useState(() => initialState(user));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function setIssues(issues: { path: PropertyKey[]; message: string }[]) {
    const fields: Record<string, string> = {};
    for (const issue of issues) {
      const path = issue.path.join(".");
      if (!fields[path]) fields[path] = issue.message;
    }
    setFieldErrors(fields);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const payload = isEdit
      ? { name: state.name.trim(), phone: state.phone.trim() }
      : {
          name: state.name.trim(),
          email: state.email.trim(),
          password: state.password,
          role: state.role,
          phone: state.phone.trim(),
        };

    const schema = isEdit ? userUpdateSchema : userCreateSchema;
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      setIssues(parsed.error.issues);
      return;
    }

    setPending(true);
    const response = await fetch(
      isEdit ? `/api/v1/users/${user.id}` : "/api/v1/users",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      },
    );
    setPending(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      if (body?.error?.fields) setFieldErrors(body.error.fields);
      setError(
        body?.error?.message ??
          (isEdit ? "Couldn't save those changes." : "Couldn't create that user."),
      );
      return;
    }

    onSuccess();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error ? <Banner tone="error">{error}</Banner> : null}

      <div>
        <Field
          label="Full name"
          id="name"
          name="name"
          value={state.name}
          onChange={(event) => update("name", event.currentTarget.value)}
          placeholder="Jane Appleseed"
          autoComplete="name"
          required
          autoFocus
        />
        {fieldErrors.name ? <FieldError>{fieldErrors.name}</FieldError> : null}
      </div>

      <div>
        <Field
          label="Email"
          id="email"
          name="email"
          type="email"
          value={state.email}
          onChange={(event) => update("email", event.currentTarget.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required={!isEdit}
          disabled={isEdit}
        />
        {isEdit ? (
          <p className="mt-1 text-xs text-muted">
            Email can&apos;t be changed from here.
          </p>
        ) : null}
        {fieldErrors.email ? <FieldError>{fieldErrors.email}</FieldError> : null}
      </div>

      {!isEdit ? (
        <div className="space-y-1.5">
          <PasswordField
            label="Temporary password"
            id="password"
            name="password"
            value={state.password}
            onChange={(event) => update("password", event.currentTarget.value)}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            minLength={8}
            required
          />
          <p className="text-xs text-muted">
            Share this with the user; they can change it after signing in.
          </p>
          {fieldErrors.password ? (
            <FieldError>{fieldErrors.password}</FieldError>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {!isEdit ? (
          <div>
            <label
              htmlFor="role"
              className="block text-sm font-medium text-foreground"
            >
              Role
            </label>
            <select
              id="role"
              value={state.role}
              onChange={(event) => update("role", event.currentTarget.value)}
              className={`mt-1.5 ${fieldInputClass}`}
            >
              {roleEnum.options.map((option) => (
                <option key={option} value={option}>
                  {option === "admin"
                    ? "Admin — full access"
                    : "Viewer — read-only"}
                </option>
              ))}
            </select>
            {fieldErrors.role ? <FieldError>{fieldErrors.role}</FieldError> : null}
          </div>
        ) : null}

        <div>
          <Field
            label="Phone (optional)"
            id="phone"
            name="phone"
            type="tel"
            value={state.phone}
            onChange={(event) => update("phone", event.currentTarget.value)}
            placeholder="+91 98765 43210"
            autoComplete="tel"
          />
          {fieldErrors.phone ? <FieldError>{fieldErrors.phone}</FieldError> : null}
        </div>
      </div>

      {isEdit ? (
        <p className="text-xs text-muted">
          Change a user&apos;s role or ban status from the row actions.
        </p>
      ) : null}

      <div className="flex items-center gap-3 border-t border-border pt-5">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-input bg-tint px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? <SpinnerIcon className="size-4 animate-spin" /> : null}
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create user"}
        </button>
      </div>
    </form>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-danger">{children}</p>;
}
