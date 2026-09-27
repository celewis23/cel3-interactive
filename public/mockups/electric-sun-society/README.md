# Electric Sun Society concept review

Share `/mockups/electric-sun-society/`. The Next.js rewrite serves the root `index.html` for the clean URL, with or without the trailing slash. The main mockups index includes Electric Sun Society. The client home credits CEL3 Interactive at the top and bottom.

The supplied exports and PDFs remain under `Choose a direction-html`:

| Concept | Desktop | Mobile | RSVP demo | Brand sheet |
| --- | --- | --- | --- | --- |
| A — The Headliner | `A · Homepage — Desktop-html/Main.dc.html` | `A · Homepage — Mobile-html/Mobile.dc.html` | `A · RSVP flow — Oct 8 finale-html/RSVP.dc.html` | `A · Brand sheet.pdf` |
| B — Hillside Press | `B · Homepage — Desktop-html/HomeB.dc.html` | `B · Homepage — Mobile-html/MobileB.dc.html` | `B · RSVP reply card — Oct 8 finale-html/RSVPB.dc.html` | `B · Brand sheet.pdf` |
| C — Sound System | `C · Homepage — Desktop-html/HomeC.dc.html` | `C · Homepage — Mobile-html/MobileC.dc.html` | `C · Pre-save (RSVP) — Oct 8 finale-html/RSVPC.dc.html` | `C · Brand sheet.pdf` |

Card previews and homepage/mobile links open new tabs. The cards omit a separate RSVP demo link; RSVP buttons within each full desktop/mobile preview and its mobile menu open the matching RSVP design in a modal. The modal keeps the underlying page and scroll position, returns focus when closed, and supports its Close button, Escape (including inside the form) and clicking the backdrop. Reopening the same RSVP keeps its form state. A same-origin iframe isolates each design's styles; `?embed=rsvp` hides standalone review navigation only inside that iframe. Direct RSVP URLs still work independently. The separate **Download brand sheet (PDF)** link at the bottom of each card downloads its matching PDF. The original `Choose.dc.html` redirects to the client home. Keep its supporting scripts and assets; the root index uses them.

`device-view.js` selects mobile below 1200 CSS pixels and desktop otherwise, including direct links. Auto / Mobile / Desktop controls allow comparison; `?view=mobile` and `?view=desktop` force a layout. These exports use fixed canvases: the 1440-pixel desktop and 390-pixel mobile/RSVP designs scale down to fit narrower screens and stay centered on larger screens. The client home uses a responsive layout. Resize handling preserves the active form state.

Every preview has an **All options** link. RSVP back links return to the matching concept and automatically choose the device layout. Mobile menu buttons open section navigation. Tickets and social links open the supplied Eventbrite and Instagram pages in new tabs; directions open Google Maps for the venue shown in the design.

RSVP demos validate name and email and support party size, travel mode, crew selection and editing. Newsletter, participation and donation actions provide demo feedback without submitting anything. Calendar links download `vibes-at-sunset-demo.ics`, explicitly marked as a tentative sample from the mockup, not a confirmed event listing. Event details and content are supplied concept material.

**Send my choice** emails the selected direction and optional notes to `info@cel3interactive.com` through `/api/mockups/electric-sun-society/choice`, using the site's existing `RESEND_API_KEY` and `RESEND_FROM_EMAIL`. Success appears only after Resend accepts the email. Failures preserve the selection and notes for retry; retries reuse an idempotency key to prevent duplicate emails when a response is lost. The API validates options, limits notes to 4,000 characters, checks the request origin and applies a best-effort per-instance throttle. The recipient and project are fixed on the server. Successful submissions record `mockup.choice_sent` in the activity log; failures are captured by the standard request logger. Notes are included in the email, not the activity log. No sender email address is collected.

`review.css` styles the client home, shared review controls and demo dialogs. Each export's `support.js`, `vendor` and `assets` directories must remain beside its HTML file.
