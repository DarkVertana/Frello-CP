import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isAdmin } from "@/lib/rbac";
import { Sidebar } from "./_components/sidebar";
import { Header } from "./_components/header";

/**
 * Server-enforced auth gate for every admin route. Redirects:
 *  - to `/login` if there's no session
 *  - to `/` if the user is signed in but doesn't have a staff role
 *
 * The role string is also exposed to the Sidebar so it can hide nav items the
 * user can't access (UI defense; server actions enforce again).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const role = session.user.role ?? "viewer";
  if (!isAdmin(role)) redirect("/");

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          user={{
            name: session.user.name,
            email: session.user.email,
            role,
          }}
        />
        <main className="min-h-0 flex-1 overflow-auto px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
