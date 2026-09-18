# Client home · pick an option — design reference

This is a design mockup created in a visual design tool (an appifact
design canvas), exported as a standalone page. Treat it as a REFERENCE
MOCKUP, not production code: the markup and inline styles carry the
design's precise values — colors, font sizes, spacing, radii, shadows,
layout — which an implementation should replicate faithfully in its own
components and styling system rather than copy wholesale.

## Contents

- `Home.dc.html` — the artboard (a Design Component: an `<x-dc>`
  template + a small logic class). The values to replicate live in its
  inline `style="…"` attributes and the `<helmet><style>` block.
- `support.js`, `vendor/react*.js` — the runtime that renders the
  component in a browser; not part of the design.

## Viewing

The client home now lives in `../index.html` and is served at
`/mockups/unlockingrva/` (also `/mockups/ulockingrva/`). `Home.dc.html`
redirects there for existing bookmarks. Keep this folder's `support.js` and
`vendor` files in place: the client home loads them from here.

For a standalone preview, serve the repository's `public` folder over HTTP
and open `/mockups/unlockingrva/index.html`; the alternate spelling requires
the Next.js rewrites.
