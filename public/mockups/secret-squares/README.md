# Secret Squares concept review

Share `/mockups/secret-squares/`. The Next.js rewrite serves the client home from `index.html`; the explicit `/mockups/secret-squares/index.html` address also works. The main mockups index lists it as Secret Squares.

The supplied exports and brand boards remain under `Home · Client landing page-html`:

| Card | Desktop folder/file | Mobile folder/file | Brand board |
| --- | --- | --- | --- |
| A — Gig Poster | `A · Gig Poster · Desktop-html/Main.dc.html` | `A · Gig Poster · Mobile-html/Mobile.dc.html` | `A · Gig Poster · Brand board.pdf` |
| B — The Menu | `B · The Menu · Desktop-html/Editorial.dc.html` | `B · The Menu · Mobile-html/EditorialMobile.dc.html` | `B · The Menu · Brand board.pdf` |
| C — Kitchen Ticket | `C · Kitchen Ticket · Desktop-html/Ticket.dc.html` | `C · Kitchen Ticket · Mobile-html/TicketMobile.dc.html` | `C · Kitchen Ticket · Brand board.pdf` |

Each card's preview opens its concept in a new tab. The separate **Download brand board (PDF)** link at the bottom downloads its matching PDF with a readable filename. Both preserve the client's place on the options page. The original exported `Home.dc.html` redirects to the new client home; its support, vendor and image assets are still used by the root `index.html`.

`device-view.js` chooses mobile below 1200 CSS pixels and desktop at larger widths, including direct concept links. Auto / Mobile / Desktop controls allow manual comparison (`?view=mobile` or `?view=desktop`). Mobile previews are centered at a maximum width of 640 pixels on larger screens; explicitly selected desktop previews remain zoomable on phones. Resizing an open concept preserves its state; new navigation or Auto chooses the current screen size.

Each concept has an **All options** link back to the cards. Section links stay in the concept; Instagram opens in a new tab. All image and PDF paths are local to these exports. Keep each concept's `support.js`, `vendor`, and `assets` directories beside its HTML file.

Ordering, pickup availability, kitchen status, gift cards, catering inquiries and text alerts are local demonstrations. Sample forms validate required fields without placing orders, charging money or sending messages. Prices and hours are sample content. `review.css` supplies shared review controls and responsive adjustments.
