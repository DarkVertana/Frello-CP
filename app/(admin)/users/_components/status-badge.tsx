export function StatusBadge({ status }: { status: string }) {
  const banned = status === "banned";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        banned
          ? "border-danger/20 bg-danger-soft text-danger"
          : "border-tint/30 bg-tint-soft text-tint-dark"
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${banned ? "bg-danger" : "bg-tint"}`}
      />
      {banned ? "Banned" : "Active"}
    </span>
  );
}
