import { Skeleton, SkeletonTable } from "./_components/skeleton";

/**
 * Group-level loading boundary for every admin route. Renders inside the
 * persistent sidebar/header shell, so switching pages shows this skeleton
 * instantly while the new route's data streams in. Its presence also lets
 * <Link> prefetch these (otherwise dynamic) routes.
 */
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <Skeleton className="h-14 w-full rounded-card" />
      <SkeletonTable />
    </div>
  );
}
