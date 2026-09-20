# Glue Craft Studio concept review

Share `/mockups/glue-craft-studio/`. The Next.js rewrite serves the new client landing page from the root `index.html`, replacing the original single mockup. The explicit `/mockups/glue-craft-studio/index.html` address also works, and the main mockups index links to the client home.

All supplied exports and PDFs remain under `Home (client landing page)-html`:

| Card | Desktop folder/file | Mobile folder/file | Brand book |
| --- | --- | --- | --- |
| A — Cut & Paste | `Cut & Paste · Desktop-html/Main.dc.html` | `Cut & Paste · Mobile-html/Mobile.dc.html` | `Cut & Paste · Brand board.pdf` |
| B — Open Studio | `Open Studio · Desktop-html/OpenStudio.dc.html` | `Open Studio · Mobile-html/OpenStudioMobile.dc.html` | `Open Studio · Brand board.pdf` |
| C — Overprint | `Overprint · Desktop-html/Overprint.dc.html` | `Overprint · Mobile-html/OverprintMobile.dc.html` | `Overprint · Brand board.pdf` |

Each card's preview opens its concept in a new tab. The separate **Download brand book (PDF)** link at the bottom downloads the matching PDF with a readable filename. Both actions preserve the client's place on the options page. The original exported `Home.dc.html` redirects to the new root client home; its support/vendor files are still required by `index.html`.

`device-view.js` automatically chooses mobile below 1200 CSS pixels and desktop at larger widths, including when opening direct concept links. Auto / Mobile / Desktop controls allow manual comparison (`?view=mobile` or `?view=desktop`). Mobile previews are centered at a maximum width of 640 pixels on larger screens; explicitly requested desktop previews on phones remain zoomable. Resizing an open concept preserves its controls and form entries. New navigation or Auto selects the current screen size.

Every concept has an **All options** link to the client cards. Section links stay within the concept, while external booking, freebie, social and policy links open new tabs. Sample forms validate fields and show a demo confirmation without sending requests. The original exported interactions remain local previews.

Keep `support.js` and the `vendor` directory beside each concept HTML file. `review.css` supplies the shared review controls and adjustments for small screens.
