import type { HTMLAttributes, ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

/**
 * Plant+ table primitives. Reused by every entity list page. Visual styling
 * matches the mobile app's "white card with hairline rows" look — set on the
 * outer container, not the table itself, so we can drop tables into other
 * surfaces (modals, detail tabs) without extra wrapping.
 */

export function Table({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`overflow-hidden rounded-card border border-border bg-card shadow-card ${className}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>
      </div>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-border bg-background/70">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

export function TR({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={`transition hover:bg-tint-soft/40 ${className}`} {...props}>
      {children}
    </tr>
  );
}

export function TH({
  children,
  className = "",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TD({
  children,
  className = "",
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-4 py-3 align-middle text-sm text-foreground ${className}`} {...props}>
      {children}
    </td>
  );
}

/**
 * Sortable column header. Renders as a Link so deep-links share sort state.
 * Cycles asc → desc → off when re-clicking the active column.
 */
export function SortHeader({
  label,
  field,
  currentField,
  currentDirection,
  hrefFor,
}: {
  label: string;
  field: string;
  currentField: string;
  currentDirection: "asc" | "desc";
  hrefFor: (sortValue: string | null) => string;
}) {
  const active = currentField === field;
  const next = !active
    ? `-${field}` // first click = desc (most recent / largest first feels natural)
    : currentDirection === "desc"
      ? field
      : null; // toggle off

  return (
    <TH>
      <Link
        href={hrefFor(next)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        {!active ? (
          <ChevronsUpDown className="size-3.5 opacity-50" aria-hidden="true" />
        ) : currentDirection === "asc" ? (
          <ChevronUp className="size-3.5 text-tint-dark" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-3.5 text-tint-dark" aria-hidden="true" />
        )}
      </Link>
    </TH>
  );
}

/** Renders inside `<TBody>` when there are zero rows. */
export function TableEmpty({
  colSpan,
  title,
  hint,
}: {
  colSpan: number;
  title: string;
  hint?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-16 text-center">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
      </td>
    </tr>
  );
}
