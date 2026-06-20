import type { Metadata } from "next";
import { listCategories } from "@/lib/data/categories";
import { getSession } from "@/lib/session";
import { canManage } from "@/lib/rbac";
import { CategoriesList } from "./_components/categories-list";
import { NewCategoryButton } from "./_components/new-category-button";

export const metadata: Metadata = { title: "Categories" };

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const session = await getSession();
  if (!session) return null;

  const { rows, meta } = await listCategories({
    page: 1,
    perPage: 100,
    sort: { field: "order", direction: "asc" },
  });

  const writable = canManage(session.user.role);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Categories
          </h1>
          <p className="text-sm text-muted">
            Organise the shop. Drag rows to reorder — order is reflected in the
            mobile app immediately.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-tint-soft px-3 py-1 text-xs font-medium text-tint-dark">
            {meta.total} {meta.total === 1 ? "category" : "categories"}
          </span>
          {writable ? <NewCategoryButton /> : null}
        </div>
      </header>

      <CategoriesList initial={rows} canManage={writable} />
    </div>
  );
}
