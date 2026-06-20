import { statusLabel, type OrderStatusValue } from "@/lib/orders/transitions";

const tone: Record<OrderStatusValue, string> = {
  pending: "border-zinc-300/60 bg-zinc-100 text-zinc-700",
  paid: "border-blue-500/20 bg-blue-50 text-blue-700",
  packed: "border-amber-500/20 bg-amber-50 text-amber-800",
  out_for_delivery: "border-violet-500/20 bg-violet-50 text-violet-700",
  delivered: "border-tint/30 bg-tint-soft text-tint-dark",
  cancelled: "border-zinc-300/60 bg-zinc-100 text-zinc-600",
  refunded: "border-danger/20 bg-danger-soft text-danger",
};

const dot: Record<OrderStatusValue, string> = {
  pending: "bg-zinc-400",
  paid: "bg-blue-500",
  packed: "bg-amber-500",
  out_for_delivery: "bg-violet-500",
  delivered: "bg-tint",
  cancelled: "bg-zinc-400",
  refunded: "bg-danger",
};

export function OrderStatusBadge({ status }: { status: OrderStatusValue }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tone[status]}`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${dot[status]}`} />
      {statusLabel(status)}
    </span>
  );
}
