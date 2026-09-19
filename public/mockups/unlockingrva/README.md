# UnlockingRVA concept review

Share `/mockups/unlockingrva/` or `/mockups/ulockingrva/` through the website. Both serve the client home directly from `index.html`, with three concept cards. The explicit `/mockups/unlockingrva/index.html` URL also works.

| Concept | Desktop file | Mobile file (inside its desktop folder) |
| --- | --- | --- |
| A — Sticker Pop | `A · Desktop home-html/Main.dc.html` | `A · Mobile home-html/Mobile.dc.html` |
| B — After Dark | `B · Desktop home-html/AfterDark.dc.html` | `B · Mobile home-html/AfterDarkMobile.dc.html` |
| C — The Almanac | `C · Desktop home-html/Almanac.dc.html` | `C · Mobile home-html/AlmanacMobile.dc.html` |

Each card's preview is a keyboard-accessible link that opens the matching concept in a new tab. A separate **Download brand board (PDF)** link at the bottom downloads the matching A, B, or C PDF from `Client home · pick an option-html`, using a readable filename. The original client home page keeps its position. Each concept has an **All options** link back to the cards; external website, store, and social links also open new tabs. Section links stay within the current concept.

`device-view.js` selects the mobile export for viewports below 1200 CSS pixels, including phones and smaller tablets, and the desktop export for larger viewports. Selection uses available screen space rather than the browser's device name. Card links update when the client home is resized. Opening a direct/bookmarked concept link also selects the appropriate export and preserves query parameters and section fragments.

Each concept has **Auto / Mobile / Desktop** preview links. The explicit choices use `?view=mobile` or `?view=desktop`; Auto returns to screen-based selection. Mobile previews remain at most 640 pixels wide on larger screens. A desktop preview explicitly requested on a phone uses a zoomable desktop viewport. `review.css` supplies the shared review bar and adjustments for narrow screens.

An already-open concept does not automatically reload when rotated or resized, preserving entered form values and selected controls. Its layout remains fluid within that export; opening it again or choosing Auto selects the current screen size.

The original `Client home · pick an option-html/Home.dc.html` address redirects to the client home for existing bookmarks. Its `support.js` and `vendor` files are still used by the root `index.html`. Next.js rewrites provide the two directory URLs; root-relative links keep assets and cards working with either spelling, with or without a trailing slash.

Filters, membership controls, service selectors, the calendar, and planner/postcard controls run locally. Sample forms validate their fields and display a demo confirmation; they do not send messages. The included `support.js` and `vendor` files must stay beside each exported HTML page.
