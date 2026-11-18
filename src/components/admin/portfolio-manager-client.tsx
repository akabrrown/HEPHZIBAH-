"use client";

import { ArrowDown, ArrowUp, Check, Film, ImagePlus, Plus, Star, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  FormField,
  INPUT_CLASSES,
  SELECT_CLASSES,
  TEXTAREA_CLASSES,
} from "@/components/ui/form-field";
import { ShotCaption } from "@/components/ui/viewfinder";
import { formatDisplayDate } from "@/lib/dates";
import { parseVideoUrl, resolveImageUrl } from "@/lib/media";
import { serviceKindValues, type Occasion, type ServiceKind } from "@/modules/catalog/schema";
import type { MediaAsset, PortfolioItem } from "@/modules/portfolio/schema";

const LOCAL_STUDIO_ASSETS = [
  { id: "local/traditional-marriage-hero", label: "Traditional marriage hero", width: 1600, height: 1000 },
  { id: "local/traditional-marriage-detail", label: "Traditional marriage detail", width: 1200, height: 1500 },
  { id: "local/cathedral-wedding-cover", label: "Cathedral wedding cover", width: 1600, height: 1000 },
  { id: "local/corporate-summit-cover", label: "Corporate summit cover", width: 1600, height: 1000 },
  { id: "local/videography-showreel-poster", label: "Videography showreel poster", width: 1600, height: 900 },
  { id: "local/design-identity-cover", label: "Brand identity cover", width: 1600, height: 1000 },
  { id: "local/memorial-tribute-cover", label: "Memorial tribute cover", width: 1600, height: 1000 },
];

