import { Skeleton, SkeletonCard, SkeletonRows } from "../_components/skeleton";

/**
 * Dashboard-shaped loading skeleton (KPI strip + chart cards + lists) so a
 * navigation to /dashboard mirrors the real layout instead of a generic table.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3 w-96 max-w-full" />
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="size-10 rounded-input" />
            </div>
          </SkeletonCard>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SkeletonCard>
          <Skeleton className="h-56 w-full" />
        </SkeletonCard>
        <SkeletonCard>
          <Skeleton className="h-56 w-full" />
        </SkeletonCard>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SkeletonCard>
          <Skeleton className="h-56 w-full" />
        </SkeletonCard>
        <SkeletonCard>
          <SkeletonRows />
        </SkeletonCard>
      </section>

      <section>
        <SkeletonCard>
          <SkeletonRows />
        </SkeletonCard>
      </section>
    </div>
  );
}
