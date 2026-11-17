<table><tbody><tr><td><strong>HEPHZIBAH MEDIA</strong><br><strong>PRODUCT REQUIREMENTS DOCUMENT</strong></td></tr><tr><td><strong>Hephzibah Media website</strong><br>Photography, videography and graphic design: showcase, booking requests and a simple admin desk</td></tr><tr><td></td></tr></tbody></table>

<table><tbody><tr><td>Version</td><td>1.0 (draft)</td></tr><tr><td>Date</td><td>16 November 2026</td></tr><tr><td>Status</td><td>Draft for client review</td></tr><tr><td>Prepared by</td><td>Codey Dev</td></tr><tr><td>Document set</td><td>PRD, Technical Design (TDD), Design Brief, App Flow, Backend Schema</td></tr></tbody></table>

1\. Purpose of this document
============================

This document says what the Hephzibah Media website must do, for whom, and how we will know it works. It is the contract between the business and the build: the Technical Design, Design Brief, App Flow and Backend Schema all trace back to the requirement IDs (FR-xx, NFR-xx, BR-xx) defined here.

<table><tbody><tr><td><strong>READ THIS FIRST</strong><br>Several answers were not available when this was written (client accounts, online payments, live calendar). Each is written down as a labelled assumption in section 9 so it can be confirmed or overturned in one conversation. Nothing in the suite depends on an assumption in a way that cannot be changed cheaply.<br>Legal items are classified and explained in section 8. They are engineering guidance, not legal advice; the points marked VERIFY need a Ghanaian lawyer or the regulator to confirm.</td></tr></tbody></table>

2\. Product summary
===================

Hephzibah Media sells three things: photography, videography and graphic design. The photography and videography work is tied to occasions (weddings, funerals, outdooring ceremonies, corporate events and similar), where the date is fixed and the stakes are emotional. The design work is deadline-driven and often starts with a message and a few reference pictures.  
The website has one job: turn a visitor who is impressed by the work into a **complete, structured booking request** that the team can answer within a day. It is a showcase and an intake desk, not a shop and not a social network.

2.1 What is being solved
------------------------

2.2 Goals and measures
----------------------

| **ID** | **Goal** | **How we measure it** | **Target at 90 days after launch** |
| --- | --- | --- | --- |
| G1 | Visitors can judge the work quickly on a mid-range phone | Largest Contentful Paint on the portfolio page, mobile, 4G profile (lab and field) | LCP under 2.5 s; no layout shift above 0.1 |
| G2 | Requests arrive complete | Share of submitted requests needing no clarifying question before a quote (admin tick-box on first reply) | 80% or more |
| G3 | Requests are answered fast | Median time from request to first admin action, shown on the dashboard | Under 24 hours |
| G4 | No double-booked dates | Overlapping confirmed jobs in the database | Zero (enforced by constraint, not by process) |
| G5 | The team runs the site without a developer | Portfolio item published by a non-technical admin, unaided, in one sitting | Under 10 minutes per item after a 30-minute handover |

2.3 Non-goals for version 1
---------------------------

3\. Users
=========

| **Persona** | **Who they are** | **What they need from the site** | **Design consequence** |
| --- | --- | --- | --- |
| Event client (P1) | Planning a wedding, funeral, outdooring or birthday; often a family member acting for a group; time-pressed and emotional; arrives from WhatsApp or Instagram on a phone | Proof that the team handles their kind of occasion with care; a straight answer on cost and availability; no jargon | Occasion-led navigation; respectful tone for sensitive occasions; booking form that never feels like a tax return |
| Business buyer (P2) | Marketing or events lead booking a conference, product shoot or brand video; may need a quote document for approval | Showreel, past client types, turnaround, an itemised quote they can forward | Pricing guide, itemised quote with validity date, professional confirmation emails |
| Design client (P3) | Needs a logo, flyer or social graphics by a deadline; usually has a reference image or competitor in mind | See design range, state deadline and deliverable formats, share reference links | Design branch of the booking form asks for deadline and formats, not event details |
| Admin (P4) | Owner or creative lead; often on a phone between shoots; not a developer | See what needs a reply now, quote quickly, never double-book, publish new work without help | Inbox-first dashboard; large touch targets; every action reversible or confirmed |

Shared constraints: mid-range Android phones, patchy 4G, data cost sensitivity, and Mobile Money as the normal way to pay. The primary device is a phone; desktop is a second-class (but fully supported) layout.

