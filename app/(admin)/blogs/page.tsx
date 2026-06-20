import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getSession } from "@/lib/session";
import { canManage, isAdmin } from "@/lib/rbac";
import { listBlogs } from "@/lib/data/blogs";
import { blogListFiltersSchema } from "@/lib/schemas/blog";
import { Pagination } from "../_components/pagination";
import { formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Blogs" };
export const dynamic = "force-dynamic";

const PER_PAGE = 12;

type SearchParams = { page?: string; search?: string; status?: string };

export default async function BlogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session) return null;
  if (!isAdmin(session.user.role)) redirect("/");

  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const search = sp.search?.trim() || undefined;
  const filters = blogListFiltersSchema.parse({ status: sp.status || undefined });

  const { rows, meta } = await listBlogs({
    page,
    perPage: PER_PAGE,
    search,
    sort: { field: "createdAt", direction: "desc" },
    filters,
  });

  const writable = canManage(session.user.role);

  function urlFor(overrides: Record<string, string | number | null>): string {
    const next = new URLSearchParams();
    const carry = { search, status: filters.status, page } as Record<
      string,
      string | number | undefined
    >;
    for (const [key, value] of Object.entries({ ...carry, ...overrides })) {
      if (value === null || value === undefined || value === "") continue;
      next.set(key, String(value));
    }
    const query = next.toString();
    return query ? `/blogs?${query}` : "/blogs";
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Blogs</h1>
          <p className="text-sm text-muted">
            Articles shown in the app. Write with the rich editor; publish when ready.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-tint-soft px-3 py-1 text-xs font-medium text-tint-dark">
            {meta.total} {meta.total === 1 ? "post" : "posts"}
          </span>
          {writable ? (
            <Link
              href="/blogs/new"
              className="inline-flex h-10 items-center gap-2 rounded-input bg-tint px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-tint/90"
            >
              <Plus className="size-4" aria-hidden="true" />
              New blog
            </Link>
          ) : null}
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-card border border-dashed border-border bg-card p-10 text-center">
          <h3 className="text-base font-semibold text-foreground">No blogs yet</h3>
          <p className="mt-1 text-sm text-muted">
            {writable ? "Write your first post." : "Check back soon."}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((blog) => (
            <li key={blog.id}>
              <Link
                href={`/blogs/${blog.id}`}
                className="flex h-full flex-col overflow-hidden rounded-card border border-border bg-card shadow-card transition hover:border-tint/40"
              >
                <div className="aspect-[16/9] w-full bg-background">
                  {blog.featuredImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={blog.featuredImageUrl}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                        blog.status === "published"
                          ? "border-tint/30 bg-tint-soft text-tint-dark"
                          : "border-border bg-background text-muted"
                      }`}
                    >
                      {blog.status === "published" ? "Published" : "Draft"}
                    </span>
                    <span className="text-xs text-muted">
                      {formatRelative(blog.publishedAt ?? blog.createdAt)}
                    </span>
                  </div>
                  <h3 className="line-clamp-2 font-semibold text-foreground">
                    {blog.title}
                  </h3>
                  {blog.excerpt ? (
                    <p className="line-clamp-2 text-sm text-muted">{blog.excerpt}</p>
                  ) : null}
                  {blog.tags.length > 0 ? (
                    <div className="mt-auto flex flex-wrap gap-1 pt-1">
                      {blog.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-background px-2 py-0.5 text-xs text-muted"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        <Pagination
          page={meta.page}
          perPage={meta.perPage}
          total={meta.total}
          hrefFor={(p) => urlFor({ page: p })}
        />
      </div>
    </div>
  );
}
