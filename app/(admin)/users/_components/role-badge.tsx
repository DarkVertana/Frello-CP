const labels: Record<string, string> = {
  admin: "Admin",
  viewer: "Viewer",
};

const tone: Record<string, string> = {
  admin: "border-tint/30 bg-tint-soft text-tint-dark",
  viewer: "border-zinc-300/60 bg-zinc-100 text-zinc-700",
};

export function RoleBadge({ role }: { role: string }) {
  const label = labels[role] ?? role;
  const className = tone[role] ?? tone.viewer;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