4\. Scope
=========

| **Release** | **Contents** |
| --- | --- |
| Version 1 (launch) | Public site (home, services, portfolio, pricing, about, testimonials, FAQ, contact, legal pages); structured booking request with availability display; emailed status link; quote acceptance; admin desk (inbox, quotes, manual deposit recording, calendar, portfolio, content); email notifications; WhatsApp links; SEO basics |
| Phase 2 | Paystack deposits (GHS cards and Mobile Money) with webhook reconciliation; SMS reminders; private client galleries with download; post-job review request; calendar feed (ICS) for the team |
| Later | Blog or behind-the-scenes; multiple crews; invoice PDFs; prints shop |

4.1 Site map (version 1)
------------------------

| **Area** | **Pages** |
| --- | --- |
| Public | Home; Services (Photography, Videography, Graphic design, each with sub-services); Portfolio (photography gallery, video showreel, design work, item detail); Packages and pricing; Request a booking; Booking confirmation; Booking status (private link); About; Testimonials; FAQ; Contact |
| Legal | Terms and conditions; Privacy policy; Booking, cancellation and refund policy; 404 |
| Admin (private) | Dashboard; Bookings and requests; Calendar and blocked dates; Portfolio manager; Services and packages; Testimonials; FAQ; Enquiries; Site settings; Team |

5\. Functional requirements
===========================

Priority uses MoSCoW: **M** must have for launch, **S** should have, **C** could have. Acceptance criteria are written so a tester can say pass or fail.

5.1 Public site
---------------

| **ID** | **Requirement** | **Pri** | **Acceptance criteria** |
| --- | --- | --- | --- |
| FR-01 | Home page presents the strongest work, the three services, a short how-it-works strip, featured portfolio and one primary call to action (Request a booking). | M | On a 360 px wide viewport the booking action is visible without scrolling; the hero image is the preloaded LCP element. |
| FR-02 | One page per service kind lists its sub-services and the occasions it covers, optional starting prices, packages, and a strip of related work. | M | Each page is reachable in two taps from home; every sub-service links to the booking form with that service preselected. |
| FR-03 | Portfolio grid is filterable by kind and occasion; items open to a gallery or video. | M | Filter state is held in the URL and survives refresh; all controls work by keyboard; images keep their native aspect ratio. |
| FR-04 | Packages and pricing page lists package name, duration, deliverables and price in GHS, with a clear route to request a bespoke quote. | S | Prices shown equal the values in the database at render time; no price is hard-coded in page code. |
| FR-05 | About, testimonials and FAQ pages are driven by admin-managed content. | M | Admin edits appear on the public page within 60 seconds without a deployment. |
| FR-06 | WhatsApp click-to-chat and phone links appear in the header or footer of every page. | M | The WhatsApp link opens a chat with a prefilled message naming the page the visitor was on. |
| FR-07 | Contact form (name, email, optional phone, message) with unticked consent, stored as an enquiry and notified to admin. | M | A submitted enquiry appears in the admin inbox and triggers one email; empty or over-long input is rejected with a message beside the field. |

5.2 Booking request
-------------------

| **ID** | **Requirement** | **Pri** | **Acceptance criteria** |
| --- | --- | --- | --- |
| FR-10 | Four-step request: (1) service and occasion, (2) when and where, (3) details, (4) contact and consent. | M | A visitor can complete it on a phone in under three minutes; back navigation keeps entered values. |
| FR-11 | Date picker marks unavailable dates and enforces the minimum lead time. Design requests ask for a deadline and deliverable formats instead of an event date. | M | Unavailable dates cannot be chosen by touch or keyboard and are announced as unavailable to screen readers; the server re-checks the date and rejects stale choices. |
| FR-12 | Visitor may pick a package or choose Not sure yet. | S | Both paths submit successfully; the chosen package is stored on the request. |
| FR-13 | Free-text brief (10 to 4000 characters) and up to five reference links. No file uploads in version 1. | M | Links must be valid web addresses; the sixth link is refused with a message. |
| FR-14 | Consent step has an unticked checkbox for the Privacy Policy and Booking Policy; accepted versions and the time are stored. | M | Submission is impossible without the tick; the stored version equals the version shown on screen. |
| FR-15 | Submission is idempotent: a double tap or retry creates one request. | M | Submitting the same payload twice returns the same reference and creates one row and one set of emails. |
| FR-16 | On success show a reference (format HM-YYMM-XXXXX), a summary, what happens next, a WhatsApp link carrying the reference, and send a confirmation email. | M | Reference and email arrive within one minute under normal conditions. |
| FR-17 | The in-progress form survives an accidental refresh; a persistent submission failure offers the WhatsApp fallback. | S | After a forced refresh on step 3 the earlier steps are intact; with the API forced to fail, the fallback link is shown. |
| FR-18 | Abuse protection (honeypot, rate limiting, bot scoring) that does not show ordinary visitors a puzzle. | M | A scripted burst of 20 submissions from one source is throttled; a normal submission is never challenged. |

