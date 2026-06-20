"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function SidebarLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "flex items-center gap-3 rounded-input bg-tint-soft px-3 py-2 text-sm font-semibold text-tint-dark"
          : "flex items-center gap-3 rounded-input px-3 py-2 text-sm font-medium text-muted transition hover:bg-tint-soft/60 hover:text-foreground"
      }
    >
      {icon}
      {label}
    </Link>
  );
}
