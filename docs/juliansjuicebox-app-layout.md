# Julian’s Juicebox app layout and scrolling

The app pass covers every owner and customer screen in designs A, B and C:
126 public routes, backed by 38 shared exports and 12 original artboards.

## Changes

- All screens inherit one React-backed `AppScreen` layout, with a fixed header,
  one vertically scrolling content area, and a fixed tab bar.
- Theme tokens follow the original artboards: Barlow Condensed / Barlow for A,
  Bricolage Grotesque / Figtree for B, and Unbounded / DM Sans for C. Selected
  fonts are loaded and verified by the browser. Card borders, radii, button shapes,
  header sizes and active tabs vary by design.
- Unsupported composite style fragments in the exports are expanded to explicit
  theme properties. This fixes the unthemed cards and browser-default controls.
- The 390×844 phone plane scales to fit desktop/tablet windows; at 480px and below,
  it fills 100dvh with safe-area padding. The role switcher and overview link sit
  outside the frame. On phones, overview access is in More / Account.
- Only content scrolls. Scrollbar thumbs stay transparent at rest and show briefly
  while scrolling. Chip rows support touch and mouse dragging with no scrollbar.
- The phone Inbox retains its existing mail links, search, avatar, sender, time,
  subject, preview and unread marker. Desktop checkboxes/stars and the full-width
  Compose bar are removed; Compose is a header action.
- Site shows a thumbnail of its actual design’s home page, properly sized View site
  action, and grouped page/media/editor links. The design-letter label is removed.
- Order rows are full tap targets, and the four specified order totals match in the
  apps and consoles: #2143 $149.99, #2141 $54.00, #2140 $27.00, #2139 $108.00.
  The existing six-shot order history uses $27.00 as well. Other placeholders remain.

The previously requested Gmail-style desktop console inbox changes are included
in this delivery. Outside those changes, console changes are limited to the order
amounts above. Website, overview, proposal and other clients are unchanged.

## Screens

Every suffix below exists under `/mockups/juliansjuicebox/{a,b,c}/app`:

| Route suffix | App |
| --- | --- |
| `/owner` | Owner |
| `/` | Customer |
| `/orders` | Customer |
| `/bulletins` | Customer |
| `/owner/orders` | Owner |
| `/owner/orders/detail` | Owner |
| `/owner/inbox` | Owner |
| `/owner/inbox/thread` | Owner |
| `/owner/inbox/compose` | Owner |
| `/owner/site` | Owner |
| `/owner/site/media` | Owner |
| `/owner/site/upload` | Owner |
| `/owner/more` | Owner |
| `/owner/more/products` | Owner |
| `/owner/more/products/edit` | Owner |
| `/owner/more/inventory` | Owner |
| `/owner/more/inventory/adjust` | Owner |
| `/owner/more/inventory/batch` | Owner |
| `/owner/more/customers` | Owner |
| `/owner/more/customers/detail` | Owner |
| `/owner/more/subscriptions` | Owner |
| `/owner/more/discounts` | Owner |
| `/owner/more/discounts/new` | Owner |
| `/owner/more/bulletins` | Owner |
| `/owner/more/bulletins/new` | Owner |
| `/owner/more/bulletins/sent` | Owner |
| `/owner/more/carts` | Owner |
| `/owner/more/reviews` | Owner |
| `/owner/more/analytics` | Owner |
| `/owner/more/notifications` | Owner |
| `/owner/more/settings` | Owner |
| `/product` | Customer |
| `/box` | Customer |
| `/checkout` | Customer |
| `/orders/detail` | Customer |
| `/guide` | Customer |
| `/subscription` | Customer |
| `/bulletins/detail` | Customer |
| `/account` | Customer |
| `/welcome` | Customer |
| `/signin` | Customer |
| `/notifications-permission` | Customer |

## Review artifacts

Local output is kept out of Git because it contains 504 full-size PNGs:

- `artifacts/juliansjuicebox-app-layout/index.html`: interactive reference / before /
  after gallery with design, viewport and screen selectors.
- `before/` and `after/`: 252 screenshots each, at 1440×900 and 390×844.
- `screens.json`: route/source inventory.
- `layout-audit.json`: checks for every route and viewport, including actual font
  loading, frame bounds, page/content overflow and fixed chrome while scrolling.

The gallery uses each role’s original Today / Order artboard as the reference.
Existing placeholder text and sample figures are preserved; no claims, reviews or
features are added to fill space. Small-screen anatomy and safe areas are intentional
layout changes to the original artboards.

## Validation

- All 28 Julian’s Juicebox regression tests pass, including theme/layout coverage,
  cross-screen packing state, order prices, mail actions, routes, pricing and PDF.
- TypeScript passes. Changed JavaScript and regression tests pass ESLint.
- All 252 route/viewport layout checks pass, with loaded selected fonts.
- Repository-wide tracked-source lint has 29 existing errors outside these changes
  (admin/portal pages, bookings/assessment APIs and other existing files).
- The ordinary build compiled and type-checked, then failed in existing billing
  route collection because STRIPE_SECRET_KEY was absent. A retry uses a process-only
  build placeholder; no environment file or production setting is changed.
- That production-build retry passes, including page-data collection and prerendering.
- Browser interaction checks pass in A/B/C for content-only scrolling, the 800ms
  scrollbar idle transition, packing, order/mail search, thread/compose navigation,
  active tabs and overview access.
