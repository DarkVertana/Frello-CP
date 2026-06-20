import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

export const auditListFiltersSchema = z.object({
  /** Better Auth user id of the actor. */
  actorId: z.string().min(1).max(64).optional(),
  /** "user", "product", "order", "ticket", etc. */
  entityType: z.string().trim().min(1).max(40).optional(),
  /**
   * Action substring (case-insensitive ILIKE). Lets reviewers narrow to
   * "create", "transition", "refund", etc. without needing a full enum.
   */
  action: z.string().trim().min(1).max(80).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});

export type AuditListFilters = z.infer<typeof auditListFiltersSchema>;
