import { z } from "zod";
import { normalizeGhanaPhone } from "@/lib/dates";

export const enquiryStatusValues = ["new", "replied", "spam", "closed"] as const;
export type EnquiryStatus = (typeof enquiryStatusValues)[number];

export const legalSlugValues = ["terms", "privacy", "booking-policy"] as const;
export type LegalSlug = (typeof legalSlugValues)[number];

export interface EnquiryRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: EnquiryStatus;
  privacy_version: string;
  consented_at: string;
  created_at: string;
}

export interface LegalDocumentRecord {
  id: string;
  slug: LegalSlug;
  version: string;
  title: string;
  body_md: string;
  effective_at: string;
  summary_of_changes: string | null;
  created_at: string;
}

export const enquiryCreateSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(120),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((val) => !val || val.trim() === "" || normalizeGhanaPhone(val) !== null, {
      message: "Enter a valid phone number or leave blank.",
    }),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters.")
    .max(3000, "Message must stay under 3000 characters."),
  consentAccepted: z.boolean().refine((v) => v === true, {
    message: "Please tick the privacy consent box before sending.",
  }),
  privacyVersion: z.string().trim().min(1).max(40),
  website: z.string().max(200).optional(), // Honeypot
});

export const enquiryStatusPatchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(enquiryStatusValues),
});

export const legalDocumentCreateSchema = z.object({
  slug: z.enum(legalSlugValues),
  version: z.string().trim().min(1).max(30),
  title: z.string().trim().min(3).max(160),
  body_md: z.string().trim().min(30).max(50000),
  effective_at: z.string().datetime({ offset: true }),
  summary_of_changes: z.string().trim().max(500).nullable().optional(),
});
