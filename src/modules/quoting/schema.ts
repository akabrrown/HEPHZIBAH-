import { z } from "zod";

export const quoteStatusValues = [
  "draft",
  "sent",
  "accepted",
  "expired",
  "superseded",
  "withdrawn",
] as const;
export type QuoteStatus = (typeof quoteStatusValues)[number];

export const paymentMethodValues = [
  "momo",
  "bank_transfer",
  "cash",
  "card",
] as const;
export type PaymentMethod = (typeof paymentMethodValues)[number];

export interface QuoteItemRecord {
  id: string;
  quote_id: string;
  position: number;
  description: string;
  quantity: number;
  unit_price_minor: number;
  line_total_minor: number;
}

export interface QuoteRecord {
  id: string;
  booking_id: string;
  version: number;
  status: QuoteStatus;
  currency: string;
  total_minor: number;
  deposit_minor: number;
  valid_until: string | null;
  notes: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  created_by: string | null;
  created_at: string;
  items: QuoteItemRecord[];
}

export interface PaymentRecord {
  id: string;
  booking_id: string;
  provider: "manual" | "paystack";
  method: PaymentMethod;
  amount_minor: number;
  is_refund: boolean;
  currency: string;
  provider_reference: string | null;
  received_at: string;
  note: string | null;
  recorded_by: string | null;
  created_at: string;
}

export const quoteLineItemSchema = z.object({
  description: z.string().trim().min(1, "Enter a line description.").max(200),
  quantity: z.number().positive("Quantity must be above zero.").max(9999),
  unit_price_minor: z.number().int().min(0, "Price cannot be negative."),
});

export const quoteDraftUpsertSchema = z
  .object({
    quote_id: z.string().uuid().optional(),
    items: z.array(quoteLineItemSchema).min(1, "Add at least one line item.").max(40),
    deposit_minor: z.number().int().min(0),
    notes: z.string().trim().max(1500).nullable().optional(),
    valid_days: z.number().int().min(1).max(60).optional(),
    starts_at: z.string().datetime({ offset: true }).nullable().optional(),
    ends_at: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const total = data.items.reduce(
      (sum, item) => sum + Math.round(item.quantity * item.unit_price_minor),
      0
    );
    if (data.deposit_minor > total) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Deposit cannot exceed the quote total.",
        path: ["deposit_minor"],
      });
    }
    if ((data.starts_at && !data.ends_at) || (!data.starts_at && data.ends_at)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide both start and end times for the work window.",
        path: ["starts_at"],
      });
    }
    if (data.starts_at && data.ends_at && new Date(data.ends_at) <= new Date(data.starts_at)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Window end time must be after the start time.",
        path: ["ends_at"],
      });
    }
  });

export const acceptQuoteBodySchema = z.object({
  quoteId: z.string().uuid(),
});

export const paymentCreateSchema = z.object({
  method: z.enum(paymentMethodValues),
  amount_minor: z.number().int().positive("Amount must be greater than zero."),
  is_refund: z.boolean().default(false),
  provider_reference: z.string().trim().max(120).nullable().optional(),
  received_at: z.string().datetime({ offset: true }),
  note: z.string().trim().max(400).nullable().optional(),
});
