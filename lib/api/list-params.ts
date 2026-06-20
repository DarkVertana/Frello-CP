import { z } from "zod";

/**
 * Parses the standard Plant+ list query — `page`, `perPage`, `search`, `sort`,
 * `filter[<key>]=value` — into a clean shape per-resource code can consume.
 *
 * `sort` accepts a single field optionally prefixed with `-` for descending:
 *   ?sort=name        → { field: "name", direction: "asc" }
 *   ?sort=-createdAt  → { field: "createdAt", direction: "desc" }
 *
 * Each resource passes a `sortable` set of allowed columns; unknown values
 * fall back to `defaultSort`.
 */

const baseSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(200).optional(),
});

export type SortDirection = "asc" | "desc";

export type ParsedListParams<TSortField extends string, TFilters> = {
  page: number;
  perPage: number;
  search?: string;
  sort: { field: TSortField; direction: SortDirection };
  filters: TFilters;
};

type ParseOptions<TSortField extends string, TFilters> = {
  sortable: readonly TSortField[];
  defaultSort: { field: TSortField; direction: SortDirection };
  filters?: (raw: Record<string, string>) => TFilters;
};

export function parseListParams<
  TSortField extends string,
  TFilters = Record<string, never>,
>(
  url: URL,
  options: ParseOptions<TSortField, TFilters>,
): ParsedListParams<TSortField, TFilters> {
  const params = url.searchParams;

  const base = baseSchema.parse({
    page: params.get("page") ?? undefined,
    perPage: params.get("perPage") ?? undefined,
    search: params.get("search") ?? undefined,
  });

  const rawSort = params.get("sort") ?? "";
  const direction: SortDirection = rawSort.startsWith("-") ? "desc" : "asc";
  const field = (rawSort.replace(/^-/, "") || options.defaultSort.field) as TSortField;
  const sort = (options.sortable as readonly string[]).includes(field)
    ? { field, direction }
    : options.defaultSort;

  // filter[<key>]=<value> → { <key>: <value> }
  const rawFilters: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    const match = /^filter\[(.+)\]$/.exec(key);
    if (match) rawFilters[match[1]!] = value;
  }
  const filters = (options.filters?.(rawFilters) ?? ({} as TFilters)) as TFilters;

  return {
    page: base.page,
    perPage: base.perPage,
    search: base.search,
    sort,
    filters,
  };
}