function slugifyTitle(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

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

export function PortfolioListClient({
  initialItems,
  occasions,
}: {
  initialItems: PortfolioItem[];
  occasions: Occasion[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [filterKind, setFilterKind] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);

  const [kind, setKind] = useState<ServiceKind>("photography");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [summary, setSummary] = useState("");
  const [occasionId, setOccasionId] = useState("");
  const [shotOn, setShotOn] = useState("");
  const [locationText, setLocationText] = useState("Accra");
  const [isFeatured, setIsFeatured] = useState(false);
  const [consent, setConsent] = useState(false);
  const [consentNote, setConsentNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleItems =
    filterKind === "all" ? items : items.filter((item) => item.kind === filterKind);

  async function handleCreateDraft(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/portfolio-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title: title.trim(),
          slug: slug.trim() || slugifyTitle(title),
          summary: summary.trim() || null,
          occasion_id: occasionId || null,
          shot_on: shotOn || null,
          location_text: locationText.trim() || null,
          status: "draft",
          is_featured: isFeatured,
          sort_order: items.length + 1,
          client_consent_to_publish: consent,
          consent_note: consentNote.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(readErrorMessage(data, "Could not create draft portfolio item."));
        return;
      }
      const created = data as PortfolioItem;
      setItems((prev) => [created, ...prev]);
      router.push(`/admin/portfolio/${created.id}`);
      router.refresh();
    } catch {
      setError("Network error while creating portfolio item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(itemToDelete: PortfolioItem) {
    const confirmMsg = `Permanently delete "${itemToDelete.title}" and all attached gallery frames? This action cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/portfolio-items/${itemToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(readErrorMessage(data, "Could not delete portfolio item."));
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
      router.refresh();
    } catch {
      setError("Network error while deleting portfolio item.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <ShotCaption parts={["CONTENT DESK", "PORTFOLIO ARCHIVE", `${items.length} ITEMS`]} />
          <h1 className="mt-2 font-display text-3xl font-extrabold">Portfolio manager</h1>
          <p className="mt-1 text-sm text-[var(--grey)]">
            Create draft galleries, attach high-resolution stills or video embeds with alt text, and publish once client consent is recorded.
          </p>
        </div>
        <Button type="button" variant="primary" onClick={() => setShowCreate((v) => !v)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>{showCreate ? "Close form" : "New portfolio draft"}</span>
        </Button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreateDraft}
          className="space-y-4 border border-[var(--hairline)] bg-[var(--ink-2)] p-6"
        >
          <h2 className="font-display text-lg font-bold">New portfolio item (starts as draft)</h2>
          {error && (
            <div role="alert" className="border border-[var(--red)] bg-[var(--black)] p-3 text-xs text-[var(--red)]">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Service kind" id="new-pf-kind" required>
              <select
                id="new-pf-kind"
                className={SELECT_CLASSES}
                value={kind}
                onChange={(e) => setKind(e.target.value as ServiceKind)}
              >
                {serviceKindValues.map((k) => (
                  <option key={k} value={k}>
                    {k.toUpperCase()}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Occasion (optional)" id="new-pf-occasion">
              <select
                id="new-pf-occasion"
                className={SELECT_CLASSES}
                value={occasionId}
                onChange={(e) => setOccasionId(e.target.value)}
              >
                <option value="">None / general</option>
                {occasions.map((occ) => (
                  <option key={occ.id} value={occ.id}>
                    {occ.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Title" id="new-pf-title" required>
              <input
                id="new-pf-title"
                type="text"
                required
                minLength={3}
                maxLength={160}
                className={INPUT_CLASSES}
                value={title}
                onChange={(e) => {
                  const val = e.target.value;
                  setTitle(val);
                  if (!slugTouched) {
                    setSlug(slugifyTitle(val));
                  }
                }}
                placeholder="e.g. Mensah-Osei Traditional Engagement, East Legon"
              />
            </FormField>

            <FormField
              label="URL slug"
              id="new-pf-slug"
              required
              helpText="Lowercase letters, numbers, and hyphens only."
            >
              <input
                id="new-pf-slug"
                type="text"
                required
                className={`${INPUT_CLASSES} font-mono-meta`}
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                placeholder="mensah-osei-engagement"
              />
            </FormField>

            <FormField label="Shot date (optional)" id="new-pf-date">
              <input
                id="new-pf-date"
                type="date"
                className={INPUT_CLASSES}
                value={shotOn}
                onChange={(e) => setShotOn(e.target.value)}
              />
            </FormField>

            <FormField label="Location" id="new-pf-location">
              <input
                id="new-pf-location"
                type="text"
                className={INPUT_CLASSES}
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                placeholder="Accra / Kumasi / Takoradi"
              />
            </FormField>
          </div>

          <FormField label="Editorial summary" id="new-pf-summary">
            <textarea
              id="new-pf-summary"
              rows={3}
              className={TEXTAREA_CLASSES}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief story of the commission, lighting approach, and final deliverables."
            />
          </FormField>

          <div className="grid gap-4 border-t border-[var(--hairline)] pt-4 md:grid-cols-2">
            <label className="flex min-h-[44px] items-center gap-3 text-sm text-[var(--white)] cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="h-4 w-4 accent-[var(--cyan)]"
              />
              <span>Feature on home page / top showcase</span>
            </label>

            <label className="flex min-h-[44px] items-center gap-3 text-sm text-[var(--white)] cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="h-4 w-4 accent-[var(--cyan)]"
              />
              <span>Written client consent obtained to publish publicly</span>
            </label>
          </div>

          {consent && (
            <FormField label="Consent note / reference" id="new-pf-consent-note">
              <input
                id="new-pf-consent-note"
                type="text"
                className={INPUT_CLASSES}
                value={consentNote}
                onChange={(e) => setConsentNote(e.target.value)}
                placeholder="e.g. Written release signed on delivery email"
              />
            </FormField>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Creating draft..." : "Create draft & add media"}
            </Button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        {(["all", ...serviceKindValues] as const).map((k) => {
          const active = filterKind === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setFilterKind(k)}
              className={`min-h-[44px] border px-4 text-xs font-mono-meta uppercase tracking-wider cursor-pointer ${
                active
                  ? "border-[var(--cyan)] bg-[var(--ink-2)] text-[var(--cyan)]"
                  : "border-[var(--control-border)] text-[var(--white)] hover:border-[var(--cyan)]"
              }`}
            >
              {k === "all" ? `All (${items.length})` : k}
            </button>
          );
        })}
      </div>

      {visibleItems.length === 0 ? (
        <div className="border border-[var(--hairline)] bg-[var(--ink-2)] p-8 text-sm text-[var(--grey)]">
          No portfolio items match this filter yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item) => {
            const cover = item.cover_asset;
            const thumbId =
              cover?.type === "video_embed" ? cover.poster_public_id : cover?.cloudinary_public_id;
            return (
              <div
                key={item.id}
                className="flex flex-col border border-[var(--hairline)] bg-[var(--ink-2)]"
              >
                <div className="aspect-[16/10] w-full overflow-hidden border-b border-[var(--hairline)] bg-[var(--black)]">
                  <img
                    src={resolveImageUrl(thumbId)}
                    alt={cover?.alt_text ?? item.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between gap-4 p-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono-meta text-[11px] uppercase tracking-wider">
                      <span className="text-[var(--grey)]">
                        {item.kind} · {item.media_count ?? 0} MEDIA
                      </span>
                      <span
                        className={
                          item.status === "published"
                            ? "text-[var(--cyan)]"
                            : "text-[var(--grey)]"
                        }
                      >
                        {item.status}
                        {item.is_featured ? " · FEATURED" : ""}
                      </span>
                    </div>
                    <h2 className="font-display text-lg font-bold leading-snug text-[var(--white)]">
                      {item.title}
                    </h2>
                    <p className="text-xs text-[var(--grey)]">
                      {item.occasion_name ?? "General"} ·{" "}
                      {item.shot_on ? formatDisplayDate(item.shot_on) : "Undated"} · Consent:{" "}
                      {item.client_consent_to_publish ? "Yes" : "Pending"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--hairline)] pt-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/portfolio/${item.id}`}
                        className="inline-flex min-h-[44px] items-center text-sm font-medium text-[var(--cyan)] underline underline-offset-4"
                      >
                        Edit &amp; manage media
                      </Link>
                      {item.status === "published" && (
                        <Link
                          href={`/portfolio/${item.slug}`}
                          target="_blank"
                          className="inline-flex min-h-[44px] items-center text-xs text-[var(--grey)] hover:text-[var(--white)]"
                        >
                          View live
                        </Link>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item)}
                      className="inline-flex min-h-[44px] items-center gap-1 text-xs text-[var(--red)] hover:underline cursor-pointer"
                      title="Permanently delete item"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PortfolioDetailClient({
  initialItem,
  occasions,
}: {
  initialItem: PortfolioItem;
  occasions: Occasion[];
}) {
  const router = useRouter();
  const [item, setItem] = useState<PortfolioItem>(initialItem);
  const [assets, setAssets] = useState<MediaAsset[]>(initialItem.media_assets ?? []);

  const [kind, setKind] = useState<ServiceKind>(initialItem.kind);
  const [title, setTitle] = useState(initialItem.title);
  const [slug, setSlug] = useState(initialItem.slug);
  const [summary, setSummary] = useState(initialItem.summary ?? "");
  const [occasionId, setOccasionId] = useState(initialItem.occasion_id ?? "");
  const [shotOn, setShotOn] = useState(initialItem.shot_on ?? "");
  const [locationText, setLocationText] = useState(initialItem.location_text ?? "");
  const [isFeatured, setIsFeatured] = useState(initialItem.is_featured);
  const [sortOrder, setSortOrder] = useState(String(initialItem.sort_order));
  const [consent, setConsent] = useState(initialItem.client_consent_to_publish);
  const [consentNote, setConsentNote] = useState(initialItem.consent_note ?? "");

  const [savingItem, setSavingItem] = useState(false);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Add Image state
  const [imagePublicId, setImagePublicId] = useState(LOCAL_STUDIO_ASSETS[0]!.id);
  const [imageWidth, setImageWidth] = useState(String(LOCAL_STUDIO_ASSETS[0]!.width));
  const [imageHeight, setImageHeight] = useState(String(LOCAL_STUDIO_ASSETS[0]!.height));
  const [imageAlt, setImageAlt] = useState("");
  const [imageCaption, setImageCaption] = useState("");
  const [imageCover, setImageCover] = useState(assets.length === 0);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Add Video embed state
  const [videoUrl, setVideoUrl] = useState("");
  const [videoPoster, setVideoPoster] = useState("local/videography-showreel-poster");
  const [videoAlt, setVideoAlt] = useState("");
  const [videoDuration, setVideoDuration] = useState("");
  const [videoCaption, setVideoCaption] = useState("");
  const [videoCover, setVideoCover] = useState(false);

  // Inline edits per existing media row
  const [altEdits, setAltEdits] = useState<Record<string, string>>(
    Object.fromEntries(assets.map((a) => [a.id, a.alt_text ?? ""]))
  );
  const [captionEdits, setCaptionEdits] = useState<Record<string, string>>(
    Object.fromEntries(assets.map((a) => [a.id, a.caption ?? ""]))
  );

  const hasConsent = consent;
  const hasMedia = assets.length > 0;
  const allAssetsHaveAlt = assets.length > 0 && assets.every((a) => (a.alt_text ?? "").trim().length >= 3);
  const canPublish = hasConsent && hasMedia && allAssetsHaveAlt;

  async function refreshItem() {
    const res = await fetch(`/api/admin/portfolio-items/${item.id}`, { cache: "no-store" });
    if (res.ok) {
      const fresh = (await res.json()) as PortfolioItem;
      setItem(fresh);
      const nextAssets = fresh.media_assets ?? [];
      setAssets(nextAssets);
      setAltEdits(Object.fromEntries(nextAssets.map((a) => [a.id, a.alt_text ?? ""])));
      setCaptionEdits(Object.fromEntries(nextAssets.map((a) => [a.id, a.caption ?? ""])));
    }
    router.refresh();
  }

  async function savePortfolio(targetStatus: "draft" | "published") {
    setSavingItem(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/portfolio-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title: title.trim(),
          slug: slug.trim(),
          summary: summary.trim() || null,
          occasion_id: occasionId || null,
          shot_on: shotOn || null,
          location_text: locationText.trim() || null,
          status: targetStatus,
          is_featured: isFeatured,
          sort_order: Number(sortOrder) || 0,
          client_consent_to_publish: consent,
          consent_note: consentNote.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ kind: "err", text: readErrorMessage(data, "Could not update portfolio item.") });
        return;
      }
      await refreshItem();
      setBanner({
        kind: "ok",
        text:
          targetStatus === "published"
            ? "Portfolio item published to live showcase."
            : "Portfolio item saved as draft.",
      });
    } catch {
      setBanner({ kind: "err", text: "Network error saving portfolio item." });
    } finally {
      setSavingItem(false);
    }
  }

  async function handleDeletePortfolioItem() {
    const confirmMsg = `Permanently delete "${item.title}" and all ${assets.length} attached gallery frame(s)? This action cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;
    setSavingItem(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/portfolio-items/${item.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setBanner({ kind: "err", text: readErrorMessage(data, "Could not delete portfolio item.") });
        setSavingItem(false);
        return;
      }
      router.push("/admin/portfolio");
      router.refresh();
    } catch {
      setBanner({ kind: "err", text: "Network error deleting portfolio item." });
      setSavingItem(false);
    }
  }

  async function handleFileUpload(file: File) {
    setUploadingFile(true);
    setBanner(null);
    try {
      const signRes = await fetch("/api/admin/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "hephzibah/portfolio" }),
      });
      const signData = await signRes.json();
      if (!signRes.ok) {
        setBanner({
          kind: "err",
          text: readErrorMessage(
            signData,
            "Cloudinary keys are not configured; select a studio local asset preset below."
          ),
        });
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", signData.apiKey);
      formData.append("timestamp", String(signData.timestamp));
      formData.append("signature", signData.signature);
      formData.append("folder", signData.folder);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`,
        { method: "POST", body: formData }
      );
      const uploaded = await uploadRes.json();
      if (!uploadRes.ok || !uploaded.public_id) {
        setBanner({ kind: "err", text: "Cloudinary upload failed. Try again or use a studio asset ID." });
        return;
      }

      setImagePublicId(String(uploaded.public_id));
      if (uploaded.width) setImageWidth(String(uploaded.width));
      if (uploaded.height) setImageHeight(String(uploaded.height));
      setBanner({ kind: "ok", text: `Uploaded ${uploaded.public_id}. Add alt text and attach to gallery.` });
    } catch {
      setBanner({ kind: "err", text: "Upload failed. Check connection or use a studio asset ID." });
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleAddImage(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    const res = await fetch(`/api/admin/portfolio-items/${item.id}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "image",
        position: assets.length,
        is_cover: imageCover,
        cloudinary_public_id: imagePublicId.trim(),
        width: Number(imageWidth) || null,
        height: Number(imageHeight) || null,
        alt_text: imageAlt.trim(),
        caption: imageCaption.trim() || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setBanner({ kind: "err", text: readErrorMessage(data, "Could not add image asset.") });
      return;
    }
    setImageAlt("");
    setImageCaption("");
    setImageCover(false);
    await refreshItem();
    setBanner({ kind: "ok", text: "Image frame added to gallery." });
  }

  async function handleAddVideo(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    const parsed = parseVideoUrl(videoUrl);
    if (!parsed) {
      setBanner({ kind: "err", text: "Enter a full YouTube or Vimeo link (https://youtube.com/... or https://vimeo.com/...)." });
      return;
    }
    const res = await fetch(`/api/admin/portfolio-items/${item.id}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "video_embed",
        position: assets.length,
        is_cover: videoCover,
        video_provider: parsed.provider,
        video_id: parsed.videoId,
        poster_public_id: videoPoster.trim(),
        alt_text: videoAlt.trim(),
        duration_seconds: videoDuration ? Number(videoDuration) : null,
        caption: videoCaption.trim() || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setBanner({ kind: "err", text: readErrorMessage(data, "Could not attach video embed.") });
      return;
    }
    setVideoUrl("");
    setVideoAlt("");
    setVideoDuration("");
    setVideoCaption("");
    setVideoCover(false);
    await refreshItem();
    setBanner({ kind: "ok", text: "Video embed attached." });
  }

  async function handleUpdateMedia(
    mediaId: string,
    payload: { is_cover?: boolean; position?: number; alt_text?: string; caption?: string | null }
  ) {
    setBanner(null);
    const res = await fetch(`/api/admin/portfolio-items/${item.id}/media`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaId, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) {
      setBanner({ kind: "err", text: readErrorMessage(data, "Could not update media asset.") });
      return;
    }
    await refreshItem();
    setBanner({ kind: "ok", text: "Media asset updated." });
  }

  async function handleMoveMedia(index: number, direction: -1 | 1) {
    const targetIdx = index + direction;
    const current = assets[index];
    const swap = assets[targetIdx];
    if (!current || !swap) return;
    await handleUpdateMedia(current.id, { position: swap.position });
    await handleUpdateMedia(swap.id, { position: current.position });
  }

  async function handleDeleteMedia(mediaId: string) {
    setBanner(null);
    const res = await fetch(`/api/admin/portfolio-items/${item.id}/media?mediaId=${encodeURIComponent(mediaId)}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      setBanner({ kind: "err", text: readErrorMessage(data, "Could not delete media asset.") });
      return;
    }
    await refreshItem();
    setBanner({ kind: "ok", text: "Media frame removed." });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <ShotCaption
            parts={[
              "PORTFOLIO EDITOR",
              item.kind.toUpperCase(),
              item.status.toUpperCase(),
              `${assets.length} FRAMES`,
            ]}
          />
          <h1 className="mt-2 font-display text-3xl font-extrabold">{item.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/admin/portfolio" variant="secondary">
            Back to portfolio
          </ButtonLink>
          {item.status === "published" && (
            <ButtonLink href={`/portfolio/${item.slug}`} variant="secondary">
              View live page
            </ButtonLink>
          )}
          <Button
            type="button"
            variant="ghost"
            className="text-[var(--red)] border border-[var(--red)]/40 hover:bg-[var(--red)] hover:text-white"
            onClick={handleDeletePortfolioItem}
            disabled={savingItem}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span>Delete item</span>
          </Button>
        </div>
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

      {/* Publishing Gate & Metadata */}
      <section className="space-y-6 border border-[var(--hairline)] bg-[var(--ink-2)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--hairline)] pb-4">
          <div>
            <h2 className="font-display text-lg font-bold">Item details &amp; publication gate</h2>
            <p className="text-xs text-[var(--grey)]">
              Items stay hidden from visitors until consent, media, and alt text checks are satisfied.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 font-mono-meta text-xs">
            <span className={hasConsent ? "text-[var(--cyan)]" : "text-[var(--grey)]"}>
              {hasConsent ? "[✓]" : "[ ]"} Client consent
            </span>
            <span className={hasMedia ? "text-[var(--cyan)]" : "text-[var(--grey)]"}>
              {hasMedia ? "[✓]" : "[ ]"} Media ({assets.length})
            </span>
            <span className={allAssetsHaveAlt ? "text-[var(--cyan)]" : "text-[var(--grey)]"}>
              {allAssetsHaveAlt ? "[✓]" : "[ ]"} Alt text on all frames
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Service kind" id="edit-pf-kind" required>
            <select
              id="edit-pf-kind"
              className={SELECT_CLASSES}
              value={kind}
              onChange={(e) => setKind(e.target.value as ServiceKind)}
            >
              {serviceKindValues.map((k) => (
                <option key={k} value={k}>
                  {k.toUpperCase()}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Occasion" id="edit-pf-occasion">
            <select
              id="edit-pf-occasion"
              className={SELECT_CLASSES}
              value={occasionId}
              onChange={(e) => setOccasionId(e.target.value)}
            >
              <option value="">None / general</option>
              {occasions.map((occ) => (
                <option key={occ.id} value={occ.id}>
                  {occ.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Title" id="edit-pf-title" required>
            <input
              id="edit-pf-title"
              type="text"
              className={INPUT_CLASSES}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormField>

          <FormField label="URL slug" id="edit-pf-slug" required>
            <input
              id="edit-pf-slug"
              type="text"
              className={`${INPUT_CLASSES} font-mono-meta`}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </FormField>

          <FormField label="Shot date" id="edit-pf-shot">
            <input
              id="edit-pf-shot"
              type="date"
              className={INPUT_CLASSES}
              value={shotOn}
              onChange={(e) => setShotOn(e.target.value)}
            />
          </FormField>

          <FormField label="Location" id="edit-pf-loc">
            <input
              id="edit-pf-loc"
              type="text"
              className={INPUT_CLASSES}
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
            />
          </FormField>

          <FormField label="Display sort order" id="edit-pf-sort">
            <input
              id="edit-pf-sort"
              type="number"
              min={0}
              max={9999}
              className={INPUT_CLASSES}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </FormField>

          <div className="flex items-end">
            <label className="flex min-h-[44px] items-center gap-3 text-sm text-[var(--white)] cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="h-4 w-4 accent-[var(--cyan)]"
              />
              <span>Feature on home page showcase</span>
            </label>
          </div>
        </div>

        <FormField label="Editorial summary" id="edit-pf-summary">
          <textarea
            id="edit-pf-summary"
            rows={3}
            className={TEXTAREA_CLASSES}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </FormField>

        <div className="space-y-3 border border-[var(--hairline)] bg-[var(--black)] p-4">
          <label className="flex min-h-[44px] items-center gap-3 text-sm font-medium text-[var(--white)] cursor-pointer">
            <input
              id="pf-client-consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="h-4 w-4 accent-[var(--cyan)]"
            />
            <span>I confirm written client consent is on file to publish this gallery publicly</span>
          </label>
          <FormField label="Consent log note" id="edit-pf-consent-note">
            <input
              id="edit-pf-consent-note"
              type="text"
              className={INPUT_CLASSES}
              value={consentNote}
              onChange={(e) => setConsentNote(e.target.value)}
              placeholder="Contract clause or email confirmation reference"
            />
          </FormField>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={savingItem}
            onClick={() => savePortfolio("draft")}
          >
            {item.status === "published" ? "Revert to draft" : "Save draft"}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={savingItem || !canPublish}
            onClick={() => savePortfolio("published")}
            title={
              canPublish
                ? "Publish portfolio item"
                : "Tick client consent and attach media with alt text before publishing"
            }
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            <span>{item.status === "published" ? "Save & keep published" : "Publish item"}</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-[var(--red)] border border-[var(--red)]/40 hover:bg-[var(--red)] hover:text-white ml-auto"
            onClick={handleDeletePortfolioItem}
            disabled={savingItem}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span>Delete item</span>
          </Button>
          {!canPublish && (
            <span className="text-xs text-[var(--grey)]">
              Publish unlocks when consent is ticked, media is attached, and alt text is filled.
            </span>
          )}
        </div>
      </section>

      {/* Media Manager */}
      <section className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Add image */}
          <form
            onSubmit={handleAddImage}
            className="space-y-4 border border-[var(--hairline)] bg-[var(--ink-2)] p-6"
          >
            <div className="flex items-center gap-2">
              <ImagePlus className="h-4 w-4 text-[var(--cyan)]" aria-hidden="true" />
              <h2 className="font-display text-lg font-bold">Add image frame</h2>
            </div>

            <div className="space-y-2 border border-dashed border-[var(--control-border)] p-3">
              <label htmlFor="cloudinary-upload-input" className="block text-xs text-[var(--grey)]">
                Upload JPEG / PNG / WebP / AVIF (Cloudinary)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  id="cloudinary-upload-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  disabled={uploadingFile}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void handleFileUpload(file);
                    }
                  }}
                  className="text-xs text-[var(--grey)] file:mr-3 file:border file:border-[var(--control-border)] file:bg-[var(--black)] file:px-3 file:py-2 file:text-xs file:text-[var(--white)]"
                />
                {uploadingFile && (
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--cyan)]">
                    <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                    Signing &amp; uploading...
                  </span>
                )}
              </div>
            </div>

            <FormField label="Studio asset preset" id="img-preset">
              <select
                id="img-preset"
                className={SELECT_CLASSES}
                value={LOCAL_STUDIO_ASSETS.some((p) => p.id === imagePublicId) ? imagePublicId : ""}
                onChange={(e) => {
                  const chosen = LOCAL_STUDIO_ASSETS.find((p) => p.id === e.target.value);
                  if (chosen) {
                    setImagePublicId(chosen.id);
                    setImageWidth(String(chosen.width));
                    setImageHeight(String(chosen.height));
                  }
                }}
              >
                <option value="">Custom Cloudinary public ID</option>
                {LOCAL_STUDIO_ASSETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} ({p.width}×{p.height})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Cloudinary public ID / local path" id="img-public-id" required>
              <input
                id="img-public-id"
                type="text"
                required
                className={`${INPUT_CLASSES} font-mono-meta`}
                value={imagePublicId}
                onChange={(e) => setImagePublicId(e.target.value)}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Width (px)" id="img-width" required>
                <input
                  id="img-width"
                  type="number"
                  required
                  min={100}
                  max={12000}
                  className={INPUT_CLASSES}
                  value={imageWidth}
                  onChange={(e) => setImageWidth(e.target.value)}
                />
              </FormField>
              <FormField label="Height (px)" id="img-height" required>
                <input
                  id="img-height"
                  type="number"
                  required
                  min={100}
                  max={12000}
                  className={INPUT_CLASSES}
                  value={imageHeight}
                  onChange={(e) => setImageHeight(e.target.value)}
                />
              </FormField>
            </div>

            <FormField
              label="Descriptive alt text"
              id="img-alt"
              required
              helpText="Required for screen readers and publishing."
            >
              <input
                id="img-alt"
                type="text"
                required
                minLength={3}
                className={INPUT_CLASSES}
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                placeholder="Describe the subject, setting, and lighting"
              />
            </FormField>

            <FormField label="Shot caption (optional)" id="img-caption">
              <input
                id="img-caption"
                type="text"
                className={INPUT_CLASSES}
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
                placeholder="e.g. Processional in woven kente"
              />
            </FormField>

            <label className="flex min-h-[44px] items-center gap-3 text-sm text-[var(--white)] cursor-pointer">
              <input
                type="checkbox"
                checked={imageCover}
                onChange={(e) => setImageCover(e.target.checked)}
                className="h-4 w-4 accent-[var(--cyan)]"
              />
              <span>Use as portfolio cover frame</span>
            </label>

            <Button type="submit" variant="secondary">
              Add image frame
            </Button>
          </form>

          {/* Add Video Embed */}
          <form
            onSubmit={handleAddVideo}
            className="space-y-4 border border-[var(--hairline)] bg-[var(--ink-2)] p-6"
          >
            <div className="flex items-center gap-2">
              <Film className="h-4 w-4 text-[var(--cyan)]" aria-hidden="true" />
              <h2 className="font-display text-lg font-bold">Add video embed (YouTube / Vimeo)</h2>
            </div>

            <FormField label="YouTube or Vimeo URL" id="vid-url" required>
              <input
                id="vid-url"
                type="url"
                required
                className={INPUT_CLASSES}
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
              />
            </FormField>

            <FormField label="Poster asset ID" id="vid-poster" required>
              <input
                id="vid-poster"
                type="text"
                required
                className={`${INPUT_CLASSES} font-mono-meta`}
                value={videoPoster}
                onChange={(e) => setVideoPoster(e.target.value)}
              />
            </FormField>

            <FormField label="Poster alt text" id="vid-alt" required>
              <input
                id="vid-alt"
                type="text"
                required
                minLength={3}
                className={INPUT_CLASSES}
                value={videoAlt}
                onChange={(e) => setVideoAlt(e.target.value)}
                placeholder="Describe the video thumbnail frame"
              />
            </FormField>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Duration (seconds)" id="vid-dur">
                <input
                  id="vid-dur"
                  type="number"
                  min={1}
                  max={36000}
                  className={INPUT_CLASSES}
                  value={videoDuration}
                  onChange={(e) => setVideoDuration(e.target.value)}
                  placeholder="180"
                />
              </FormField>
              <FormField label="Caption (optional)" id="vid-cap">
                <input
                  id="vid-cap"
                  type="text"
                  className={INPUT_CLASSES}
                  value={videoCaption}
                  onChange={(e) => setVideoCaption(e.target.value)}
                />
              </FormField>
            </div>

            <label className="flex min-h-[44px] items-center gap-3 text-sm text-[var(--white)] cursor-pointer">
              <input
                type="checkbox"
                checked={videoCover}
                onChange={(e) => setVideoCover(e.target.checked)}
                className="h-4 w-4 accent-[var(--cyan)]"
              />
              <span>Set video poster as cover frame</span>
            </label>

            <Button type="submit" variant="secondary">
              Attach video embed
            </Button>
          </form>
        </div>

        {/* Attached Media Frames */}
        <div className="space-y-4">
          <h2 className="font-display text-lg font-bold">Attached media ({assets.length})</h2>
          {assets.length === 0 ? (
            <div className="border border-[var(--hairline)] bg-[var(--ink-2)] p-6 text-sm text-[var(--grey)]">
              No media frames attached yet. Add at least one image or video embed above.
            </div>
          ) : (
            <div className="space-y-3">
              {assets.map((asset, idx) => {
                const thumbId =
                  asset.type === "video_embed"
                    ? asset.poster_public_id
                    : asset.cloudinary_public_id;
                return (
                  <div
                    key={asset.id}
                    className="grid gap-4 border border-[var(--hairline)] bg-[var(--ink-2)] p-4 md:grid-cols-[180px_1fr]"
                  >
                    <div className="aspect-[16/10] overflow-hidden border border-[var(--hairline)] bg-[var(--black)]">
                      <img
                        src={resolveImageUrl(thumbId)}
                        alt={asset.alt_text ?? "Media preview"}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 font-mono-meta text-xs uppercase">
                          <span className="text-[var(--grey)]">
                            #{idx + 1} · {asset.type === "video_embed" ? asset.video_provider : "IMAGE"}
                          </span>
                          {asset.is_cover && (
                            <span className="border border-[var(--cyan)] px-2 py-0.5 text-[var(--cyan)]">
                              COVER FRAME
                            </span>
                          )}
                          {asset.width && asset.height && (
                            <span className="text-[var(--grey)]">
                              {asset.width}×{asset.height}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1">
                          {!asset.is_cover && (
                            <button
                              type="button"
                              onClick={() => handleUpdateMedia(asset.id, { is_cover: true })}
                              className="inline-flex min-h-[44px] items-center gap-1 border border-[var(--control-border)] px-3 text-xs text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)] cursor-pointer"
                            >
                              <Star className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Set cover</span>
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={idx === 0}
                            aria-label="Move frame up"
                            onClick={() => handleMoveMedia(idx, -1)}
                            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center border border-[var(--control-border)] text-[var(--white)] disabled:opacity-40 cursor-pointer"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === assets.length - 1}
                            aria-label="Move frame down"
                            onClick={() => handleMoveMedia(idx, 1)}
                            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center border border-[var(--control-border)] text-[var(--white)] disabled:opacity-40 cursor-pointer"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="Delete frame"
                            onClick={() => handleDeleteMedia(asset.id)}
                            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center border border-[var(--control-border)] text-[var(--red)] hover:border-[var(--red)] cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label htmlFor={`alt-${asset.id}`} className="mb-1 block text-xs text-[var(--grey)]">
                            Alt text (required)
                          </label>
                          <input
                            id={`alt-${asset.id}`}
                            type="text"
                            className={INPUT_CLASSES}
                            value={altEdits[asset.id] ?? ""}
                            onChange={(e) =>
                              setAltEdits((prev) => ({ ...prev, [asset.id]: e.target.value }))
                            }
                          />
                        </div>
                        <div>
                          <label htmlFor={`cap-${asset.id}`} className="mb-1 block text-xs text-[var(--grey)]">
                            Caption
                          </label>
                          <input
                            id={`cap-${asset.id}`}
                            type="text"
                            className={INPUT_CLASSES}
                            value={captionEdits[asset.id] ?? ""}
                            onChange={(e) =>
                              setCaptionEdits((prev) => ({ ...prev, [asset.id]: e.target.value }))
                            }
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          handleUpdateMedia(asset.id, {
                            alt_text: altEdits[asset.id] ?? "",
                            caption: (captionEdits[asset.id] ?? "").trim() || null,
                          })
                        }
                      >
                        Save frame metadata
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
