import { NextRequest, NextResponse } from "next/server";
import { withAnonRole } from "@/lib/db";
import { toProblemResponse } from "@/lib/errors";
import { generateRequestId } from "@/lib/tokens";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    await withAnonRole(async (tx) => {
      await tx.query("select 1 as ok");
    });
    return NextResponse.json(
      { ok: true, timestamp: new Date().toISOString() },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
