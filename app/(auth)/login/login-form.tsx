"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "../_components/field";
import { PasswordField } from "../_components/password-field";
import { SubmitButton } from "../_components/submit-button";
import { Banner } from "../_components/banner";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    setPending(true);
    const res = await authClient.signIn.email({
      email,
      password,
      rememberMe: form.get("remember") === "on",
    });
    setPending(false);

    if (res.error) {
      setError(res.error.message ?? "Sign in failed. Check your credentials.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      style={{ "--color-border": "var(--color-tint-deep)" } as React.CSSProperties}
      noValidate
    >
      {error ? <Banner tone="error">{error}</Banner> : null}

      <Field
        label="Email"
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
      />

      <div className="space-y-1.5">
        <PasswordField
          label="Password"
          id="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
        <div className="flex items-center justify-between pt-0.5">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              name="remember"
              className="size-4 rounded border-border text-tint focus:ring-tint"
            />
            Remember me
          </label>
        </div>
      </div>

      <SubmitButton pending={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </SubmitButton>
    </form>
  );
}
