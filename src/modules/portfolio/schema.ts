import { z } from "zod";
import { serviceKindValues, type ServiceKind } from "@/modules/catalog/schema";

export const mediaTypeValues = ["image", "video_embed"] as const;
export type MediaType = (typeof mediaTypeValues)[number];

export const videoProviderValues = ["youtube", "vimeo"] as const;
export type VideoProvider = (typeof videoProviderValues)[number];

export const publishStatusValues = ["draft", "published"] as const;
export type PublishStatus = (typeof publishStatusValues)[number];

export interface MediaAsset {
  id: string;
  portfolio_item_id: string;
  type: MediaType;
  position: number;
  is_cover: boolean;
  cloudinary_public_id: string | null;
  poster_public_id: string | null;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  video_provider: VideoProvider | null;
  video_id: string | null;
  duration_seconds: number | null;
  caption: string | null;
  created_at: string;
}

export interface PortfolioItem {
  id: string;
  kind: ServiceKind;
  slug: string;
  title: string;
  summary: string | null;
  occasion_id: string | null;
  occasion_slug?: string | null;
  occasion_name?: string | null;
  shot_on: string | null;
  location_text: string | null;
  status: PublishStatus;
  is_featured: boolean;
  sort_order: number;
  client_consent_to_publish: boolean;
  consent_note: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  cover_asset?: MediaAsset | null;
  media_count?: number;
  media_assets?: MediaAsset[];
}

export interface Testimonial {
  id: string;
  author_name: string;
  author_context: string | null;
  quote: string;
  booking_id: string | null;
  consent_to_publish: boolean;
  status: PublishStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
}

export const portfolioItemUpsertSchema = z
  .object({
    id: z.string().uuid().optional(),
    kind: z.enum(serviceKindValues),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must use lowercase letters, numbers, and hyphens"),
    title: z.string().trim().min(3).max(160),
    summary: z.string().trim().max(1000).nullable().optional(),
    occasion_id: z.string().uuid().nullable().optional(),
    shot_on: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    location_text: z.string().trim().max(120).nullable().optional(),
    status: z.enum(publishStatusValues).default("draft"),
    is_featured: z.boolean().default(false),
    sort_order: z.number().int().min(0).max(9999).default(0),
    client_consent_to_publish: z.boolean().default(false),
    consent_note: z.string().trim().max(400).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "published" && !data.client_consent_to_publish) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Client consent must be ticked before publishing a portfolio item.",
        path: ["client_consent_to_publish"],
      });
    }
  });

export const mediaAssetCreateSchema = z
  .object({
    type: z.enum(mediaTypeValues),
    position: z.number().int().min(0).max(200).default(0),
    is_cover: z.boolean().default(false),
    cloudinary_public_id: z.string().trim().max(300).nullable().optional(),
    poster_public_id: z.string().trim().max(300).nullable().optional(),
    width: z.number().int().positive().max(12000).nullable().optional(),
    height: z.number().int().positive().max(12000).nullable().optional(),
    alt_text: z.string().trim().max(400).nullable().optional(),
    video_provider: z.enum(videoProviderValues).nullable().optional(),
    video_id: z.string().trim().max(80).nullable().optional(),
    duration_seconds: z.number().int().positive().max(36000).nullable().optional(),
    caption: z.string().trim().max(300).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.alt_text || data.alt_text.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Descriptive alt text is required for every image and video poster.",
        path: ["alt_text"],
      });
    }
    if (data.type === "image") {
      if (!data.cloudinary_public_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Image asset ID or path is required.",
          path: ["cloudinary_public_id"],
        });
      }
      if (!data.width || !data.height) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Image width and height are required to prevent layout shift.",
          path: ["width"],
        });
      }
    } else if (data.type === "video_embed") {
      if (!data.video_provider || !data.video_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Valid YouTube or Vimeo link is required.",
          path: ["video_id"],
        });
      }
      if (!data.poster_public_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Poster image is required for video embeds.",
          path: ["poster_public_id"],
        });
      }
    }
  });

export const testimonialUpsertSchema = z
  .object({
    id: z.string().uuid().optional(),
    author_name: z.string().trim().min(2).max(100),
    author_context: z.string().trim().max(120).nullable().optional(),
    quote: z.string().trim().min(20).max(600),
    booking_id: z.string().uuid().nullable().optional(),
    consent_to_publish: z.boolean().default(false),
    status: z.enum(publishStatusValues).default("draft"),
    sort_order: z.number().int().min(0).max(9999).default(0),
  })
  .superRefine((data, ctx) => {
    if (data.status === "published" && !data.consent_to_publish) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Client consent is required to publish a testimonial.",
        path: ["consent_to_publish"],
      });
    }
  });

export const faqUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(10).max(2000),
  sort_order: z.number().int().min(0).max(9999).default(0),
  is_published: z.boolean().default(true),
});
