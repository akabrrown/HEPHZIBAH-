import { NextRequest } from "next/server";
import { ProblemError } from "@/lib/errors";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function assertUuid(value: string, label = "ID"): string {
  const trimmed = value.trim();
  if (!UUID_RE.test(trimmed)) {
    throw new ProblemError(
      422,
      "validation_error",
      `Invalid ${label}`,
      `${label} must be a valid UUID.`
    );
  }
  return trimmed;
}

export function assertIsoDate(value: string, label = "date"): string {
  const trimmed = value.trim();
  if (!ISO_DATE_RE.test(trimmed)) {
    throw new ProblemError(
      422,
      "validation_error",
      `Invalid ${label}`,
      `${label} must use YYYY-MM-DD format.`
    );
  }
  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== trimmed) {
    throw new ProblemError(
      422,
      "validation_error",
      `Invalid ${label}`,
      `${label} is not a valid calendar date.`
    );
  }
  return trimmed;
}

export function assertIsoTimestampCursor(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 64 || Number.isNaN(Date.parse(trimmed))) {
    throw new ProblemError(
      422,
      "validation_error",
      "Invalid pagination cursor",
      "Cursor must be a valid ISO-8601 timestamp."
    );
  }
  return trimmed;
}

export async function readJsonBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ProblemError(
      400,
      "invalid_json",
      "Invalid request body",
      "Request body must be valid JSON."
    );
  }
}

export function extractBearerOrQueryToken(req: NextRequest): string {
  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return req.nextUrl.searchParams.get("t")?.trim() ?? "";
}
