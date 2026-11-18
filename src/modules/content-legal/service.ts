import { revalidatePath } from "next/cache";
import type { AdminSessionPayload } from "@/lib/auth";
import { getCached, invalidateCache, setCached } from "@/lib/cache";
import { normalizeGhanaPhone } from "@/lib/dates";
import { withAdminRole, withAnonRole, withServiceRole } from "@/lib/db";
import { ProblemError } from "@/lib/errors";
import { isHoneypotTriggered } from "@/lib/rate-limit";
import { findSiteSettings } from "@/modules/catalog/repository";
import { enqueueOutboxEmail } from "@/modules/notify/repository";
import { processEmailOutbox } from "@/modules/notify/service";
import {
  findAllLegalDocumentsAdmin,
  findCurrentLegalDocumentBySlug,
  findCurrentLegalDocuments,
  findEnquiriesAdmin,
  findLegalHistoryBySlug,
} from "./repository";
import {
  enquiryCreateSchema,
  enquiryStatusPatchSchema,
  legalDocumentCreateSchema,
  type EnquiryRecord,
  type EnquiryStatus,
  type LegalDocumentRecord,
  type LegalSlug,
} from "./schema";

export async function getPublicLegalDocument(slug: LegalSlug): Promise<{
  current: LegalDocumentRecord | null;
  history: LegalDocumentRecord[];
}> {
  const cacheKey = `legal:doc:${slug}`;
  const cached = getCached<{
    current: LegalDocumentRecord | null;
    history: LegalDocumentRecord[];
  }>(cacheKey);
  if (cached) return cached;

  const result = await withAnonRole(async (tx) => {
    const [current, history] = await Promise.all([
      findCurrentLegalDocumentBySlug(tx, slug),
      findLegalHistoryBySlug(tx, slug),
    ]);
    return { current, history };
  });

  setCached(cacheKey, result, 600);
  return result;
}

export async function getPublicPolicyVersions(): Promise<{
  privacyVersion: string;
  termsVersion: string;
  bookingPolicyVersion: string;
}> {
  const cacheKey = "legal:policy_versions";
  const cached = getCached<{
    privacyVersion: string;
    termsVersion: string;
    bookingPolicyVersion: string;
  }>(cacheKey);
  if (cached) return cached;

  const docs = await withAnonRole((tx) => findCurrentLegalDocuments(tx));
  const result = {
    privacyVersion: docs.find((d) => d.slug === "privacy")?.version ?? "1.0",
    termsVersion: docs.find((d) => d.slug === "terms")?.version ?? "1.0",
    bookingPolicyVersion: docs.find((d) => d.slug === "booking-policy")?.version ?? "1.0",
  };

  setCached(cacheKey, result, 600);
  return result;
}

export async function submitPublicEnquiry(rawInput: unknown): Promise<{
  accepted: boolean;
  enquiryId?: string;
}> {
  const parsed = enquiryCreateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ProblemError(422, "validation_error", "Check your enquiry", "Please fix the highlighted fields.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  const v = parsed.data;
  if (isHoneypotTriggered(v.website)) {
    // Honeypot triggered: act as success to the bot without storing anything
    return { accepted: true };
  }

  const normalizedPhone = v.phone && v.phone.trim() ? normalizeGhanaPhone(v.phone) : null;

  const enquiryId = await withServiceRole(async (tx) => {
    const settings = await findSiteSettings(tx);
    const res = await tx.query<{ id: string }>(
      `insert into enquiries (name, email, phone, message, privacy_version)
       values ($1, $2::citext, $3, $4, $5)
       returning id`,
      [v.name, v.email, normalizedPhone, v.message, v.privacyVersion]
    );
    const id = res.rows[0]!.id;
    await enqueueOutboxEmail(tx, {
      dedupeKey: `admin-new-enquiry:${id}`,
      toEmail: settings.contact_email,
      template: "admin_new_enquiry",
      payload: {
        enquiry_id: id,
        name: v.name,
        email: v.email,
        phone: normalizedPhone,
        message: v.message,
      },
    });
    return id;
  });

  await processEmailOutbox().catch(() => undefined);
  return { accepted: true, enquiryId };
}

export async function listAdminEnquiries(
  admin: AdminSessionPayload,
  status?: EnquiryStatus
): Promise<EnquiryRecord[]> {
  return withAdminRole(admin.adminId, admin.aal, (tx) => findEnquiriesAdmin(tx, status));
}

export async function updateAdminEnquiryStatus(
  admin: AdminSessionPayload,
  rawInput: unknown
): Promise<EnquiryRecord> {
  const parsed = enquiryStatusPatchSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ProblemError(422, "validation_error", "Invalid enquiry update", "Invalid status update.");
  }
  const v = parsed.data;
  return withAdminRole(admin.adminId, admin.aal, async (tx) => {
    const res = await tx.query<EnquiryRecord>(
      `update enquiries
          set status = $2::enquiry_status
        where id = $1::uuid
        returning id, name, email::text as email, phone, message, status, privacy_version, consented_at::text, created_at::text`,
      [v.id, v.status]
    );
    if (!res.rows[0]) {
      throw new ProblemError(404, "not_found", "Enquiry not found", "No enquiry matches that ID.");
    }
    return res.rows[0];
  });
}

export async function listAdminLegalDocuments(
  admin: AdminSessionPayload
): Promise<LegalDocumentRecord[]> {
  return withAdminRole(admin.adminId, admin.aal, (tx) => findAllLegalDocumentsAdmin(tx));
}

export async function publishAdminLegalDocument(
  admin: AdminSessionPayload,
  rawInput: unknown
): Promise<LegalDocumentRecord> {
  const parsed = legalDocumentCreateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ProblemError(422, "validation_error", "Check legal document fields", "Invalid legal document.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }
  const v = parsed.data;
  const saved = await withAdminRole(admin.adminId, admin.aal, async (tx) => {
    const res = await tx.query<LegalDocumentRecord>(
      `insert into legal_documents (slug, version, title, body_md, effective_at, summary_of_changes)
       values ($1, $2, $3, $4, $5::timestamptz, $6)
       returning id, slug, version, title, body_md, effective_at::text, summary_of_changes, created_at::text`,
      [v.slug, v.version, v.title, v.body_md, v.effective_at, v.summary_of_changes ?? null]
    );
    return res.rows[0]!;
  });

  invalidateCache("legal");
  try {
    revalidatePath(`/${saved.slug}`);
    revalidatePath("/book");
    revalidatePath("/contact");
  } catch {
    // ignore outside request lifecycle
  }

  return saved;
}
