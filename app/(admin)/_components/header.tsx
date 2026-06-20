import { Search } from "lucide-react";
import { UserMenu } from "./user-menu";

type HeaderProps = {
  user: {
    name: string;
    email: string;
    role: string;
  };
};

export function Header({ user }: HeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6">
      <div className="flex max-w-md flex-1 items-center gap-2 rounded-input bg-background px-3 py-2 ring-1 ring-border focus-within:ring-tint">
        <Search className="size-4 text-muted" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search users, orders, products…"
          aria-label="Search"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </div>
      <UserMenu name={user.name} email={user.email} role={user.role} />
    </header>
  );
}
