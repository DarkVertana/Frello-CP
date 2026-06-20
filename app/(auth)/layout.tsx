import { redirect } from "next/navigation";
import { FrelloWordmark } from "@/app/_components/frello-wordmark";
import { getSession } from "@/lib/session";
import { isAdmin } from "@/lib/rbac";

// Soft translucent green bubbles painted behind the auth form — mirrors the
// BubbleBackground from the Frello app (auth_theme.dart).
const bubbles = [
  { size: 190, alpha: 0.1, top: -70, left: -50 },
  { size: 150, alpha: 0.08, top: 90, right: -60 },
  { size: 140, alpha: 0.07, bottom: 140, left: -55 },
  { size: 180, alpha: 0.09, bottom: -60, right: -40 },
];

// Force the auth screens to the Frello light palette regardless of the OS
// color scheme — the app's auth flow is white-with-green-bubbles only.
const lightTheme = {
  colorScheme: "light",
  "--color-tint": "#00cd52",
  "--color-tint-dark": "#0a8f3c",
  "--color-tint-soft": "#e3f8ea",
  "--color-tint-deep": "#092f00",
  "--color-card": "#ffffff",
  "--color-background": "#ffffff",
  "--color-border": "#d7dae0",
  "--color-foreground": "#0a0e13",
  "--color-muted": "#60646c",
} as React.CSSProperties;

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Bounce already-signed-in staff straight to the dashboard.
  const session = await getSession();
  if (session && isAdmin(session.user.role)) redirect("/dashboard");

  return (
    <div
      style={lightTheme}
      className="relative flex min-h-dvh flex-col overflow-hidden bg-white text-foreground"
    >
      {bubbles.map((b, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full"
          style={{
            width: b.size,
            height: b.size,
            top: b.top,
            bottom: b.bottom,
            left: b.left,
            right: b.right,
            backgroundColor: `rgb(0 205 82 / ${b.alpha})`,
          }}
        />
      ))}

      <main className="relative flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex justify-center">
            <FrelloWordmark className="text-4xl" />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
