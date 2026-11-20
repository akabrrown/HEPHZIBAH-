import crypto from "node:crypto";

export const DEFAULT_OWNER_ID = "11111111-1111-4111-8111-111111111111";
export const DEFAULT_CONTENT_ADMIN_ID = "22222222-2222-4222-8222-222222222222";
export const DEFAULT_BOOKINGS_ADMIN_ID = "33333333-3333-4333-8333-333333333333";

function generateEphemeralBase32(bytesLen = 10): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes = crypto.randomBytes(bytesLen);
  let out = "";
  for (const b of bytes) {
    out += alphabet[b % alphabet.length] ?? "A";
  }
  return out;
}

declare global {
  var __hephzibahEphemeralSeedPass: string | undefined;
  var __hephzibahEphemeralSeedTotp: Record<string, string> | undefined;
}

/**
 * Reads local dev/test admin password from environment or generates a process-scoped
 * ephemeral random string. Never returns a hardcoded repository credential.
 */
export function getSeedAdminPassword(): string {
  const fromEnv = process.env.SEED_ADMIN_PASSWORD?.trim();
  if (fromEnv) return fromEnv;
  if (!globalThis.__hephzibahEphemeralSeedPass) {
    globalThis.__hephzibahEphemeralSeedPass = `Ephemeral#${crypto.randomBytes(12).toString("base64url")}`;
  }
  return globalThis.__hephzibahEphemeralSeedPass;
}

/**
 * Reads local dev/test TOTP base32 secret from envKey or generates a process-scoped
 * ephemeral base32 secret. Zero static TOTP secrets are committed to source.
 */
export function getSeedTotpSecret(envKey: string): string {
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return fromEnv;
  if (!globalThis.__hephzibahEphemeralSeedTotp) {
    globalThis.__hephzibahEphemeralSeedTotp = {};
  }
  if (!globalThis.__hephzibahEphemeralSeedTotp[envKey]) {
    globalThis.__hephzibahEphemeralSeedTotp[envKey] = generateEphemeralBase32(10);
  }
  return globalThis.__hephzibahEphemeralSeedTotp[envKey]!;
}

