import { NextRequest } from "next/server";
import { ProblemError } from "@/lib/errors";

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
