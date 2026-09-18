# UnlockingRVA concept review

Open `/mockups/unlockingrva/index.html` through the website or a local HTTP server. It leads to the client home page with three concept cards:

- **A — Sticker Pop:** `A · Desktop home-html/Main.dc.html`
- **B — After Dark:** `B · Desktop home-html/AfterDark.dc.html`
- **C — The Almanac:** `C · Desktop home-html/Almanac.dc.html`

Each entire card is a keyboard-accessible link that opens the matching concept in a new tab. The original client home page keeps its position. Each concept has an **All options** link back to the cards; external website, store, and social links also open new tabs. Section links stay within the current concept.

The supplied files are desktop concepts. The client home page adapts to narrow screens; full concepts retain a desktop viewport and allow zooming. Links to separate mobile exports were removed because those files were not supplied.

Filters, membership controls, service selectors, the calendar, and planner/postcard controls run locally. Sample forms validate their fields and display a demo confirmation; they do not send messages. The included `support.js` and `vendor` files must stay beside each exported HTML page.
