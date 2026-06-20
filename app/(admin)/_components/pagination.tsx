import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Server-rendered prev/next pagination. Pages are encoded in the URL so deep
 * links + browser back/forward Just Work. `hrefFor(page)` builds the next URL
 * preserving every other search param.
 */
export function Pagination({
  page,
  perPage,
  total,
  hrefFor,
}: {
  page: number;
  perPage: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const first = total === 0 ? 0 : (page - 1) * perPage + 1;
  const last = Math.min(page * perPage, total);

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  const buttonBase =
    "inline-flex h-9 items-center gap-1 rounded-input border border-border bg-card px-3 text-sm font-medium text-foreground transition hover:bg-tint-soft";
  const disabledClass = "pointer-events-none cursor-not-allowed opacity-40";

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between border-t border-border px-4 py-3"
    >
      <p className="text-sm text-muted">
        {total === 0 ? (
          "No results"
        ) : (
          <>
            <span className="font-medium text-foreground">{first}</span>–
            <span className="font-medium text-foreground">{last}</span> of{" "}
            <span className="font-medium text-foreground">{total}</span>
          </>
        )}
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={prevDisabled ? "#" : hrefFor(page - 1)}
          aria-disabled={prevDisabled}
          className={`${buttonBase} ${prevDisabled ? disabledClass : ""}`}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Previous
        </Link>
        <span className="text-xs text-muted">
          Page <span className="font-medium text-foreground">{page}</span> of{" "}
          <span className="font-medium text-foreground">{totalPages}</span>
        </span>
        <Link
          href={nextDisabled ? "#" : hrefFor(page + 1)}
          aria-disabled={nextDisabled}
          className={`${buttonBase} ${nextDisabled ? disabledClass : ""}`}
        >
          Next
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </nav>
  );
}
