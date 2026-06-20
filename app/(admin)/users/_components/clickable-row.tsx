"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

/**
 * Makes an entire user row navigate to `href` on click, while letting nested
 * interactive controls (the name <Link>, the role <select>, and the ban/delete
 * buttons) keep handling their own clicks. The visible name <Link> still covers
 * keyboard users, since a clickable <tr> isn't focusable on its own.
 */
export function ClickableRow({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLTableRowElement>) {
    // Ignore clicks originating from an interactive control inside the row.
    if ((event.target as HTMLElement).closest("a, button, select, input, label")) {
      return;
    }
    router.push(href);
  }

  return (
    <tr
      onClick={handleClick}
      className="cursor-pointer transition hover:bg-tint-soft/40"
    >
      {children}
    </tr>
  );
}
