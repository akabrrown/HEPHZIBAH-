import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dedupeRequest, hashDedupePayload } from "@/lib/dedupe";
import { toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { protectEndpoint } from "@/lib/rate-limit";
import { withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import {
  createAdminHeroSlide,
  deleteAdminHeroSlide,
  listAdminHeroSlides,
  reorderAdminHeroSlides,
  updateAdminHeroSlide,
} from "@/modules/hero-slides/service";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("GET", "/api/admin/hero-slides", async () => {
    try {
      protectEndpoint(req, {
        keyPrefix: "admin-hero-slides-get:1m",
        maxRequests: 120,
        windowMs: 60_000,
      });

      const admin = await requireAdmin("content");
      const slides = await listAdminHeroSlides(admin);
      return NextResponse.json(
        { slides },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("POST", "/api/admin/hero-slides", async () => {
    try {
      protectEndpoint(req, {
        keyPrefix: "admin-hero-slides-write:1m",
        maxRequests: 30,
        windowMs: 60_000,
      });

      const admin = await requireAdmin("content");
      const body = await readJsonBody(req);
      const slide = await dedupeRequest(
        `hero-slide-create:${admin.adminId}:${hashDedupePayload(body)}`,
        () => createAdminHeroSlide(admin, body)
      );
      return NextResponse.json(slide, {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}

export async function PATCH(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("PATCH", "/api/admin/hero-slides", async () => {
    try {
      protectEndpoint(req, {
        keyPrefix: "admin-hero-slides-write:1m",
        maxRequests: 30,
        windowMs: 60_000,
      });

      const admin = await requireAdmin("content");
      const body = await readJsonBody(req);
      if (
        body &&
        typeof body === "object" &&
        "action" in body &&
        (body as { action?: unknown }).action === "reorder"
      ) {
        const slides = await reorderAdminHeroSlides(admin, body);
        return NextResponse.json(
          { slides },
          { status: 200, headers: { "Cache-Control": "no-store" } }
        );
      }

      const updated = await updateAdminHeroSlide(admin, body);
      return NextResponse.json(updated, {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}

export async function DELETE(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("DELETE", "/api/admin/hero-slides", async () => {
    try {
      protectEndpoint(req, {
        keyPrefix: "admin-hero-slides-write:1m",
        maxRequests: 30,
        windowMs: 60_000,
      });

      const admin = await requireAdmin("content");
      const id = req.nextUrl.searchParams.get("id") ?? "";
      await deleteAdminHeroSlide(admin, id);
      return NextResponse.json(
        { deleted: true },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}
