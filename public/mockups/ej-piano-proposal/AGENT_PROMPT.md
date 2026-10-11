# Prompt for the coding agent

Copy everything below the line into your coding agent, with this whole folder in the repo (or attached).

---

You are building a **production-quality, deployable interactive design proposal** for **E&J Piano and Music Studio**, prepared by **CEL3 Interactive**. It presents three design directions, and each direction has three products: a marketing website, a family/student mobile app, and a teacher's studio dashboard. Everything must look polished on **mobile and desktop** and be ready to send to the client as one link.

## What's in this folder

- `design-source/*.dc.html`: the approved mockups, **one file per screen**. They are the visual spec: layout, copy, colors, spacing, sizes and interactions. They're written in a custom "design component" format, so **read them as reference and don't try to run them**:
  - The markup lives inside `<x-dc>…</x-dc>`. Inline `style="…"` attributes are the source of truth for the design.
  - `{{name}}` holes are filled by `renderVals()` in the `<script type="text/x-dc">` block at the bottom of each file. That block also holds the **mock data and interaction logic** (state, handlers). Port that logic.
  - `<sc-for list="{{items}}" as="item">` is a loop and `<sc-if value="{{cond}}">` is a conditional.
  - Links like `href="app-B-Pay.dc.html"` show how screens connect.
  - `design-source/canvas.json` lists every screen with its title and size: 390×844 for phone screens, 1440-wide for pages.
- `media/`: optimized images and H.264 MP4s with poster frames. The design files already point at them with relative paths.
- `reference/design-tokens.json`: fonts, colors, radii and "feel" for directions A, B and C.
- `reference/piano-engine.ts`: the working piano sound and multi-touch engine extracted from the mockup. **Reuse it.**

## Screen inventory (map 1:1)

| Design file(s) | What it is |
|---|---|
| `StartHere.dc.html` | Proposal landing page with links to everything. This becomes `/`. |
| `Main.dc.html` | Website, direction **A · Concert Hall** |
| `Site-B-Modern.dc.html` | Website, direction **B · Black & White Keys** |
| `Site-C-Playful.dc.html` | Website, direction **C · Bright & Playful** |
| `app-{Feed,Practice,Assignment,Messages,Pay,Lesson}.dc.html` | Family/student app, direction A |
| `app-B-*.dc.html`, `app-C-*.dc.html` | Same 6 app screens, directions B and C |
| `studio-{Dashboard,Students,Student,Schedule,Live,Messages,Feed,Billing}.dc.html` | Studio dashboard, direction A |
| `studio-B-*.dc.html`, `studio-C-*.dc.html` | Same 8 dashboard screens, directions B and C |

The B and C app and dashboard screens are re-skins of A: same structure, different tokens. **Build one set of app and dashboard components and theme them with CSS variables per direction.** Don't copy-paste three versions. The three websites differ in layout and need their own page components, but they share primitives such as the piano, the video card and the section shells.

## Tech stack

- **Next.js (App Router) + TypeScript**, deployed on **Vercel**.
- Styling: Tailwind CSS or CSS Modules, either is fine, but all colors, fonts and radii come from **CSS variables** set per direction (for example `[data-direction="a"|"b"|"c"]`), seeded from `design-tokens.json`.
- Fonts via `next/font/google`: Cormorant Garamond, Karla, Space Grotesk, IBM Plex Sans, Fredoka, Nunito. Load only what each route needs.
- Images via `next/image`. Videos self-hosted from `/public/media`.
- Put all mock data in typed modules (`/data/*.ts`) behind a small service layer (`getStudents()`, `getSchedule()`…). That way a real API, likely ASP.NET Core 8 + PostgreSQL, can replace it later without touching the UI.
- No backend, auth or payments in this phase. Interactions are client-side state only, as in the mockups.

## Routes

```
/                              → Start Here (proposal landing)
/[direction]                   → website (direction = a | b | c)
/[direction]/app/[screen]      → feed | practice | assignment | messages | tuition | lesson
/[direction]/studio/[screen]   → today | students | student | schedule | live | messages | feed | billing
```

Use `generateStaticParams` so everything is statically generated. Rewrite every internal `*.dc.html` link to these routes.

## Responsive requirements (the main job)

