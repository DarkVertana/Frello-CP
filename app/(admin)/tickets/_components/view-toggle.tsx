import Link from "next/link";
import { Columns3, List } from "lucide-react";

export type TicketViewMode = "kanban" | "table";

type Props = {
  mode: TicketViewMode;
  hrefFor: (mode: TicketViewMode) => string;
};

export function ViewToggle({ mode, hrefFor }: Props) {
  const base =
    "inline-flex h-9 items-center gap-1.5 rounded-input px-3 text-sm font-medium transition";
  const active = "bg-tint text-white shadow-sm";
  const inactive = "border border-border bg-card text-foreground hover:bg-tint-soft";

  return (
    <div className="inline-flex items-center gap-1.5">
      <Link
        href={hrefFor("kanban")}
        aria-pressed={mode === "kanban"}
        className={`${base} ${mode === "kanban" ? active : inactive}`}
      >
        <Columns3 className="size-4" aria-hidden="true" />
        Kanban
      </Link>
      <Link
        href={hrefFor("table")}
        aria-pressed={mode === "table"}
        className={`${base} ${mode === "table" ? active : inactive}`}
      >
        <List className="size-4" aria-hidden="true" />
        Table
      </Link>
    </div>
  );
}
