ap<table><tbody><tr><td><strong>HEPHZIBAH MEDIA</strong><br><strong>DESIGN BRIEF</strong></td></tr><tr><td><strong>Hephzibah Media website</strong><br>Visual language, components and page direction for a camera-first brand</td></tr><tr><td></td></tr></tbody></table>

<table><tbody><tr><td>Version</td><td>1.0 (draft)</td></tr><tr><td>Date</td><td>16 November 2026</td></tr><tr><td>Status</td><td>Draft for client review</td></tr><tr><td>Prepared by</td><td>Codey Dev</td></tr><tr><td>Colour status</td><td>Colours were supplied by name (electric cyan, bright red, deep black, bright white). The hex values below are proposals pending client review.</td></tr></tbody></table>

1\. The design problem
======================

The palette asked for is loud: black, white, electric cyan and bright red. The work it must carry is not. A wedding, a funeral, an outdooring and a music video are very different moods, and a visitor planning one of the first three is usually anxious, grieving or both. A site that shouts in cyan and red over every photograph would serve the music video and insult the funeral.

<table><tbody><tr><td><strong>RESOLUTION</strong><br><strong>Black is the gallery wall; the photographs carry the emotion; cyan and red are instrument colours.</strong> They belong to the interface, the way a camera’s focus box and recording light belong to the camera. They never tint, frame-fill or overlay a client’s photograph.<br>This gives the brand its edge (the palette is unmistakable) while the work stays the hero and sensitive occasions are treated with calm.</td></tr></tbody></table>

1.1 Brand position in one line
------------------------------

A crew that sees the moment before it happens, and is professional about it. Tone: warm, direct, unhurried; Ghanaian English; no hype words; no stock-agency language.

1.2 Signature idea: the viewfinder
----------------------------------

The interface borrows from the camera, but only where the borrowing does a job:

| **Device** | **What it looks like** | **What it does (its job)** | **Where it is allowed** |
| --- | --- | --- | --- |
| Framing corners | Four short L-shaped marks at the corners of an element, 2 px, cyan | Shows the focused or selected item | Keyboard focus on portfolio tiles and cards; hover on pointer devices; the selected step in the booking flow. Never decorative. |
| REC dot | A 10 px red circle beside a label | Marks that an item is video | Video tiles and the showreel link. Static for reduced-motion users; a slow pulse otherwise, only while that tile is hovered or focused. |
| Shot metadata caption | Monospace line: occasion, place, year, count | Gives each item context the way camera data does | Portfolio tiles and item headers, e.g. WEDDING / ACCRA / 2026 / 48 FRAMES |
| Frame counter | Step label “Frame 2 of 4” | Shows progress in the booking flow | Booking stepper only |

Rule of restraint: **one viewfinder device per view.** If the page already has framing corners on focus, it does not also use a REC dot for decoration. When in doubt, remove it.

2\. Colour
==========

2.1 Palette (proposed values)
-----------------------------

| **Token** | **Hex** | **Role** | **Rules** |
| --- | --- | --- | --- |
| \--black | #0A0A0B | Page background, primary surface | Deep black, not pure #000, which causes harsh smearing on OLED phones when scrolling |
| \--ink-2 | #16171A | Raised surface (cards, inputs, admin panels) | Separation by tone and hairline, never by drop shadow |
| \--hairline | #2A2C31 | Decorative dividers | Decorative only (1.42:1 against black). Never the only indication of a control. |
| \--control-border | #8A9096 | Input and button outlines on black | Meets the 3:1 requirement for interface components (6.14:1) |
| \--grey | #9AA0A6 | Secondary text on black | 7.49:1 on black, 6.79:1 on ink-2 |
| \--white | #FFFFFF | Body and heading text on black; light bands | 19.79:1 on black |
| \--cyan | #00E5FF | Focus, selection, links, active states, framing corners | 12.86:1 on black. Never used as text or a fill on white (1.54:1) |
| \--red | #FF1F2E | The primary action fill; REC dot; error accents on black | Appears at most once per viewport as an action fill. 5.17:1 against black |
| \--red-on-light | #E0101F | Error text and red marks on white bands | 4.93:1 on white; use this, not --red, on light backgrounds |
| \--cyan-on-light | #007C8A | Links and focus on white bands | 4.94:1 on white |

