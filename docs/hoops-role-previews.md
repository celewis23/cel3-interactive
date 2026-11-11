# Hoops role previews

The November 2026 app change order replaces the old six-screen preview with
three self-contained role components, using the new CoachApp, ParentApp and
AthleteApp HTML exports and the existing bundled React canvas runtime:

- `/mockups/hoopsbasketballacademy/app/coach`
- `/mockups/hoopsbasketballacademy/app/parent`
- `/mockups/hoopsbasketballacademy/app/athlete`

Tabs switch inside each component. Role-specific state is saved to separate
`hoops.demo.v2.ROLE` sessionStorage keys. Closing the browser tab resets the demo;
no app action creates a real enrollment, sends a message, or charges a card.
Parent billing uses a clearly labeled demo card update and sample receipt download.
The original sample names, placeholder prices, themes and 390×844 desktop frame
are retained. The existing proposal, prices and payment integrations are unchanged.

The intro links to three role cards. A desktop role switcher sits above the phone
frame; phones use the full screen with overview access below the fixed tab bar.
Athlete workout/scanner overlays hide the tab bar and mobile preview chrome.

The old `parent-home`, `messages`, `today`, `workout`, `checkin` and `progress`
app routes redirect to `/app/parent`, as do their six raw HTML filenames
(`ParentHome`, `ParentMessages`, `AthleteToday`, `AthleteWorkout`,
`AthleteCheckin`, `AthleteProgress`, each ending `.dc.html`). The old exports
are removed. The bare `/app` URL also redirects to `/app/parent`.

The public website now includes viewport metadata on all five pages, shared
responsive styles, and a mobile side drawer with backdrop, Escape dismissal,
focus return and keyboard containment. The website App login points to Parent.

Validation: `npm run test:mockups` includes role behavior, persistence and route
regressions. Browser checks cover the role flows on desktop and at 390px, legacy
redirects, and the five website pages at 320, 390, 768 and 1280px. No production
emails or Stripe payments are necessary for these preview-only changes.
