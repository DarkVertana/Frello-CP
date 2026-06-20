import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignupPage() {
  return (
    <div className="space-y-7">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="text-base text-muted">
          Sign up to get started with Frello.
        </p>
      </header>

      <SignupForm />

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-tint-deep hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
