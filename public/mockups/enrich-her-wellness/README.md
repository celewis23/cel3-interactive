# Enrich Her Wellness concept review

Share `/mockups/enrich-her-wellness/`. The Next.js rewrite serves the client home from `index.html`; the explicit `/mockups/enrich-her-wellness/index.html` address and the bare `/mockups/enrich-her-wellness` address (via `next.config.ts`) also work. The main mockups directory lists it as Enrich Her Wellness.

Unlike the other clients in this repo, each of the three directions here pairs **two** deliverables — a website and a matching Instagram concept (profile, nine-post launch grid, and post/story templates) — so every card on the index page links to both. The supplied exports and brand sheets remain under `Start here — Three directions-html`:

| Card | Website | Instagram | Brand sheet |
| --- | --- | --- | --- |
| A — Gilded Calm | `Concept A — Gilded Calm · Website-html/SiteA.dc.html` | `Concept A — Gilded Calm · Instagram-html/InstaA.dc.html` | `Concept A — Gilded Calm · Brand sheet.pdf` |
| B — Garden Gold | `Concept B — Garden Gold · Website-html/SiteB.dc.html` | `Concept B — Garden Gold · Instagram-html/InstaB.dc.html` | `Concept B — Garden Gold · Brand sheet.pdf` |
| C — Golden Hour | `Concept C — Golden Hour · Website-html/SiteC.dc.html` | `Concept C — Golden Hour · Instagram-html/InstaC.dc.html` | `Concept C — Golden Hour · Brand sheet.pdf` |

Each card's **Website** and **Instagram** buttons open their concept in a new tab, preserving this page. The separate **Download brand sheet (PDF)** link downloads the matching PDF with a readable filename. The original exported `Main.dc.html` redirects to the new root client home; its support, vendor and logo assets are still used by the root `index.html`.

The Instagram concepts are static design reference boards (a fixed 1880×1180 canvas showing a phone-shaped profile preview next to post and story templates and highlight covers) — not live, swipeable Instagram clones. The website concepts are static design mockups too: the "Add to bag" and similar buttons don't hold state or place orders. Anything in `[brackets]` across both is a placeholder for Francine's real photos, programs, prices and copy, called out again in the "What we still need" section on the index page.

As with the other clients' exports, none of these six pages have a separate mobile breakpoint (all are fixed at their desktop/board preview width), so there is no `device-view.js` here — just the shared **All options** review banner (`review.css`) linking back to the cards. Keep each concept's `support.js`, `vendor`, and `assets` directories beside its HTML file.
