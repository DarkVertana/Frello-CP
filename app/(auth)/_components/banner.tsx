import type { ReactNode } from "react";

type Tone = "error" | "success";

const toneClass: Record<Tone, string> = {
  error: "border-danger/20 bg-danger-soft text-danger",
  success: "border-tint/20 bg-tint-soft text-tint-dark",
};

export function Banner({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-input border px-3 py-2 text-sm ${toneClass[tone]}`}
    >
      {children}
    </div>
  );
}
