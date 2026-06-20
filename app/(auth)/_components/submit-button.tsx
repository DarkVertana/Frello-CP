import type { ReactNode } from "react";
import { SpinnerIcon } from "@/app/_components/icons";

export function SubmitButton({
  pending,
  children,
}: {
  pending?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-input bg-neutral-900 text-base font-semibold text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tint disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? <SpinnerIcon className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