2.2 Contrast decisions that matter
----------------------------------

| **Pair** | **Ratio** | **Verdict** | **Decision** |
| --- | --- | --- | --- |
| White text on --red fill | 3.83:1 | Fails for normal text (needs 4.5) | The red button label is deep black, not white (5.17:1). It also reads as a distinct, confident button on a black page. |
| Black text on --red | 5.17:1 | Passes | Used for all primary buttons. |
| \--red text on black | 5.17:1 | Passes | Allowed for error messages on black, always with an icon and words. |
| \--red text on white | 3.83:1 | Fails for normal text | Use --red-on-light (4.93:1). |
| \--cyan text on black | 12.86:1 | Passes strongly | Links and focus rings on black. |
| \--cyan on white | 1.54:1 | Fails | Cyan is never used on white; use --cyan-on-light. |
| Cyan beside red (adjacent) | 2.49:1 | Vibrates optically | Cyan and red never touch. Separate with black space of at least 8 px. |

2.3 Proportion and rhythm
-------------------------

3\. Typography
==============

| **Role** | **Typeface (proposed)** | **Use** | **Why** |
| --- | --- | --- | --- |
| Display and headings | Archivo (variable; heavy weights, expanded width for large headings, normal width below 24 px) | Headlines, section titles, numerals | A grotesque with a width axis gives a confident, camera-body feel and lets one family do both expanded display and compact UI labels |
| Body and UI | Public Sans (variable) | Paragraphs, forms, admin | Calm, highly legible at small sizes on low-density screens; coverage for Latin-extended names |
| Metadata | System monospace stack (ui-monospace, Menlo, Consolas) | Shot captions, reference numbers, timecode-style labels | No download cost; reads as instrument data |

4\. Layout and imagery
======================

4.1 Imagery rules
-----------------

5\. Components
==============

| **Component** | **Specification** |
| --- | --- |
| Primary button | Rectangle, 48 px high, fill --red, label deep black bold, 2 px radius; focus: 3 px cyan ring with 2 px black offset; pressed: darker red; one per viewport |
| Secondary button | Transparent, 2 px --control-border outline, white label; hover swaps the outline to cyan |
| Text link | White or cyan on black, underlined with a 2 px cyan underline offset 4 px; visited state unchanged |
| Form field | Label above (always visible, never placeholder-only), 48 px high, ink-2 fill, --control-border outline, 3 px cyan focus ring; help text in grey below; error text in red with an icon and plain words |
| Date picker | Month grid, 44 px cells. Unavailable dates are struck through with a diagonal pattern and labelled “unavailable” to assistive technology; today and selected differ by shape as well as colour; arrow-key navigation; dates before the lead time are visibly disabled with an explanation line |
| Stepper | Text label “Frame 2 of 4” plus step names; the current step carries framing corners; previous steps are links |
| Portfolio tile | Image at native ratio, monospace caption beneath, REC dot for video, framing corners on hover and keyboard focus |
| Lightbox | Full-screen, keyboard (arrows, escape), swipe, focus trapped, close button 48 px, alt text and caption visible, previous and next preload |
| Package card (white band) | Name, duration, price, deliverables list, secondary button leading to the booking form with the package preselected |
| Status timeline | Vertical list of events with date, label and the current step emphasised; plain language, no internal status names |
| Toast / notice | Rarely used; success and errors appear inline where they happen, with a summary at the top of a form on failure |
| Admin table | 44 px rows, sticky header, status as text with a small shape (not colour alone), row opens detail; works at 360 px by collapsing to cards |

6\. Page direction
==================

Each row names the page’s job, the order of content, and the one distinctive move. Wireframes are produced in Figma from this table.