5.3 Client tracking
-------------------

| **ID** | **Requirement** | **Pri** | **Acceptance criteria** |
| --- | --- | --- | --- |
| FR-20 | The confirmation email contains a private link to a status page showing the timeline, current quote and next step. | M | The page loads without login; with a wrong or missing token it shows nothing about the booking. |
| FR-21 | Client can accept a live quote on the status page. Acceptance shows deposit instructions. | M | Acceptance after the validity date is refused with a clear message; acceptance moves the request to Accepted and notifies admin. |
| FR-22 | Client can cancel a request or booking from the status page, with an optional reason. No automatic refund. | S | Cancellation is recorded in the timeline and the admin is emailed; the booking policy governs any refund. |
| FR-23 | Client can request changes through a WhatsApp link that carries the reference. | S | The link opens WhatsApp with the reference in the message. |

5.4 Admin desk
--------------

| **ID** | **Requirement** | **Pri** | **Acceptance criteria** |
| --- | --- | --- | --- |
| FR-30 | Sign-in with email, password and a mandatory authenticator-app code. No shared accounts. | M | A correct password alone never reaches admin data; sessions expire after inactivity. |
| FR-31 | Dashboard shows requests awaiting first response (with age), quotes expiring soon, the next seven days of confirmed work, and failed emails. | M | Counts equal database counts; items link to the booking. |
| FR-32 | Bookings list with filters (status, kind, dates) and search (reference, name, email, phone); detail page with full timeline. | M | Search by the last four digits of a phone number finds the booking. |
| FR-33 | Create and send quotes with line items; sending freezes the prices; a revised quote supersedes the old one. | M | After sending, no price can be edited; the client sees only the latest sent quote. |
| FR-34 | Record deposits and payments manually (method, amount, reference, date). | M | Entries cannot be edited, only corrected by a new refund entry. |
| FR-35 | Confirm a booking: needs an accepted quote, a work window and a recorded deposit. Refused with a plain message if the window overlaps a confirmed job. | M | Two concurrent attempts to confirm overlapping windows result in exactly one success. |
| FR-36 | Calendar of confirmed and quoted jobs and blocked dates; add and remove blocked dates. | M | A blocked date disappears from the public picker within 60 seconds. |
| FR-37 | Decline, cancel and complete actions with reason; client is notified. | M | Illegal moves (for example Quoted straight to Completed) are impossible, not merely hidden. |
| FR-38 | Portfolio manager: create item, upload images with required alt text, add videos by link, set cover, reorder, tick client consent, publish or unpublish. | M | An item cannot be published without the consent tick or without alt text on every image. |
| FR-39 | Manage services, packages, FAQs, testimonials and site settings (contact details, lead time, quote validity). | M | Changes are visible publicly within 60 seconds. |
| FR-40 | Enquiries inbox with statuses. | S | An enquiry can be marked replied, spam or closed. |
| FR-41 | Owner can add admin users and limit what each can do (bookings, content, settings, team). | S | A user with only the content scope cannot open bookings, including by direct URL. |

5.5 Notifications, content and legal
------------------------------------

