import "server-only";
import { and, asc, count, desc, eq, ilike, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { blogs, type Blog } from "@/db/schema";
import { APIError, type ListMeta } from "@/lib/api/response";
import type {
  BlogCreateInput,
  BlogListFilters,
  BlogUpdateInput,
} from "@/lib/schemas/blog";

export type BlogSortField = "title" | "status" | "createdAt" | "publishedAt";

export type BlogListParams = {
  page: number;
  perPage: number;
  search?: string;
  sort: { field: BlogSortField; direction: "asc" | "desc" };
  filters: BlogListFilters;
};

const orderColumn = {
  title: blogs.title,
  status: blogs.status,
  createdAt: blogs.createdAt,
  publishedAt: blogs.publishedAt,
} as const satisfies Record<BlogSortField, unknown>;

function buildWhere(params: BlogListParams): SQL | undefined {
  const clauses: SQL[] = [];
  if (params.search) {
    const like = `%${params.search}%`;
    const match = ilike(blogs.title, like);
    if (match) clauses.push(match);
  }
  if (params.filters.status) clauses.push(eq(blogs.status, params.filters.status));
  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return and(...clauses);
}

export async function listBlogs(
  params: BlogListParams,
): Promise<{ rows: Blog[]; meta: ListMeta }> {
  const where = buildWhere(params);
  const column = orderColumn[params.sort.field];
  const orderBy = params.sort.direction === "asc" ? asc(column) : desc(column);
  const offset = (params.page - 1) * params.perPage;

  const [rows, totals] = await Promise.all([
    db.select().from(blogs).where(where).orderBy(orderBy, desc(blogs.createdAt))
      .limit(params.perPage).offset(offset),
    db.select({ value: count() }).from(blogs).where(where),
  ]);

  return {
    rows,
    meta: { page: params.page, perPage: params.perPage, total: totals[0]?.value ?? 0 },
  };
}

/** Published posts, newest first — backs the public catalog endpoint. */
export async function listPublishedBlogs(params: {
  page: number;
  perPage: number;
  search?: string;
}): Promise<{ rows: Blog[]; meta: ListMeta }> {
  return listBlogs({
    page: params.page,
    perPage: params.perPage,
    search: params.search,
    sort: { field: "publishedAt", direction: "desc" },
    filters: { status: "published" },
  });
}

export async function getBlogById(id: string): Promise<Blog | null> {
  const [row] = await db.select().from(blogs).where(eq(blogs.id, id)).limit(1);
  return row ?? null;
}

export async function getBlogBySlug(slug: string): Promise<Blog | null> {
  const [row] = await db.select().from(blogs).where(eq(blogs.slug, slug)).limit(1);
  return row ?? null;
}

/** A single PUBLISHED post by slug (public detail). */
export async function getPublishedBlogBySlug(slug: string): Promise<Blog | null> {
  const [row] = await db
    .select()
    .from(blogs)
    .where(and(eq(blogs.slug, slug), eq(blogs.status, "published")))
    .limit(1);
  return row ?? null;
}

export async function createBlog(
  input: BlogCreateInput & { authorId: string },
): Promise<Blog> {
  const clash = await getBlogBySlug(input.slug);
  if (clash) {
    throw new APIError("CONFLICT", "A blog with that slug already exists.", {
      slug: "Already in use.",
    });
  }

  const [row] = await db
    .insert(blogs)
    .values({
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt ? input.excerpt : null,
      content: input.content ?? "",
      featuredImageUrl: input.featuredImageUrl ? input.featuredImageUrl : null,
      tags: input.tags,
      status: input.status,
      authorId: input.authorId,
      publishedAt: input.status === "published" ? new Date() : null,
    })
    .returning();
  if (!row) throw new APIError("INTERNAL", "Failed to create blog.");
  return row;
}

export async function updateBlog(
  id: string,
  patch: BlogUpdateInput,
): Promise<{ before: Blog; after: Blog }> {
  const before = await getBlogById(id);
  if (!before) throw new APIError("NOT_FOUND", "Blog not found.");

  if (patch.slug && patch.slug !== before.slug) {
    const clash = await getBlogBySlug(patch.slug);
    if (clash) {
      throw new APIError("CONFLICT", "A blog with that slug already exists.", {
        slug: "Already in use.",
      });
    }
  }

  const next: Partial<typeof blogs.$inferInsert> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };
  if (patch.title !== undefined) next.title = patch.title;
  if (patch.slug !== undefined) next.slug = patch.slug;
  if (patch.excerpt !== undefined) next.excerpt = patch.excerpt ? patch.excerpt : null;
  if (patch.content !== undefined) next.content = patch.content;
  if (patch.featuredImageUrl !== undefined)
    next.featuredImageUrl = patch.featuredImageUrl ? patch.featuredImageUrl : null;
  if (patch.tags !== undefined) next.tags = patch.tags;
  if (patch.status !== undefined) {
    next.status = patch.status;
    // Stamp publishedAt the first time it goes live; clear if back to draft.
    if (patch.status === "published" && !before.publishedAt) next.publishedAt = new Date();
    if (patch.status === "draft") next.publishedAt = null;
  }

  const [after] = await db.update(blogs).set(next).where(eq(blogs.id, id)).returning();
  if (!after) throw new APIError("INTERNAL", "Failed to update blog.");
  return { before, after };
}

export async function deleteBlog(id: string): Promise<Blog> {
  const before = await getBlogById(id);
  if (!before) throw new APIError("NOT_FOUND", "Blog not found.");
  const [deleted] = await db.delete(blogs).where(eq(blogs.id, id)).returning();
  if (!deleted) throw new APIError("INTERNAL", "Failed to delete blog.");
  return deleted;
}

export function blogDiff(
  before: Blog,
  after: Blog,
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  const keys: (keyof Blog)[] = ["title", "slug", "excerpt", "status", "featuredImageUrl"];
  for (const key of keys) {
    if (before[key] !== after[key]) diff[key] = { from: before[key], to: after[key] };
  }
  if (JSON.stringify(before.tags) !== JSON.stringify(after.tags)) {
    diff.tags = { from: before.tags, to: after.tags };
  }
  if (before.content !== after.content) {
    diff.content = { from: "(changed)", to: "(changed)" };
  }
  return diff;
}
