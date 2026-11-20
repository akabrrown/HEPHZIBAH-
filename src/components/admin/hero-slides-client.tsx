"use client";

import { ArrowDown, ArrowUp, Check, Eye, EyeOff, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HeroSlideshow } from "@/components/home/hero-slideshow";
import { Button } from "@/components/ui/button";
import {
  FormField,
  INPUT_CLASSES,
  SELECT_CLASSES,
  TEXTAREA_CLASSES,
} from "@/components/ui/form-field";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { ShotCaption } from "@/components/ui/viewfinder";
import { resolveImageUrl } from "@/lib/media";
import { useOnlineStatus } from "@/lib/use-online-status";
import type { HeroSlide } from "@/modules/hero-slides/schema";

const STUDIO_HERO_PRESETS = [
  { id: "/media/hephzibah-hero-bg.jpg", label: "Studio Team Portrait (Accra)" },
  { id: "/media/hephzibah-hero-crew.jpg", label: "Production Crew Wide" },
  { id: "/media/hephzibah-photography.webp", label: "Event Photography Still" },
];

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

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

function deriveAltFromFilename(filename: string): string {
  const stem = filename
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (stem.length >= 3) {
    return `${stem} — Hephzibah Media photography and film showcase`;
  }
  return "Hephzibah Media hero showcase photograph";
}

