import type { CSSProperties, ReactNode } from "react";

/**
 * Pulsing placeholder block, themed to Frello's surface tokens. Compose these
 * into page/loading skeletons — we show skeletons instead of a spinner so the
 * page chrome stays put and navigation feels instant.
 */
export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`animate-pulse rounded-md bg-border ${className}`}
      style={style}
    />
  );
}

/** Card-shaped wrapper matching the dashboard/list card chrome. */
export function SkeletonCard({
  className = "",
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`rounded-card border border-border bg-card p-5 shadow-card ${className}`}
    >
      {children}
    </div>
  );
}

/** Row placeholders for list panels (recent orders/scans, activity feeds). */
export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
        >
          <Skeleton className="size-10 shrink-0 rounded-input" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

/** Full table placeholder for entity list pages. */
export function SkeletonTable({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
      <div className="border-b border-border bg-background/70 px-4 py-3.5">
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-3 w-1/5" />
            <Skeleton className="ml-auto h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
