# You Matter concept review

Share `/mockups/youmatterrva/`. The Next.js rewrite serves the client home from `index.html`; the explicit `/mockups/youmatterrva/index.html` address and the bare `/mockups/youmatterrva` address (via `next.config.ts`) also work. The main mockups directory lists it as You Matter Juice Bar & More.

The supplied exports and brand sheets remain under `Start here — Pick a direction-html`:

| Card | Folder/file | Brand sheet |
| --- | --- | --- |
| A — Fresh Pressed | `Concept A — Fresh Pressed-html/Main.dc.html` | `Brand Sheet — Concept A.pdf` |
| B — Because You Matter | `Concept B — Because You Matter-html/Mission.dc.html` | `Brand Sheet — Concept B.pdf` |
| C — True Colors | `Concept C — True Colors-html/Fresh.dc.html` | `Brand Sheet — Concept C.pdf` |
| D — Order-First Companion | `Concept D — Order-First Companion-html/OrderApp.dc.html` | `Brand Sheet — Concept D.pdf` |

A, B and C are three complete website directions. D is not a fourth site to choose instead of the others — it's a companion ordering screen meant to run alongside whichever site is picked, shown as a wide panel below the three cards rather than a fourth grid card.

D is one React component (`OrderApp.dc.html`) that re-themes itself from a `skin` prop (`D`, `A`, `B` or `C` — see the `SKINS` object and `this.props.skin` in its data-props script). Since a static export can't be re-configured at runtime, the companion is published as four separate files, each baked with a different `skin` default:

| View | File | Skin default |
| --- | --- | --- |
| D (standalone) | `OrderApp.dc.html` | `D` |
| D with A | `DwithA.dc.html` | `A` |
| D with B | `DwithB.dc.html` | `B` |
| D with C | `DwithC.dc.html` | `C` |

The three `DwithX.dc.html` files are otherwise byte-for-byte copies of `OrderApp.dc.html` (same menu data, same logic) — only the `<title>`, the review banner label and the `"default"` value in the `data-props` script differ. Each of the four files carries a small **D · D·A · D·B · D·C** switcher in its review banner (`.mockup-review__views` in `review.css`) so reviewers can hop between skins without returning to the index. The index page's wide Concept D panel links to all four, plus the brand sheet, matching the view buttons from the original exported `Home.dc.html` (`View D` / `D with A` / `D with B` / `D with C` / `Brand sheet`).

Each card's preview opens its concept in a new tab, preserving this page. The separate **Download brand sheet (PDF)** link downloads the matching PDF with a readable filename. The original exported `Home.dc.html` redirects to the new root client home; its support, vendor and image assets are still used by the root `index.html`.

Unlike the other client exports in this repo, none of these four concepts have a separate mobile export (all are fixed at a 1440px desktop preview), so there is no `device-view.js` and no Auto/Mobile/Desktop switcher here. Each concept has an **All options** link back to the cards via `review.css`'s shared banner styling. Keep each concept's `support.js`, `vendor`, and `assets` directories beside its HTML file.

Ordering, cleanse bookings and sign-ups are local demonstrations. Sample forms validate required fields without placing orders, charging money or sending messages. Prices, hours and menu items are sample content tied to a future Square catalog integration, as described on the index page.
