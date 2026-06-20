import Image from "next/image";
import Link from "next/link";
import icon from "@/app/icon.png";
import splash from "@/public/splash.png";
import { navForRole } from "./nav-config";
import { SidebarLink } from "./sidebar-link";

export function Sidebar({ role }: { role: string }) {
  const items = navForRole(role);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
        <Link
          href="/"
          aria-label="Frello home"
          className="flex items-center gap-2.5"
        >
          <Image src={icon} alt="" priority className="size-9 rounded-xl" />
          <Image src={splash} alt="Frello" priority className="h-7 w-auto" />
        </Link>
      </div>
      <nav aria-label="Primary" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <SidebarLink
                  href={item.href}
                  label={item.label}
                  icon={<Icon className="size-4" aria-hidden="true" />}
                />
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-border px-5 py-4 text-xs text-muted">
        Signed in as{" "}
        <span className="font-medium text-foreground capitalize">
          {role.replace("_", " ")}
        </span>
      </div>
    </aside>
  );
}
