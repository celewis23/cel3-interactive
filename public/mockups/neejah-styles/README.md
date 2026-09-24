# Najeeah Styles concept review

Share `/mockups/neejah-styles`. The Next.js rewrite serves the client home from the root `index.html`; a trailing slash and the explicit `/mockups/neejah-styles/index.html` URL also work. The main mockups index lists it as Najeeah Styles, preserving the name in the supplied designs.

The supplied exports remain under `Home — Choose a Direction-html`:

| Card | Desktop | Mobile | Download |
| --- | --- | --- | --- |
| A — Golden Hour | `Option A — Golden Hour (Desktop)-html/Main.dc.html` | `Option A — Golden Hour (Mobile)-html/Mobile.dc.html` | `Option A — Brand Sheet.pdf` |
| B — Boutique Classic | `Option B — Boutique Classic (Desktop)-html/Editorial.dc.html` | `Option B — Boutique Classic (Mobile)-html/EditorialMobile.dc.html` | `Option B — Brand Sheet.pdf` |
| C — Sunkissed Modern | `Option C — Sunkissed Modern (Desktop)-html/Ticket.dc.html` | `Option C — Sunkissed Modern (Mobile)-html/TicketMobile.dc.html` | `Option C — Brand Sheet.pdf` |
| D — Flagship Experience | `Option D — Interactive Experience-html/Flagship.dc.html` | `Option D — Interactive Experience (Mobile)-html/FlagshipMobile.dc.html` | `Option D — Brand Sheet.pdf` |

Each card opens its preview in a new tab. A separate **Download brand sheet (PDF)** link at the bottom downloads the matching file with a readable filename. The original `Home.dc.html` redirects to the client home. Keep its supporting scripts and images, which the root index still uses.

`device-view.js` chooses mobile below 1200 CSS pixels and desktop otherwise, including direct preview links. Auto / Mobile / Desktop controls allow manual comparison (`?view=mobile` or `?view=desktop`). Mobile layouts are centered at a maximum width of 640 pixels on larger screens. Forced desktop layouts are zoomable on phones. Resizing an open concept preserves its local state; a new navigation selects the layout for the current screen.

All previews have an **All options** link back to the cards. Brand logos and section navigation stay within the preview. Category filters work in all eight exports. Options A–C demonstrate visual directions; their shopping buttons explain that Option D provides the interactive bag. Option D supports quick view, quantity changes and removing items. Sold-out items cannot be added. Checkout and newsletter controls show demo feedback; they do not place orders, charge money or submit subscriptions.

`review.css` supplies the review controls and responsive adjustments. Each export's `support.js`, `vendor` and `assets` directories must remain beside its HTML file.
