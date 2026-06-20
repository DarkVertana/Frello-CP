export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        active
          ? "border-tint/30 bg-tint-soft text-tint-dark"
          : "border-zinc-300/60 bg-zinc-100 text-zinc-700"
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${active ? "bg-tint" : "bg-zinc-400"}`}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}
