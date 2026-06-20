import type { NextRequest } from "next/server";
import { APIError, noContent, ok, withErrorHandling } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { canManage, isAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { blogDiff, deleteBlog, getBlogById, updateBlog } from "@/lib/data/blogs";
import { blogUpdateSchema } from "@/lib/schemas/blog";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/v1/blogs/[id] — a single post incl. drafts (admin). */
export function GET(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    await requireRole(isAdmin);
    const { id } = await context.params;
    const row = await getBlogById(id);
    if (!row) throw new APIError("NOT_FOUND", "Blog not found.");
    return ok(row);
  });
}

/** PATCH /api/v1/blogs/[id] — edit a post (admin). */
export function PATCH(request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const { id } = await context.params;
    const patch = blogUpdateSchema.parse(await request.json());
    const { before, after } = await updateBlog(id, patch);

    await recordAudit({
      actorId: user.id,
      action: "blog.update",
      entityType: "blog",
      entityId: id,
      diff: blogDiff(before, after),
    });

    return ok(after);
  });
}

/** DELETE /api/v1/blogs/[id] — remove a post (admin). */
export function DELETE(_request: NextRequest, context: RouteContext) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const { id } = await context.params;
    const deleted = await deleteBlog(id);

    await recordAudit({
      actorId: user.id,
      action: "blog.delete",
      entityType: "blog",
      entityId: id,
      diff: { before: { title: deleted.title, slug: deleted.slug } },
    });

    return noContent();
  });
}