export const EXTRA_SEED_SQL = `
-- Seed default site settings (id = 1 singleton)
insert into site_settings (
  id, business_name, contact_email, whatsapp_e164, phone_e164, address_text,
  social, min_lead_days, max_advance_days, quote_validity_days, budget_bands
) values (
  1,
  'Hephzibah Media',
  'desk@hephzibahmedia.com',
  '+233240000000',
  '+233302000000',
  'Ring Road Central, Accra, Ghana',
  '{"instagram":"https://www.instagram.com/hephzibahphotography_","tiktok":"https://www.tiktok.com/@hephzibah_photography?_r=1&_t=ZS-9BTfXSCc6bf","youtube":"https://youtube.com/@hephzibahmedia","momo_number":"","bank_details":""}'::jsonb,
  3,
  540,
  7,
  '["Under GHS 3,000","GHS 3,000 - 6,000","GHS 6,000 - 12,000","Above GHS 12,000","Not sure yet"]'::jsonb
) on conflict (id) do nothing;

-- Seed versioned legal documents (v1.0)
insert into legal_documents (slug, version, title, body_md, effective_at, summary_of_changes) values
(
  'privacy',
  '1.0',
  'Privacy Policy',
  '## Plain-language summary
We collect only the details needed to review your booking request, send an itemised quote, and turn up on the day. We do not run ad trackers or sell your contact details.

## 1. Who handles your data
Hephzibah Media (Accra, Ghana) is the data controller for booking requests and contact enquiries submitted through this website, in line with the Data Protection Act, 2012 (Act 843).

## 2. What we collect and why
- **Booking requests:** Your name, phone number, email address, event date or design deadline, venue or brief, and reference links. We use these to check crew availability, prepare your quote, and coordinate delivery.
- **Contact enquiries:** Your name, email, optional phone number, and message so we can reply.
- **Technical logs:** Short-lived server request IDs for security and uptime checks. Version 1 sets no non-essential cookies and uses no third-party analytics trackers.

## 3. Service providers
We rely on managed infrastructure providers (hosting, PostgreSQL database, image delivery, transactional email, and bot protection) to operate this service reliably. Data may be processed outside Ghana under standard vendor data-processing terms.

## 4. How long we keep your details
Personal contact details on closed bookings (completed, declined, cancelled, or expired) are anonymised after 24 months, while financial quote totals and payment records are retained without personal contact fields for accounting compliance. Contact enquiries are removed after 12 months.

## 5. Portfolio consent
We never publish photographs, films, or design work showing identifiable people or private family occasions without explicit written client consent. You may withdraw consent at any time by emailing us.

## 6. Your rights
Under Act 843, you may ask to view, correct, or erase your personal data by emailing desk@hephzibahmedia.com.',
  '2026-11-01T00:00:00Z',
  'Initial launch policy.'
),
(
  'terms',
  '1.0',
  'Terms and Conditions',
  '## Plain-language summary
These terms govern use of the Hephzibah Media website and how commissioned photography, videography, and graphic design work is delivered and licensed.

## 1. Website use and booking requests
Submitting a booking request through this website does not lock a date or form a binding contract. A booking is only confirmed once you accept an itemised quote, pay the agreed deposit, and receive written confirmation from us.

## 2. Scope of services
Deliverables, crew hours, turnaround times, and revision rounds are stated on each itemised quote. Requests outside the agreed hours or deliverable list require a written variation.

## 3. Copyright and usage rights
Commissioned photography, video, and graphic design licences are governed by the Copyright Act, 2005 (Act 690) and your accepted quote. Clients receive a personal or stated commercial licence upon full payment. Hephzibah Media only features commissioned work in its public portfolio where client consent has been granted.

## 4. Client responsibilities
For events, the client is responsible for securing venue permissions and informing guests where photography or filming is taking place. For design jobs, the client warrants they hold rights to any supplied text, fonts, or logos.

## 5. Liability
If illness, equipment failure, or circumstances beyond reasonable control prevent coverage, our maximum liability is limited to a full refund of fees paid for the unfulfilled portion.',
  '2026-11-01T00:00:00Z',
  'Initial launch terms.'
),
(
  'booking-policy',
  '1.0',
  'Booking, Cancellation and Refund Policy',
  '## Plain-language summary
A date is held only when your deposit is received and confirmed by our team. Quotes stay valid for 7 days unless stated otherwise.

## 1. Quotes and validity
Every booking request is reviewed within one working day. Itemised quotes show exact deliverables, total cost in Ghana Cedis (GHS), the required deposit, and the expiry date (default 7 days). Prices on an issued quote are frozen even if public package prices change later.

## 2. Securing a date
One crew serves one photography or videography job per time window. Sending or accepting a quote does not block the calendar publicly; your date is reserved only after the deposit is recorded and your booking moves to Confirmed.

## 3. Deposits and balance payments
Deposits are paid via Mobile Money or bank transfer using the instructions shown on your status page. The remaining balance is due as stated on your quote prior to final gallery or master file release.

## 4. Rescheduling and cancellations
- You may cancel a request or booking at any time from your private booking status link or via WhatsApp.
- Cancelling before a deposit is paid carries no fee.
- Once a date is confirmed with a deposit, refunds or date transfers depend on notice given and unrecoverable crew or preparation costs. Contact our desk promptly so we can review alternatives.

## 5. Rush requests
Online booking enforces a minimum 3-day lead time. If your event or deadline is sooner, message us directly on WhatsApp so we can check immediate crew availability.',
  '2026-11-01T00:00:00Z',
  'Initial launch booking policy.'
)
on conflict (slug, version) do nothing;

-- Seed packages across services (prices in integer pesewas: 100 pesewas = 1 GHS)
insert into packages (id, service_id, name, summary, price_minor, duration_hours, deliverables, is_featured, sort_order)
select
  'a1000000-0000-4000-8000-000000000001'::uuid,
  id,
  'Ceremony Only Coverage',
  'Focused coverage for church, mosque, court, or family hall ceremonies in Accra.',
  280000,
  4.0,
  array['1 lead photographer', 'Up to 4 hours on location', '180+ colour-graded photographs', 'Private online delivery within 7 working days'],
  false,
  10
from services where slug = 'event-photography'
on conflict (id) do nothing;

insert into packages (id, service_id, name, summary, price_minor, duration_hours, deliverables, is_featured, sort_order)
select
  'a1000000-0000-4000-8000-000000000002'::uuid,
  id,
  'Full-Day Wedding & Reception',
  'Unrushed documentation from bridal preparation through the final reception dance.',
  580000,
  10.0,
  array['2 photographers', 'Up to 10 hours coverage', '450+ edited high-resolution frames', 'Next-day preview set of 15 frames', 'Online delivery within 14 working days'],
  true,
  20
from services where slug = 'event-photography'
on conflict (id) do nothing;

insert into packages (id, service_id, name, summary, price_minor, duration_hours, deliverables, is_featured, sort_order)
select
  'a1000000-0000-4000-8000-000000000003'::uuid,
  id,
  'Studio Portrait Session',
  'Clean, directed studio or location portraits for professionals and families.',
  120000,
  2.0,
  array['Up to 2 hours session time', '25 retouched high-resolution portraits', '3 outfit or backdrop looks', 'Delivery within 5 working days'],
  false,
  10
from services where slug = 'portrait-photography'
on conflict (id) do nothing;

insert into packages (id, service_id, name, summary, price_minor, duration_hours, deliverables, is_featured, sort_order)
select
  'a1000000-0000-4000-8000-000000000004'::uuid,
  id,
  'Commercial Product Set',
  'Consistent studio lighting and clean colour accuracy for menus and online catalogues.',
  180000,
  4.0,
  array['Up to 15 styled product frames', 'Consistent white or dark-surface backgrounds', 'Web and print export sizes', 'Delivery within 5 working days'],
  false,
  10
from services where slug = 'product-photography'
on conflict (id) do nothing;

insert into packages (id, service_id, name, summary, price_minor, duration_hours, deliverables, is_featured, sort_order)
select
  'a1000000-0000-4000-8000-000000000005'::uuid,
  id,
  'Ceremony Film & Highlight Reel',
  'Multi-camera audio and cinema coverage capturing speeches, vows, and music cleanly.',
  620000,
  8.0,
  array['2 camera operators with dedicated audio capture', '5-minute graded highlight film', 'Full-length edited ceremony cut', '4K digital delivery within 21 working days'],
  true,
  10
from services where slug = 'event-videography'
on conflict (id) do nothing;

insert into packages (id, service_id, name, summary, price_minor, duration_hours, deliverables, is_featured, sort_order)
select
  'a1000000-0000-4000-8000-000000000006'::uuid,
  id,
  'Performance Music Video',
  'Pre-production treatment, cinema lighting, and colour grade for artists.',
  750000,
  10.0,
  array['Director treatment and shot list', 'Single full-day shoot in Greater Accra', '4K cinema edit and colour grade', 'Vertical teaser cut for social channels'],
  false,
  10
from services where slug = 'music-video'
on conflict (id) do nothing;

insert into packages (id, service_id, name, summary, price_minor, duration_hours, deliverables, is_featured, sort_order)
select
  'a1000000-0000-4000-8000-000000000007'::uuid,
  id,
  'Brand Documentary Short',
  'Founder interviews and workplace b-roll shaped for corporate campaigns.',
  480000,
  6.0,
  array['Pre-shoot interview planning call', '3-minute master brand film', '30-second social cutdown', 'Licensed audio and clean subtitles'],
  false,
  10
from services where slug = 'brand-promo-video'
on conflict (id) do nothing;

insert into packages (id, service_id, name, summary, price_minor, duration_hours, deliverables, is_featured, sort_order)
select
  'a1000000-0000-4000-8000-000000000008'::uuid,
  id,
  'Complete Identity System',
  'Primary mark, monochrome variations, typography rules, and usage sheets.',
  250000,
  null,
  array['2 initial logo directions', 'Up to 3 revision rounds', 'Vector SVG, EPS, PDF, and PNG exports', 'Concise brand colour and type sheet'],
  true,
  10
from services where slug = 'logo-and-brand-identity'
on conflict (id) do nothing;

insert into packages (id, service_id, name, summary, price_minor, duration_hours, deliverables, is_featured, sort_order)
select
  'a1000000-0000-4000-8000-000000000009'::uuid,
  id,
  'Event Flyer & Social Suite',
  'Print-ready posters plus sized assets for WhatsApp status and Instagram.',
  95000,
  null,
  array['A3/A4 print-ready CMYK PDF', 'Square and 4:5 Instagram feed sizes', '9:16 WhatsApp Status and story cut', '2 revision rounds included'],
  false,
  10
from services where slug = 'flyers-and-posters'
on conflict (id) do nothing;

-- Update starting prices on services to reflect active packages
update services s
   set starting_price_minor = sub.min_price
  from (
    select service_id, min(price_minor) as min_price
      from packages
     where is_active
     group by service_id
  ) sub
 where s.id = sub.service_id
   and s.starting_price_minor is null;

-- Seed FAQs
insert into faqs (id, question, answer, sort_order, is_published) values
(
  'e1000000-0000-4000-8000-000000000001'::uuid,
  'How does booking work and when is my date secured?',
  'Send a request using the four-step booking form. We review crew availability and reply within one working day with an itemised quote in Ghana Cedis. Your date is reserved only after you accept the quote and pay the deposit shown on your status page.',
  10,
  true
),
(
  'e1000000-0000-4000-8000-000000000002'::uuid,
  'How do we pay deposits and balances?',
  'Deposits are paid by MTN Mobile Money or bank transfer using the studio details displayed once you accept a quote. Send your payment reference on WhatsApp so our desk can record it and confirm your booking.',
  20,
  true
),
(
  'e1000000-0000-4000-8000-000000000003'::uuid,
  'How long does delivery take after an event or design brief?',
  'Portrait sessions and graphic design jobs typically deliver within 5 working days. Full-day event photography galleries deliver within 7 to 14 working days, and multi-camera event films within 21 working days.',
  30,
  true
),
(
  'e1000000-0000-4000-8000-000000000004'::uuid,
  'Will our photos or videos appear publicly on your website?',
  'Never without your consent. We ask explicitly before publishing any private family event, memorial, or portrait on our portfolio, and you can withdraw consent at any time.',
  40,
  true
),
(
  'e1000000-0000-4000-8000-000000000005'::uuid,
  'What happens if we need to reschedule or cancel?',
  'You can cancel any open request from your private status link. If a confirmed date needs to move due to family or venue changes, message us on WhatsApp as early as possible so we can check alternative dates under our Booking Policy.',
  50,
  true
)
on conflict (id) do nothing;
`;
