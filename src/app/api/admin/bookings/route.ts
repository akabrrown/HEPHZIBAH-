import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { buildCsvDocument } from "@/lib/csv";
import { toProblemResponse } from "@/lib/errors";
import { generateRequestId } from "@/lib/tokens";
import { bookingStatusValues, type BookingStatus } from "@/modules/booking/schema";
import { listBookingsForAdmin } from "@/modules/booking/service";
import { serviceKindValues, type ServiceKind } from "@/modules/catalog/schema";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("bookings");
    const sp = req.nextUrl.searchParams;
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

    const format = sp.get("format");
    const data = await listBookingsForAdmin(admin, {
      status,
      kind,
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
      q: sp.get("q") ?? undefined,
      cursor: sp.get("cursor") ?? undefined,
      limit: format === "csv" ? 100 : undefined,
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
}
