import { NextRequest, NextResponse } from "next/server";
import { toProblemResponse } from "@/lib/errors";
import { generateRequestId } from "@/lib/tokens";
import { getPublicUnavailableDates } from "@/modules/booking/service";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const from = req.nextUrl.searchParams.get("from") ?? undefined;
    const to = req.nextUrl.searchParams.get("to") ?? undefined;
    const data = await getPublicUnavailableDates(from, to);
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
