import type { SiteSettings } from "@/modules/catalog/schema";
import { buildWhatsAppUrl, formatDisplayDate, formatAccraDateTime } from "@/lib/dates";
import { formatGhsFromMinor } from "@/lib/money";

export type EmailTemplateName =
  | "booking_received"
  | "admin_new_request"
  | "quote_sent"
  | "admin_quote_accepted"
  | "deposit_instructions"
  | "booking_confirmed"
  | "shoot_reminder"
  | "quote_expired"
  | "request_declined"
  | "admin_cancelled"
  | "cancellation_received"
  | "booking_cancelled"
  | "new_status_link"
  | "admin_new_enquiry";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrapEmailLayout(
  subject: string,
  bodyHtml: string,
  bodyText: string,
  settings: SiteSettings,
  includesPrivateLink: boolean
): RenderedEmail {
  const waUrl = buildWhatsAppUrl(settings.whatsapp_e164, `Hello ${settings.business_name}`);
  const privateNoticeHtml = includesPrivateLink
    ? `<p style="margin-top:20px;padding:12px 14px;border:1px solid #2A2C31;background:#16171A;color:#9AA0A6;font-size:13px;">Anyone with this link can see this booking. Do not forward it to people you do not want viewing your event details.</p>`
    : "";
  const privateNoticeText = includesPrivateLink
    ? "\n\nAnyone with this link can see this booking."
    : "";

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:24px;background:#0A0A0B;color:#FFFFFF;font-family:system-ui,-apple-system,sans-serif;line-height:1.5;">
  <div style="max-width:600px;margin:0 auto;border:1px solid #2A2C31;padding:28px;background:#0A0A0B;">
    <div style="font-family:ui-monospace,monospace;font-size:12px;letter-spacing:0.12em;color:#9AA0A6;margin-bottom:20px;">
      ${escapeHtml(settings.business_name.toUpperCase())}
    </div>
    ${bodyHtml}
    ${privateNoticeHtml}
    <hr style="border:none;border-top:1px solid #2A2C31;margin:28px 0 18px;" />
    <div style="font-size:13px;color:#9AA0A6;">
      <strong style="color:#FFFFFF;">${escapeHtml(settings.business_name)}</strong><br/>
      ${settings.address_text ? `${escapeHtml(settings.address_text)}<br/>` : ""}
      Email: ${escapeHtml(settings.contact_email)} · Phone: ${escapeHtml(settings.phone_e164 ?? settings.whatsapp_e164)}<br/>
      WhatsApp: <a href="${escapeHtml(waUrl)}" style="color:#00E5FF;">Message studio on WhatsApp</a>
    </div>
  </div>
</body>
</html>`;

  const text = `${bodyText}${privateNoticeText}

--
${settings.business_name}
${settings.address_text ?? ""}
Email: ${settings.contact_email}
Phone: ${settings.phone_e164 ?? settings.whatsapp_e164}
WhatsApp: ${waUrl}`;

  return { subject, html, text };
}

export function renderEmailTemplate(
  template: string,
  payload: Record<string, unknown>,
  settings: SiteSettings,
  siteUrl: string
): RenderedEmail {
  const ref = String(payload.reference ?? "");
  const clientName = String(payload.client_name ?? "Client");
  const serviceName = String(payload.service_name ?? "media coverage");
  const statusUrl = payload.status_url
    ? String(payload.status_url)
    : ref && payload.raw_token
      ? `${siteUrl}/booking/status/${encodeURIComponent(ref)}?t=${encodeURIComponent(String(payload.raw_token))}`
      : "";
  const adminBookingUrl = payload.booking_id
    ? `${siteUrl}/admin/bookings/${encodeURIComponent(String(payload.booking_id))}`
    : `${siteUrl}/admin/bookings`;

  switch (template as EmailTemplateName) {
    case "booking_received": {
      const dateStr = payload.event_date
        ? formatDisplayDate(String(payload.event_date))
        : payload.deadline
          ? `Deadline ${formatDisplayDate(String(payload.deadline))}`
          : "Date to be confirmed";
      const linkLine = statusUrl
        ? `<p style="margin:20px 0;"><a href="${escapeHtml(statusUrl)}" style="display:inline-block;background:#FF1F2E;color:#0A0A0B;font-weight:700;text-decoration:none;padding:12px 20px;">Open your booking status</a></p>`
        : "";
      return wrapEmailLayout(
        `Request received (${ref}) — ${settings.business_name}`,
        `<h1 style="font-size:22px;margin:0 0 12px;">Request received</h1>
         <p>Hello ${escapeHtml(clientName)},</p>
         <p>We received your request for <strong>${escapeHtml(serviceName)}</strong> (${escapeHtml(dateStr)}). Your reference is <strong style="font-family:ui-monospace,monospace;">${escapeHtml(ref)}</strong>.</p>
         <p>This is a request, not a confirmed booking yet. Our team reviews every request and sends an itemised quote within one working day.</p>
         ${linkLine}`,
        `Request received (${ref})\n\nHello ${clientName},\nWe received your request for ${serviceName} (${dateStr}).\nReference: ${ref}\nWe reply within one working day.${statusUrl ? `\nStatus link: ${statusUrl}` : ""}`,
        settings,
        Boolean(statusUrl)
      );
    }

    case "admin_new_request": {
      return wrapEmailLayout(
        `New booking request ${ref} — ${clientName}`,
        `<h1 style="font-size:20px;margin:0 0 12px;">New request awaiting review</h1>
         <p><strong>Reference:</strong> <span style="font-family:ui-monospace,monospace;">${escapeHtml(ref)}</span><br/>
         <strong>Client:</strong> ${escapeHtml(clientName)}<br/>
         <strong>Service:</strong> ${escapeHtml(serviceName)}</p>
         <p><a href="${escapeHtml(adminBookingUrl)}" style="color:#00E5FF;">Open in admin desk</a></p>`,
        `New booking request ${ref} from ${clientName} for ${serviceName}.\nOpen: ${adminBookingUrl}`,
        settings,
        false
      );
    }

    case "quote_sent": {
      const totalFormatted = formatGhsFromMinor(Number(payload.total_minor ?? 0));
      const depositFormatted = formatGhsFromMinor(Number(payload.deposit_minor ?? 0));
      const validUntil = payload.valid_until ? formatDisplayDate(String(payload.valid_until)) : "7 days";
      return wrapEmailLayout(
        `Your quote is ready (${ref}) — ${totalFormatted}`,
        `<h1 style="font-size:22px;margin:0 0 12px;">Your quote is ready</h1>
         <p>Hello ${escapeHtml(clientName)},</p>
         <p>We prepared an itemised quote for request <strong style="font-family:ui-monospace,monospace;">${escapeHtml(ref)}</strong>:</p>
         <p><strong>Quote total:</strong> ${escapeHtml(totalFormatted)}<br/>
         <strong>Deposit to secure date:</strong> ${escapeHtml(depositFormatted)}<br/>
         <strong>Valid until:</strong> ${escapeHtml(validUntil)}</p>
         ${statusUrl ? `<p style="margin:20px 0;"><a href="${escapeHtml(statusUrl)}" style="display:inline-block;background:#FF1F2E;color:#0A0A0B;font-weight:700;text-decoration:none;padding:12px 20px;">Review and accept quote</a></p>` : ""}`,
        `Your quote for ${ref} is ready.\nTotal: ${totalFormatted}\nDeposit: ${depositFormatted}\nValid until: ${validUntil}${statusUrl ? `\nReview quote: ${statusUrl}` : ""}`,
        settings,
        Boolean(statusUrl)
      );
    }

    case "admin_quote_accepted": {
      return wrapEmailLayout(
        `Quote accepted (${ref}) — deposit awaited`,
        `<h1 style="font-size:20px;margin:0 0 12px;">Client accepted quote</h1>
         <p>${escapeHtml(clientName)} accepted the quote for <strong style="font-family:ui-monospace,monospace;">${escapeHtml(ref)}</strong>.</p>
         <p>Record the deposit once received and confirm the booking work window.</p>
         <p><a href="${escapeHtml(adminBookingUrl)}" style="color:#00E5FF;">Open booking in admin desk</a></p>`,
        `Client ${clientName} accepted the quote for ${ref}.\nOpen: ${adminBookingUrl}`,
        settings,
        false
      );
    }

    case "deposit_instructions": {
      const depositFormatted = formatGhsFromMinor(Number(payload.deposit_minor ?? 0));
      const momo = settings.social.momo_number ?? settings.whatsapp_e164;
      const bank = settings.social.bank_details ?? "Ask us on WhatsApp for current bank account details.";
      return wrapEmailLayout(
        `Quote accepted (${ref}) — deposit instructions`,
        `<h1 style="font-size:22px;margin:0 0 12px;">Quote accepted</h1>
         <p>Hello ${escapeHtml(clientName)},</p>
         <p>Thank you for accepting the quote for <strong style="font-family:ui-monospace,monospace;">${escapeHtml(ref)}</strong>. To hold your date, please pay the deposit of <strong>${escapeHtml(depositFormatted)}</strong> using either option below and send your payment reference on WhatsApp:</p>
         <p><strong>Mobile Money:</strong> ${escapeHtml(momo)}<br/>
         <strong>Bank transfer:</strong> ${escapeHtml(bank)}<br/>
         <strong>Payment reference:</strong> ${escapeHtml(ref)}</p>
         ${statusUrl ? `<p><a href="${escapeHtml(statusUrl)}" style="color:#00E5FF;">View your booking status</a></p>` : ""}`,
        `Quote accepted for ${ref}.\nDeposit due: ${depositFormatted}\nMobile Money: ${momo}\nBank: ${bank}\nUse reference: ${ref}${statusUrl ? `\nStatus: ${statusUrl}` : ""}`,
        settings,
        Boolean(statusUrl)
      );
    }

    case "booking_confirmed": {
      const windowLabel = payload.starts_at
        ? `${formatAccraDateTime(String(payload.starts_at))} – ${formatAccraDateTime(String(payload.ends_at))}`
        : formatDisplayDate(String(payload.event_date ?? payload.deadline ?? ""));
      const venue = payload.venue_text ? String(payload.venue_text) : String(payload.venue_city ?? "To be finalised");
      return wrapEmailLayout(
        `Booking confirmed (${ref}) — ${settings.business_name}`,
        `<h1 style="font-size:22px;margin:0 0 12px;">You are booked</h1>
         <p>Hello ${escapeHtml(clientName)},</p>
         <p>Your deposit has been recorded and your booking <strong style="font-family:ui-monospace,monospace;">${escapeHtml(ref)}</strong> is confirmed.</p>
         <p><strong>Schedule:</strong> ${escapeHtml(windowLabel)}<br/>
         <strong>Location:</strong> ${escapeHtml(venue)}</p>
         ${statusUrl ? `<p><a href="${escapeHtml(statusUrl)}" style="color:#00E5FF;">View confirmed schedule</a></p>` : ""}`,
        `Booking confirmed (${ref}).\nSchedule: ${windowLabel}\nLocation: ${venue}${statusUrl ? `\nStatus: ${statusUrl}` : ""}`,
        settings,
        Boolean(statusUrl)
      );
    }

    case "shoot_reminder": {
      const windowLabel = payload.starts_at
        ? formatAccraDateTime(String(payload.starts_at))
        : formatDisplayDate(String(payload.event_date ?? ""));
      return wrapEmailLayout(
        `48-hour reminder for ${ref} — ${settings.business_name}`,
        `<h1 style="font-size:22px;margin:0 0 12px;">Shoot reminder</h1>
         <p>Hello ${escapeHtml(clientName)},</p>
         <p>This is a quick reminder that our crew is scheduled with you for booking <strong style="font-family:ui-monospace,monospace;">${escapeHtml(ref)}</strong> on <strong>${escapeHtml(windowLabel)}</strong>.</p>
         <p>Reply on WhatsApp if there are any last-minute venue or timing notes.</p>`,
        `Reminder: booking ${ref} is scheduled for ${windowLabel}.`,
        settings,
        false
      );
    }

    case "quote_expired": {
      return wrapEmailLayout(
        `Quote expired (${ref}) — ${settings.business_name}`,
        `<h1 style="font-size:22px;margin:0 0 12px;">This quote has expired</h1>
         <p>Hello ${escapeHtml(clientName)},</p>
         <p>The validity window for quote <strong style="font-family:ui-monospace,monospace;">${escapeHtml(ref)}</strong> has passed. If you still want us to cover this work, message us on WhatsApp or email and we will check availability and issue a refreshed quote.</p>`,
        `Your quote for ${ref} has expired. Reply here or on WhatsApp and we will refresh it.`,
        settings,
        false
      );
    }

    case "request_declined": {
      const reason = payload.reason ? String(payload.reason) : "Our crew is unable to take this request on the requested schedule.";
      return wrapEmailLayout(
        `Update on your request (${ref}) — ${settings.business_name}`,
        `<h1 style="font-size:22px;margin:0 0 12px;">We cannot take this one</h1>
         <p>Hello ${escapeHtml(clientName)},</p>
         <p>Thank you for contacting ${escapeHtml(settings.business_name)} regarding <strong style="font-family:ui-monospace,monospace;">${escapeHtml(ref)}</strong>.</p>
         <p>${escapeHtml(reason)}</p>
         <p>If your dates are flexible, message us on WhatsApp and we will gladly check alternative days.</p>`,
        `Update on ${ref}: ${reason}`,
        settings,
        false
      );
    }

    case "admin_cancelled": {
      const reason = payload.reason ? String(payload.reason) : "No reason provided.";
      return wrapEmailLayout(
        `Booking cancelled by client (${ref})`,
        `<h1 style="font-size:20px;margin:0 0 12px;">Client cancelled booking</h1>
         <p>${escapeHtml(clientName)} cancelled <strong style="font-family:ui-monospace,monospace;">${escapeHtml(ref)}</strong>.</p>
         <p><strong>Reason:</strong> ${escapeHtml(reason)}</p>
         <p><a href="${escapeHtml(adminBookingUrl)}" style="color:#00E5FF;">Review in admin desk</a></p>`,
        `Client cancelled ${ref}. Reason: ${reason}\nOpen: ${adminBookingUrl}`,
        settings,
        false
      );
    }

    case "cancellation_received":
    case "booking_cancelled": {
      const reason = payload.reason ? String(payload.reason) : "";
      return wrapEmailLayout(
        `Booking cancelled (${ref}) — ${settings.business_name}`,
        `<h1 style="font-size:22px;margin:0 0 12px;">Booking cancelled</h1>
         <p>Hello ${escapeHtml(clientName)},</p>
         <p>Request <strong style="font-family:ui-monospace,monospace;">${escapeHtml(ref)}</strong> has been marked as cancelled.${reason ? ` Note: ${escapeHtml(reason)}` : ""}</p>
         <p>Our Booking Policy governs any deposit refund if a deposit was already recorded. Message us if you need help.</p>`,
        `Request ${ref} has been cancelled.${reason ? ` Note: ${reason}` : ""}`,
        settings,
        false
      );
    }

    case "new_status_link": {
      return wrapEmailLayout(
        `Fresh booking status link (${ref}) — ${settings.business_name}`,
        `<h1 style="font-size:22px;margin:0 0 12px;">Your new status link</h1>
         <p>Hello ${escapeHtml(clientName)},</p>
         <p>Here is your new private status link for booking <strong style="font-family:ui-monospace,monospace;">${escapeHtml(ref)}</strong>. Any earlier link no longer works.</p>
         ${statusUrl ? `<p style="margin:20px 0;"><a href="${escapeHtml(statusUrl)}" style="display:inline-block;background:#FF1F2E;color:#0A0A0B;font-weight:700;text-decoration:none;padding:12px 20px;">Open booking status</a></p>` : ""}`,
        `Your new status link for ${ref}: ${statusUrl}`,
        settings,
        Boolean(statusUrl)
      );
    }

    case "admin_new_enquiry": {
      const sender = String(payload.name ?? "Visitor");
      const email = String(payload.email ?? "");
      const phone = payload.phone ? String(payload.phone) : "Not provided";
      const message = String(payload.message ?? "");
      return wrapEmailLayout(
        `New contact enquiry from ${sender}`,
        `<h1 style="font-size:20px;margin:0 0 12px;">New website enquiry</h1>
         <p><strong>From:</strong> ${escapeHtml(sender)} (${escapeHtml(email)})<br/>
         <strong>Phone:</strong> ${escapeHtml(phone)}</p>
         <p style="padding:12px;border:1px solid #2A2C31;background:#16171A;">${escapeHtml(message)}</p>
         <p><a href="${escapeHtml(siteUrl)}/admin/enquiries" style="color:#00E5FF;">Open enquiries inbox</a></p>`,
        `New enquiry from ${sender} (${email}, ${phone}):\n\n${message}`,
        settings,
        false
      );
    }

    default:
      return wrapEmailLayout(
        `${settings.business_name} update (${ref})`,
        `<p>Hello ${escapeHtml(clientName)},</p><p>Your booking <strong style="font-family:ui-monospace,monospace;">${escapeHtml(ref)}</strong> has an update.</p>`,
        `Update for booking ${ref}.`,
        settings,
        false
      );
  }
}
