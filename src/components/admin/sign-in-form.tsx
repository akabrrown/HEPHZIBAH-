"use client";

import { AlertCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, INPUT_CLASSES } from "@/components/ui/form-field";
import { ShotCaption } from "@/components/ui/viewfinder";
import { adminSignInSchema, adminVerifyTotpSchema } from "@/modules/admin/schema";

export function AdminSignInForm({
  showLocalHint,
  returnTo = "/admin",
}: {
  showLocalHint: boolean;
  returnTo?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"password" | "totp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [adminDisplay, setAdminDisplay] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clientParsed = adminSignInSchema.safeParse({ email: email.trim(), password });
    if (!clientParsed.success) {
      const errs = clientParsed.error.flatten().fieldErrors;
      setError(errs.email?.[0] ?? errs.password?.[0] ?? "Enter a valid email and password.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientParsed.data),
      });
      const body = (await res.json().catch(() => ({}))) as {
        detail?: string;
        displayName?: string;
      };
      if (!res.ok) {
        setError(body.detail ?? "Sign in failed.");
        return;
      }
      setAdminDisplay(body.displayName ?? email);
      setStep("totp");
    } catch {
      setError("Network error while signing in.");
    } finally {
      setLoading(false);
    }
  }

  async function handleTotpSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clientParsed = adminVerifyTotpSchema.safeParse({ code: totpCode.trim() });
    if (!clientParsed.success) {
      setError(clientParsed.error.flatten().fieldErrors.code?.[0] ?? "Enter the 6-digit authenticator code.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth/verify-totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientParsed.data),
      });
      const body = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) {
        setError(body.detail ?? "Authenticator code rejected.");
        return;
      }
      router.push(returnTo.startsWith("/admin") ? returnTo : "/admin");
      router.refresh();
    } catch {
      setError("Network error while verifying code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--black)] text-[var(--white)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md border border-[var(--hairline)] bg-[var(--ink-2)] p-6 sm:p-8 space-y-6">
        <header className="space-y-2 border-b border-[var(--hairline)] pb-4">
          <ShotCaption
            parts={[
              "HEPHZIBAH MEDIA DESK",
              step === "password" ? "STEP 1 OF 2" : "STEP 2 OF 2 · MFA",
            ]}
          />
          <h1 className="font-display text-2xl font-extrabold">
            {step === "password" ? "Admin sign-in" : "Authenticator verification"}
          </h1>
          <p className="text-xs text-[var(--grey)]">
            {step === "password"
              ? "Every team member uses their own email, password, and authenticator app."
              : `Signed in as ${adminDisplay}. Enter the 6-digit code from your authenticator app.`}
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="border-2 border-[var(--red)] bg-[var(--black)] p-3.5 text-sm text-[var(--red)] flex items-start gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="text-[var(--white)]">{error}</span>
          </div>
        )}

        {step === "password" ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <FormField id="admin-email" label="Email" required>
              <input
                id="admin-email"
                type="email"
                autoComplete="email"
                required
                className={INPUT_CLASSES}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@hephzibahmedia.com"
              />
            </FormField>

            <FormField id="admin-password" label="Password" required>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                className={INPUT_CLASSES}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormField>

            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? "Checking credentials..." : "Continue to authenticator"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleTotpSubmit} className="space-y-4">
            <FormField
              id="admin-totp"
              label="6-digit authenticator code"
              required
              helpText="Open your TOTP authenticator app and enter the current 6-digit code."
            >
              <input
                id="admin-totp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                className={`${INPUT_CLASSES} font-mono-meta text-lg tracking-[0.25em]`}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
              />
            </FormField>

            <div className="flex flex-col gap-2">
              <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span>{loading ? "Verifying..." : "Verify and enter desk"}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setStep("password");
                  setTotpCode("");
                  setError(null);
                }}
              >
                Use a different account
              </Button>
            </div>
          </form>
        )}

        {showLocalHint && (
          <p className="border-t border-[var(--hairline)] pt-4 text-xs text-[var(--grey)]">
            Local development mode active. Seeded accounts use TOTP MFA.
          </p>
        )}

        <div className="pt-1 text-center">
          <Link href="/" className="text-xs text-[var(--cyan)] underline underline-offset-4">
            Return to public website
          </Link>
        </div>
      </div>
    </div>
  );
}
