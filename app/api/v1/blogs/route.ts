import type { NextRequest } from "next/server";
import { created, list, withErrorHandling } from "@/lib/api/response";
import { parseListParams } from "@/lib/api/list-params";
import { requireRole } from "@/lib/api/auth";
import { canManage, isAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { createBlog, listBlogs, type BlogSortField } from "@/lib/data/blogs";
import { blogCreateSchema, blogListFiltersSchema } from "@/lib/schemas/blog";

const SORTABLE = [
  "title",
  "status",
  "createdAt",
  "publishedAt",
] as const satisfies readonly BlogSortField[];

/** GET /api/v1/blogs — admin list (search, filter[status], sort, paginate). */
export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    await requireRole(isAdmin);
    const params = parseListParams(new URL(request.url), {
      sortable: SORTABLE,
      defaultSort: { field: "createdAt", direction: "desc" },
      filters: (raw) =>
        blogListFiltersSchema.parse({ status: raw.status || undefined }),
    });
    const { rows, meta } = await listBlogs(params);
    return list(rows, meta);
  });
}

/** POST /api/v1/blogs — create a post (admin). */
export function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const input = blogCreateSchema.parse(await request.json());
    const row = await createBlog({ ...input, authorId: user.id });

    await recordAudit({
      actorId: user.id,
      action: "blog.create",
      entityType: "blog",
      entityId: row.id,
      diff: { after: { title: row.title, slug: row.slug, status: row.status } },
    });

    return created(row);
  });
}