| **ID** | **Requirement** | **Pri** | **Acceptance criteria** |
| --- | --- | --- | --- |
| FR-50 | Transactional emails for each event in the notification matrix (App Flow, section 9). Failures are retried and visible to admin. | M | Killing the email provider for ten minutes loses no email; the dashboard shows the backlog. |
| FR-51 | Reminder email to the client 48 hours before a confirmed shoot. | S | Exactly one reminder is sent per confirmed job. |
| FR-52 | Daily job expires quotes past their validity date and notifies the client. | M | An expired quote can no longer be accepted. |
| FR-60 | Public pages are server-rendered with unique titles and descriptions, social preview image, sitemap, robots file and local business structured data. | M | Every public URL returns complete HTML without client-side script. |
| FR-61 | Terms, Privacy and Booking Policy pages are versioned and editable; footer links on every page; consent records point to a version. | M | Publishing a new version does not alter what earlier clients accepted. |
| FR-62 | Version 1 sets no non-essential cookies. If a later feature needs them, a consent control ships before the feature does. | M | A fresh browser session shows no cookie other than the admin session cookie on admin routes. |
| FR-63 | Branded 404 and error pages that never expose technical detail. | M | A forced server error shows the friendly page and a reference ID. |

6\. Business rules
==================

| **ID** | **Rule** | **Why it exists** |
| --- | --- | --- |
| BR-01 | A request moves only along these paths: New, Reviewing, Quoted, Accepted, Confirmed, Completed; with Declined, Cancelled and Expired as exits. Illegal jumps are rejected by the database. | Prevents a mis-click from skipping the deposit step and holding a date for free. |
| BR-02 | Quote prices are frozen when the quote is sent. Later changes to the price list never alter an issued quote. | A client who accepted GHS 1,500 must never see 1,650 because a package price changed. |
| BR-03 | A date is held only at Confirmed (deposit recorded). A Quoted or Accepted request does not block the date publicly. | Open quotes would otherwise lock the calendar against paying clients. |
| BR-04 | Version 1 assumes one crew. No two Confirmed photography or videography jobs may overlap in time. | Matches how the business appears to work; revisit if a second crew is added. |
| BR-05 | Graphic design requests are not date-bound and never block the calendar; they carry a deadline. | Design capacity is not tied to a day. |
| BR-06 | Minimum lead time before an event date is configurable (default 3 days). Shorter notice goes through WhatsApp. | Rush work is a business judgment, not a form field. |
| BR-07 | A quote is valid for a configurable number of days (default 7) and then expires. | Keeps the calendar and pricing honest. |
| BR-08 | Work may be shown in the portfolio only if the client consented; the consent tick is mandatory to publish. | Respect for clients, especially at funerals and for children; also a data-protection duty. |
| BR-09 | The deposit amount is set per quote by the owner (the common practice of a percentage up front is to be confirmed). | Owner decision; the system supports any amount up to the total. |
| BR-10 | Client personal data is anonymised after the retention period in the Backend Schema, section 7. | Data minimisation. |

7\. Non-functional requirements
===============================

| **ID** | **Area** | **Requirement** |
| --- | --- | --- |
| NFR-01 | Performance | On an emulated mid-range Android phone over 4G: LCP under 2.5 s, INP under 200 ms, CLS under 0.1; JavaScript under about 170 KB gzipped per route; web fonts under 300 KB. Measured before launch with before/after figures recorded. |
| NFR-02 | Resilience to poor networks | No autoplaying full-size video; hero video is optional, short and only loaded on a fast connection. Booking submission can be retried safely. Previously loaded public pages remain readable when the database is briefly unavailable. |
| NFR-03 | Availability | Target 99.5% monthly for public pages and booking submission. A planned maintenance window is announced by email to the owner. |
| NFR-04 | Security | Deny-by-default data access enforced in the database; admin sessions need a second factor; secrets never reach the browser; input validated at every boundary; security headers set. Threat model in the TDD. |
| NFR-05 | Accessibility | WCAG 2.2 level AA: visible focus, 44 px minimum touch targets, labelled fields, error summaries, no meaning conveyed by colour alone, reduced-motion respected, alt text on every image. |
| NFR-06 | Browser and device support | Last two versions of Chrome, Safari, Firefox, Edge and Samsung Internet; Android 8 and newer; iOS 15 and newer. |
| NFR-07 | Privacy | Collect only fields that change the quote or the schedule. No third-party trackers in version 1. Retention and deletion per the Backend Schema. |
| NFR-08 | Maintainability | TypeScript strict mode; shared validation schemas; migrations forward-only with a rollback note; pull requests small and reviewed; documentation updated with the change that makes it stale. |
| NFR-09 | Cost | Run on managed services chosen to keep recurring cost low; every service has a documented upgrade trigger (TDD, section 14). Two services need paid plans from day one; see risks R3 and R4. |
| NFR-10 | Recoverability | Target recovery point 24 hours and recovery time 4 hours; restore drilled before launch and then quarterly. |

