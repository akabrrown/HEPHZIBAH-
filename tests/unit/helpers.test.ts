import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  buildWhatsAppUrl,
  getAccraTodayIso,
  normalizeGhanaPhone,
} from "@/lib/dates";
import { formatGhsFromMinor, toMinorUnits } from "@/lib/money";
import {
  generateAccessToken,
  generateBookingReference,
  hashAccessToken,
  safeCompare,
} from "@/lib/tokens";
import { generateTotpCode, verifyTotpCode } from "@/lib/auth";
import { canTransitionBooking } from "@/modules/booking/schema";
import { sanitizeCsvCell } from "@/lib/csv";

describe("money helpers", () => {
  it("formats whole and fractional GHS values from integer pesewas", () => {
    expect(formatGhsFromMinor(150000)).toBe("GHS 1,500");
    expect(formatGhsFromMinor(150050)).toBe("GHS 1,500.50");
    expect(toMinorUnits(250.75)).toBe(25075);
  });
});

describe("date and Ghana phone helpers", () => {
  it("normalizes Ghanaian phone numbers into E.164 format", () => {
    expect(normalizeGhanaPhone("024 123 4567")).toBe("+233241234567");
    expect(normalizeGhanaPhone("233241234567")).toBe("+233241234567");
    expect(normalizeGhanaPhone("+233209876543")).toBe("+233209876543");
    expect(normalizeGhanaPhone("123")).toBeNull();
  });

  it("computes Accra ISO dates and WhatsApp click-to-chat URLs", () => {
    const today = getAccraTodayIso(new Date("2026-11-17T22:00:00Z"));
    expect(today).toBe("2026-11-17");
    expect(addDaysIso(today, 3)).toBe("2026-11-20");
    expect(buildWhatsAppUrl("+233240000000", "Hello HM-2611-K7P4D")).toBe(
      "https://wa.me/233240000000?text=Hello%20HM-2611-K7P4D"
    );
  });
});

describe("tokens and TOTP verification", () => {
  it("generates booking references matching the database regex", () => {
    for (let i = 0; i < 20; i++) {
      const ref = generateBookingReference(new Date("2026-11-17T08:00:00Z"));
      expect(ref).toMatch(/^HM-2611-[A-Z2-9]{5}$/);
    }
  });

  it("hashes access tokens consistently and compares timing-safely", () => {
    const token = generateAccessToken();
    expect(token).toHaveLength(64);
    const hashA = hashAccessToken(token);
    const hashB = hashAccessToken(token);
    expect(safeCompare(hashA, hashB)).toBe(true);
    expect(safeCompare(hashA, hashAccessToken("wrong-token"))).toBe(false);
  });

  it("validates RFC 6238 TOTP codes across drift tolerance", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const now = 1763360000000;
    const code = generateTotpCode(secret, now);
    expect(code).toMatch(/^\d{6}$/);
    expect(verifyTotpCode(secret, code, now)).toBe(true);
    expect(verifyTotpCode(secret, code, now + 29_000)).toBe(true);
    expect(verifyTotpCode(secret, "000000", now)).toBe(false);
  });
});

describe("state machine and CSV injection guards", () => {
  it("matches database booking transition rules", () => {
    expect(canTransitionBooking("new", "reviewing")).toBe(true);
    expect(canTransitionBooking("quoted", "accepted")).toBe(true);
    expect(canTransitionBooking("quoted", "completed")).toBe(false);
    expect(canTransitionBooking("new", "confirmed")).toBe(false);
    expect(canTransitionBooking("expired", "reviewing")).toBe(true);
  });

  it("neutralizes spreadsheet formula prefixes in CSV cells", () => {
    expect(sanitizeCsvCell("=cmd|' /C calc'!A0")).toBe('"\'=cmd|\' /C calc\'!A0"');
    expect(sanitizeCsvCell("+233240000000")).toBe('"\'+233240000000"');
    expect(sanitizeCsvCell("Normal Venue")).toBe('"Normal Venue"');
  });
});
