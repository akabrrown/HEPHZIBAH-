"use client";

import { AlertCircle, ArrowLeft, ArrowRight, Check, MessageCircle, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  FormField,
  INPUT_CLASSES,
  SELECT_CLASSES,
  TEXTAREA_CLASSES,
} from "@/components/ui/form-field";
import { FramingCorners, ShotCaption } from "@/components/ui/viewfinder";
import {
  addDaysIso,
  buildWhatsAppUrl,
  getAccraTodayIso,
  getEarliestSelectableDate,
  getLatestSelectableDate,
  normalizeGhanaPhone,
} from "@/lib/dates";
import { formatGhsFromMinor } from "@/lib/money";
import type { Occasion, PackageItem, Service, ServiceKind, SiteSettings } from "@/modules/catalog/schema";
import { contactMethodValues, timeOfDayValues, type ContactMethod, type TimeOfDay } from "@/modules/booking/schema";

const DRAFT_STORAGE_KEY = "hm_booking_draft_v1";

const DESIGN_FORMATS = [
  "Logo files (SVG / PNG / PDF)",
  "Print-ready flyer or poster",
  "Social media sizes (IG / WhatsApp)",
  "Invitation or memorial programme",
  "Banner or outdoor print",
];

interface DraftState {
  step: 1 | 2 | 3 | 4;
  idempotencyKey: string;
  kind: ServiceKind;
  serviceId: string;
  occasionId: string;
  occasionOther: string;
  packageId: string;
  eventDate: string;
  timeOfDay: TimeOfDay;
  venueText: string;
  venueCity: string;
  guestCount: string;
  deadline: string;
  deliverableFormats: string[];
  brief: string;
  referenceLinks: string[];
  budgetBand: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  preferredContact: ContactMethod;
  consentAccepted: boolean;
  source: string;
}

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `hm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function BookingWizard({
  services,
  occasions,
  packages,
  settings,
  policyVersions,
  initialUnavailableDates,
  initialKind,
  initialServiceId,
  initialPackageId,
  initialOccasionId,
  initialSource,
}: {
  services: Service[];
  occasions: Occasion[];
  packages: PackageItem[];
  settings: SiteSettings;
  policyVersions: { privacyVersion: string; termsVersion: string; bookingPolicyVersion: string };
  initialUnavailableDates: string[];
  initialKind?: ServiceKind;
  initialServiceId?: string;
  initialPackageId?: string;
  initialOccasionId?: string;
  initialSource?: string;
}) {
  const router = useRouter();
  const defaultKind: ServiceKind = initialKind ?? "photography";
  const defaultService =
    services.find((s) => s.id === initialServiceId && s.kind === defaultKind)?.id ??
    services.find((s) => s.kind === defaultKind)?.id ??
    services[0]?.id ??
    "";

  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState<DraftState>(() => ({
    step: 1,
    idempotencyKey: createIdempotencyKey(),
    kind: defaultKind,
    serviceId: defaultService,
    occasionId: initialOccasionId ?? "",
    occasionOther: "",
    packageId: initialPackageId ?? "",
    eventDate: "",
    timeOfDay: "morning",
    venueText: "",
    venueCity: "",
    guestCount: "",
    deadline: "",
    deliverableFormats: [],
    brief: "",
    referenceLinks: [],
    budgetBand: "",
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    preferredContact: "whatsapp",
    consentAccepted: false,
    source: initialSource ?? "",
  }));

  const [newLinkInput, setNewLinkInput] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<{ title: string; detail: string; failedAttempts: number } | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [unavailableDates, setUnavailableDates] = useState<string[]>(initialUnavailableDates);
  const [availLoading, setAvailLoading] = useState(false);
  const [availError, setAvailError] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  // Restore saved draft from sessionStorage on refresh, unless explicit deep link params override
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DraftState>;
        const hasUrlPreselect = Boolean(initialKind || initialServiceId || initialPackageId || initialOccasionId);
        if (!hasUrlPreselect && parsed.kind) {
          setDraft((prev) => ({
            ...prev,
            ...parsed,
            // Never auto-tick consent from stale session unless currently ticked by user
            consentAccepted: Boolean(parsed.consentAccepted),
            idempotencyKey: parsed.idempotencyKey || prev.idempotencyKey,
          }));
        }
      }
    } catch {
      // Ignore corrupt session storage
    }
    setHydrated(true);
  }, [initialKind, initialServiceId, initialPackageId, initialOccasionId]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Ignore storage quota issues
    }
  }, [draft, hydrated]);

  async function refreshAvailability() {
    setAvailLoading(true);
    setAvailError(false);
    try {
      const today = getAccraTodayIso();
      const to = addDaysIso(today, 395);
      const res = await fetch(`/api/availability?from=${today}&to=${to}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Availability request failed");
      const json = (await res.json()) as { dates?: string[] };
      if (Array.isArray(json.dates)) {
        setUnavailableDates(json.dates);
      }
    } catch {
      setAvailError(true);
    } finally {
      setAvailLoading(false);
    }
  }

  const todayIso = getAccraTodayIso();
  const earliestDate = getEarliestSelectableDate(settings.min_lead_days);
  const latestDate = getLatestSelectableDate(settings.max_advance_days);

  const filteredServices = useMemo(
    () => services.filter((s) => s.kind === draft.kind),
    [services, draft.kind]
  );

  const filteredOccasions = useMemo(
    () => occasions.filter((o) => o.applies_to.includes(draft.kind)),
    [occasions, draft.kind]
  );

  const filteredPackages = useMemo(
    () => packages.filter((p) => p.service_id === draft.serviceId),
    [packages, draft.serviceId]
  );

  const selectedService = services.find((s) => s.id === draft.serviceId);
  const selectedPackage = packages.find((p) => p.id === draft.packageId);

  function updateDraft<K extends keyof DraftState>(key: K, val: DraftState[K]) {
    setDraft((prev) => ({ ...prev, [key]: val }));
    setStepErrors((prev) => {
      if (!prev[key]) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  }

  function validateStep(step: 1 | 2 | 3 | 4): Record<string, string> {
    const errs: Record<string, string> = {};
    if (step === 1) {
      if (!draft.serviceId) errs.serviceId = "Please choose a service.";
      if (draft.kind !== "design" && !draft.occasionId && draft.occasionOther.trim().length < 2) {
        errs.occasionId = "Choose an occasion or enter your own.";
      }
    } else if (step === 2) {
      if (draft.kind === "design") {
        if (!draft.deadline) {
          errs.deadline = "Choose a target deadline.";
        } else if (draft.deadline < earliestDate) {
          errs.deadline = `Choose a deadline from ${earliestDate} onward.`;
        }
      } else {
        if (!draft.eventDate) {
          errs.eventDate = "Pick an event date on the calendar.";
        } else if (draft.eventDate < earliestDate) {
          errs.eventDate = `Choose a date from ${earliestDate} onward.`;
        } else if (unavailableDates.includes(draft.eventDate)) {
          errs.eventDate = "We are already booked that day. Pick another date.";
        }
        if (!draft.venueCity.trim() || draft.venueCity.trim().length < 2) {
          errs.venueCity = "Enter the town or city for your event.";
        }
      }
    } else if (step === 3) {
      if (draft.brief.trim().length < 10) {
        errs.brief = "Please tell us a bit more about the job (at least 10 characters).";
      } else if (draft.brief.trim().length > 4000) {
        errs.brief = "Please keep the brief under 4000 characters.";
      }
    } else if (step === 4) {
      if (draft.clientName.trim().length < 2) {
        errs.clientName = "Enter your full name.";
      }
      if (!normalizeGhanaPhone(draft.clientPhone)) {
        errs.clientPhone = "Enter a valid Ghana or international phone number (e.g. 024 123 4567).";
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.clientEmail.trim())) {
        errs.clientEmail = "Enter a valid email address for your quote and status link.";
      }
      if (!draft.consentAccepted) {
        errs.consentAccepted = "Tick this box to confirm you have read the Privacy Policy and Booking Policy.";
      }
    }
    return errs;
  }

  function handleNext(fromStep: 1 | 2 | 3) {
    const errs = validateStep(fromStep);
    if (Object.keys(errs).length > 0) {
      setStepErrors(errs);
      return;
    }
    setStepErrors({});
    setDraft((prev) => ({ ...prev, step: (fromStep + 1) as 1 | 2 | 3 | 4 }));
    if (fromStep === 1) {
      void refreshAvailability();
    }
  }

  function handleAddReferenceLink() {
    setLinkError(null);
    const trimmed = newLinkInput.trim();
    if (!trimmed) return;
    if (draft.referenceLinks.length >= 5) {
      setLinkError("You can share up to five reference links.");
      return;
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        setLinkError("Links must begin with https:// or http://");
        return;
      }
      updateDraft("referenceLinks", [...draft.referenceLinks, parsed.toString()]);
      setNewLinkInput("");
    } catch {
      setLinkError("Enter a complete web address (e.g. https://instagram.com/...).");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateStep(4);
    if (Object.keys(errs).length > 0) {
      setStepErrors(errs);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        kind: draft.kind,
        serviceId: draft.serviceId,
        packageId: draft.packageId || null,
        occasionId: draft.occasionId && draft.occasionId !== "other" ? draft.occasionId : null,
        occasionOther: draft.occasionId === "other" ? draft.occasionOther.trim() : null,
        eventDate: draft.kind === "design" ? null : draft.eventDate,
        timeOfDay: draft.kind === "design" ? null : draft.timeOfDay,
        venueText: draft.venueText.trim() || null,
        venueCity: draft.venueCity.trim() || null,
        guestCount: draft.guestCount ? Number(draft.guestCount) : null,
        deadline: draft.kind === "design" ? draft.deadline : null,
        deliverableFormats: draft.kind === "design" ? draft.deliverableFormats : [],
        brief: draft.brief.trim(),
        referenceLinks: draft.referenceLinks,
        budgetBand: draft.budgetBand || null,
        clientName: draft.clientName.trim(),
        clientPhone: draft.clientPhone.trim(),
        clientEmail: draft.clientEmail.trim(),
        preferredContact: draft.preferredContact,
        consentAccepted: draft.consentAccepted,
        privacyVersion: policyVersions.privacyVersion,
        termsVersion: policyVersions.termsVersion,
        source: draft.source || null,
        website: honeypot,
      };

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": draft.idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const body = (await res.json().catch(() => ({}))) as {
        reference?: string;
        statusUrl?: string;
        title?: string;
        detail?: string;
        code?: string;
        fieldErrors?: Record<string, string[]>;
      };

      if (!res.ok) {
        if (res.status === 409 && body.code === "date_unavailable") {
          await refreshAvailability();
          setDraft((prev) => ({ ...prev, step: 2, eventDate: "" }));
          setStepErrors({
            eventDate: body.detail ?? "We are already booked that day. Pick another date.",
          });
          return;
        }
        if (body.fieldErrors) {
          const mapped: Record<string, string> = {};
          for (const [k, msgs] of Object.entries(body.fieldErrors)) {
            if (msgs?.[0]) mapped[k] = msgs[0];
          }
          setStepErrors(mapped);
        }
        setSubmitError((prev) => ({
          title: body.title ?? "Could not send request",
          detail: body.detail ?? "Please check your details or try again.",
          failedAttempts: (prev?.failedAttempts ?? 0) + 1,
        }));
        return;
      }

      const ref = body.reference!;
      try {
        sessionStorage.setItem(
          `hm_booking_confirmed_${ref}`,
          JSON.stringify({
            reference: ref,
            statusUrl: body.statusUrl ?? "",
            serviceName: selectedService?.name ?? draft.kind,
            packageName: selectedPackage?.name ?? null,
            dateLabel: draft.kind === "design" ? draft.deadline : draft.eventDate,
            clientName: draft.clientName.trim(),
            clientEmail: draft.clientEmail.trim(),
          })
        );
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // Ignore storage errors
      }

      router.push(`/book/confirmation/${encodeURIComponent(ref)}`);
    } catch {
      setSubmitError((prev) => ({
        title: "Network issue while sending",
        detail: "Your details are still saved here. Retry sending or message us on WhatsApp.",
        failedAttempts: (prev?.failedAttempts ?? 0) + 1,
      }));
    } finally {
      setSubmitting(false);
    }
  }

  const fallbackWhatsApp = buildWhatsAppUrl(
    settings.whatsapp_e164,
    `Hello ${settings.business_name}, I tried booking ${selectedService?.name ?? draft.kind} (${draft.kind === "design" ? draft.deadline : draft.eventDate}). Name: ${draft.clientName}. Brief: ${draft.brief.slice(0, 200)}`
  );

  const STEPS: Array<{ num: 1 | 2 | 3 | 4; label: string }> = [
    { num: 1, label: "Service" },
    { num: 2, label: draft.kind === "design" ? "Deadline" : "When & where" },
    { num: 3, label: "Details" },
    { num: 4, label: "Contact" },
  ];

  return (
    <div className="space-y-8">
      {/* Frame counter stepper */}
      <nav aria-label="Booking steps" className="border border-[var(--hairline)] bg-[var(--ink-2)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--hairline)]">
          <p className="font-mono-meta text-xs uppercase tracking-[0.14em] text-[var(--cyan)]">
            Frame {draft.step} of 4
          </p>
          <p className="text-xs text-[var(--grey)]">
            This is a request, not a commitment. We reply within one working day.
          </p>
        </div>
        <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STEPS.map((st) => {
            const isCurrent = draft.step === st.num;
            const isPast = draft.step > st.num;
            return (
              <li key={st.num}>
                <FramingCorners active={isCurrent}>
                  <button
                    type="button"
                    disabled={!isPast && !isCurrent}
                    onClick={() => {
                      if (isPast) {
                        setStepErrors({});
                        updateDraft("step", st.num);
                      }
                    }}
                    className={`flex min-h-[44px] w-full items-center justify-between border px-3 py-2 text-left text-xs font-medium transition-colors ${
                      isCurrent
                        ? "border-[var(--cyan)] bg-[var(--black)] text-[var(--white)]"
                        : isPast
                          ? "border-[var(--control-border)] bg-[var(--black)] text-[var(--cyan)] hover:border-[var(--cyan)] cursor-pointer"
                          : "border-[var(--hairline)] bg-[var(--ink-2)] text-[var(--grey)] cursor-not-allowed"
                    }`}
                  >
                    <span>
                      {st.num}. {st.label}
                    </span>
                    {isPast && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  </button>
                </FramingCorners>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Error summary if API or form failed */}
      {(Object.keys(stepErrors).length > 0 || submitError) && (
        <div
          role="alert"
          className="border-2 border-[var(--red)] bg-[var(--ink-2)] p-4 text-sm"
        >
          <div className="flex items-start gap-2.5 text-[var(--red)] font-semibold">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p>{submitError ? submitError.title : "Check the highlighted fields below"}</p>
              {submitError && (
                <p className="mt-1 font-normal text-[var(--white)]">{submitError.detail}</p>
              )}
            </div>
          </div>
          {submitError && (
            <div className="mt-3 pt-3 border-t border-[var(--hairline)]">
              <a
                href={fallbackWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 text-[var(--cyan)] underline underline-offset-4"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Send this request directly on WhatsApp instead
              </a>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Honeypot hidden from users & assistive tech */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="booking-website">Website</label>
          <input
            id="booking-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        {/* FRAME 1: SERVICE AND OCCASION */}
        {draft.step === 1 && (
          <div key="frame-1" className="vf-step-slide space-y-6 border border-[var(--hairline)] bg-[var(--ink-2)] p-5 sm:p-7">
            <ShotCaption parts={["FRAME 1 OF 4", "SERVICE AND OCCASION"]} />

            <div>
              <span className="block text-sm font-semibold text-[var(--white)]">
                What do you need? <span className="text-[var(--red)]">*</span>
              </span>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                {(
                  [
                    { k: "photography", label: "Photography", sub: "Events, portraits, products" },
                    { k: "videography", label: "Videography", sub: "Films, music & brand video" },
                    { k: "design", label: "Graphic design", sub: "Logos, flyers, social sets" },
                  ] as const
                ).map((item) => {
                  const selected = draft.kind === item.k;
                  return (
                    <button
                      key={item.k}
                      type="button"
                      onClick={() => {
                        const firstSvc = services.find((s) => s.kind === item.k);
                        setDraft((prev) => ({
                          ...prev,
                          kind: item.k,
                          serviceId: firstSvc?.id ?? "",
                          packageId: "",
                          occasionId: "",
                          occasionOther: "",
                        }));
                        setStepErrors({});
                      }}
                      className={`min-h-[68px] border-2 p-3.5 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] ${
                        selected
                          ? "border-[var(--cyan)] bg-[var(--black)]"
                          : "border-[var(--control-border)] bg-[var(--black)] hover:border-[var(--white)]"
                      }`}
                    >
                      <p className="font-display text-base font-bold text-[var(--white)]">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--grey)]">{item.sub}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <FormField
              id="booking-service"
              label="Specific service"
              required
              error={stepErrors.serviceId}
            >
              <select
                id="booking-service"
                className={SELECT_CLASSES}
                value={draft.serviceId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setDraft((prev) => ({ ...prev, serviceId: newId, packageId: "" }));
                }}
              >
                {filteredServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.starting_price_minor !== null
                      ? ` (from ${formatGhsFromMinor(s.starting_price_minor)})`
                      : ""}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              id="booking-occasion"
              label="Occasion"
              required={draft.kind !== "design"}
              error={stepErrors.occasionId}
              helpText={
                draft.kind === "design"
                  ? "Optional for design briefs."
                  : "Helps us match crew size and dress guidance."
              }
            >
              <select
                id="booking-occasion"
                className={SELECT_CLASSES}
                value={draft.occasionId}
                onChange={(e) => updateDraft("occasionId", e.target.value)}
              >
                <option value="">Select an occasion</option>
                {filteredOccasions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
                <option value="other">Other occasion</option>
              </select>
            </FormField>

            {draft.occasionId === "other" && (
              <FormField
                id="booking-occasion-other"
                label="Describe the occasion"
                required
                error={stepErrors.occasionOther}
              >
                <input
                  id="booking-occasion-other"
                  type="text"
                  maxLength={80}
                  className={INPUT_CLASSES}
                  placeholder="e.g. Book launch or thanksgiving"
                  value={draft.occasionOther}
                  onChange={(e) => updateDraft("occasionOther", e.target.value)}
                />
              </FormField>
            )}

            <FormField
              id="booking-package"
              label="Package"
              helpText="Pick a starting package or choose Not sure yet for a custom quote."
            >
              <select
                id="booking-package"
                className={SELECT_CLASSES}
                value={draft.packageId}
                onChange={(e) => updateDraft("packageId", e.target.value)}
              >
                <option value="">Not sure yet — prepare a custom quote</option>
                {filteredPackages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatGhsFromMinor(p.price_minor, p.currency)}
                    {p.duration_hours ? ` (${p.duration_hours} hrs)` : ""}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="flex justify-end pt-2">
              <Button type="button" variant="primary" onClick={() => handleNext(1)}>
                <span>Continue to {draft.kind === "design" ? "deadline" : "when and where"}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}

        {/* FRAME 2: WHEN AND WHERE / DEADLINE */}
        {draft.step === 2 && (
          <div key="frame-2" className="vf-step-slide space-y-6 border border-[var(--hairline)] bg-[var(--ink-2)] p-5 sm:p-7">
            <ShotCaption
              parts={[
                "FRAME 2 OF 4",
                draft.kind === "design" ? "TARGET DEADLINE & FORMATS" : "WHEN AND WHERE",
              ]}
            />

            {draft.kind === "design" ? (
              <>
                <FormField
                  id="booking-deadline"
                  label="Target deadline"
                  required
                  error={stepErrors.deadline}
                >
                  <DatePicker
                    id="booking-deadline-picker"
                    value={draft.deadline}
                    onChange={(iso) => updateDraft("deadline", iso)}
                    unavailableDates={[]}
                    earliestDate={earliestDate}
                    latestDate={latestDate}
                    todayIso={todayIso}
                    minLeadDays={settings.min_lead_days}
                    whatsappE164={settings.whatsapp_e164}
                    label="Design deadline (GMT)"
                  />
                </FormField>

                <div>
                  <span className="block text-sm font-semibold text-[var(--white)]">
                    Deliverable formats needed
                  </span>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {DESIGN_FORMATS.map((fmt) => {
                      const checked = draft.deliverableFormats.includes(fmt);
                      return (
                        <label
                          key={fmt}
                          className="flex min-h-[44px] cursor-pointer items-center gap-3 border border-[var(--control-border)] bg-[var(--black)] px-3.5 py-2 text-sm text-[var(--white)]"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                updateDraft("deliverableFormats", [...draft.deliverableFormats, fmt]);
                              } else {
                                updateDraft(
                                  "deliverableFormats",
                                  draft.deliverableFormats.filter((x) => x !== fmt)
                                );
                              }
                            }}
                            className="h-4 w-4 accent-[var(--cyan)]"
                          />
                          <span>{fmt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <>
                <FormField
                  id="booking-event-date"
                  label="Event date"
                  required
                  error={stepErrors.eventDate}
                >
                  <DatePicker
                    id="booking-event-date-picker"
                    value={draft.eventDate}
                    onChange={(iso) => updateDraft("eventDate", iso)}
                    unavailableDates={unavailableDates}
                    earliestDate={earliestDate}
                    latestDate={latestDate}
                    todayIso={todayIso}
                    minLeadDays={settings.min_lead_days}
                    whatsappE164={settings.whatsapp_e164}
                    loading={availLoading}
                    availabilityError={availError}
                    label="Crew availability (Africa/Accra)"
                  />
                </FormField>

                <FormField
                  id="booking-time-of-day"
                  label="Part of the day"
                  required
                  helpText="We confirm exact start and end hours on your quote."
                >
                  <select
                    id="booking-time-of-day"
                    className={SELECT_CLASSES}
                    value={draft.timeOfDay}
                    onChange={(e) => updateDraft("timeOfDay", e.target.value as TimeOfDay)}
                  >
                    {timeOfDayValues.map((tod) => (
                      <option key={tod} value={tod}>
                        {tod === "all_day"
                          ? "All day"
                          : tod === "unsure"
                            ? "Not sure yet"
                            : tod.charAt(0).toUpperCase() + tod.slice(1)}
                      </option>
                    ))}
                  </select>
                </FormField>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    id="booking-city"
                    label="Town or city"
                    required
                    error={stepErrors.venueCity}
                  >
                    <input
                      id="booking-city"
                      type="text"
                      maxLength={80}
                      className={INPUT_CLASSES}
                      placeholder="e.g. Accra, Kumasi, Takoradi"
                      value={draft.venueCity}
                      onChange={(e) => updateDraft("venueCity", e.target.value)}
                    />
                  </FormField>

                  <FormField
                    id="booking-guest-count"
                    label="Estimated guests"
                  >
                    <input
                      id="booking-guest-count"
                      type="number"
                      min={1}
                      max={20000}
                      className={INPUT_CLASSES}
                      placeholder="e.g. 150"
                      value={draft.guestCount}
                      onChange={(e) => updateDraft("guestCount", e.target.value)}
                    />
                  </FormField>
                </div>

                <FormField
                  id="booking-venue"
                  label="Venue or neighbourhood"
                >
                  <input
                    id="booking-venue"
                    type="text"
                    maxLength={200}
                    className={INPUT_CLASSES}
                    placeholder="e.g. Ridge Church or private home in East Legon"
                    value={draft.venueText}
                    onChange={(e) => updateDraft("venueText", e.target.value)}
                  />
                </FormField>
              </>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => updateDraft("step", 1)}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Back</span>
              </Button>
              <Button type="button" variant="primary" onClick={() => handleNext(2)}>
                <span>Continue to details</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}

        {/* FRAME 3: DETAILS */}
        {draft.step === 3 && (
          <div key="frame-3" className="vf-step-slide space-y-6 border border-[var(--hairline)] bg-[var(--ink-2)] p-5 sm:p-7">
            <ShotCaption parts={["FRAME 3 OF 4", "BRIEF AND REFERENCES"]} />

            <FormField
              id="booking-brief"
              label="Tell us about the job"
              required
              error={stepErrors.brief}
              helpText={`${draft.brief.length} / 4000 characters (minimum 10).`}
            >
              <textarea
                id="booking-brief"
                rows={5}
                maxLength={4000}
                className={TEXTAREA_CLASSES}
                placeholder="Share the flow of the day, key moments you care about, or what your design piece needs to say."
                value={draft.brief}
                onChange={(e) => updateDraft("brief", e.target.value)}
              />
            </FormField>

            <div className="space-y-2">
              <FormField
                id="booking-reference-input"
                label="Reference links"
                error={linkError ?? undefined}
                helpText="Paste up to five web links (Instagram, Pinterest, Google Drive, YouTube) showing a look you like."
              >
                <div className="flex gap-2">
                  <input
                    id="booking-reference-input"
                    type="url"
                    className={INPUT_CLASSES}
                    placeholder="https://..."
                    value={newLinkInput}
                    onChange={(e) => setNewLinkInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddReferenceLink();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddReferenceLink}
                    className="shrink-0"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>Add</span>
                  </Button>
                </div>
              </FormField>

              {draft.referenceLinks.length > 0 && (
                <ul className="space-y-2 pt-1">
                  {draft.referenceLinks.map((url, idx) => (
                    <li
                      key={`${url}-${idx}`}
                      className="flex items-center justify-between gap-2 border border-[var(--hairline)] bg-[var(--black)] px-3 py-2 text-xs"
                    >
                      <span className="truncate font-mono-meta text-[var(--cyan)]">{url}</span>
                      <button
                        type="button"
                        aria-label={`Remove link ${idx + 1}`}
                        onClick={() =>
                          updateDraft(
                            "referenceLinks",
                            draft.referenceLinks.filter((_, i) => i !== idx)
                          )
                        }
                        className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center text-[var(--grey)] hover:text-[var(--red)] cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {settings.budget_bands.length > 0 && (
              <FormField
                id="booking-budget"
                label="Approximate budget"
                helpText="Helps us tailor package options; leave blank if unsure."
              >
                <select
                  id="booking-budget"
                  className={SELECT_CLASSES}
                  value={draft.budgetBand}
                  onChange={(e) => updateDraft("budgetBand", e.target.value)}
                >
                  <option value="">Prefer not to say / Not sure yet</option>
                  {settings.budget_bands.map((band) => (
                    <option key={band} value={band}>
                      {band}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => updateDraft("step", 2)}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Back</span>
              </Button>
              <Button type="button" variant="primary" onClick={() => handleNext(3)}>
                <span>Continue to contact</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}

        {/* FRAME 4: CONTACT AND CONSENT */}
        {draft.step === 4 && (
          <div key="frame-4" className="vf-step-slide space-y-6 border border-[var(--hairline)] bg-[var(--ink-2)] p-5 sm:p-7">
            <ShotCaption parts={["FRAME 4 OF 4", "CONTACT AND CONSENT"]} />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="booking-client-name"
                label="Full name"
                required
                error={stepErrors.clientName}
              >
                <input
                  id="booking-client-name"
                  type="text"
                  autoComplete="name"
                  maxLength={120}
                  className={INPUT_CLASSES}
                  placeholder="e.g. Kwame Boateng"
                  value={draft.clientName}
                  onChange={(e) => updateDraft("clientName", e.target.value)}
                />
              </FormField>

              <FormField
                id="booking-client-phone"
                label="WhatsApp / phone number"
                required
                error={stepErrors.clientPhone}
                helpText="Ghana numbers accepted with or without +233."
              >
                <input
                  id="booking-client-phone"
                  type="tel"
                  autoComplete="tel"
                  className={INPUT_CLASSES}
                  placeholder="e.g. 024 000 0000"
                  value={draft.clientPhone}
                  onChange={(e) => updateDraft("clientPhone", e.target.value)}
                />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="booking-client-email"
                label="Email address"
                required
                error={stepErrors.clientEmail}
                helpText="Your reference and private status link are sent here."
              >
                <input
                  id="booking-client-email"
                  type="email"
                  autoComplete="email"
                  className={INPUT_CLASSES}
                  placeholder="you@example.com"
                  value={draft.clientEmail}
                  onChange={(e) => updateDraft("clientEmail", e.target.value)}
                />
              </FormField>

              <FormField
                id="booking-preferred-contact"
                label="Preferred way to reach you"
                required
              >
                <select
                  id="booking-preferred-contact"
                  className={SELECT_CLASSES}
                  value={draft.preferredContact}
                  onChange={(e) =>
                    updateDraft("preferredContact", e.target.value as ContactMethod)
                  }
                >
                  {contactMethodValues.map((m) => (
                    <option key={m} value={m}>
                      {m === "whatsapp" ? "WhatsApp" : m === "phone" ? "Phone call" : "Email"}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="border border-[var(--hairline)] bg-[var(--black)] p-4 space-y-2">
              <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--white)]">
                <input
                  id="booking-consent"
                  type="checkbox"
                  checked={draft.consentAccepted}
                  onChange={(e) => updateDraft("consentAccepted", e.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 accent-[var(--cyan)]"
                />
                <span>
                  I have read and accept the{" "}
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="text-[var(--cyan)] underline underline-offset-4"
                  >
                    Privacy Policy (v{policyVersions.privacyVersion})
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/booking-policy"
                    target="_blank"
                    className="text-[var(--cyan)] underline underline-offset-4"
                  >
                    Booking Policy (v{policyVersions.bookingPolicyVersion})
                  </Link>
                  .
                </span>
              </label>
              {stepErrors.consentAccepted && (
                <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-[var(--red)]">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{stepErrors.consentAccepted}</span>
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => updateDraft("step", 3)}
                disabled={submitting}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Back</span>
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "Sending request..." : "Send booking request"}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
