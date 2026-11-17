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
      },
    }
  );
}
