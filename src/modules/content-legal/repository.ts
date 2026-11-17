import type { DbTx } from "@/lib/db";
import type { EnquiryRecord, EnquiryStatus, LegalDocumentRecord, LegalSlug } from "./schema";

export async function findCurrentLegalDocuments(tx: DbTx): Promise<LegalDocumentRecord[]> {
  const res = await tx.query<LegalDocumentRecord>(
    `select id, slug, version, title, body_md, effective_at::text, summary_of_changes, created_at::text
       from current_legal_documents
      order by slug asc`
  );
  return res.rows;
}

export async function findCurrentLegalDocumentBySlug(
  tx: DbTx,
  slug: LegalSlug
): Promise<LegalDocumentRecord | null> {
  const res = await tx.query<LegalDocumentRecord>(
    `select id, slug, version, title, body_md, effective_at::text, summary_of_changes, created_at::text
       from current_legal_documents
      where slug = $1`,
    [slug]
  );
  return res.rows[0] ?? null;
}

export async function findLegalHistoryBySlug(
  tx: DbTx,
  slug: LegalSlug
): Promise<LegalDocumentRecord[]> {
  const res = await tx.query<LegalDocumentRecord>(
    `select id, slug, version, title, body_md, effective_at::text, summary_of_changes, created_at::text
       from legal_documents
      where slug = $1 and effective_at <= now()
      order by effective_at desc`,
    [slug]
  );
  return res.rows;
}

export async function findAllLegalDocumentsAdmin(tx: DbTx): Promise<LegalDocumentRecord[]> {
  const res = await tx.query<LegalDocumentRecord>(
    `select id, slug, version, title, body_md, effective_at::text, summary_of_changes, created_at::text
       from legal_documents
      order by slug asc, effective_at desc`
  );
  return res.rows;
}

export async function findEnquiriesAdmin(
  tx: DbTx,
  status?: EnquiryStatus
): Promise<EnquiryRecord[]> {
  if (status) {
    const res = await tx.query<EnquiryRecord>(
      `select id, name, email::text as email, phone, message, status, privacy_version, consented_at::text, created_at::text
         from enquiries
        where status = $1::enquiry_status
        order by created_at desc`,
      [status]
    );
    return res.rows;
  }
  const res = await tx.query<EnquiryRecord>(
    `select id, name, email::text as email, phone, message, status, privacy_version, consented_at::text, created_at::text
       from enquiries
      order by created_at desc`
  );
  return res.rows;
}