8\. Documentation and compliance assessment
===========================================

This section classifies every document a project like this might need, as the project rules require. **A** = required by law, platform or the nature of the contract. **B** = conditionally required. **C** = recommended. **D** = not applicable (not created, no page or footer link). Where I could not verify a legal point I say so.

8.1 What the regulator says (checked 16 November 2026)
------------------------------------------------------

<table><tbody><tr><td><strong>CONSEQUENCE FOR THIS PROJECT</strong><br>A booking site collects names, phone numbers, email addresses and the details of private events, so <strong>Hephzibah Media will be a data controller and should register with the DPC before launch</strong>. The registering party is the business that owns the site, not the developer. Category, fee and form are on the DPC website and must be confirmed there. VERIFY.</td></tr></tbody></table>

8.2 Classification
------------------

| **Document or control** | **Class** | **Reason and basis** | **Where it lives** |
| --- | --- | --- | --- |
| Privacy policy and collection notice | A | Personal data is collected; Act 843 requires lawful, transparent processing. Wording must match what the system really does (processors, retention, rights, contact). | /privacy, linked in footer and consent step |
| Terms and conditions (site use and service terms) | A | Contractual necessity: scope, deliverables, usage rights, payment, liability. Not known to be a statutory mandate. | /terms |
| Booking, cancellation and refund policy | A | Contractual: deposits, rescheduling, cancellation, no-show, weather and force majeure, delivery timelines. | /booking-policy, linked at consent step and in the quote |
| Copyright and usage-rights terms | A | Who owns the images, what licence the client receives, the studio’s right to show the work. Default ownership of commissioned work is set by the contract. VERIFY against the Copyright Act, 2005 (Act 690). | Inside Terms; copyright line in footer |
| Client image release and portfolio consent | A | Identifiable people and private events appear in the portfolio; children and funerals are sensitive. Implemented as a consent flag that blocks publishing, plus a release form the team keeps. | Admin portfolio manager; paper or digital release |
| DPC registration as data controller | A | See 8.1. | Business registration; renewal reminder in the owner’s calendar |
| Data retention and deletion procedure | A | Storage limitation is a data-protection principle. The retention schedule is a business decision; the mechanism exists (Backend Schema, section 7). | Internal, summarised in the privacy policy |
| Data breach response procedure | A (VERIFY) | Act 843 is understood to require notification after a security compromise. Confirm the section, who must be told and by when. | Internal runbook, one page |
| Cookie policy and consent banner | B | Version 1 uses only strictly necessary cookies (admin session) and cookieless analytics, so no banner is added. Reassess before adding ad pixels, cookie-setting analytics, or embeds that set cookies before the visitor clicks play. | Not created in v1 |
| Processor terms with vendors | B | Hosting, database, image, email and bot-protection vendors process personal data. Accept each vendor’s standard data-processing terms and keep a register. | Internal vendor register |
| International transfer safeguards | B (VERIFY) | Vendors may store data outside Ghana. Confirm what Act 843 requires for cross-border processing and disclose it in the privacy policy. | Privacy policy |
| Software development agreement and statement of work; IP assignment; NDA | B | Needed if Codey Dev is building this for Hephzibah Media as a client: ownership of code and design, ownership of hosting accounts and domain, support terms. | Between the two businesses; not published |
| Payment provider terms | B | Only when Paystack is added in Phase 2. | Phase 2 |
| Review under the Electronic Transactions Act, 2008 (Act 772) | B (VERIFY) | Online contract formation and any disclosures required for electronic commerce. Ask counsel whether the booking flow needs anything beyond the terms above. | Counsel review |
| Cybersecurity Act, 2020 (Act 1038) review | B (VERIFY) | Unlikely to impose direct duties on a small business site, but confirm. | Counsel review |
| Information security policy (two pages) | C | Small team, high-trust data. Covers MFA, devices, vendor access, offboarding. | Internal |
| Incident response plan | C | Supports the breach procedure. | Internal, one page |
| Backup and disaster recovery plan | C | TDD section 12. | Internal |
| Accessibility statement | C | No Ghanaian mandate found; stating the WCAG 2.2 AA target is good practice. | /accessibility (optional) |
| Admin manual and deployment guide; change log; dependency and licence register | C | Lets the team run the site and lets a new developer take over. | Repository and handover pack |
| Marketing consent notice | D | No newsletter or marketing messages in version 1. Add the consent flow when that feature exists. | Not created |
| Children’s privacy policy | D | The site is not directed at children. Children photographed at events are covered by the image release and guardian consent. | Not created |
| Acceptable use policy; community guidelines | D | No user-generated content. | Not created |
| Shipping policy; subscription terms; seller or vendor agreement; buyer protection | D | Delivery is digital; no subscriptions; no third-party sellers. | Not created |
| Account deletion flow | D | There are no client accounts. Erasure requests go to the contact email under the privacy policy and are handled by the anonymise procedure. | Not created |
| App store compliance | D | Website only. | Not created |
| Business continuity plan | D | Disproportionate for version 1; the backup plan covers the realistic risks. | Not created |

