import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { ProblemError, toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { protectEndpoint } from "@/lib/rate-limit";
import { withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";

const uploadSignSchema = z.object({
  folder: z
    .string()
    .trim()
    .regex(/^hephzibah\/[a-z0-9/_-]{1,60}$/i, "Upload folder must start with hephzibah/.")
    .default("hephzibah/portfolio"),
});

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("POST", "/api/admin/uploads/sign", async () => {
    try {
      protectEndpoint(req, {
        keyPrefix: "upload-sign:5m",
        maxRequests: 30,
        windowMs: 5 * 60_000,
        customMessage: "Upload signature rate limit reached. Please wait a few moments.",
      });

      await requireAdmin("content");
      const rawBody = await readJsonBody(req).catch(() => ({}));
      const parsed = uploadSignSchema.safeParse(rawBody);
      if (!parsed.success) {
        throw new ProblemError(
          422,
          "validation_error",
          "Invalid upload folder",
          "Upload folder must be inside hephzibah/."
        );
      }

      const env = getServerEnv();
      const folder = parsed.data.folder;

      if (!env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET || !env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
        throw new ProblemError(
          503,
          "upload_not_configured",
          "Cloudinary upload keys not configured",
          "Add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET or use a studio asset path."
        );
      }

      const allowedFormats = ["jpg", "jpeg", "png", "webp", "avif"];
      const allowedFormatsParam = allowedFormats.join(",");
      const timestamp = Math.floor(Date.now() / 1000);
      const paramsToSign = `allowed_formats=${allowedFormatsParam}&folder=${folder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`;
      const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

      return NextResponse.json(
        {
          signature,
          timestamp,
          folder,
          cloudName: env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
          apiKey: env.CLOUDINARY_API_KEY,
          presetName: env.CLOUDINARY_UPLOAD_PRESET || "Heph.Photo",
          maxFileSizeBytes: 15 * 1024 * 1024,
          allowedFormats,
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}
