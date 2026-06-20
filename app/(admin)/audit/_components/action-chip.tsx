/**
 * Audit-action chip. Colour-coded by the last verb in dot-notation:
 *   product.create        → success
 *   user.role.update      → info
 *   order.transition.paid → warn
 *   product.delete        → danger
 */
function tone(action: string): "success" | "info" | "warn" | "danger" {
  if (action.endsWith(".delete")) return "danger";
  if (action.endsWith(".create")) return "success";
  if (
    action.includes(".transition") ||
    action.endsWith(".refund") ||
    action.endsWith(".ban") ||
    action.endsWith(".unban") ||
    action.endsWith(".flag") ||
    action.endsWith(".unflag") ||
    action.endsWith(".reorder") ||
    action.endsWith(".bulk_activate") ||
    action.endsWith(".bulk_deactivate")
  )
    return "warn";
  return "info";
}

const styles: Record<ReturnType<typeof tone>, string> = {
  success: "border-tint/30 bg-tint-soft text-tint-dark",
  info: "border-blue-500/20 bg-blue-50 text-blue-700",
  warn: "border-amber-500/20 bg-amber-50 text-amber-800",
  danger: "border-danger/20 bg-danger-soft text-danger",
};

export function ActionChip({ action }: { action: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium ${styles[tone(action)]}`}
    >
      {action}
    </span>
  );
}
