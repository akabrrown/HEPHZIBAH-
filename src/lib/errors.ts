import { NextResponse } from "next/server";

export type FieldErrors = Record<string, string[]>;

export class ProblemError extends Error {
  readonly status: number;
  readonly code: string;
  readonly title: string;
  readonly detail: string;
  readonly fieldErrors?: FieldErrors;
  readonly headers?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    title: string,
    detail: string,
    options?: { fieldErrors?: FieldErrors; headers?: Record<string, string> }
  ) {
    super(detail);
    this.name = "ProblemError";
    this.status = status;
    this.code = code;
    this.title = title;
    this.detail = detail;
    this.fieldErrors = options?.fieldErrors;
    this.headers = options?.headers;
  }
}

export function toProblemResponse(
  err: unknown,
  instance: string,
  requestId: string
): NextResponse {
  if (err instanceof ProblemError) {
    return NextResponse.json(
      {
        type: `https://hephzibahmedia.com/problems/${err.code.replace(/_/g, "-")}`,
        title: err.title,
        status: err.status,
        code: err.code,
        detail: err.detail,
        instance,
        requestId,
        ...(err.fieldErrors ? { fieldErrors: err.fieldErrors } : {}),
      },
      {
        status: err.status,
        headers: {
          "Content-Type": "application/problem+json",
          "Cache-Control": "no-store",
          ...(err.headers ?? {}),
        },
      }
    );
  }

  console.error(
    JSON.stringify({
      level: "error",
      requestId,
      instance,
      message: err instanceof Error ? err.message : "Unknown internal error",
    })
  );

  return NextResponse.json(
    {
      type: "https://hephzibahmedia.com/problems/internal-error",
      title: "Something went wrong on our side",
      status: 500,
      code: "internal_error",
      detail: "Please try again or message us on WhatsApp with your reference.",
      instance,
      requestId,
    },
    {
      status: 500,
      headers: {
        "Content-Type": "application/problem+json",
        "Cache-Control": "no-store",
      },
    }
  );
}

/**
 * Translates common PostgreSQL integrity error codes into structured 4xx ProblemError
 * responses instead of letting them bubble as generic 500 Internal Server Errors.
 */
export function rethrowKnownPgError(
  err: unknown,
  messages: {
    uniqueConflict?: string;
    foreignKey?: string;
    invalidSyntax?: string;
  } = {}
): never {
  if (err instanceof ProblemError) {
    throw err;
  }
  const pgErr = err as { code?: string; detail?: string } | null;
  const code = pgErr?.code;
  if (code === "23505") {
    throw new ProblemError(
      409,
      "conflict",
      "Duplicate record",
      messages.uniqueConflict ?? "A record with this unique identifier or reference already exists."
    );
  }
  if (code === "23503") {
    throw new ProblemError(
      409,
      "in_use",
      "Record is referenced elsewhere",
      messages.foreignKey ?? "This action cannot be completed because another record depends on it."
    );
  }
  if (code === "22P02" || code === "22007") {
    throw new ProblemError(
      422,
      "validation_error",
      "Invalid identifier or date",
      messages.invalidSyntax ?? "One of the provided IDs or date values has an invalid format."
    );
  }
  throw err;
}