export function HeroSlidesClient({ initialSlides }: { initialSlides: HeroSlide[] }) {
  const router = useRouter();
  const isOnline = useOnlineStatus();

  const [slides, setSlides] = useState<HeroSlide[]>(initialSlides);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Manual / preset form
  const [showManual, setShowManual] = useState(false);
  const [manualImageId, setManualImageId] = useState(STUDIO_HERO_PRESETS[0]!.id);
  const [manualAlt, setManualAlt] = useState("");
  const [manualFocalX, setManualFocalX] = useState("50");
  const [manualFocalY, setManualFocalY] = useState("30");
  const [manualEyebrowLeft, setManualEyebrowLeft] = useState("");
  const [manualEyebrowRight, setManualEyebrowRight] = useState("");
  const [manualHeadline, setManualHeadline] = useState("");
  const [manualSubcopy, setManualSubcopy] = useState("");
  const [manualActive, setManualActive] = useState(true);

  // Inline editor state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState("");
  const [editFocalX, setEditFocalX] = useState(50);
  const [editFocalY, setEditFocalY] = useState(30);
  const [editEyebrowLeft, setEditEyebrowLeft] = useState("");
  const [editEyebrowRight, setEditEyebrowRight] = useState("");
  const [editHeadline, setEditHeadline] = useState("");
  const [editSubcopy, setEditSubcopy] = useState("");

  const activeSlides = slides.filter((s) => s.is_active);

  async function refreshFromApi() {
    const res = await fetch("/api/admin/hero-slides", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json().catch(() => null)) as { slides?: HeroSlide[] } | null;
      if (data?.slides) {
        setSlides(data.slides);
      }
    }
    router.refresh();
  }

  function startEdit(slide: HeroSlide) {
    setEditingId(slide.id);
    setEditAlt(slide.alt_text);
    setEditFocalX(slide.focal_x);
    setEditFocalY(slide.focal_y);
    setEditEyebrowLeft(slide.eyebrow_left ?? "");
    setEditEyebrowRight(slide.eyebrow_right ?? "");
    setEditHeadline(slide.headline ?? "");
    setEditSubcopy(slide.subcopy ?? "");
    setBanner(null);
  }

  async function handleMultiFileUpload(fileList: FileList | File[], inputEl?: HTMLInputElement | null) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setBanner(null);
    setBusy(true);
    let addedCount = 0;

    try {
      for (let idx = 0; idx < files.length; idx++) {
        const file = files[idx]!;
        if (file.size > MAX_UPLOAD_BYTES) {
          setBanner({
            kind: "err",
            text: `"${file.name}" exceeds the 15 MB upload limit. Resize or export a compressed JPEG/WebP.`,
          });
          return;
        }

        setUploadProgress(`Signing & uploading ${idx + 1} of ${files.length}: ${file.name}...`);

        const signRes = await fetch("/api/admin/uploads/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder: "hephzibah/hero" }),
        });
        const signData = (await signRes.json().catch(() => null)) as {
          signature?: string;
          timestamp?: number;
          folder?: string;
          cloudName?: string;
          apiKey?: string;
          maxFileSizeBytes?: number;
          allowedFormats?: string[];
        } | null;

        if (!signRes.ok || !signData?.signature || !signData.cloudName || !signData.apiKey) {
          setBanner({
            kind: "err",
            text: readErrorMessage(
              signData,
              "Cloudinary upload signing failed. Use the studio preset/ID form below if keys are absent."
            ),
          });
          return;
        }

        const serverMax =
          typeof signData.maxFileSizeBytes === "number"
            ? signData.maxFileSizeBytes
            : MAX_UPLOAD_BYTES;
        if (file.size > serverMax) {
          setBanner({
            kind: "err",
            text: `"${file.name}" exceeds the ${Math.round(serverMax / (1024 * 1024))} MB limit.`,
          });
          return;
        }

        const allowedFormats =
          Array.isArray(signData.allowedFormats) && signData.allowedFormats.length > 0
            ? signData.allowedFormats.join(",")
            : "jpg,jpeg,png,webp,avif";

        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", signData.apiKey);
        formData.append("timestamp", String(signData.timestamp));
        formData.append("signature", signData.signature);
        formData.append("folder", signData.folder ?? "hephzibah/hero");
        formData.append("allowed_formats", allowedFormats);

        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`,
          { method: "POST", body: formData }
        );
        const uploaded = (await uploadRes.json().catch(() => null)) as {
          public_id?: string;
          error?: { message?: string };
        } | null;

        if (!uploadRes.ok || !uploaded?.public_id) {
          const cloudMsg = uploaded?.error?.message;
          setBanner({
            kind: "err",
            text: cloudMsg
              ? `Cloudinary rejected "${file.name}": ${cloudMsg}`
              : `Could not upload "${file.name}" to Cloudinary.`,
          });
          return;
        }

        const createRes = await fetch("/api/admin/hero-slides", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_public_id: String(uploaded.public_id),
            alt_text: deriveAltFromFilename(file.name),
            focal_x: 50,
            focal_y: 30,
            is_active: true,
          }),
        });
        const createdData = await createRes.json().catch(() => null);
        if (!createRes.ok) {
          setBanner({
            kind: "err",
            text: readErrorMessage(createdData, `Uploaded image but failed saving slide "${file.name}".`),
          });
          return;
        }

        const createdSlide = createdData as HeroSlide;
        setSlides((prev) => [...prev, createdSlide]);
        addedCount++;
      }

      await refreshFromApi();
      setBanner({
        kind: "ok",
        text:
          addedCount === 1
            ? "1 hero slide uploaded and published to the homepage slideshow."
            : `${addedCount} hero slides uploaded and published to the homepage slideshow.`,
      });
    } catch {
      setBanner({ kind: "err", text: "Network error while uploading hero slide images." });
    } finally {
      setBusy(false);
      setUploadProgress(null);
      if (inputEl) inputEl.value = "";
    }
  }

  async function handleAddManualSlide(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    const fx = Number(manualFocalX);
    const fy = Number(manualFocalY);
    if (!Number.isInteger(fx) || fx < 0 || fx > 100 || !Number.isInteger(fy) || fy < 0 || fy > 100) {
      setBanner({ kind: "err", text: "Focal X and Y values must be integers between 0 and 100." });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/admin/hero-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_public_id: manualImageId.trim(),
          alt_text: manualAlt.trim(),
          focal_x: fx,
          focal_y: fy,
          eyebrow_left: manualEyebrowLeft.trim() || null,
          eyebrow_right: manualEyebrowRight.trim() || null,
          headline: manualHeadline.trim() || null,
          subcopy: manualSubcopy.trim() || null,
          is_active: manualActive,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setBanner({ kind: "err", text: readErrorMessage(data, "Could not save hero slide.") });
        return;
      }

      setManualAlt("");
      setManualEyebrowLeft("");
      setManualEyebrowRight("");
      setManualHeadline("");
      setManualSubcopy("");
      setShowManual(false);
      await refreshFromApi();
      setBanner({ kind: "ok", text: "Hero slide added to slideshow." });
    } catch {
      setBanner({ kind: "err", text: "Network error while adding hero slide." });
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit(slideId: string) {
    if (editAlt.trim().length < 3) {
      setBanner({ kind: "err", text: "Alt text must be at least 3 characters." });
      return;
    }
    setBusy(true);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/hero-slides", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: slideId,
          alt_text: editAlt.trim(),
          focal_x: editFocalX,
          focal_y: editFocalY,
          eyebrow_left: editEyebrowLeft.trim() || null,
          eyebrow_right: editEyebrowRight.trim() || null,
          headline: editHeadline.trim() || null,
          subcopy: editSubcopy.trim() || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setBanner({ kind: "err", text: readErrorMessage(data, "Could not update hero slide.") });
        return;
      }
      setEditingId(null);
      await refreshFromApi();
      setBanner({ kind: "ok", text: "Hero slide details updated." });
    } catch {
      setBanner({ kind: "err", text: "Network error updating hero slide." });
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive(slide: HeroSlide) {
    setBusy(true);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/hero-slides", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: slide.id, is_active: !slide.is_active }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setBanner({ kind: "err", text: readErrorMessage(data, "Could not update slide visibility.") });
        return;
      }
      await refreshFromApi();
      setBanner({
        kind: "ok",
        text: slide.is_active ? "Slide hidden from homepage." : "Slide published on homepage.",
      });
    } catch {
      setBanner({ kind: "err", text: "Network error toggling slide visibility." });
    } finally {
      setBusy(false);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;

    const reordered = [...slides];
    const [moved] = reordered.splice(index, 1);
    if (!moved) return;
    reordered.splice(target, 0, moved);

    setBusy(true);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/hero-slides", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reorder",
          orderedIds: reordered.map((s) => s.id),
        }),
      });
      const data = (await res.json().catch(() => null)) as { slides?: HeroSlide[] } | null;
      if (!res.ok) {
        setBanner({ kind: "err", text: readErrorMessage(data, "Could not reorder slides.") });
        return;
      }
      if (data?.slides) {
        setSlides(data.slides);
      } else {
        setSlides(reordered);
      }
      router.refresh();
      setBanner({ kind: "ok", text: "Slideshow order updated." });
    } catch {
      setBanner({ kind: "err", text: "Network error reordering slides." });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(slide: HeroSlide) {
    if (!window.confirm(`Delete slide "${slide.alt_text}" from the homepage slideshow?`)) {
      return;
    }
    setBusy(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/hero-slides?id=${encodeURIComponent(slide.id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setBanner({ kind: "err", text: readErrorMessage(data, "Could not delete hero slide.") });
        return;
      }
      if (editingId === slide.id) setEditingId(null);
      setSlides((prev) => prev.filter((s) => s.id !== slide.id));
      router.refresh();
      setBanner({ kind: "ok", text: "Hero slide removed." });
    } catch {
      setBanner({ kind: "err", text: "Network error deleting hero slide." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <OfflineBanner />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <ShotCaption
            parts={[
              "CONTENT DESK",
              "HOMEPAGE HERO SLIDESHOW",
              `${activeSlides.length} ACTIVE / ${slides.length} TOTAL`,
            ]}
          />
          <h1 className="mt-2 font-display text-3xl font-extrabold">Hero slideshow pictures</h1>
          <p className="mt-1 text-sm text-[var(--grey)]">
            Upload wide landscape frames for the rounded homepage hero slideshow. Leave copy fields blank to keep the default headline and circular Book CTA.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          disabled={busy || !isOnline}
          onClick={() => setShowManual((v) => !v)}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>{showManual ? "Hide preset/ID form" : "Add preset or Cloudinary ID"}</span>
        </Button>
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

      {/* Multi-file Cloudinary uploader */}
      <section
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy && isOnline) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (busy || !isOnline) return;
          if (e.dataTransfer.files?.length) {
            void handleMultiFileUpload(e.dataTransfer.files);
          }
        }}
        className={`border-2 border-dashed p-6 transition-colors ${
          isDragging
            ? "border-[var(--cyan)] bg-[var(--ink-3)]"
            : "border-[var(--control-border)] bg-[var(--ink-2)]"
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-display text-lg font-bold">
              <Upload className="h-5 w-5 text-[var(--cyan)]" aria-hidden="true" />
              <h2>Upload slideshow images (JPEG, PNG, WebP, AVIF)</h2>
            </div>
            <p className="text-xs text-[var(--grey)]">
              Select or drag multiple wide photos (recommended 1920×1080 or 16:9 landscape, max 15 MB each). Slides publish immediately in order.
            </p>
            {uploadProgress && (
              <p role="status" className="font-mono-meta text-xs text-[var(--cyan)] pt-1">
                {uploadProgress}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="hero-slide-upload-input"
              className="sr-only"
            >
              Choose hero slideshow images
            </label>
            <input
              id="hero-slide-upload-input"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={busy || !isOnline}
              onChange={(e) => {
                const inputEl = e.currentTarget;
                const selected = inputEl.files;
                if (selected && selected.length > 0) {
                  void handleMultiFileUpload(selected, inputEl);
                }
              }}
              className="block text-xs text-[var(--grey)] file:mr-3 file:min-h-[44px] file:cursor-pointer file:border file:border-[var(--control-border)] file:bg-[var(--black)] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-[var(--white)] hover:file:border-[var(--cyan)] disabled:opacity-50"
            />
          </div>
        </div>
      </section>

      {/* Collapsible preset / manual ID form */}
      {showManual && (
        <form
          onSubmit={handleAddManualSlide}
          className="space-y-5 border border-[var(--hairline)] bg-[var(--ink-2)] p-6"
        >
          <h2 className="font-display text-lg font-bold">Add hero slide by studio preset or Cloudinary ID</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Studio asset preset" id="hero-preset">
              <select
                id="hero-preset"
                className={SELECT_CLASSES}
                value={STUDIO_HERO_PRESETS.some((p) => p.id === manualImageId) ? manualImageId : ""}
                onChange={(e) => {
                  if (e.target.value) setManualImageId(e.target.value);
                }}
              >
                <option value="">Custom path / Cloudinary ID</option>
                {STUDIO_HERO_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Image path or Cloudinary public ID" id="hero-public-id" required>
              <input
                id="hero-public-id"
                type="text"
                required
                className={`${INPUT_CLASSES} font-mono-meta`}
                value={manualImageId}
                onChange={(e) => setManualImageId(e.target.value)}
                placeholder="hephzibah/hero/my-slide"
              />
            </FormField>

            <FormField label="Accessible alt text" id="hero-alt" required>
              <input
                id="hero-alt"
                type="text"
                required
                minLength={3}
                maxLength={300}
                className={INPUT_CLASSES}
                value={manualAlt}
                onChange={(e) => setManualAlt(e.target.value)}
                placeholder="Bride and groom portrait under cathedral light in Accra"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Focal X (%)" id="hero-fx">
                <input
                  id="hero-fx"
                  type="number"
                  min={0}
                  max={100}
                  className={INPUT_CLASSES}
                  value={manualFocalX}
                  onChange={(e) => setManualFocalX(e.target.value)}
                />
              </FormField>
              <FormField label="Focal Y (%)" id="hero-fy">
                <input
                  id="hero-fy"
                  type="number"
                  min={0}
                  max={100}
                  className={INPUT_CLASSES}
                  value={manualFocalY}
                  onChange={(e) => setManualFocalY(e.target.value)}
                />
              </FormField>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Top-left eyebrow (optional)" id="hero-eb-l">
              <input
                id="hero-eb-l"
                type="text"
                maxLength={80}
                className={INPUT_CLASSES}
                value={manualEyebrowLeft}
                onChange={(e) => setManualEyebrowLeft(e.target.value)}
                placeholder="PHOTOGRAPHY · FILM · DESIGN"
              />
            </FormField>
            <FormField label="Top-right location tag (optional)" id="hero-eb-r">
              <input
                id="hero-eb-r"
                type="text"
                maxLength={80}
                className={INPUT_CLASSES}
                value={manualEyebrowRight}
                onChange={(e) => setManualEyebrowRight(e.target.value)}
                placeholder="ACCRA / GHANA / WORLDWIDE"
              />
            </FormField>
            <FormField label="Headline override (optional)" id="hero-headline">
              <input
                id="hero-headline"
                type="text"
                maxLength={120}
                className={INPUT_CLASSES}
                value={manualHeadline}
                onChange={(e) => setManualHeadline(e.target.value)}
                placeholder="Discover stories made to last."
              />
            </FormField>
            <FormField label="Right summary copy override (optional)" id="hero-subcopy">
              <input
                id="hero-subcopy"
                type="text"
                maxLength={280}
                className={INPUT_CLASSES}
                value={manualSubcopy}
                onChange={(e) => setManualSubcopy(e.target.value)}
                placeholder="Leave blank to use default studio intro"
              />
            </FormField>
          </div>

          <label className="flex min-h-[44px] items-center gap-3 text-sm text-[var(--white)] cursor-pointer">
            <input
              type="checkbox"
              checked={manualActive}
              onChange={(e) => setManualActive(e.target.checked)}
              className="h-4 w-4 accent-[var(--cyan)]"
            />
            <span>Publish immediately in homepage hero slideshow</span>
          </label>

          <Button type="submit" variant="primary" disabled={busy || !isOnline}>
            {busy ? "Saving slide..." : "Add hero slide"}
          </Button>
        </form>
      )}

      {/* Live Preview Stage */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ShotCaption parts={["LIVE PREVIEW", `${activeSlides.length} PUBLISHED SLIDE(S)`]} />
          <p className="text-xs text-[var(--grey)]">
            {activeSlides.length === 0
              ? "Showing built-in fallback image until an active slide is uploaded."
              : "Preview reflects active slides, order, and focal points."}
          </p>
        </div>
        <HeroSlideshow slides={activeSlides} compactPreview />
      </section>

      {/* Managed Slide List */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold">
          All hero slides ({slides.length})
        </h2>

        {slides.length === 0 ? (
          <div className="border border-[var(--hairline)] bg-[var(--ink-2)] p-8 text-sm text-[var(--grey)] space-y-2">
            <p className="font-semibold text-[var(--white)]">No custom slideshow pictures uploaded yet.</p>
            <p>
              The homepage is currently showing the built-in studio hero image so visitors still see the new editorial rounded design. Upload one or more photos above whenever you are ready to replace or rotate it.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {slides.map((slide, idx) => {
              const isEditing = editingId === slide.id;
              return (
                <article
                  key={slide.id}
                  className="border border-[var(--hairline)] bg-[var(--ink-2)] p-4 sm:p-5 space-y-4"
                >
                  <div className="grid gap-4 md:grid-cols-[240px_1fr]">
                    <div className="aspect-[16/9] overflow-hidden border border-[var(--hairline)] bg-[var(--black)]">
                      <img
                        src={resolveImageUrl(slide.image_public_id, { width: 640 })}
                        alt={slide.alt_text}
                        loading="lazy"
                        style={{ objectPosition: `${slide.focal_x}% ${slide.focal_y}%` }}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="flex flex-col justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 font-mono-meta text-xs uppercase">
                            <span className="text-[var(--white)] font-bold">#{idx + 1}</span>
                            <span
                              className={`border px-2 py-0.5 ${
                                slide.is_active
                                  ? "border-[var(--cyan)] text-[var(--cyan)]"
                                  : "border-[var(--control-border)] text-[var(--grey)]"
                              }`}
                            >
                              {slide.is_active ? "ACTIVE" : "HIDDEN"}
                            </span>
                            <span className="text-[var(--grey)]">
                              Focus {slide.focal_x}% × {slide.focal_y}%
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              disabled={busy || idx === 0}
                              aria-label="Move slide earlier"
                              onClick={() => handleMove(idx, -1)}
                              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center border border-[var(--control-border)] text-[var(--white)] hover:border-[var(--cyan)] disabled:opacity-40 cursor-pointer"
                            >
                              <ArrowUp className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              disabled={busy || idx === slides.length - 1}
                              aria-label="Move slide later"
                              onClick={() => handleMove(idx, 1)}
                              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center border border-[var(--control-border)] text-[var(--white)] hover:border-[var(--cyan)] disabled:opacity-40 cursor-pointer"
                            >
                              <ArrowDown className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleToggleActive(slide)}
                              className="inline-flex min-h-[44px] items-center gap-1.5 border border-[var(--control-border)] px-3 text-xs font-medium text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)] disabled:opacity-40 cursor-pointer"
                            >
                              {slide.is_active ? (
                                <>
                                  <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Hide</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Publish</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => (isEditing ? setEditingId(null) : startEdit(slide))}
                              className="inline-flex min-h-[44px] items-center gap-1.5 border border-[var(--control-border)] px-3 text-xs font-medium text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)] disabled:opacity-40 cursor-pointer"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>{isEditing ? "Close" : "Edit"}</span>
                            </button>
                            <Button
                              type="button"
                              variant="danger"
                              className="min-h-[44px] px-3 py-2 text-xs"
                              disabled={busy}
                              onClick={() => handleDelete(slide)}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Delete</span>
                            </Button>
                          </div>
                        </div>

                        <p className="text-sm font-medium text-[var(--white)]">{slide.alt_text}</p>
                        <p className="font-mono-meta text-xs text-[var(--grey)] break-all">
                          Asset: {slide.image_public_id}
                        </p>
                        {(slide.headline || slide.subcopy) && (
                          <p className="text-xs text-[var(--grey)]">
                            Custom copy: {slide.headline ?? "(default headline)"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="space-y-4 border-t border-[var(--hairline)] pt-4">
                      <FormField label="Alt text" id={`edit-alt-${slide.id}`} required>
                        <input
                          id={`edit-alt-${slide.id}`}
                          type="text"
                          minLength={3}
                          maxLength={300}
                          className={INPUT_CLASSES}
                          value={editAlt}
                          onChange={(e) => setEditAlt(e.target.value)}
                        />
                      </FormField>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor={`edit-fx-${slide.id}`}
                            className="mb-1.5 flex justify-between text-xs font-semibold text-[var(--white)]"
                          >
                            <span>Horizontal crop focal point</span>
                            <span className="font-mono-meta text-[var(--cyan)]">{editFocalX}%</span>
                          </label>
                          <input
                            id={`edit-fx-${slide.id}`}
                            type="range"
                            min={0}
                            max={100}
                            value={editFocalX}
                            onChange={(e) => setEditFocalX(Number(e.target.value))}
                            className="w-full accent-[var(--cyan)] cursor-pointer"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`edit-fy-${slide.id}`}
                            className="mb-1.5 flex justify-between text-xs font-semibold text-[var(--white)]"
                          >
                            <span>Vertical crop focal point (subjects/faces)</span>
                            <span className="font-mono-meta text-[var(--cyan)]">{editFocalY}%</span>
                          </label>
                          <input
                            id={`edit-fy-${slide.id}`}
                            type="range"
                            min={0}
                            max={100}
                            value={editFocalY}
                            onChange={(e) => setEditFocalY(Number(e.target.value))}
                            className="w-full accent-[var(--cyan)] cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField label="Top-left eyebrow (optional)" id={`edit-ebl-${slide.id}`}>
                          <input
                            id={`edit-ebl-${slide.id}`}
                            type="text"
                            maxLength={80}
                            className={INPUT_CLASSES}
                            value={editEyebrowLeft}
                            onChange={(e) => setEditEyebrowLeft(e.target.value)}
                            placeholder="PHOTOGRAPHY · FILM · DESIGN"
                          />
                        </FormField>
                        <FormField label="Top-right tag (optional)" id={`edit-ebr-${slide.id}`}>
                          <input
                            id={`edit-ebr-${slide.id}`}
                            type="text"
                            maxLength={80}
                            className={INPUT_CLASSES}
                            value={editEyebrowRight}
                            onChange={(e) => setEditEyebrowRight(e.target.value)}
                            placeholder="ACCRA / GHANA / WORLDWIDE"
                          />
                        </FormField>
                        <FormField label="Headline override (optional)" id={`edit-hl-${slide.id}`}>
                          <input
                            id={`edit-hl-${slide.id}`}
                            type="text"
                            maxLength={120}
                            className={INPUT_CLASSES}
                            value={editHeadline}
                            onChange={(e) => setEditHeadline(e.target.value)}
                            placeholder="Discover stories made to last."
                          />
                        </FormField>
                        <FormField label="Summary override (optional)" id={`edit-sc-${slide.id}`}>
                          <textarea
                            id={`edit-sc-${slide.id}`}
                            rows={2}
                            maxLength={280}
                            className={TEXTAREA_CLASSES}
                            value={editSubcopy}
                            onChange={(e) => setEditSubcopy(e.target.value)}
                            placeholder="Leave blank for default studio description"
                          />
                        </FormField>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="button"
                          variant="primary"
                          disabled={busy}
                          onClick={() => handleSaveEdit(slide.id)}
                        >
                          <Check className="h-4 w-4" aria-hidden="true" />
                          <span>Save slide changes</span>
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
