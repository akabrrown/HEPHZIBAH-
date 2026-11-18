import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { ProblemError, toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { protectEndpoint } from "@/lib/rate-limit";
import { recordApiRequest } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";

export async function POST(req: NextRequest) {
  const start = performance.now();
  const requestId = generateRequestId();
  try {
    protectEndpoint(req, {
      keyPrefix: "upload-sign:5m",
      maxRequests: 30,
      windowMs: 5 * 60_000,
      customMessage: "Upload signature rate limit reached. Please wait a few moments.",
    });

    await requireAdmin("content");
    const body = (await readJsonBody(req).catch(() => ({}))) as { folder?: string };
    const env = getServerEnv();
    const folder = (body.folder ?? "hephzibah/portfolio").replace(/[^a-zA-Z0-9/_-]/g, "");

    if (!env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET || !env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
      throw new ProblemError(
        503,
        "upload_not_configured",
        "Cloudinary upload keys not configured",
        "Add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET or use a studio asset path."
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

    recordApiRequest("POST", "/api/admin/uploads/sign", performance.now() - start);

    return NextResponse.json(
      {
        signature,
        timestamp,
        folder,
        cloudName: env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        apiKey: env.CLOUDINARY_API_KEY,
        presetName: env.CLOUDINARY_UPLOAD_PRESET || "Heph.Photo",
        maxFileSizeBytes: 15 * 1024 * 1024,
        allowedFormats: ["jpg", "jpeg", "png", "webp", "avif"],
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    recordApiRequest("POST", "/api/admin/uploads/sign", performance.now() - start);
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
