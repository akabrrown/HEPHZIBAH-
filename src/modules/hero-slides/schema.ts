import { z } from "zod";

export interface HeroSlide {
  id: string;
  image_public_id: string;
  alt_text: string;
  focal_x: number;
  focal_y: number;
  eyebrow_left: string | null;
  eyebrow_right: string | null;
  headline: string | null;
  subcopy: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const LOCAL_MEDIA_RE = /^\/media\/[a-zA-Z0-9._/-]+$/;
const CLOUDINARY_PUBLIC_ID_RE = /^[a-zA-Z0-9/_-]{2,300}(\.[a-zA-Z0-9]{2,6})?$/;
const CLOUDINARY_HTTPS_RE = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/.+$/;

export function isSafeSlideImageRef(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 500) return false;
  if (trimmed.includes("..") || trimmed.startsWith("//") || /[\s<>"'`]/.test(trimmed)) {
    return false;
  }
  return (
    LOCAL_MEDIA_RE.test(trimmed) ||
    CLOUDINARY_PUBLIC_ID_RE.test(trimmed) ||
    CLOUDINARY_HTTPS_RE.test(trimmed)
  );
}

function optionalNullableText(maxLen: number, label: string) {
  return z
    .string()
    .trim()
    .max(maxLen, `${label} must stay under ${maxLen} characters.`)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional();
}

export const heroSlideCreateSchema = z.object({
  image_public_id: z
    .string()
    .trim()
    .refine(isSafeSlideImageRef, "Use an uploaded Cloudinary image, public ID, or /media/... asset path."),
  alt_text: z
    .string()
    .trim()
    .min(3, "Alt text must be at least 3 characters.")
    .max(300, "Alt text must stay under 300 characters."),
  focal_x: z.number().int().min(0).max(100).default(50),
  focal_y: z.number().int().min(0).max(100).default(30),
  eyebrow_left: optionalNullableText(80, "Left eyebrow"),
  eyebrow_right: optionalNullableText(80, "Right eyebrow"),
  headline: optionalNullableText(120, "Headline"),
  subcopy: optionalNullableText(280, "Subcopy"),
  sort_order: z.number().int().min(0).max(9999).optional(),
  is_active: z.boolean().default(true),
});

export const heroSlideUpdateSchema = z.object({
  id: z.string().uuid("Invalid slide ID."),
  image_public_id: z
    .string()
    .trim()
    .refine(isSafeSlideImageRef, "Use an uploaded Cloudinary image, public ID, or /media/... asset path.")
    .optional(),
  alt_text: z
    .string()
    .trim()
    .min(3, "Alt text must be at least 3 characters.")
    .max(300, "Alt text must stay under 300 characters.")
    .optional(),
  focal_x: z.number().int().min(0).max(100).optional(),
  focal_y: z.number().int().min(0).max(100).optional(),
  eyebrow_left: optionalNullableText(80, "Left eyebrow"),
  eyebrow_right: optionalNullableText(80, "Right eyebrow"),
  headline: optionalNullableText(120, "Headline"),
  subcopy: optionalNullableText(280, "Subcopy"),
  sort_order: z.number().int().min(0).max(9999).optional(),
  is_active: z.boolean().optional(),
});

export const heroSlideReorderSchema = z.object({
  orderedIds: z.array(z.string().uuid("Invalid slide ID.")).min(1).max(30),
});
