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
import { formatGhsFromMinor, fromMinorUnits, toMinorUnits } from "@/lib/money";
import {
  serviceKindValues,
  type PackageItem,
  type Service,
  type ServiceKind,
} from "@/modules/catalog/schema";
import type { FaqItem, PublishStatus, Testimonial } from "@/modules/portfolio/schema";

type ContentTab = "services" | "packages" | "testimonials" | "faqs";

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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ContentManagerClient({
  initialServices,
  initialPackages,
  initialTestimonials,
  initialFaqs,
}: {
  initialServices: Service[];
  initialPackages: PackageItem[];
  initialTestimonials: Testimonial[];
  initialFaqs: FaqItem[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<ContentTab>("services");
  const [services, setServices] = useState(initialServices);
  const [packages, setPackages] = useState(initialPackages);
  const [testimonials, setTestimonials] = useState(initialTestimonials);
  const [faqs, setFaqs] = useState(initialFaqs);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Service form state
  const [srvId, setSrvId] = useState<string | null>(null);
  const [srvKind, setSrvKind] = useState<ServiceKind>("photography");
  const [srvSlug, setSrvSlug] = useState("");
  const [srvSlugTouched, setSrvSlugTouched] = useState(false);
  const [srvName, setSrvName] = useState("");
  const [srvSummary, setSrvSummary] = useState("");
  const [srvDesc, setSrvDesc] = useState("");
  const [srvStartingGhs, setSrvStartingGhs] = useState("");
  const [srvSort, setSrvSort] = useState("0");
  const [srvActive, setSrvActive] = useState(true);

  // Package form state
  const [pkgId, setPkgId] = useState<string | null>(null);
  const [pkgServiceId, setPkgServiceId] = useState(initialServices[0]?.id ?? "");
  const [pkgName, setPkgName] = useState("");
  const [pkgSummary, setPkgSummary] = useState("");
  const [pkgPriceGhs, setPkgPriceGhs] = useState("3500");
  const [pkgHours, setPkgHours] = useState("");
  const [pkgDeliverables, setPkgDeliverables] = useState("");
  const [pkgFeatured, setPkgFeatured] = useState(false);
  const [pkgSort, setPkgSort] = useState("0");
  const [pkgActive, setPkgActive] = useState(true);

  // Testimonial form state
  const [testId, setTestId] = useState<string | null>(null);
  const [testAuthor, setTestAuthor] = useState("");
  const [testContext, setTestContext] = useState("");
  const [testQuote, setTestQuote] = useState("");
  const [testConsent, setTestConsent] = useState(false);
  const [testStatus, setTestStatus] = useState<PublishStatus>("draft");
  const [testSort, setTestSort] = useState("0");

  // FAQ form state
  const [faqId, setFaqId] = useState<string | null>(null);
  const [faqQ, setFaqQ] = useState("");
  const [faqA, setFaqA] = useState("");
  const [faqSort, setFaqSort] = useState("0");
  const [faqPublished, setFaqPublished] = useState(true);

  function loadService(s: Service) {
    setSrvId(s.id);
    setSrvKind(s.kind);
    setSrvSlug(s.slug);
    setSrvSlugTouched(true);
    setSrvName(s.name);
    setSrvSummary(s.summary);
    setSrvDesc(s.description_md ?? "");
    setSrvStartingGhs(s.starting_price_minor != null ? String(fromMinorUnits(s.starting_price_minor)) : "");
    setSrvSort(String(s.sort_order));
    setSrvActive(s.is_active);
  }

  function resetServiceForm() {
    setSrvId(null);
    setSrvKind("photography");
    setSrvSlug("");
    setSrvSlugTouched(false);
    setSrvName("");
    setSrvSummary("");
    setSrvDesc("");
    setSrvStartingGhs("");
    setSrvSort("0");
    setSrvActive(true);
  }

  async function submitService(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setBanner(null);
    try {
      const finalSlug = (srvSlug.trim() || slugify(srvName)).trim();
      if (!finalSlug) {
        setBanner({ kind: "err", text: "Please enter a service name to generate a valid slug." });
        setSaving(false);
        return;
      }
      const parsedPrice = srvStartingGhs.trim() ? Number(srvStartingGhs) : null;
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(srvId ? { id: srvId } : {}),
          kind: srvKind,
          slug: finalSlug,
          name: srvName.trim(),
          summary: srvSummary.trim(),
          description_md: srvDesc.trim() || null,
          starting_price_minor: parsedPrice != null && Number.isFinite(parsedPrice) ? toMinorUnits(parsedPrice) : null,
          sort_order: Number(srvSort) || 0,
          is_active: srvActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ kind: "err", text: readErrorMessage(data, "Could not save service.") });
        return;
      }
      const listRes = await fetch("/api/admin/services", { cache: "no-store" });
      if (listRes.ok) {
        const listData = (await listRes.json()) as { services: Service[] };
        setServices(listData.services);
      }
      resetServiceForm();
      router.refresh();
      setBanner({ kind: "ok", text: "Service saved successfully." });
    } catch {
      setBanner({ kind: "err", text: "Network error saving service." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteService(service: Service) {
    const confirmMsg = `Delete service "${service.name}"? Any packages belonging to this service will also be deleted.`;
    if (!window.confirm(confirmMsg)) return;
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/services?id=${encodeURIComponent(service.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ kind: "err", text: readErrorMessage(data, "Could not delete service.") });
        return;
      }
      setServices((prev) => prev.filter((s) => s.id !== service.id));
      setPackages((prev) => prev.filter((p) => p.service_id !== service.id));
      if (srvId === service.id) resetServiceForm();
      router.refresh();
      setBanner({ kind: "ok", text: `Service "${service.name}" deleted.` });
    } catch {
      setBanner({ kind: "err", text: "Network error deleting service." });
    } finally {
      setSaving(false);
    }
  }

  function loadPackage(p: PackageItem) {
    setPkgId(p.id);
    setPkgServiceId(p.service_id);
    setPkgName(p.name);
    setPkgSummary(p.summary ?? "");
    setPkgPriceGhs(String(fromMinorUnits(p.price_minor)));
    setPkgHours(p.duration_hours != null ? String(p.duration_hours) : "");
    setPkgDeliverables((p.deliverables ?? []).join("\n"));
    setPkgFeatured(p.is_featured);
    setPkgSort(String(p.sort_order));
    setPkgActive(p.is_active);
  }

  function resetPackageForm() {
    setPkgId(null);
    setPkgServiceId(services[0]?.id ?? "");
    setPkgName("");
    setPkgSummary("");
    setPkgPriceGhs("3500");
    setPkgHours("");
    setPkgDeliverables("");
    setPkgFeatured(false);
    setPkgSort("0");
    setPkgActive(true);
  }

  async function submitPackage(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setBanner(null);
    try {
      if (!pkgServiceId) {
        setBanner({ kind: "err", text: "Please create and select a Service first before adding a package." });
        setSaving(false);
        return;
      }
      const priceNum = Number(pkgPriceGhs);
      const res = await fetch("/api/admin/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(pkgId ? { id: pkgId } : {}),
          service_id: pkgServiceId,
          name: pkgName.trim(),
          summary: pkgSummary.trim() || null,
          price_minor: Number.isFinite(priceNum) ? toMinorUnits(priceNum) : -1,
          duration_hours: pkgHours.trim() ? Number(pkgHours) : null,
          deliverables: pkgDeliverables
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean),
          is_featured: pkgFeatured,
          sort_order: Number(pkgSort) || 0,
          is_active: pkgActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ kind: "err", text: readErrorMessage(data, "Could not save package.") });
        return;
      }
      const listRes = await fetch("/api/admin/packages", { cache: "no-store" });
      if (listRes.ok) {
        const listData = (await listRes.json()) as { packages: PackageItem[] };
        setPackages(listData.packages);
      }
      resetPackageForm();
      router.refresh();
      setBanner({ kind: "ok", text: "Package saved successfully." });
    } catch {
      setBanner({ kind: "err", text: "Network error saving package." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePackage(pkg: PackageItem) {
    const confirmMsg = `Delete package "${pkg.name}"?`;
    if (!window.confirm(confirmMsg)) return;
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/packages?id=${encodeURIComponent(pkg.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ kind: "err", text: readErrorMessage(data, "Could not delete package.") });
        return;
      }
      setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
      if (pkgId === pkg.id) resetPackageForm();
      router.refresh();
      setBanner({ kind: "ok", text: `Package "${pkg.name}" deleted.` });
    } catch {
      setBanner({ kind: "err", text: "Network error deleting package." });
    } finally {
      setSaving(false);
    }
  }

  function loadTestimonial(t: Testimonial) {
    setTestId(t.id);
    setTestAuthor(t.author_name);
    setTestContext(t.author_context ?? "");
    setTestQuote(t.quote);
    setTestConsent(t.consent_to_publish);
    setTestStatus(t.status);
    setTestSort(String(t.sort_order));
  }

  function resetTestimonialForm() {
    setTestId(null);
    setTestAuthor("");
    setTestContext("");
    setTestQuote("");
    setTestConsent(false);
    setTestStatus("draft");
    setTestSort("0");
  }

  async function submitTestimonial(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setBanner(null);
    try {
      if (testQuote.trim().length < 20) {
        setBanner({ kind: "err", text: "Quote must be at least 20 characters long." });
        setSaving(false);
        return;
      }
      const effectiveStatus: PublishStatus = testConsent ? testStatus : "draft";
      const res = await fetch("/api/admin/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(testId ? { id: testId } : {}),
          author_name: testAuthor.trim(),
          author_context: testContext.trim() || null,
          quote: testQuote.trim(),
          consent_to_publish: testConsent,
          status: effectiveStatus,
          sort_order: Number(testSort) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ kind: "err", text: readErrorMessage(data, "Could not save testimonial.") });
        return;
      }
      const listRes = await fetch("/api/admin/testimonials", { cache: "no-store" });
      if (listRes.ok) {
        const listData = (await listRes.json()) as { testimonials: Testimonial[] };
        setTestimonials(listData.testimonials);
      }
      resetTestimonialForm();
      router.refresh();
      setBanner({ kind: "ok", text: "Testimonial saved successfully." });
    } catch {
      setBanner({ kind: "err", text: "Network error saving testimonial." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTestimonial(testimonial: Testimonial) {
    const confirmMsg = `Delete testimonial from "${testimonial.author_name}"?`;
    if (!window.confirm(confirmMsg)) return;
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/testimonials?id=${encodeURIComponent(testimonial.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ kind: "err", text: readErrorMessage(data, "Could not delete testimonial.") });
        return;
      }
      setTestimonials((prev) => prev.filter((t) => t.id !== testimonial.id));
      if (testId === testimonial.id) resetTestimonialForm();
      router.refresh();
      setBanner({ kind: "ok", text: "Testimonial deleted." });
    } catch {
      setBanner({ kind: "err", text: "Network error deleting testimonial." });
    } finally {
      setSaving(false);
    }
  }

  function loadFaq(f: FaqItem) {
    setFaqId(f.id);
    setFaqQ(f.question);
    setFaqA(f.answer);
    setFaqSort(String(f.sort_order));
    setFaqPublished(f.is_published);
  }

  function resetFaqForm() {
    setFaqId(null);
    setFaqQ("");
    setFaqA("");
    setFaqSort("0");
    setFaqPublished(true);
  }

  async function submitFaq(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(faqId ? { id: faqId } : {}),
          question: faqQ.trim(),
          answer: faqA.trim(),
          sort_order: Number(faqSort) || 0,
          is_published: faqPublished,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ kind: "err", text: readErrorMessage(data, "Could not save FAQ.") });
        return;
      }
      const listRes = await fetch("/api/admin/faqs", { cache: "no-store" });
      if (listRes.ok) {
        const listData = (await listRes.json()) as { faqs: FaqItem[] };
        setFaqs(listData.faqs);
      }
      resetFaqForm();
      router.refresh();
      setBanner({ kind: "ok", text: "FAQ item saved successfully." });
    } catch {
      setBanner({ kind: "err", text: "Network error saving FAQ." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteFaq(faq: FaqItem) {
    const confirmMsg = `Delete FAQ "${faq.question}"?`;
    if (!window.confirm(confirmMsg)) return;
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/faqs?id=${encodeURIComponent(faq.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ kind: "err", text: readErrorMessage(data, "Could not delete FAQ.") });
        return;
      }
      setFaqs((prev) => prev.filter((f) => f.id !== faq.id));
      if (faqId === faq.id) resetFaqForm();
      router.refresh();
      setBanner({ kind: "ok", text: "FAQ deleted." });
    } catch {
      setBanner({ kind: "err", text: "Network error deleting FAQ." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <ShotCaption parts={["CONTENT DESK", "CATALOGUE & EDITORIAL"]} />
        <h1 className="mt-2 font-display text-3xl font-extrabold">Services, packages, testimonials &amp; FAQs</h1>
        <p className="mt-1 text-sm text-[var(--grey)]">
          Manage pricing guides, deliverables, client endorsements, and studio answers published across the public site.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Content categories">
        {(
          [
            { id: "services", label: `Services (${services.length})` },
            { id: "packages", label: `Packages (${packages.length})` },
            { id: "testimonials", label: `Testimonials (${testimonials.length})` },
            { id: "faqs", label: `FAQs (${faqs.length})` },
          ] as const
        ).map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setTab(t.id);
                setBanner(null);
              }}
              className={`min-h-[44px] border px-4 text-xs font-mono-meta uppercase tracking-wider cursor-pointer ${
                active
                  ? "border-[var(--cyan)] bg-[var(--ink-2)] text-[var(--cyan)]"
                  : "border-[var(--control-border)] text-[var(--white)] hover:border-[var(--cyan)]"
              }`}
            >
              {t.label}
            </button>
          );
        })}
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

      {tab === "services" && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            {services.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-start justify-between gap-4 border border-[var(--hairline)] bg-[var(--ink-2)] p-4"
              >
                <div className="space-y-1">
                  <p className="font-mono-meta text-xs uppercase text-[var(--grey)]">
                    {s.kind} · {s.slug} · {s.is_active ? "ACTIVE" : "HIDDEN"}
                  </p>
                  <h2 className="font-display text-lg font-bold">{s.name}</h2>
                  <p className="text-xs text-[var(--grey)]">{s.summary}</p>
                  {s.starting_price_minor != null && (
                    <p className="font-mono-meta text-xs text-[var(--cyan)]">
                      From {formatGhsFromMinor(s.starting_price_minor)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => loadService(s)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-[var(--red)] border border-[var(--red)]/40 hover:bg-[var(--red)] hover:text-white"
                    onClick={() => handleDeleteService(s)}
                    disabled={saving}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={submitService}
            className="space-y-4 border border-[var(--hairline)] bg-[var(--ink-2)] p-6 self-start"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold">
                {srvId ? "Edit service" : "Add service"}
              </h2>
              {srvId && (
                <button
                  type="button"
                  onClick={resetServiceForm}
                  className="text-xs text-[var(--cyan)] underline underline-offset-4 cursor-pointer"
                >
                  New instead
                </button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Discipline" id="srv-kind" required>
                <select
                  id="srv-kind"
                  className={SELECT_CLASSES}
                  value={srvKind}
                  onChange={(e) => setSrvKind(e.target.value as ServiceKind)}
                >
                  {serviceKindValues.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Slug" id="srv-slug" required>
                <input
                  id="srv-slug"
                  type="text"
                  required
                  className={`${INPUT_CLASSES} font-mono-meta`}
                  value={srvSlug}
                  onChange={(e) => {
                    setSrvSlugTouched(true);
                    setSrvSlug(e.target.value);
                  }}
                  placeholder="event-photography"
                />
              </FormField>
            </div>

            <FormField label="Service name" id="srv-name" required>
              <input
                id="srv-name"
                type="text"
                required
                className={INPUT_CLASSES}
                value={srvName}
                onChange={(e) => {
                  const val = e.target.value;
                  setSrvName(val);
                  if (!srvSlugTouched) {
                    setSrvSlug(slugify(val));
                  }
                }}
              />
            </FormField>

            <FormField label="Summary" id="srv-summary" required>
              <textarea
                id="srv-summary"
                required
                rows={2}
                className={TEXTAREA_CLASSES}
                value={srvSummary}
                onChange={(e) => setSrvSummary(e.target.value)}
              />
            </FormField>

            <FormField label="Full description (optional)" id="srv-desc">
              <textarea
                id="srv-desc"
                rows={3}
                className={TEXTAREA_CLASSES}
                value={srvDesc}
                onChange={(e) => setSrvDesc(e.target.value)}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Starting price (GHS)" id="srv-price">
                <input
                  id="srv-price"
                  type="number"
                  min={0}
                  step="1"
                  className={INPUT_CLASSES}
                  value={srvStartingGhs}
                  onChange={(e) => setSrvStartingGhs(e.target.value)}
                />
              </FormField>
              <FormField label="Sort order" id="srv-sort">
                <input
                  id="srv-sort"
                  type="number"
                  min={0}
                  className={INPUT_CLASSES}
                  value={srvSort}
                  onChange={(e) => setSrvSort(e.target.value)}
                />
              </FormField>
            </div>

            <label className="flex min-h-[44px] items-center gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={srvActive}
                onChange={(e) => setSrvActive(e.target.checked)}
                className="h-4 w-4 accent-[var(--cyan)]"
              />
              <span>Active on public services &amp; booking intake</span>
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? "Saving..." : srvId ? "Update service" : "Create service"}
              </Button>
              {srvId && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-[var(--red)] border border-[var(--red)]/40 hover:bg-[var(--red)] hover:text-white"
                  onClick={() => {
                    const target = services.find((s) => s.id === srvId);
                    if (target) handleDeleteService(target);
                  }}
                  disabled={saving}
                >
                  Delete service
                </Button>
              )}
            </div>
          </form>
        </div>
      )}

      {tab === "packages" && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            {packages.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-start justify-between gap-4 border border-[var(--hairline)] bg-[var(--ink-2)] p-4"
              >
                <div className="space-y-1">
                  <p className="font-mono-meta text-xs uppercase text-[var(--grey)]">
                    {p.service_name ?? p.service_kind} · {p.is_active ? "ACTIVE" : "HIDDEN"}
                    {p.is_featured ? " · FEATURED" : ""}
                  </p>
                  <h2 className="font-display text-lg font-bold">
                    {p.name} — {formatGhsFromMinor(p.price_minor)}
                  </h2>
                  {p.summary && <p className="text-xs text-[var(--grey)]">{p.summary}</p>}
                  <p className="text-xs text-[var(--grey)]">
                    {(p.deliverables ?? []).length} deliverable lines
                    {p.duration_hours ? ` · ${p.duration_hours} hrs` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => loadPackage(p)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-[var(--red)] border border-[var(--red)]/40 hover:bg-[var(--red)] hover:text-white"
                    onClick={() => handleDeletePackage(p)}
                    disabled={saving}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={submitPackage}
            className="space-y-4 border border-[var(--hairline)] bg-[var(--ink-2)] p-6 self-start"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold">
                {pkgId ? "Edit package" : "Add package"}
              </h2>
              {pkgId && (
                <button
                  type="button"
                  onClick={resetPackageForm}
                  className="text-xs text-[var(--cyan)] underline underline-offset-4 cursor-pointer"
                >
                  New instead
                </button>
              )}
            </div>

            {services.length === 0 && (
              <div className="border border-[var(--amber)] bg-[var(--black)] p-3 text-xs text-[var(--amber)]">
                No services exist yet. Please create a Service on the Services tab before adding packages.
              </div>
            )}

            <FormField label="Service" id="pkg-service" required>
              <select
                id="pkg-service"
                className={SELECT_CLASSES}
                value={pkgServiceId}
                onChange={(e) => setPkgServiceId(e.target.value)}
              >
                {services.length === 0 ? (
                  <option value="">No services available</option>
                ) : (
                  services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.kind})
                    </option>
                  ))
                )}
              </select>
            </FormField>

            <FormField label="Package name" id="pkg-name" required>
              <input
                id="pkg-name"
                type="text"
                required
                className={INPUT_CLASSES}
                value={pkgName}
                onChange={(e) => setPkgName(e.target.value)}
                placeholder="Half-Day Coverage"
              />
            </FormField>

            <FormField label="Summary" id="pkg-summary">
              <input
                id="pkg-summary"
                type="text"
                className={INPUT_CLASSES}
                value={pkgSummary}
                onChange={(e) => setPkgSummary(e.target.value)}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Price (GHS)" id="pkg-price" required>
                <input
                  id="pkg-price"
                  type="number"
                  required
                  min={0}
                  step="1"
                  className={INPUT_CLASSES}
                  value={pkgPriceGhs}
                  onChange={(e) => setPkgPriceGhs(e.target.value)}
                />
              </FormField>
              <FormField label="Hours (optional)" id="pkg-hours">
                <input
                  id="pkg-hours"
                  type="number"
                  min={0.5}
                  step="0.5"
                  className={INPUT_CLASSES}
                  value={pkgHours}
                  onChange={(e) => setPkgHours(e.target.value)}
                />
              </FormField>
              <FormField label="Sort order" id="pkg-sort">
                <input
                  id="pkg-sort"
                  type="number"
                  min={0}
                  className={INPUT_CLASSES}
                  value={pkgSort}
                  onChange={(e) => setPkgSort(e.target.value)}
                />
              </FormField>
            </div>

            <FormField
              label="Deliverables (one per line)"
              id="pkg-deliverables"
            >
              <textarea
                id="pkg-deliverables"
                rows={4}
                className={TEXTAREA_CLASSES}
                value={pkgDeliverables}
                onChange={(e) => setPkgDeliverables(e.target.value)}
                placeholder={"5 hours event coverage\n200+ colour-graded stills\nOnline gallery within 7 days"}
              />
            </FormField>

            <div className="flex flex-col gap-2">
              <label className="flex min-h-[44px] items-center gap-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={pkgFeatured}
                  onChange={(e) => setPkgFeatured(e.target.checked)}
                  className="h-4 w-4 accent-[var(--cyan)]"
                />
                <span>Highlight as featured tier</span>
              </label>
              <label className="flex min-h-[44px] items-center gap-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={pkgActive}
                  onChange={(e) => setPkgActive(e.target.checked)}
                  className="h-4 w-4 accent-[var(--cyan)]"
                />
                <span>Published on /pricing</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="primary" disabled={saving || services.length === 0}>
                {saving ? "Saving..." : pkgId ? "Update package" : "Create package"}
              </Button>
              {pkgId && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-[var(--red)] border border-[var(--red)]/40 hover:bg-[var(--red)] hover:text-white"
                  onClick={() => {
                    const target = packages.find((p) => p.id === pkgId);
                    if (target) handleDeletePackage(target);
                  }}
                  disabled={saving}
                >
                  Delete package
                </Button>
              )}
            </div>
          </form>
        </div>
      )}

      {tab === "testimonials" && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            {testimonials.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-start justify-between gap-4 border border-[var(--hairline)] bg-[var(--ink-2)] p-4"
              >
                <div className="space-y-1 max-w-xl">
                  <p className="font-mono-meta text-xs uppercase text-[var(--grey)]">
                    {t.status} · CONSENT: {t.consent_to_publish ? "YES" : "NO"}
                  </p>
                  <p className="text-sm text-[var(--white)]">“{t.quote}”</p>
                  <p className="text-xs text-[var(--grey)]">
                    {t.author_name}
                    {t.author_context ? ` — ${t.author_context}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => loadTestimonial(t)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-[var(--red)] border border-[var(--red)]/40 hover:bg-[var(--red)] hover:text-white"
                    onClick={() => handleDeleteTestimonial(t)}
                    disabled={saving}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={submitTestimonial}
            className="space-y-4 border border-[var(--hairline)] bg-[var(--ink-2)] p-6 self-start"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold">
                {testId ? "Edit testimonial" : "Add testimonial"}
              </h2>
              {testId && (
                <button
                  type="button"
                  onClick={resetTestimonialForm}
                  className="text-xs text-[var(--cyan)] underline underline-offset-4 cursor-pointer"
                >
                  New instead
                </button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Client name" id="test-author" required>
                <input
                  id="test-author"
                  type="text"
                  required
                  className={INPUT_CLASSES}
                  value={testAuthor}
                  onChange={(e) => setTestAuthor(e.target.value)}
                />
              </FormField>
              <FormField label="Occasion / organisation" id="test-context">
                <input
                  id="test-context"
                  type="text"
                  className={INPUT_CLASSES}
                  value={testContext}
                  onChange={(e) => setTestContext(e.target.value)}
                  placeholder="Cathedral wedding, Accra"
                />
              </FormField>
            </div>

            <FormField label="Endorsement quote (20-600 chars)" id="test-quote" required>
              <textarea
                id="test-quote"
                required
                minLength={20}
                maxLength={600}
                rows={4}
                className={TEXTAREA_CLASSES}
                value={testQuote}
                onChange={(e) => setTestQuote(e.target.value)}
              />
              <div className="mt-1 flex justify-between text-[11px]">
                <span className="text-[var(--grey)]">Min 20, max 600 characters</span>
                <span
                  className={
                    testQuote.trim().length > 0 &&
                    (testQuote.trim().length < 20 || testQuote.trim().length > 600)
                      ? "text-[var(--red)] font-semibold"
                      : "text-[var(--cyan)]"
                  }
                >
                  {testQuote.trim().length} / 20-600 chars
                </span>
              </div>
            </FormField>

            <label className="flex min-h-[44px] items-center gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={testConsent}
                onChange={(e) => {
                  setTestConsent(e.target.checked);
                  if (!e.target.checked) setTestStatus("draft");
                }}
                className="h-4 w-4 accent-[var(--cyan)]"
              />
              <span>Client gave written consent to publish publicly</span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Publish status" id="test-status">
                <select
                  id="test-status"
                  className={SELECT_CLASSES}
                  value={testConsent ? testStatus : "draft"}
                  disabled={!testConsent}
                  onChange={(e) => setTestStatus(e.target.value as PublishStatus)}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </FormField>
              <FormField label="Sort order" id="test-sort">
                <input
                  id="test-sort"
                  type="number"
                  min={0}
                  className={INPUT_CLASSES}
                  value={testSort}
                  onChange={(e) => setTestSort(e.target.value)}
                />
              </FormField>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? "Saving..." : testId ? "Update testimonial" : "Save testimonial"}
              </Button>
              {testId && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-[var(--red)] border border-[var(--red)]/40 hover:bg-[var(--red)] hover:text-white"
                  onClick={() => {
                    const target = testimonials.find((t) => t.id === testId);
                    if (target) handleDeleteTestimonial(target);
                  }}
                  disabled={saving}
                >
                  Delete testimonial
                </Button>
              )}
            </div>
          </form>
        </div>
      )}

      {tab === "faqs" && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            {faqs.map((f) => (
              <div
                key={f.id}
                className="flex flex-wrap items-start justify-between gap-4 border border-[var(--hairline)] bg-[var(--ink-2)] p-4"
              >
                <div className="space-y-1 max-w-xl">
                  <p className="font-mono-meta text-xs uppercase text-[var(--grey)]">
                    ORDER {f.sort_order} · {f.is_published ? "PUBLISHED" : "DRAFT"}
                  </p>
                  <h2 className="font-display text-base font-bold">{f.question}</h2>
                  <p className="text-xs text-[var(--grey)]">{f.answer}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => loadFaq(f)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-[var(--red)] border border-[var(--red)]/40 hover:bg-[var(--red)] hover:text-white"
                    onClick={() => handleDeleteFaq(f)}
                    disabled={saving}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={submitFaq}
            className="space-y-4 border border-[var(--hairline)] bg-[var(--ink-2)] p-6 self-start"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold">
                {faqId ? "Edit FAQ" : "Add FAQ"}
              </h2>
              {faqId && (
                <button
                  type="button"
                  onClick={resetFaqForm}
                  className="text-xs text-[var(--cyan)] underline underline-offset-4 cursor-pointer"
                >
                  New instead
                </button>
              )}
            </div>

            <FormField label="Question" id="faq-q" required>
              <input
                id="faq-q"
                type="text"
                required
                minLength={5}
                className={INPUT_CLASSES}
                value={faqQ}
                onChange={(e) => setFaqQ(e.target.value)}
              />
            </FormField>

            <FormField label="Answer" id="faq-a" required>
              <textarea
                id="faq-a"
                required
                minLength={10}
                rows={4}
                className={TEXTAREA_CLASSES}
                value={faqA}
                onChange={(e) => setFaqA(e.target.value)}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Sort order" id="faq-sort">
                <input
                  id="faq-sort"
                  type="number"
                  min={0}
                  className={INPUT_CLASSES}
                  value={faqSort}
                  onChange={(e) => setFaqSort(e.target.value)}
                />
              </FormField>
              <div className="flex items-end">
                <label className="flex min-h-[44px] items-center gap-3 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={faqPublished}
                    onChange={(e) => setFaqPublished(e.target.checked)}
                    className="h-4 w-4 accent-[var(--cyan)]"
                  />
                  <span>Published on /faq</span>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? "Saving..." : faqId ? "Update FAQ" : "Save FAQ"}
              </Button>
              {faqId && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-[var(--red)] border border-[var(--red)]/40 hover:bg-[var(--red)] hover:text-white"
                  onClick={() => {
                    const target = faqs.find((f) => f.id === faqId);
                    if (target) handleDeleteFaq(target);
                  }}
                  disabled={saving}
                >
                  Delete FAQ
                </Button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