8.3 Questions that need a lawyer or the regulator
-------------------------------------------------

9\. Assumptions and open questions
==================================

Each row has a default I built the documents on. If the answer differs, the last column says how much changes.

| **ID** | **Question** | **Assumed answer** | **If the answer is different** |
| --- | --- | --- | --- |
| A-1 | Do clients need accounts? | No. A private emailed link gives access to one booking. | Add auth for clients; the schema gains a clients table and RLS ownership policies. Moderate. |
| A-2 | Online payment in version 1? | No. Deposits are paid by Mobile Money or bank transfer and recorded by an admin. | Add Paystack: payments table already has provider and reference columns; add webhook route. Small to moderate. |
| A-3 | Live calendar or admin-confirmed dates? | Admin-confirmed. The public calendar shows unavailable dates only; every request is still reviewed. | Instant booking would need slot inventory and payment first. Large. |
| A-4 | How many crews? | One. Confirmed jobs may not overlap. | Add a crews table and scope the overlap constraint per crew. Small. |
| A-5 | Which occasions and sub-services? | Wedding, engagement or traditional marriage, outdooring, birthday, graduation, funeral or memorial, church event, corporate event, portrait, product, music video, brand video; design: logo, flyer or poster, social graphics, invitation. Owner must confirm the list. | Data only: occasions and services are database rows, not code. |
| A-6 | Show prices publicly? | Show packages with starting prices; bespoke work by quote. | Hide prices: remove the pricing page; the data model is unchanged. |
| A-7 | Business identity | Legal name, registration status, address, phone, WhatsApp number, email and social links are not yet supplied and are shown as settings, never hard-coded. | None technical; needed before the legal pages can be finalised. |
| A-8 | Who owns the domain, hosting and accounts? | Hephzibah Media owns every account; the developer is added as a collaborator. | Affects the agreement in 8.2 and handover. |
| A-9 | Language and region | English; Ghana first. Times shown in Africa/Accra (GMT, no daylight saving). | A second language adds a content model layer. Moderate. |
| A-10 | Portfolio material for launch | At least 24 photographs across occasions, 3 videos and 6 design pieces, all with client consent. | Less material means launching with fewer filters; no engineering change. |

10\. Risks
==========

| **ID** | **Risk** | **Likelihood / impact** | **Response** |
| --- | --- | --- | --- |
| R1 | Launch content is thin or lacks client consent | High / High | Content checklist agreed at kickoff; portfolio manager enforces the consent tick; launch with fewer, stronger items rather than many weak ones. |
| R2 | Spam or fake bookings pollute the inbox | Medium / Medium | Honeypot, rate limiting, bot scoring, email format checks; admin can mark spam; no date is held until a deposit is recorded. |
| R3 | Database project pauses or throttles on a free plan after inactivity | Medium / High | Use a paid database plan from launch, or at minimum a scheduled keep-alive and a tested restore; verify the vendor’s current terms. |
| R4 | Hosting plan terms may not allow commercial use on a free tier | Medium / High | Check the host’s current terms before launch and budget for a paid plan or an alternative host. VERIFY. |
| R5 | Emails land in spam (new domain) | Medium / High | Set SPF, DKIM and DMARC on the sending domain; keep WhatsApp as a parallel channel; admin dashboard shows delivery state. |
| R6 | Scope creep toward payments, galleries and accounts | High / Medium | Phase 2 list is explicit; changes go through a short written change note. |
| R7 | Owner time for content and handover | Medium / Medium | A 30-minute admin handover and a one-page admin guide; content tasks scheduled before build completes. |
| R8 | Regulatory registration delays launch | Medium / Medium | Start the DPC registration early; legal pages are drafted in parallel. |