"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "../_components/field";
import { PasswordField } from "../_components/password-field";
import { SubmitButton } from "../_components/submit-button";
import { Banner } from "../_components/banner";
import { authClient } from "@/lib/auth-client";

export function SignupForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    setPending(true);
    const res = await authClient.signUp.email({ name, email, password });
    setPending(false);

    if (res.error) {
      setError(res.error.message ?? "Sign up failed. Please try again.");
      return;
    }
    // autoSignIn is enabled on the auth config, so cookies are set on success.
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
        label="Full name"
        id="name"
        name="name"
        type="text"
        autoComplete="name"
        placeholder="Jane Appleseed"
        required
      />
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          minLength={8}
          required
        />
        <p className="text-xs text-muted">
          Use 8 or more characters with a mix of letters and numbers.
        </p>
      </div>

      <label className="flex items-start gap-2.5 text-sm text-muted">
        <input
          type="checkbox"
          name="terms"
          required
          className="mt-0.5 size-4 rounded border-border text-tint focus:ring-tint"
        />
        <span>
          I agree to the{" "}
          <a href="/terms" className="font-medium text-tint hover:text-tint/80">
            Terms
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            className="font-medium text-tint hover:text-tint/80"
          >
            Privacy Policy
          </a>
          .
        </span>
      </label>

      <SubmitButton pending={pending}>
        {pending ? "Creating account…" : "Create account"}
      </SubmitButton>
    </form>
  );
}
