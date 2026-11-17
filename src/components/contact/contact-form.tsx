"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, INPUT_CLASSES, TEXTAREA_CLASSES } from "@/components/ui/form-field";

export function ContactEnquiryForm({ privacyVersion }: { privacyVersion: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [website, setWebsite] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = "Enter your name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) errs.email = "Enter a valid email.";
    if (message.trim().length < 10) errs.message = "Message must be at least 10 characters.";
    if (message.trim().length > 3000) errs.message = "Message must stay under 3000 characters.";
    if (!consentAccepted) errs.consentAccepted = "Please tick the consent box before sending.";

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          message: message.trim(),
          consentAccepted,
          privacyVersion,
          website,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        detail?: string;
        fieldErrors?: Record<string, string[]>;
      };
      if (!res.ok) {
        if (body.fieldErrors) {
          const next: Record<string, string> = {};
          for (const [k, v] of Object.entries(body.fieldErrors)) {
            if (v?.[0]) next[k] = v[0];
          }
          setFieldErrors(next);
        }
        setFormError(body.detail ?? "Could not send enquiry. Please try again.");
        return;
      }

      setSubmitted(true);
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
      setConsentAccepted(false);
    } catch {
      setFormError("Network error while sending. Reach us on WhatsApp instead.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div role="status" className="border-2 border-[var(--cyan)] bg-[var(--ink-2)] p-6 space-y-3">
        <div className="flex items-center gap-2.5 text-[var(--cyan)] font-display text-lg font-bold">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          <span>Enquiry sent</span>
        </div>
        <p className="text-sm text-[var(--grey)]">
          We received your message and will reply by email or phone within one working day.
        </p>
        <Button type="button" variant="secondary" onClick={() => setSubmitted(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 border border-[var(--hairline)] bg-[var(--ink-2)] p-6">
      {formError && (
        <div role="alert" className="border border-[var(--red)] bg-[var(--black)] p-3 text-sm text-[var(--red)] flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{formError}</span>
        </div>
      )}

      <div className="hidden" aria-hidden="true">
        <label htmlFor="enquiry-website">Website</label>
        <input
          id="enquiry-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <FormField id="enquiry-name" label="Your name" required error={fieldErrors.name}>
        <input
          id="enquiry-name"
          type="text"
          maxLength={120}
          className={INPUT_CLASSES}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="enquiry-email" label="Email address" required error={fieldErrors.email}>
          <input
            id="enquiry-email"
            type="email"
            className={INPUT_CLASSES}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>

        <FormField id="enquiry-phone" label="Phone number" error={fieldErrors.phone}>
          <input
            id="enquiry-phone"
            type="tel"
            className={INPUT_CLASSES}
            placeholder="024 000 0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </FormField>
      </div>

      <FormField
        id="enquiry-message"
        label="Message"
        required
        error={fieldErrors.message}
        helpText={`${message.length} / 3000 characters`}
      >
        <textarea
          id="enquiry-message"
          rows={5}
          maxLength={3000}
          className={TEXTAREA_CLASSES}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </FormField>

      <div className="space-y-1.5">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--white)]">
          <input
            id="enquiry-consent"
            type="checkbox"
            checked={consentAccepted}
            onChange={(e) => setConsentAccepted(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--cyan)]"
          />
          <span>
            I agree to Hephzibah Media storing these details to answer my enquiry under the{" "}
            <Link href="/privacy" target="_blank" className="text-[var(--cyan)] underline">
              Privacy Policy (v{privacyVersion})
            </Link>
            .
          </span>
        </label>
        {fieldErrors.consentAccepted && (
          <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-[var(--red)]">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{fieldErrors.consentAccepted}</span>
          </p>
        )}
      </div>

      <Button type="submit" variant="primary" disabled={submitting}>
        {submitting ? "Sending..." : "Send enquiry"}
      </Button>
    </form>
  );
}
