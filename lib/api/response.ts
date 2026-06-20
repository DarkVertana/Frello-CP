import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Plant+ REST envelope helpers.
 *
 * Success: { data, meta? }
 * Error:   { error: { code, message, fields? } }
 *
 * Use these from every /api/v1/* handler so the mobile app sees a
 * consistent shape it can codegen against (see /api/openapi.json plan).
 */

export type ApiErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BAD_REQUEST"
  | "INTERNAL";

export type ListMeta = {
  page: number;
  perPage: number;
  total: number;
};

const codeToStatus: Record<ApiErrorCode, number> = {
  VALIDATION: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  BAD_REQUEST: 400,
  INTERNAL: 500,
};

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function list<T>(data: T[], meta: ListMeta) {
  return NextResponse.json({ data, meta });
}

export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function err(
  code: ApiErrorCode,
  message: string,
  options?: { fields?: Record<string, string>; status?: number },
) {
  return NextResponse.json(
    {
      error: { code, message, ...(options?.fields ? { fields: options.fields } : {}) },
    },
    { status: options?.status ?? codeToStatus[code] },
  );
}

/** Convert a ZodError into the Plant+ VALIDATION envelope shape. */
export function fromZodError(error: ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    // Only keep the first error per field — UI shows one message per input.
    if (!fields[path]) fields[path] = issue.message;
  }
  return err("VALIDATION", "Validation failed.", { fields });
}

/**
 * Wraps a route handler so any thrown ZodError or APIError surfaces as the
 * canonical Plant+ error envelope, and other errors become INTERNAL 500s.
 */
export class APIError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export async function withErrorHandling<T extends Response>(
  fn: () => Promise<T>,
): Promise<T | NextResponse> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ZodError) return fromZodError(error);
    if (error instanceof APIError) {
      return err(error.code, error.message, { fields: error.fields });
    }
    console.error("[api] unhandled error:", error);
    return err("INTERNAL", "Something went wrong on our end.");
  }
}
