import { describe, expect, it } from "vitest";
import { galleryDeliverySchema } from "@/modules/booking/schema";

describe("Gallery Delivery Feature", () => {
  it("validates valid Google Drive or cloud gallery URLs", () => {
    const valid = {
      galleryUrl: "https://drive.google.com/drive/folders/1ABCxyz789",
      galleryPin: "8492",
      galleryNotes: "120 color-graded photos in RAW print resolution and web formats.",
      galleryExpiresAt: "2026-12-31T23:59:59.000Z",
      markCompleted: true,
    };
    const parsed = galleryDeliverySchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.galleryUrl).toBe("https://drive.google.com/drive/folders/1ABCxyz789");
      expect(parsed.data.galleryPin).toBe("8492");
      expect(parsed.data.markCompleted).toBe(true);
    }
  });

  it("allows optional fields and accepts null or empty pin/notes", () => {
    const minimal = {
      galleryUrl: "https://pixieset.com/gallery/hephzibah-wedding-2026",
    };
    const parsed = galleryDeliverySchema.safeParse(minimal);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.galleryPin).toBeUndefined();
      expect(parsed.data.markCompleted).toBe(false);
    }
  });

  it("rejects non-URL strings for galleryUrl", () => {
    const invalid = {
      galleryUrl: "not-a-valid-url",
    };
    const parsed = galleryDeliverySchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects PINs exceeding length limits", () => {
    const invalid = {
      galleryUrl: "https://dropbox.com/sh/abc",
      galleryPin: "A".repeat(70),
    };
    const parsed = galleryDeliverySchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });
});
