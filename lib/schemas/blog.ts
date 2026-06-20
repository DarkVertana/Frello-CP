import { z } from "zod";
import { slugSchema, slugify } from "./category";

export const blogStatusEnum = z.enum(["draft", "published"]);
export type BlogStatus = z.infer<typeof blogStatusEnum>;

const tag = z.string().trim().min(1).max(40);

export const blogCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  slug: slugSchema,
  excerpt: z.string().trim().max(300).optional().or(z.literal("")),
  /** Rich HTML body (authored in the editor). Not trimmed — whitespace matters. */
  content: z.string().max(200_000).default(""),
  featuredImageUrl: z
    .union([z.literal(""), z.url("Add a valid image URL.")])
    .optional(),
  tags: z.array(tag).max(20, "Up to 20 tags.").default([]),
  status: blogStatusEnum.default("draft"),
});

export const blogUpdateSchema = blogCreateSchema.partial();

export const blogListFiltersSchema = z.object({
  status: blogStatusEnum.optional(),
});

export type BlogCreateInput = z.infer<typeof blogCreateSchema>;
export type BlogUpdateInput = z.infer<typeof blogUpdateSchema>;
export type BlogListFilters = z.infer<typeof blogListFiltersSchema>;

export { slugify };
