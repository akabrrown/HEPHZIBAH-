"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  FormField,
  INPUT_CLASSES,
  SELECT_CLASSES,
  TEXTAREA_CLASSES,
} from "@/components/ui/form-field";
import { ShotCaption } from "@/components/ui/viewfinder";
import { formatAccraDateTime } from "@/lib/dates";
import type { SiteSettings } from "@/modules/catalog/schema";
import {
  legalSlugValues,
  type LegalDocumentRecord,
  type LegalSlug,
} from "@/modules/content-legal/schema";

function readErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const obj = data as { detail?: string; title?: string };
    return obj.detail ?? obj.title ?? fallback;
  }
  return fallback;
}

export function SettingsClient({
  initialSettings,
  initialLegalDocs,
}: {
  initialSettings: SiteSettings;
  initialLegalDocs: LegalDocumentRecord[];
}) {
  const router = useRouter();

  const [businessName, setBusinessName] = useState(initialSettings.business_name);
  const [contactEmail, setContactEmail] = useState(initialSettings.contact_email);
  const [whatsappE164, setWhatsappE164] = useState(initialSettings.whatsapp_e164);
  const [phoneE164, setPhoneE164] = useState(initialSettings.phone_e164 ?? "");
  const [addressText, setAddressText] = useState(initialSettings.address_text ?? "");
  const [instagram, setInstagram] = useState(initialSettings.social?.instagram ?? "");
  const [tiktok, setTiktok] = useState(initialSettings.social?.tiktok ?? "");
  const [youtube, setYoutube] = useState(initialSettings.social?.youtube ?? "");
  const [momoNumber, setMomoNumber] = useState(initialSettings.social?.momo_number ?? "");
  const [bankDetails, setBankDetails] = useState(initialSettings.social?.bank_details ?? "");
  const [minLeadDays, setMinLeadDays] = useState(String(initialSettings.min_lead_days));
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(String(initialSettings.max_advance_days));
  const [quoteValidityDays, setQuoteValidityDays] = useState(
    String(initialSettings.quote_validity_days)
  );
  const [budgetBandsText, setBudgetBandsText] = useState(
    (initialSettings.budget_bands ?? []).join("\n")
  );
  const [savingSettings, setSavingSettings] = useState(false);

  // Legal docs
  const [legalDocs, setLegalDocs] = useState(initialLegalDocs);
  const [legalSlug, setLegalSlug] = useState<LegalSlug>("booking-policy");
  const [legalVersion, setLegalVersion] = useState("");
  const [legalTitle, setLegalTitle] = useState("");
  const [legalBody, setLegalBody] = useState("");
  const [legalEffectiveDate, setLegalEffectiveDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [legalSummary, setLegalSummary] = useState("");
  const [savingLegal, setSavingLegal] = useState(false);

  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName.trim(),
          contact_email: contactEmail.trim(),
          whatsapp_e164: whatsappE164.trim(),
          phone_e164: phoneE164.trim() || null,
          address_text: addressText.trim() || null,
          social: {
            instagram: instagram.trim() || undefined,
            tiktok: tiktok.trim() || undefined,
            youtube: youtube.trim() || undefined,
            momo_number: momoNumber.trim() || undefined,
            bank_details: bankDetails.trim() || undefined,
          },
          min_lead_days: Number(minLeadDays),
          max_advance_days: Number(maxAdvanceDays),
          quote_validity_days: Number(quoteValidityDays),
          budget_bands: budgetBandsText
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ kind: "err", text: readErrorMessage(data, "Could not update studio settings.") });
        return;
      }
      router.refresh();
      setBanner({ kind: "ok", text: "Studio settings saved." });
    } catch {
      setBanner({ kind: "err", text: "Network error saving settings." });
    } finally {
      setSavingSettings(false);
    }
  }

  async function handlePublishLegal(e: React.FormEvent) {
    e.preventDefault();
    setSavingLegal(true);
    setBanner(null);
    try {
      const effectiveAtIso = `${legalEffectiveDate}T00:00:00Z`;
      const res = await fetch("/api/admin/legal-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: legalSlug,
          version: legalVersion.trim(),
          title: legalTitle.trim(),
          body_md: legalBody.trim(),
          effective_at: effectiveAtIso,
          summary_of_changes: legalSummary.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ kind: "err", text: readErrorMessage(data, "Could not publish legal document.") });
        return;
      }
      const listRes = await fetch("/api/admin/legal-documents", { cache: "no-store" });
      if (listRes.ok) {
        const listData = (await listRes.json()) as { documents: LegalDocumentRecord[] };
        setLegalDocs(listData.documents);
      }
      setLegalVersion("");
      setLegalTitle("");
      setLegalBody("");
      setLegalSummary("");
      router.refresh();
      setBanner({ kind: "ok", text: "New legal document version published." });
    } catch {
      setBanner({ kind: "err", text: "Network error publishing legal document." });
    } finally {
      setSavingLegal(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <ShotCaption parts={["SETTINGS DESK", "OPERATIONS & LEGAL VERSIONS"]} />
        <h1 className="mt-2 font-display text-3xl font-extrabold">Studio settings &amp; legal notices</h1>
        <p className="mt-1 text-sm text-[var(--grey)]">
          Configure booking lead-time rules, Mobile Money &amp; bank transfer instructions, and publish versioned legal documents.
        </p>
      </div>

      {banner && (
        <div
          role={banner.kind === "err" ? "alert" : "status"}
          className={`border p-4 text-sm ${
            banner.kind === "err"
              ? "border-[var(--red)] bg-[var(--ink-2)] text-[var(--red)]"
              : "border-[var(--cyan)] bg-[var(--ink-2)] text-[var(--cyan)]"
          }`}
        >
          {banner.text}
        </div>
      )}

      <form
        onSubmit={handleSaveSettings}
        className="space-y-6 border border-[var(--hairline)] bg-[var(--ink-2)] p-6"
      >
        <h2 className="font-display text-xl font-bold">Studio profile &amp; booking rules</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Business name" id="set-biz" required>
            <input
              id="set-biz"
              type="text"
              required
              className={INPUT_CLASSES}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </FormField>

          <FormField label="Studio contact email" id="set-email" required>
            <input
              id="set-email"
              type="email"
              required
              className={INPUT_CLASSES}
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </FormField>

          <FormField label="WhatsApp (E.164)" id="set-wa" required>
            <input
              id="set-wa"
              type="tel"
              required
              className={`${INPUT_CLASSES} font-mono-meta`}
              value={whatsappE164}
              onChange={(e) => setWhatsappE164(e.target.value)}
            />
          </FormField>

          <FormField label="Voice phone (E.164)" id="set-phone">
            <input
              id="set-phone"
              type="tel"
              className={`${INPUT_CLASSES} font-mono-meta`}
              value={phoneE164}
              onChange={(e) => setPhoneE164(e.target.value)}
            />
          </FormField>

          <FormField label="Studio address" id="set-addr">
            <input
              id="set-addr"
              type="text"
              className={INPUT_CLASSES}
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
            />
          </FormField>

          <FormField label="Instagram URL or handle" id="set-ig">
            <input
              id="set-ig"
              type="text"
              className={INPUT_CLASSES}
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
            />
          </FormField>

          <FormField label="TikTok URL or handle" id="set-tt">
            <input
              id="set-tt"
              type="text"
              className={INPUT_CLASSES}
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
            />
          </FormField>

          <FormField label="YouTube channel URL" id="set-yt">
            <input
              id="set-yt"
              type="text"
              className={INPUT_CLASSES}
              value={youtube}
              onChange={(e) => setYoutube(e.target.value)}
            />
          </FormField>

          <FormField label="MTN MoMo / merchant instructions" id="set-momo">
            <input
              id="set-momo"
              type="text"
              className={INPUT_CLASSES}
              value={momoNumber}
              onChange={(e) => setMomoNumber(e.target.value)}
            />
          </FormField>
        </div>

        <FormField label="Bank transfer instructions" id="set-bank">
          <input
            id="set-bank"
            type="text"
            className={INPUT_CLASSES}
            value={bankDetails}
            onChange={(e) => setBankDetails(e.target.value)}
          />
        </FormField>

        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="Minimum lead days" id="set-lead" required>
            <input
              id="set-lead"
              type="number"
              required
              min={0}
              max={90}
              className={INPUT_CLASSES}
              value={minLeadDays}
              onChange={(e) => setMinLeadDays(e.target.value)}
            />
          </FormField>

          <FormField label="Max advance booking (days)" id="set-max" required>
            <input
              id="set-max"
              type="number"
              required
              min={7}
              max={1095}
              className={INPUT_CLASSES}
              value={maxAdvanceDays}
              onChange={(e) => setMaxAdvanceDays(e.target.value)}
            />
          </FormField>

          <FormField label="Quote validity (days)" id="set-val" required>
            <input
              id="set-val"
              type="number"
              required
              min={1}
              max={90}
              className={INPUT_CLASSES}
              value={quoteValidityDays}
              onChange={(e) => setQuoteValidityDays(e.target.value)}
            />
          </FormField>
        </div>

        <FormField
          label="Booking wizard budget bands (one per line)"
          id="set-bands"
        >
          <textarea
            id="set-bands"
            rows={4}
            className={TEXTAREA_CLASSES}
            value={budgetBandsText}
            onChange={(e) => setBudgetBandsText(e.target.value)}
          />
        </FormField>

        <Button type="submit" variant="primary" disabled={savingSettings}>
          {savingSettings ? "Saving settings..." : "Save studio settings"}
        </Button>
      </form>

      {/* Versioned Legal Documents */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <form
          onSubmit={handlePublishLegal}
          className="space-y-4 border border-[var(--hairline)] bg-[var(--ink-2)] p-6 self-start"
        >
          <h2 className="font-display text-xl font-bold">Publish new legal document version</h2>
          <p className="text-xs text-[var(--grey)]">
            Publishing a new version creates an immutable record; prior booking &amp; enquiry consent versions remain verifiable.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Document" id="leg-slug" required>
              <select
                id="leg-slug"
                className={SELECT_CLASSES}
                value={legalSlug}
                onChange={(e) => setLegalSlug(e.target.value as LegalSlug)}
              >
                {legalSlugValues.map((slug) => (
                  <option key={slug} value={slug}>
                    /{slug}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Version tag" id="leg-ver" required>
              <input
                id="leg-ver"
                type="text"
                required
                className={`${INPUT_CLASSES} font-mono-meta`}
                value={legalVersion}
                onChange={(e) => setLegalVersion(e.target.value)}
                placeholder="1.1"
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Document title" id="leg-title" required>
              <input
                id="leg-title"
                type="text"
                required
                className={INPUT_CLASSES}
                value={legalTitle}
                onChange={(e) => setLegalTitle(e.target.value)}
                placeholder="Booking & Deposit Policy"
              />
            </FormField>

            <FormField label="Effective date (UTC)" id="leg-date" required>
              <input
                id="leg-date"
                type="date"
                required
                className={INPUT_CLASSES}
                value={legalEffectiveDate}
                onChange={(e) => setLegalEffectiveDate(e.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Summary of changes" id="leg-sum">
            <input
              id="leg-sum"
              type="text"
              className={INPUT_CLASSES}
              value={legalSummary}
              onChange={(e) => setLegalSummary(e.target.value)}
              placeholder="Updated reschedule notice window"
            />
          </FormField>

          <FormField label="Markdown / plain policy text" id="leg-body" required>
            <textarea
              id="leg-body"
              required
              minLength={30}
              rows={8}
              className={`${TEXTAREA_CLASSES} font-mono-meta text-xs`}
              value={legalBody}
              onChange={(e) => setLegalBody(e.target.value)}
            />
          </FormField>

          <Button type="submit" variant="secondary" disabled={savingLegal}>
            {savingLegal ? "Publishing version..." : "Publish legal version"}
          </Button>
        </form>

        <div className="space-y-3">
          <h2 className="font-display text-xl font-bold">Published versions history ({legalDocs.length})</h2>
          {legalDocs.map((doc) => (
            <article
              key={doc.id}
              className="space-y-2 border border-[var(--hairline)] bg-[var(--ink-2)] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono-meta text-xs">
                <span className="text-[var(--cyan)]">
                  /{doc.slug} · v{doc.version}
                </span>
                <span className="text-[var(--grey)]">
                  Effective {formatAccraDateTime(doc.effective_at)}
                </span>
              </div>
              <h3 className="font-display text-base font-bold">{doc.title}</h3>
              {doc.summary_of_changes && (
                <p className="text-xs text-[var(--grey)]">{doc.summary_of_changes}</p>
              )}
              <button
                type="button"
                onClick={() => {
                  setLegalSlug(doc.slug);
                  setLegalTitle(doc.title);
                  setLegalBody(doc.body_md);
                  setLegalVersion(`${doc.version}.1`);
                }}
                className="min-h-[44px] text-xs text-[var(--cyan)] underline underline-offset-4 cursor-pointer"
              >
                Load into editor as new draft
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
