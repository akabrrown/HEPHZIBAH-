import { z } from "zod";
import { normalizeGhanaPhone } from "@/lib/dates";
import { serviceKindValues, type ServiceKind } from "@/modules/catalog/schema";

export const bookingStatusValues = [
  "new",
  "reviewing",
  "quoted",
  "accepted",
  "confirmed",
  "completed",
  "declined",
  "cancelled",
  "expired",
] as const;
export type BookingStatus = (typeof bookingStatusValues)[number];

export const timeOfDayValues = [
  "morning",
  "afternoon",
  "evening",
  "all_day",
  "unsure",
] as const;
export type TimeOfDay = (typeof timeOfDayValues)[number];

export const contactMethodValues = ["whatsapp", "phone", "email"] as const;
export type ContactMethod = (typeof contactMethodValues)[number];

export const ALLOWED_BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  new: ["reviewing", "declined", "cancelled"],
  reviewing: ["quoted", "declined", "cancelled"],
  quoted: ["reviewing", "accepted", "declined", "expired", "cancelled"],
  accepted: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  expired: ["reviewing"],
  completed: [],
  declined: [],
  cancelled: [],
};

export function canTransitionBooking(from: BookingStatus, to: BookingStatus): boolean {
  if (from === to) return true;
  return ALLOWED_BOOKING_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface BookingRecord {
  id: string;
  reference: string;
  idempotency_key: string | null;
  access_token_hash: string;
  status: BookingStatus;
  kind: ServiceKind;
  service_id: string;
  service_name?: string;
  package_id: string | null;
  package_name?: string | null;
  occasion_id: string | null;
  occasion_name?: string | null;
  occasion_other: string | null;
  client_name: string;
  client_email: string;
  client_phone: string;
  preferred_contact: ContactMethod;
  event_date: string | null;
  time_of_day: TimeOfDay | null;
  venue_text: string | null;
  venue_city: string | null;
  guest_count: number | null;
  deadline: string | null;
  brief: string;
  budget_band: string | null;
  reference_links: string[];
  source: string | null;
  starts_at: string | null;
  ends_at: string | null;
  accepted_quote_id: string | null;
  cancelled_reason: string | null;
  gallery_url?: string | null;
  gallery_pin?: string | null;
  gallery_notes?: string | null;
  gallery_expires_at?: string | null;
  privacy_version: string;
  terms_version: string;
  consented_at: string;
  created_at: string;
  updated_at: string;
}

export interface BookingEventRecord {
  id: number;
  booking_id: string;
  actor_type: "client" | "admin" | "system";
  actor_id: string | null;
  actor_name?: string | null;
  event_type: string;
  from_status: BookingStatus | null;
  to_status: BookingStatus | null;
  note: string | null;
  visible_to_client: boolean;
  created_at: string;
}

export interface BlockedDateRange {
  id: string;
  from_date: string;
  to_date_inclusive: string;
  reason: string;
  created_by: string | null;
  created_at: string;
}

const referenceUrlSchema = z
  .string()
  .trim()
  .url("Enter a valid web address starting with https:// or http://")
  .refine((u) => u.startsWith("http://") || u.startsWith("https://"), {
    message: "Reference links must start with http:// or https://",
  });

export const bookingRequestSchema = z
  .object({
    kind: z.enum(serviceKindValues),
    serviceId: z.string().uuid("Please pick a service."),
    packageId: z.string().uuid().nullable().optional(),
    occasionId: z.string().uuid().nullable().optional(),
    occasionOther: z.string().trim().max(80, "Keep occasion under 80 characters.").nullable().optional(),
    eventDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date.")
      .nullable()
      .optional(),
    timeOfDay: z.enum(timeOfDayValues).nullable().optional(),
    venueText: z.string().trim().max(200, "Venue must be under 200 characters.").nullable().optional(),
    venueCity: z.string().trim().max(80, "City must be under 80 characters.").nullable().optional(),
    guestCount: z.number().int().min(1).max(20000).nullable().optional(),
    deadline: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid deadline date.")
      .nullable()
      .optional(),
    deliverableFormats: z.array(z.string().trim().max(60)).max(10).optional().default([]),
    brief: z
      .string()
      .trim()
      .min(10, "Please describe the work in at least 10 characters.")
      .max(4000, "Brief must stay under 4000 characters."),
    referenceLinks: z
      .array(referenceUrlSchema)
      .max(5, "You can share up to five reference links.")
      .default([]),
    budgetBand: z.string().trim().max(40).nullable().optional(),
    clientName: z
      .string()
      .trim()
      .min(2, "Enter your full name.")
      .max(120, "Name must stay under 120 characters."),
    clientEmail: z.string().trim().email("Enter a valid email address."),
    clientPhone: z
      .string()
      .trim()
      .refine((val) => normalizeGhanaPhone(val) !== null, {
        message: "Enter a valid Ghana or international phone number.",
      }),
    preferredContact: z.enum(contactMethodValues).default("whatsapp"),
    consentAccepted: z.boolean().refine((v) => v === true, {
      message: "Please read and accept the Privacy Policy and Booking Policy to continue.",
    }),
    privacyVersion: z.string().trim().min(1).max(40),
    termsVersion: z.string().trim().min(1).max(40),
    source: z.string().trim().max(40).nullable().optional(),
    website: z.string().max(200).optional(), // Honeypot field
  })
  .superRefine((data, ctx) => {
    if (data.kind === "design") {
      if (!data.deadline) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please choose your target deadline.",
          path: ["deadline"],
        });
      }
      if (data.eventDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Design requests use a deadline rather than an event date.",
          path: ["eventDate"],
        });
      }
    } else {
      if (!data.occasionId && (!data.occasionOther || data.occasionOther.trim().length < 2)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Choose an occasion or enter your own.",
          path: ["occasionId"],
        });
      }
      if (!data.eventDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please choose your event date.",
          path: ["eventDate"],
        });
      }
      if (!data.timeOfDay) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select what part of the day we are covering.",
          path: ["timeOfDay"],
        });
      }
      if (!data.venueCity || data.venueCity.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter the town or city for the event.",
          path: ["venueCity"],
        });
      }
    }
  });

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;

export const bookingTransitionSchema = z.object({
  to: z.enum(bookingStatusValues),
  note: z.string().trim().max(500).optional(),
  startsAt: z.string().datetime({ offset: true }).nullable().optional(),
  endsAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export const clientCancelSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const galleryDeliverySchema = z.object({
  galleryUrl: z
    .string()
    .trim()
    .url("Enter a valid URL (Google Drive, Pixieset, Dropbox, WeTransfer, etc.)")
    .max(1000, "URL must stay under 1000 characters.")
    .nullable()
    .optional(),
  galleryPin: z.string().trim().max(60, "PIN must stay under 60 characters.").nullable().optional(),
  galleryNotes: z.string().trim().max(2000, "Notes must stay under 2000 characters.").nullable().optional(),
  galleryExpiresAt: z.string().datetime({ offset: true }).nullable().optional(),
  markCompleted: z.boolean().optional().default(false),
});
export type GalleryDeliveryInput = z.infer<typeof galleryDeliverySchema>;

export const blockedDateCreateSchema = z
  .object({
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    toDateInclusive: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.string().trim().min(2).max(200),
  })
  .refine((v) => v.toDateInclusive >= v.fromDate, {
    message: "End date must be on or after the start date.",
    path: ["toDateInclusive"],
  });
