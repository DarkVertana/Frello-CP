import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <div className="space-y-7">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="text-base text-muted">Log in to continue.</p>
      </header>

      <LoginForm />

      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link
          href="/signup"
          className="font-semibold text-tint-deep hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
