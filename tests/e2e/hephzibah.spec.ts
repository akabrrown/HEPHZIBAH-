import crypto from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Hephzibah#2026!Accra";
const OWNER_EMAIL = "owner@hephzibahmedia.com";
const OWNER_TOTP_SECRET = "JBSWY3DPEHPK3PXP";
const CONTENT_EMAIL = "content@hephzibahmedia.com";
const CONTENT_TOTP_SECRET = "KRSXG5CTMVRXEZLU";

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function decodeBase32(secret: string): Buffer {
  const clean = secret.replace(/[\s=]/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32_CHARS.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function generateTotp(secretBase32: string): string {
  const counter = Math.floor(Date.now() / 1000 / 30);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", decodeBase32(secretBase32)).update(counterBuf).digest();
  const offset = (hmac[hmac.length - 1] ?? 0) & 0x0f;
  const binCode =
    (((hmac[offset] ?? 0) & 0x7f) << 24) |
    (((hmac[offset + 1] ?? 0) & 0xff) << 16) |
    (((hmac[offset + 2] ?? 0) & 0xff) << 8) |
    ((hmac[offset + 3] ?? 0) & 0xff);
  return String(binCode % 1_000_000).padStart(6, "0");
}

async function signInAdmin(page: Page, email: string, password: string, totpSecret: string) {
  await page.goto("/admin/sign-in");
  await page.getByLabel(/Email/i).fill(email);
  await page.getByLabel(/Password/i).fill(password);
  await page.getByRole("button", { name: /Continue to authenticator/i }).click();
  await expect(page.getByRole("heading", { name: /Authenticator verification/i })).toBeVisible();
  await page.getByLabel(/6-digit authenticator code/i).fill(generateTotp(totpSecret));
  await page.getByRole("button", { name: /Verify and enter desk/i }).click();
  await page.waitForURL("**/admin");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

test.describe("Hephzibah Media End-to-End Verification", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.sessionStorage.setItem("hm_welcome_splash_seen_v1", "1");
    });
  });

  test("public browsing, URL filter persistence, pricing white band, contact enquiry & 360px overflow guard", async ({
    page,
  }, testInfo) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    if (testInfo.project.name === "mobile") {
      await page.setViewportSize({ width: 360, height: 800 });
    }

    // Home page
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflowHome = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(overflowHome).toBe(false);

    if (testInfo.project.name === "mobile") {
      // Verify Rapperholic-inspired Electric Cyan side navigation drawer
      const menuToggle = page.locator(".rh-lines-button").first();
      await expect(menuToggle).toBeVisible();
      await menuToggle.click();
      const mobileNav = page.locator("#mobile-side-nav");
      await expect(mobileNav).toBeVisible();
      await expect(page.getByRole("dialog", { name: "Studio Navigation" })).toBeVisible();
      await expect(page.getByRole("link", { name: /SERVICES/i })).toBeVisible();
      // Close navigation via close button
      const closeBtn = page.getByRole("button", { name: "Close navigation menu" });
      await expect(closeBtn).toBeVisible();
      await closeBtn.click();
      await expect(mobileNav).not.toBeVisible();
    }

    // Portfolio URL filter persists across full reload
    await page.goto("/portfolio");
    await expect(page.getByRole("heading", { name: "Portfolio" })).toBeVisible();
    await page.getByRole("link", { name: "photography", exact: true }).click();
    await page.waitForURL("**/portfolio?kind=photography");
    await page.reload();
    expect(page.url()).toContain("kind=photography");
    await expect(page.getByRole("heading", { name: "Portfolio" })).toBeVisible();

    // Pricing white band shows GHS packages from DB
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: /Packages and pricing/i })).toBeVisible();
    await expect(page.locator("body")).toContainText("GHS");

    // General contact enquiry submission with privacy consent
    await page.goto("/contact");
    await expect(page.getByRole("heading", { name: /Contact|Reach our studio desk/i }).first()).toBeVisible();
    await page.getByLabel(/Your name/i).fill(`Akua Mensah ${testInfo.project.name}`);
    await page.getByLabel(/Email address/i).fill(`akua-${testInfo.project.name}@example.com`);
    await page.getByLabel(/Phone number/i).fill("024 555 1234");
    await page
      .getByLabel(/Message/i)
      .fill("Hello studio desk, checking portrait availability in Accra next month.");
    await page.locator("#enquiry-consent").check();
    await page.getByRole("button", { name: /Send enquiry/i }).click();
    await expect(page.getByText("Enquiry sent")).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test("complete booking, tokenised status, scoped MFA admin, quote, acceptance, deposit, confirmed calendar & portfolio publish gate", async ({
    page,
    request,
  }, testInfo) => {
    test.setTimeout(90_000);
    const runTag = `${testInfo.project.name}-${Date.now().toString().slice(-5)}`;
    const dayPickIndex = testInfo.project.name === "desktop" ? 0 : 3;

    // 1. Design booking brief flow (no venue/event date)
    await page.goto("/book?kind=design");
    await expect(page.getByRole("heading", { name: /Request a booking/i })).toBeVisible();
    await page.getByRole("button", { name: /Continue to deadline/i }).click();
    await expect(page.locator("#booking-deadline-picker")).toBeVisible();
    await page.getByRole("button", { name: "Next month" }).click();
    const designAvailableCell = page.locator('#booking-deadline-picker button[aria-disabled="false"]').first();
    await designAvailableCell.click();
    await page.getByRole("button", { name: /Continue to details/i }).click();
    await page
      .getByLabel(/Tell us about the job/i)
      .fill(`Programme and poster print artwork for ${runTag} anniversary gala.`);
    await page.getByRole("button", { name: /Continue to contact/i }).click();
    await page.getByLabel(/Full name/i).fill(`Kojo Design ${runTag}`);
    await page.getByLabel(/WhatsApp \/ phone number/i).fill("055 222 8899");
    await page.getByLabel(/Email address/i).fill(`design-${runTag}@example.com`);
    await page.locator("#booking-consent").check();
    await page.getByRole("button", { name: /Send booking request/i }).click();
    await page.waitForURL("**/book/confirmation/HM-*");
    await expect(page.getByRole("heading", { name: /Request received/i })).toBeVisible();

    // Clear sessionStorage so fresh photography draft starts at Frame 1
    await page.evaluate(() => sessionStorage.clear());

    // 2. Full 4-frame photography booking + draft persistence across refresh
    await page.goto("/book");
    await page.getByRole("button", { name: /Photography/i }).first().click();
    const occasionSelect = page.locator("#booking-occasion");
    const firstValidOccasion = await occasionSelect
      .locator('option:not([value=""]):not([value="other"])')
      .first()
      .getAttribute("value");
    if (firstValidOccasion) {
      await occasionSelect.selectOption(firstValidOccasion);
    }
    await page.getByRole("button", { name: /Continue to when and where/i }).click();

    // Advance calendar to open months cleanly without colliding across runs
    await page.getByRole("button", { name: "Next month" }).click();
    await page.getByRole("button", { name: "Next month" }).click();
    if (testInfo.project.name === "mobile") {
      await page.getByRole("button", { name: "Next month" }).click();
    }

    const availableCells = page.locator('#booking-event-date-picker button[aria-disabled="false"]');
    const pickedCell = availableCells.nth(dayPickIndex);
    const pickedIso = await pickedCell.getAttribute("data-iso");
    expect(pickedIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await pickedCell.click();

    await page.getByLabel(/Town or city/i).fill("Accra");
    await page.getByLabel(/Venue or neighbourhood/i).fill("East Legon Ridge Hall");

    // Verify draft survives page reload on Frame 2
    await page.reload();
    await expect(page.getByLabel(/Town or city/i)).toHaveValue("Accra");
    await expect(page.getByLabel(/Venue or neighbourhood/i)).toHaveValue("East Legon Ridge Hall");

    await page.getByRole("button", { name: /Continue to details/i }).click();
    await page
      .getByLabel(/Tell us about the job/i)
      .fill(`Full ceremony and reception coverage for ${runTag} family gathering.`);
    await page.getByRole("button", { name: /Continue to contact/i }).click();

    await page.getByLabel(/Full name/i).fill(`Kofi Boateng ${runTag}`);
    await page.getByLabel(/WhatsApp \/ phone number/i).fill("024 888 7766");
    await page.getByLabel(/Email address/i).fill(`kofi-${runTag}@example.com`);
    await page.locator("#booking-consent").check();
    await page.getByRole("button", { name: /Send booking request/i }).click();

    await page.waitForURL("**/book/confirmation/HM-*");
    await expect(page.getByRole("heading", { name: /Request received/i })).toBeVisible();
    const confirmUrl = page.url();
    const reference = confirmUrl.split("/book/confirmation/")[1]?.split("?")[0] ?? "";
    expect(reference).toMatch(/^HM-/);

    const statusLinkEl = page.getByRole("link", { name: /Open private status page/i });
    const statusUrl = await statusLinkEl.getAttribute("href");
    expect(statusUrl).toContain(`/booking/status/${reference}?t=`);

    // Reloading confirmation hides private details and preserves reference only
    await page.reload();
    await expect(page.getByText(/Check your email inbox for your private booking summary/i)).toBeVisible();

    // 3. Invalid client token denied cleanly without leaking details
    await page.goto(`/booking/status/${reference}?t=wrong-token-value`);
    await expect(page.getByRole("heading", { name: /This status link is not valid/i })).toBeVisible();

    // Valid token opens client status page
    await page.goto(statusUrl!);
    await expect(page.getByText(reference).first()).toBeVisible();
    await expect(page.getByText(`Kofi Boateng ${runTag}`)).toBeVisible();

    // 4. Scoped MFA Admin check: content-only admin is blocked from bookings
    await signInAdmin(page, CONTENT_EMAIL, SEED_ADMIN_PASSWORD, CONTENT_TOTP_SECRET);
    await page.goto("/admin/bookings");
    await expect(page.getByRole("heading", { name: /Permission denied/i })).toBeVisible();
    await page.getByRole("button", { name: /Sign out/i }).click();
    await page.waitForURL("**/admin/sign-in");

    // 5. Owner MFA sign-in, quote build & send
    await signInAdmin(page, OWNER_EMAIL, SEED_ADMIN_PASSWORD, OWNER_TOTP_SECRET);
    await page.goto(`/admin/bookings?q=${encodeURIComponent(reference)}`);
    await page.locator(`a:has-text("${reference}"):visible`).first().click();
    await page.waitForURL("**/admin/bookings/*");
    const adminBookingUrl = page.url();

    await page.getByLabel(/Required deposit \(GHS\)/i).fill("1200");
    await page.getByRole("button", { name: /Send quote to client/i }).click();
    await expect(page.getByText(/STATUS: quoted/i).first()).toBeVisible();

    // 6. Client accepts quote via tokenised status page
    await page.goto(statusUrl!);
    await expect(page.getByRole("button", { name: /Accept this quote/i })).toBeVisible();
    await page.getByRole("button", { name: /Accept this quote/i }).click();
    await expect(page.getByText(/Quote accepted/i).first()).toBeVisible();
    await expect(page.getByText(/Mobile Money:/i).first()).toBeVisible();

    // 7. Admin records MoMo payment & confirms booking
    await page.goto(adminBookingUrl);
    await page.getByLabel(/MoMo \/ Bank reference/i).fill(`MOMO-${runTag}`);
    await page.getByRole("button", { name: /Record payment/i }).click();
    await expect(page.getByText(/Deposit payment recorded/i)).toBeVisible();

    await page.getByRole("button", { name: /Confirm booking/i }).click();
    await expect(page.getByText(/STATUS: confirmed/i).first()).toBeVisible();

    // 8. Confirmed date is now unavailable on /api/availability and disabled on /book
    const availRes = await request.get(`/api/availability?from=${pickedIso}&to=${pickedIso}`);
    expect(availRes.status()).toBe(200);
    const availJson = (await availRes.json()) as { dates: string[] };
    expect(availJson.dates).toContain(pickedIso);

    await page.evaluate(() => sessionStorage.clear());
    await page.goto("/book");
    if (firstValidOccasion) {
      await page.locator("#booking-occasion").selectOption(firstValidOccasion);
    }
    await page.getByRole("button", { name: /Continue to when and where/i }).click();
    await page.getByRole("button", { name: "Next month" }).click();
    await page.getByRole("button", { name: "Next month" }).click();
    if (testInfo.project.name === "mobile") {
      await page.getByRole("button", { name: "Next month" }).click();
    }
    const disabledBookedCell = page.locator(`#booking-event-date-picker button[data-iso="${pickedIso}"]`);
    await expect(disabledBookedCell).toHaveAttribute("aria-disabled", "true");

    // 9. Portfolio consent & alt-text publish gate
    const draftSlug = `e2e-identity-${runTag}`.toLowerCase();
    await page.goto("/admin/portfolio");
    await page.getByRole("button", { name: /New portfolio draft/i }).click();
    await page.locator("#new-pf-kind").selectOption("design");
    await page.locator("#new-pf-title").fill(`Identity Suite ${runTag}`);
    await page.locator("#new-pf-slug").fill(draftSlug);
    await page.getByRole("button", { name: /Create draft & add media/i }).click();
    await page.waitForURL("**/admin/portfolio/*");

    const publishBtn = page.getByRole("button", { name: /Publish item/i });
    await expect(publishBtn).toBeDisabled();

    // Add studio image frame with descriptive alt text
    await page.locator("#img-preset").selectOption("local/design-identity-cover");
    await page.locator("#img-alt").fill("Monochrome brand identity stationery and embossed folders");
    await page.getByRole("button", { name: /Add image frame/i }).click();
    await expect(page.getByText(/Image frame added to gallery/i)).toBeVisible();

    // Still disabled without consent checkbox
    await expect(publishBtn).toBeDisabled();

    // Tick written client consent -> Publish enables
    await page.locator("#pf-client-consent").check();
    await expect(publishBtn).toBeEnabled();
    await publishBtn.click();
    await expect(page.getByText(/Portfolio item published to live showcase/i)).toBeVisible();

    // Live public portfolio detail page now renders
    await page.goto(`/portfolio/${draftSlug}`);
    await expect(page.getByRole("heading", { name: `Identity Suite ${runTag}` })).toBeVisible();
  });
});
