"use client";

import { KeyRound, ShieldAlert, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, INPUT_CLASSES } from "@/components/ui/form-field";
import { ShotCaption } from "@/components/ui/viewfinder";
import { formatAccraDateTime } from "@/lib/dates";
import {
  adminScopeValues,
  type AdminScopeValue,
  type AdminUserRecord,
} from "@/modules/admin/schema";

function readErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const obj = data as {
      detail?: string;
      title?: string;
      fieldErrors?: Record<string, string[]>;
    };
    if (obj.fieldErrors && typeof obj.fieldErrors === "object") {
      const messages: string[] = [];
      for (const [field, errs] of Object.entries(obj.fieldErrors)) {
        if (Array.isArray(errs) && errs.length > 0) {
          messages.push(`${field}: ${errs.join(", ")}`);
        }
      }
      if (messages.length > 0) {
        return messages.join(" | ");
      }
    }
    return obj.detail ?? obj.title ?? fallback;
  }
  return fallback;
}

export function TeamClient({
  initialMembers,
  currentAdminId,
}: {
  initialMembers: AdminUserRecord[];
  currentAdminId: string;
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [scopes, setScopes] = useState<AdminScopeValue[]>(["bookings"]);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [revealedTotp, setRevealedTotp] = useState<{
    email: string;
    secret: string;
    sampleCode?: string;
  } | null>(null);

  function toggleNewScope(scope: AdminScopeValue) {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setBanner(null);
    setRevealedTotp(null);
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          display_name: displayName.trim(),
          password,
          scopes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ kind: "err", text: readErrorMessage(data, "Could not add admin account.") });
        return;
      }
      const created = data as {
        user: AdminUserRecord;
        totpSecret: string;
        sampleCode: string;
      };
      setMembers((prev) => [...prev, created.user]);
      setRevealedTotp({
        email: created.user.email,
        secret: created.totpSecret,
        sampleCode: created.sampleCode,
      });
      setEmail("");
      setDisplayName("");
      setPassword("");
      setScopes(["bookings"]);
      router.refresh();
      setBanner({
        kind: "ok",
        text: `Created admin account for ${created.user.display_name}. Save the authenticator secret below now.`,
      });
    } catch {
      setBanner({ kind: "err", text: "Network error adding team member." });
    } finally {
      setCreating(false);
    }
  }

  async function patchMember(
    target: AdminUserRecord,
    updates: { scopes?: AdminScopeValue[]; is_active?: boolean; reset_totp?: boolean }
  ) {
    setBusyId(target.id);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: target.id, ...updates }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ kind: "err", text: readErrorMessage(data, "Could not update team member.") });
        return;
      }
      const result = data as { user: AdminUserRecord; newTotpSecret?: string };
      setMembers((prev) => prev.map((m) => (m.id === target.id ? result.user : m)));
      if (result.newTotpSecret) {
        setRevealedTotp({
          email: result.user.email,
          secret: result.newTotpSecret,
        });
      }
      router.refresh();
      setBanner({ kind: "ok", text: `Updated ${result.user.display_name}.` });
    } catch {
      setBanner({ kind: "err", text: "Network error updating team member." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <ShotCaption parts={["TEAM DESK", "SCOPED RBAC & MFA"]} />
        <h1 className="mt-2 font-display text-3xl font-extrabold">Admin team &amp; access scopes</h1>
        <p className="mt-1 text-sm text-[var(--grey)]">
          Manage scoped staff accounts. At least one active admin with the{" "}
          <span className="font-mono-meta text-[var(--white)]">team</span> scope is always enforced.
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

      {revealedTotp && (
        <div className="space-y-2 border-2 border-[var(--cyan)] bg-[var(--ink-2)] p-5">
          <div className="flex items-center gap-2 text-xs font-mono-meta uppercase text-[var(--cyan)]">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            <span>One-time TOTP enrollment secret for {revealedTotp.email}</span>
          </div>
          <p className="font-mono-meta text-base font-bold text-[var(--white)] select-all">
            {revealedTotp.secret}
          </p>
          {revealedTotp.sampleCode && (
            <p className="font-mono-meta text-xs text-[var(--grey)]">
              Current verification code: <span className="text-[var(--white)]">{revealedTotp.sampleCode}</span>
            </p>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {members.map((member) => {
            const isSelf = member.id === currentAdminId;
            return (
              <article
                key={member.id}
                className="space-y-4 border border-[var(--hairline)] bg-[var(--ink-2)] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--hairline)] pb-3">
                  <div>
                    <h2 className="font-display text-lg font-bold">
                      {member.display_name}
                      {isSelf ? " (You)" : ""}
                    </h2>
                    <p className="font-mono-meta text-xs text-[var(--grey)]">
                      {member.email} · Added {formatAccraDateTime(member.created_at)}
                    </p>
                  </div>
                  <span
                    className={`font-mono-meta text-xs uppercase ${
                      member.is_active ? "text-[var(--cyan)]" : "text-[var(--red)]"
                    }`}
                  >
                    {member.is_active ? "ACTIVE · MFA REQUIRED" : "DEACTIVATED"}
                  </span>
                </div>

                <div>
                  <p className="mb-2 text-xs text-[var(--grey)]">Assigned scopes</p>
                  <div className="flex flex-wrap gap-2">
                    {adminScopeValues.map((scope) => {
                      const has = member.scopes.includes(scope);
                      return (
                        <button
                          key={scope}
                          type="button"
                          disabled={busyId === member.id}
                          onClick={() => {
                            const nextScopes = has
                              ? member.scopes.filter((s) => s !== scope)
                              : [...member.scopes, scope];
                            void patchMember(member, { scopes: nextScopes });
                          }}
                          className={`min-h-[44px] border px-3 text-xs font-mono-meta uppercase cursor-pointer ${
                            has
                              ? "border-[var(--cyan)] bg-[var(--black)] text-[var(--cyan)]"
                              : "border-[var(--control-border)] text-[var(--grey)] hover:border-[var(--white)]"
                          }`}
                        >
                          {has ? `✓ ${scope}` : scope}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busyId === member.id}
                    onClick={() => patchMember(member, { is_active: !member.is_active })}
                    className="min-h-[44px] border border-[var(--control-border)] px-3 text-xs font-medium text-[var(--white)] hover:border-[var(--red)] hover:text-[var(--red)] cursor-pointer"
                  >
                    {member.is_active ? "Deactivate account" : "Reactivate account"}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === member.id}
                    onClick={() => patchMember(member, { reset_totp: true })}
                    className="min-h-[44px] border border-[var(--control-border)] px-3 text-xs font-medium text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)] cursor-pointer"
                  >
                    Rotate authenticator secret
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <form
          onSubmit={handleCreateAdmin}
          className="space-y-4 border border-[var(--hairline)] bg-[var(--ink-2)] p-6 self-start"
        >
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-[var(--cyan)]" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold">Add admin staff member</h2>
          </div>

          <FormField label="Full name" id="team-name" required>
            <input
              id="team-name"
              type="text"
              required
              className={INPUT_CLASSES}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Abena Mensah"
            />
          </FormField>

          <FormField label="Work email" id="team-email" required>
            <input
              id="team-email"
              type="email"
              required
              className={INPUT_CLASSES}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="abena@hephzibahmedia.com"
            />
          </FormField>

          <FormField
            label="Initial password"
            id="team-pass"
            required
            helpText="Minimum 8 characters; checked against breached password lists."
          >
            <input
              id="team-pass"
              type="password"
              required
              minLength={8}
              maxLength={128}
              className={INPUT_CLASSES}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>

          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--white)]">Initial scopes</p>
            <div className="grid grid-cols-2 gap-2">
              {adminScopeValues.map((scope) => (
                <label
                  key={scope}
                  className="flex min-h-[44px] items-center gap-2 border border-[var(--hairline)] bg-[var(--black)] px-3 text-xs font-mono-meta uppercase cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={scopes.includes(scope)}
                    onChange={() => toggleNewScope(scope)}
                    className="h-4 w-4 accent-[var(--cyan)]"
                  />
                  <span>{scope}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-[var(--grey)]">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--grey)]" aria-hidden="true" />
            <span>TOTP MFA enrollment secret is generated on creation and shown once.</span>
          </div>

          <Button type="submit" variant="primary" disabled={creating || scopes.length === 0}>
            {creating ? "Creating admin..." : "Create team admin"}
          </Button>
        </form>
      </div>
    </div>
  );
}