| **Page** | **Job** | **Content order** | **Distinctive move** |
| --- | --- | --- | --- |
| Home | Prove quality, route to booking | Hero work and one action; three services as three large panels; featured portfolio row; how it works in four steps; testimonials strip; closing action | Hero caption in shot-metadata style; panels use each service’s best image at native ratio |
| Services (hub) | Help a visitor self-select | Three panels, then occasions list, then design deliverables | Occasion names are the primary navigation, not service jargon |
| Service detail | Explain one service and sell it | Intro; sub-services; what you get; packages (white band); related work; action | White band for packages |
| Portfolio | Let the work speak | Filters (kind, occasion) then justified grid | Filters are links with URL state; REC dots on video |
| Portfolio item | Show a job in depth | Title and metadata; gallery or video; short note on the job; related items; action | Large images, minimal chrome |
| Pricing | Remove price anxiety | Plain statement of how pricing works; packages by service; what changes the price; bespoke quote route | White band throughout, paperwork feel |
| Book | Complete request with least effort | Four frames: service and occasion; when and where; details; contact and consent | Frame counter; calendar shows unavailable dates honestly |
| Confirmation | Reassure | Reference, summary, what happens next with times, WhatsApp link, link to status page | Reference set in monospace |
| Status | Keep the client informed | Timeline; current quote with accept action; deposit instructions; change or cancel | Plain-language timeline |
| About | Build trust | Who, how the crew works, equipment philosophy in two lines, a team portrait | No stock portraits; real team |
| Testimonials | Social proof | Short quotes with first name and occasion; link to the related portfolio item | Only quotes the client has approved |
| FAQ | Answer the same five questions once | Booking, deposit, delivery time, rights, cancellation | Accordion with real headings for search and anchors |
| Contact | Give three ways to reach us | WhatsApp first, then phone and email, then form | WhatsApp as the primary action |
| Legal pages | Be readable | Plain-language summary box, then full text, version and date | Typography for reading, not decoration |
| 404 | Recover | Short apology, three useful links, search by occasion | A single well-chosen frame, no joke |
| Admin | Speed and safety | Dashboard: needs-reply list, this week, email problems. Booking detail: timeline left, actions right, quote builder | Large controls, destructive actions confirmed with the booking reference typed or a clear two-step |

7\. Motion
==========

Motion is used only to explain state, never to decorate scrolling.

| **Allowed** | **Spec** | **Not used** |
| --- | --- | --- |
| Framing corners snap to a focused or hovered item | 120 ms ease-out; instant under reduced motion | Scroll-triggered fade-in on every section |
| Booking step change | Horizontal slide of 16 px with a fade, 200 ms; instant under reduced motion | Parallax and scroll-jacking |
| REC dot pulse | 1.6 s, only on a hovered or focused video tile; static under reduced motion | Cursor-following effects or gradient beams |
| Lightbox open and close | 150 ms fade | Fade-only hover as the only hover feedback |

8\. Content voice
=================

| **Moment** | **Say** | **Avoid** |
| --- | --- | --- |
| Primary action | Request a booking | Get started; Book now!! |
| Form reassurance | This is a request, not a commitment. We reply within one working day. | Our team of experts will get back to you ASAP |
| Date unavailable | We are already booked that day. Pick another, or message us if it is urgent. | Error: date invalid |
| Success | Request received. Your reference is HM-2611-K7P4D. | Thank you for choosing us! |
| Quote expired | This quote has expired. Reply here or on WhatsApp and we will refresh it. | Quote no longer valid |
| Funeral and memorial pages | We are here to document the day with care. | Capture the magic |

9\. Accessibility
=================

10\. Anti-generic checklist
===========================

These patterns are common signs of templated work. The right-hand column says what this design does instead.

| **Avoid** | **Instead** |
| --- | --- |
| Gradient blobs and glow orbs | Flat black with real photographs; any glow is optical, from the image itself |
| Glass-effect cards by default | Opaque ink-2 surfaces with a hairline |
| Uniform pill buttons | Rectangles with a clear primary, secondary and text-link hierarchy |
| Every section fading in on scroll | Motion only for state change (section 7) |
| Cursor-following gradient beams | None |
| Grain laid over a gradient as decoration | Grain only as texture on a photograph, if at all |
| Fade-only hover states | Shape change (framing corners, underline) so hover is not colour-only |
| Decorative italic serif accents on a sans UI | One expressive grotesque plus one quiet text face |
| Space Grotesk plus Instrument Serif | Archivo plus Public Sans |
| Stock imagery | Client work only, or no image |
| Square crops for every thumbnail | Native aspect ratios in justified rows |

Inspiration is taken as **mechanics to extract**, not layouts to copy. At design kickoff, each reference is recorded as one sentence naming the mechanic (for example: how a justified gallery handles mixed orientations) and why it suits this brand.

11\. Figma handoff
==================

12\. Needed from the client
===========================

12.1 Open design questions
--------------------------