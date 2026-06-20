import { z } from "zod";

/** Create an API key — only a label is needed; the secret is server-generated. */
export const apiKeyCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
});

export type ApiKeyCreateInput = z.infer<typeof apiKeyCreateSchema>;

/**
 * Public projection of an API key — never includes the hashed secret. This is
 * the shape the list endpoint returns and the UI renders.
 */
export type ApiKeyPublic = {
  id: string;
  name: string;
  prefix: string;
  lastFour: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};
