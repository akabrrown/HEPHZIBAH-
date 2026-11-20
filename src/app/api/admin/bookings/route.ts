import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { buildCsvDocument } from "@/lib/csv";
import { toProblemResponse } from "@/lib/errors";
import { assertIsoDate, assertIsoTimestampCursor } from "@/lib/http";
import { protectEndpoint } from "@/lib/rate-limit";
import { withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import { bookingStatusValues, type BookingStatus } from "@/modules/booking/schema";
import { listBookingsForAdmin } from "@/modules/booking/service";
import { serviceKindValues, type ServiceKind } from "@/modules/catalog/schema";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("GET", "/api/admin/bookings", async () => {
    try {
      const admin = await requireAdmin("bookings");
      const sp = req.nextUrl.searchParams;
      const q = sp.get("q") ?? undefined;
      if (q && q.trim().length > 0) {
        protectEndpoint(req, {
          keyPrefix: `admin-bookings-search:${admin.adminId}`,
          maxRequests: 30,
          windowMs: 60_000,
          customMessage: "Search rate limit exceeded. Wait a moment before searching again.",
        });
      }

      const statusParam = sp.get("status") ?? undefined;
      const kindParam = sp.get("kind") ?? undefined;
      const status =
        statusParam && bookingStatusValues.includes(statusParam as BookingStatus)
          ? (statusParam as BookingStatus)
          : undefined;
      const kind =
        kindParam && serviceKindValues.includes(kindParam as ServiceKind)
          ? (kindParam as ServiceKind)
          : undefined;

      const fromParam = sp.get("from");
      const toParam = sp.get("to");
      const cursorParam = sp.get("cursor");

      const from = fromParam ? assertIsoDate(fromParam, "from date") : undefined;
      const to = toParam ? assertIsoDate(toParam, "to date") : undefined;
      const cursor = cursorParam ? assertIsoTimestampCursor(cursorParam) : undefined;

      const format = sp.get("format");
      const data = await listBookingsForAdmin(admin, {
        status,
        kind,
        from,
        to,
        q,
        cursor,
        limit: format === "csv" ? 1000 : undefined,
      });

      if (format === "csv") {
        const csv = buildCsvDocument(
          [
            "Reference",
            "Status",
            "Kind",
            "Service",
            "Client Name",
            "Email",
            "Phone",
            "Event Date",
            "Deadline",
            "City",
            "Created At",
          ],
          data.items.map((b) => [
            b.reference,
            b.status,
            b.kind,
            b.service_name ?? b.kind,
            b.client_name,
            b.client_email,
            b.client_phone,
            b.event_date ?? "",
            b.deadline ?? "",
            b.venue_city ?? "",
            b.created_at,
          ])
        );
        return new NextResponse(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="hephzibah-bookings.csv"',
            "Cache-Control": "no-store",
          },
        });
      }

      return NextResponse.json(data, { status: 200, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}
