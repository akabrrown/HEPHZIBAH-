import { z } from "zod";

export const serviceKindValues = ["photography", "videography", "design"] as const;
export type ServiceKind = (typeof serviceKindValues)[number];

export interface Occasion {
  id: string;
  slug: string;
  name: string;
  applies_to: ServiceKind[];
  sort_order: number;
  is_active: boolean;
}

export interface Service {
  id: string;
  kind: ServiceKind;
  slug: string;
  name: string;
  summary: string;
  description_md: string | null;
  starting_price_minor: number | null;
  currency: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PackageItem {
  id: string;
  service_id: string;
  service_name?: string;
  service_slug?: string;
  service_kind?: ServiceKind;
  name: string;
  summary: string | null;
  price_minor: number;
  currency: string;
  duration_hours: number | null;
  deliverables: string[];
  is_featured: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SiteSettings {
  id: number;
  business_name: string;
  contact_email: string;
  whatsapp_e164: string;
  phone_e164: string | null;
  address_text: string | null;
  social: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    momo_number?: string;
    bank_details?: string;
  };
  min_lead_days: number;
  max_advance_days: number;
  quote_validity_days: number;
  budget_bands: string[];
  updated_at: string;
}

export const serviceUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  kind: z.enum(serviceKindValues),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must use lowercase letters, numbers, and hyphens"),
  name: z.string().trim().min(2).max(120),
  summary: z.string().trim().min(5).max(500),
  description_md: z.string().trim().max(5000).nullable().optional(),
  starting_price_minor: z.number().int().min(0).nullable().optional(),
  sort_order: z.number().int().min(0).max(9999).default(0),
  is_active: z.boolean().default(true),
});

export const packageUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  service_id: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  summary: z.string().trim().max(400).nullable().optional(),
  price_minor: z.number().int().min(0),
  duration_hours: z.number().positive().max(200).nullable().optional(),
  deliverables: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  is_featured: z.boolean().default(false),
  sort_order: z.number().int().min(0).max(9999).default(0),
  is_active: z.boolean().default(true),
});

export const siteSettingsPatchSchema = z
  .object({
    business_name: z.string().trim().min(2).max(120),
    contact_email: z.string().trim().email(),
    whatsapp_e164: z
      .string()
      .trim()
      .regex(/^\+[1-9][0-9]{7,14}$/, "WhatsApp number must be E.164 format (e.g. +233240000000)"),
    phone_e164: z
      .string()
      .trim()
      .regex(/^\+[1-9][0-9]{7,14}$/, "Phone number must be E.164 format")
      .nullable()
      .optional(),
    address_text: z.string().trim().max(250).nullable().optional(),
    social: z
      .object({
        instagram: z.string().trim().max(200).optional(),
        tiktok: z.string().trim().max(200).optional(),
        youtube: z.string().trim().max(200).optional(),
        momo_number: z.string().trim().max(200).optional(),
        bank_details: z.string().trim().max(300).optional(),
      })
      .default({}),
    min_lead_days: z.number().int().min(0).max(90),
    max_advance_days: z.number().int().min(7).max(1095),
    quote_validity_days: z.number().int().min(1).max(90),
    budget_bands: z.array(z.string().trim().min(1).max(40)).max(12),
  })
  .refine((val) => val.max_advance_days > val.min_lead_days, {
    message: "Maximum advance days must exceed minimum lead days",
    path: ["max_advance_days"],
  });
