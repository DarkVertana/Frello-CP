import type { NextRequest } from "next/server";
import { list, created, withErrorHandling } from "@/lib/api/response";
import { parseListParams } from "@/lib/api/list-params";
import { requireRole, requireSession } from "@/lib/api/auth";
import { canManage } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import {
  type CategorySortField,
  createCategory,
  listCategories,
} from "@/lib/data/categories";
import { categoryCreateSchema } from "@/lib/schemas/category";

const SORTABLE = ["name", "order", "createdAt", "updatedAt"] as const satisfies readonly CategorySortField[];

/**
 * GET /api/v1/categories
 *
 *   ?page=1&perPage=20&search=&sort=order|-createdAt
 *
 * Open to any signed-in user (the mobile app's shop tab reads it too); writes
 * are gated to managers below.
 */
export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    // Mobile customers and admin staff both read this list. requireSession
    // rejects unauthenticated traffic; admin-only routes use requireRole.
    await requireSession();

    const params = parseListParams(new URL(request.url), {
      sortable: SORTABLE,
      defaultSort: { field: "order", direction: "asc" },
    });
    const { rows, meta } = await listCategories(params);
    return list(rows, meta);
  });
}

/**
 * POST /api/v1/categories — managers/super admins only.
 */
export function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const { user } = await requireRole(canManage);
    const input = categoryCreateSchema.parse(await request.json());
    const row = await createCategory(input);

    await recordAudit({
      actorId: user.id,
      action: "category.create",
      entityType: "category",
      entityId: row.id,
      diff: { after: { name: row.name, slug: row.slug, icon: row.icon } },
    });

    return created(row);
  });
}