- **Websites:** fully fluid from 360px to 1920px. The mockups are drawn at 1440 and most sections already use flex-wrap or auto-fit grids, so keep that behavior. On mobile, the nav collapses to a menu button and drawer, hero text scales down (use `clamp()`), and multi-column grids stack. No horizontal scroll at any width.
- **Family app:** a real mobile web app layout. On phones (<768px) it's full-screen, with a sticky bottom tab bar that respects `env(safe-area-inset-bottom)`. On tablet and desktop, center it inside a phone device frame (about 390×844) on a soft backdrop, with a short caption and a "← All designs" link beside it. Tab bar links navigate between app screens.
- **Studio dashboard:** desktop-first but fully usable on mobile. The sidebar becomes a top bar with a hamburger drawer below 1024px. Tables scroll horizontally inside their card (`overflow-x:auto`) and never overflow the page. The calendar gets a day/week toggle and shows a single day on mobile. Messages becomes list → thread navigation on mobile instead of three panes.
- **Start Here:** the three direction cards sit side by side on desktop and stack on mobile.
- Test at **360, 390, 430, 768, 1024, 1280 and 1440** widths. Touch targets must be at least 44px.

## The piano (signature feature — must feel like a real keyboard)

Port `reference/piano-engine.ts`. Requirements:

- Every website has a playable keyboard. A: 3 octaves from C3 under the hero. B: 4 octaves from C3 at the bottom of the video hero. C: 2 octaves from C4 in its own "Play our piano!" section, with color-coded note letters and the **Play Twinkle Twinkle** demo that lights keys as it plays.
- Pointer events go on the keyboard **container**. Every pointer is its own voice, so multi-touch chords work with two hands. **Dragging across keys plays each key (glissando).** Notes sustain while held and fade on release. Keys light up while held.
- `touch-action:none`, no text selection, no long-press menu on the keyboard, and the page still scrolls normally everywhere else.
- Responsive key count: fewer octaves on narrow screens so keys stay at least ~32px wide (for example 1.5–2 octaves on phones), or a horizontally scrollable keyboard with a clear affordance. Pick one and make it feel good on a phone.
- Accessibility: keys are `<button>`s with `aria-label` (e.g. "C4"), and Enter or Space plays a short note.
- Show a subtle "Tap the keys · turn your sound on" hint. Note in the UI or README that the iPhone silent switch mutes web audio.

## Video

- The Student spotlight cards use `<video controls playsinline preload="metadata" poster=…>` with `object-fit:cover`. Keep each card's crop (`object-position`) from the design files.
- Website B's hero uses a **muted, autoplaying, looping, playsinline** background video with the dark gradient overlay from the design. Respect `prefers-reduced-motion` by showing the poster only. **`site-b-hero-loop-STOCK-PREVIEW-REPLACE.mp4` is an Adobe Stock watermarked preview.** Keep it for the proposal, but put a clear TODO in the README and code to replace it with the studio's own footage before any public launch. Don't attempt to remove or obscure the watermark.
- Lazy-load anything below the fold.

## Interactions to preserve (from each file's script block)

Feed post like toggle · practice checklist and timer · tuition "Pay now" → paid state, autopay toggle · message composer that appends sent messages, quick replies, switching conversations · live lesson mic/camera/record toggles · dashboard student search and filters · reschedule approve (moves Maya's lesson on the calendar) / suggest another time · billing per-family "Send reminder" and "Remind all" · studio feed composer that adds a post, comment like/hide · assignment adder on the student profile · tabs on the student profile.

## Proposal polish

- Every non-landing screen gets a small, unobtrusive **"← All designs"** link back to `/`, plus a direction switcher (A / B / C) that keeps you on the equivalent screen.
- Footer and Start Here keep "Website Design Mockup Proposal · Prepared by CEL3 Interactive".
- Keep `[BRACKET]` placeholders (rates, student names, bio) visible and lightly highlighted so the client knows what still needs real content. List all of them in the README.
- **Privacy:** the videos show children. Add `noindex, nofollow` (metadata plus `robots.txt` disallow), and make it easy to turn on Vercel password protection or deploy as an unlisted preview. Don't add analytics.
- Open Graph image and title: "E&J Piano and Music Studio — Website Design Proposal by CEL3 Interactive".

## Quality bar

- Lighthouse on mobile: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95.
- WCAG AA contrast. Visible focus states. Real `<button>`, `<a>` and `<label>` elements. Keyboard navigable.
- No layout shift from fonts, images or videos (set dimensions and aspect ratios).
- Works in iOS Safari, Android Chrome, desktop Chrome, Safari and Firefox. Specifically test the piano's multi-touch and video playback on iOS Safari.
- Zero console errors, `tsc --noEmit` clean, ESLint clean.

## Deliverables

1. The repo with a clear README: how to run, where the mock data lives, the placeholder list, and the stock-video TODO.
2. A Vercel preview deployment URL.
3. A short QA checklist showing what you tested at which widths and devices, including the piano on a real phone if possible.

Work in small, reviewable steps: scaffold and tokens → Start Here → website A → B → C → app shell and screens → dashboard shell and screens → piano and video polish → responsive QA → deploy. Before you start, ask me anything that's genuinely ambiguous. Otherwise make sensible decisions and note them in the README.
