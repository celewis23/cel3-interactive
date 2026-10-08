# CEL3 Interactive SEO audit and improvement report

Audit started 6 October 2026; verification continued into 7 October UTC. Canonical site: `https://cel3interactive.com/`. [Code PR #1](https://github.com/celewis23/cel3-interactive/pull/1).

## Decisions and release state

Technical fixes are pushed for review. Substantial new service/city copy and Google Business Profile material remain drafts. The existing Vercel `www` domain redirect has been corrected live from 307 to 301; the destination, path and query are preserved. The remaining SEO application changes require PR merge and production deployment.

The initial findings were shared before the code/content work. [Original findings](./2026-10-06-findings.md), [baseline page inventory](./2026-10-06-pages.csv), [66 client preview pages](./2026-10-06-preview-pages.csv), [verified marketing pages](./2026-10-06-verified-pages.csv).

## Prioritized findings: impact versus effort

| Priority | Finding and impact | Effort | Result / next action |
|---|---|---|---|
| P1 | Missing canonicals on all 22 marketing pages; temporary www redirect weakens URL consistency | Low | Bare HTTPS canonicals and OG URLs in code; live www redirect is now 301 |
| P1 | Seven-entry sitemap omits 15 public marketing URLs and uses www URLs | Medium | Generated sitemap contains 22 canonical URLs, including six service pages and 12 case studies; published CMS records and fallback records are deduplicated |
| P1 | No robots file and no indexing policy on 66 client preview HTML pages | Low | Generated robots file; preview/account/utility response noindex headers; public utility pages remain crawlable so noindex is discoverable |
| P1 | Homepage LCP is delayed by hidden headline animation; large portfolio originals compete for loading | Medium | Essential hero is server-rendered and visible immediately; responsive images, lazy cards/thumbnails and early case-study hero loading |
| P1 | Shared `/#fit` navigation target is missing from server HTML | Low | Existing section is server-rendered; browser and JavaScript-disabled checks pass |
| P2 | Nine page titles repeat the brand twice | Low | Unique page-specific titles, each with one brand suffix |
| P2 | No marketing JSON-LD or social image metadata | Medium | Organization/WebSite plus page-specific Service, WebPage/CollectionPage/Article and BreadcrumbList graphs; shared 1200×630 branded image |
| P2 | Client-portal service page is orphaned | Low | Shared service/footer links create 26 incoming links in the verified marketing graph |
| P2 | Below-fold work images and work-page prefetches download unnecessarily; favicon/PWA icon total 686,426 bytes | Medium | Lazy responsive image delivery and reduced prefetching; icons now total 26,074 bytes, preserving the artwork |
| P2 | Heavy decorative homepage hydration and early analytics loading | Medium | Hero illustration and work cards render on the server; CSS retains decorative motion; analytics script is deferred until after load |
| P2 | Business phone, address, founding year and exact service area cannot be confirmed | Owner input | Do not fabricate NAP or LocalBusiness details; confirm facts before local publishing |
| P2 | Cost, ownership/support, migration and local process questions lack full answers | Medium | Fact-only drafts and page/section proposals prepared for review |
| P3 | HTTP www still takes HTTPS enforcement followed by host canonicalization | Hosting constraint | 308 → 301 → 200; all internal/sitemap/canonical links use direct bare HTTPS URLs. Removing this last extra hop would require a different edge configuration |
| P2 | Google tag still contributes roughly 656 ms of homepage blocking in the lab | Medium / owner analytics decision | Review measurement requirements before removing or replacing the configured tag; no INP pass is claimed |
| P3 | Field CWV/INP data unavailable from the public API | External access | PageSpeed API returned 429. Use Search Console/CrUX after deployment; no field pass is claimed |

## 1. Crawl and indexing

Fetched the sitemap and robots endpoints on both hosts, HTTP/HTTPS host variants, all 22 public marketing pages, six public utility/entry pages, and every one of the 66 tracked static client-preview HTML files. This is 94 distinct page URLs, plus control and redirect probes. All 94 returned 200 in the baseline crawl. Private authenticated account records, tokenized contracts/estimates/forms and mutation APIs were classified by route policy rather than enumerated or submitted.

All 22 marketing pages contain meaningful heading/body text in the server response; none was accidentally noindexed. Titles and descriptions were present, and there were no duplicated marketing descriptions. Nine titles duplicated the brand within the title. The JavaScript-only issues were an initially invisible homepage headline and the missing server-rendered `#fit` target. The portal login's empty initial body is an account utility issue, not missing marketing content.

The public marketing link graph contained no broken HTTP page destinations or outgoing external HTTP anchors. The shared `/#fit` fragment depended on hydration. After the fixes, the preview crawl found zero unresolved marketing page/fragment destinations and the orphan portal service is linked. Client mockup placeholder actions and third-party client-brand claims are not treated as CEL3 marketing content; their pages are explicitly excluded from indexing.

Noindex now covers admin, API, portal, form, contract, estimate, download and mockup route families, plus assessment success and suspension pages. Authentication remains the access control for private records. Public utility/mockup routes are not robots-blocked, allowing search engines to read their noindex headers. Protected route families are crawl-restricted, with login exceptions so their exclusions can be read. [Google noindex requirements](https://developers.google.com/search/docs/crawling-indexing/block-indexing).

The sitemap uses actual project update dates where available and omits unknown static modification dates. It does not claim every page changed on every build. Draft project records are excluded from both sitemap and public project queries. [Sitemap date guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

Redirect verification: bare HTTPS returns 200; www HTTPS returns 301 to the same bare HTTPS path/query; bare HTTP returns 308 to HTTPS; www HTTP returns 308 to HTTPS www, then 301 to bare HTTPS. The application also contains a matching host redirect. Vercel's platform HTTPS enforcement occurs before application routing.

## 2. Metadata and structured data

The shared metadata registry supplies canonical URLs, unique titles/descriptions, Open Graph and Twitter cards. A generated brand image returns PNG, 1200×630, 42,322 bytes in the verified preview. It uses existing site facts and design colors. No new external image service is introduced.

| Page type | Structured data |
|---|---|
| Homepage | Organization, WebSite, WebPage |
| Six service pages | Organization, WebSite, WebPage, Service, BreadcrumbList |
| Audit | Same service graph, with the existing $150 USD Offer |
| Work listing | Organization, WebSite, CollectionPage, BreadcrumbList |
| Platform builder | Organization, WebSite, WebPage, BreadcrumbList |
| Case study | Organization, WebSite, WebPage, Article, BreadcrumbList |

Organization is an accurate broad business type with the confirmed public brand, email, site URL and Richmond location. A street address, phone, founding date, opening hours, review rating, certifications and social-profile identifiers have not been invented. A more specific eligible LocalBusiness subtype can be evaluated after the operating model and address policy are confirmed. [Google LocalBusiness documentation](https://developers.google.com/search/docs/appearance/structured-data/local-business).

Validation covers JSON parsing, schema.org vocabulary terms, 183 typed nodes across the 22 rendered page graphs, unique/resolved entity references, breadcrumb ordering/URLs, published-page sitemap membership and script-injection escaping. Case studies have headline, publisher/author entity and image references. Unknown publication dates are omitted. This is automated syntax/vocabulary/entity validation, not a guarantee of Google rich-result eligibility or display. Run Google's Rich Results Test on production after deployment. [Article guidance](https://developers.google.com/search/docs/appearance/structured-data/article).

## 3. Mobile performance

Seven representative templates were selected: homepage; service pillar; service-business portal page; work listing; case study; audit checkout landing page; interactive platform builder. The first client-portal trace failed in Lighthouse and was retried in a fresh browser.

Measurements use Lighthouse 12.8.2, Chrome, mobile emulation (412×823, DPR 1.75), simulated mobile throttling and 4× CPU slowdown. Baseline is the live canonical site; after measurements use a protected Vercel preview with a domain-scoped access cookie and cleared browser cache. The preview shares the application build/platform but can have different caching and response times. These are individual lab observations, not a controlled statistical benchmark or real-user INP measurement. TBT is a lab diagnostic, not INP.

| Template | Score before → after | LCP seconds before → after | TBT ms before → after | Transfer MB before → after | CLS after |
|---|---:|---:|---:|---:|---:|
| `/` | 44 → 76 | 13.35 → 2.15 | 920 → 986 | 3.25 → 0.52 | 0.000096 |
| `/custom-web-applications` | 72 → 77 | 2.42 → 1.89 | 1413 → 1062 | 4.87 → 0.46 | 0.000102 |
| `/client-portals-service-businesses` | 71 → 77 | 2.59 → 1.85 | 1362 → 1036 | 4.87 → 0.49 | 0.000104 |
| `/work` | 45 → 80 | 9.92 → 2.02 | 1092 → 822 | 4.89 → 0.51 | 0.000104 |
| `/work/biobox` | 71 → 79 | 4.09 → 1.43 | 610 → 919 | 6.03 → 0.48 | 0.000102 |
| `/assessment` | 73 → 77 | 1.70 → 2.18 | 1559 → 1006 | 1.17 → 0.49 | 0.000104 |
| `/build-your-platform` | 73 → 77 | 2.43 → 1.42 | 1328 → 1093 | 1.18 → 0.44 | 0.000103 |

All seven after-change LCP observations are under 2.2 seconds and CLS is below 0.001. Blocking time remains high: the homepage trace attributes approximately 656 ms to the Google tag. Deferment improves loading order but does not remove its execution cost. Further reduction requires reviewing the analytics requirements before removing or replacing the configured Google tag. The audit-page LCP and two TBT observations are worse than the individual baseline run; the table deliberately preserves these regressions rather than hiding them. Field data and repeated same-host measurements are needed to establish a sustained improvement.

[Machine-readable metrics and timestamps](./2026-10-06-mobile-lab.csv). The seven-template comparison uses preview `qgux7nra5` (build `dpl_B8UhVFtYmbGzEYAEZzwtPr8GAzon`). The final build `4ovye5ass` additionally removes the unused sans-font preload; its homepage follow-up is recorded below.

Final homepage follow-up (2026-10-07T03:36:13.281Z, preview `4ovye5ass`): **LCP 1.98 s, CLS 0.000102, TBT 1097 ms, performance score 75, 0.44 MB transferred, zero font requests**. [Follow-up record](./2026-10-06-final-home-lab.json). This verifies that the unnecessary font download is gone. Total transfer and score also vary between individual runs; the entire byte difference is not attributed solely to font removal.

The baseline homepage's LCP element was the headline: 94% of its 13.35-second LCP was render delay. The baseline work listing's LCP was also its headline. The BioBox case study's LCP was its screenshot, with roughly 70% of its 4.09 seconds spent loading the image. These findings drove the specific changes instead of assuming every template had the same LCP problem.

Code changes:

- Visible, server-rendered headline and hero illustration; decorative random latency updates and Framer hydration removed from that illustration. CSS floating motion remains, with the existing reduced-motion support.
- Work cards render on the server with ordinary CSS hover styling. Shared navigation, footer, related-service and work links stop automatically prefetching entire work pages and their assets.
- Responsive optimized images include dimensions/sizes; cards and thumbnails load lazily. The case-study hero uses eager loading and high fetch priority. Existing aspect-ratio containers reserve layout space.
- Fonts explicitly use swap and load only where used. Neither Geist font preloads globally, because the public body uses the existing system font. A final homepage follow-up checks this additional 29 KB preload removal.
- The external Google Analytics script loads after the page load. Initialization still queues events. Very short visits that end before the delayed script loads can be undercounted; monitor analytics after rollout.
- Favicon is a valid 48×48 ICO instead of a 1024px PNG under an ICO filename. The PWA image is now actually 192×192. The combined reduction is approximately 96%.

The built-in Next/Vercel image optimizer can use the existing plan's transformation allowance; monitor that usage. No new paid service was added. Layout shift was zero in the completed baseline runs, so image sizing preserves this rather than claiming a pre-existing CLS problem. [Next image sizing/loading guidance](https://nextjs.org/docs/app/api-reference/components/image), [Core Web Vitals field definitions](https://web.dev/articles/vitals).

## 4. Business name, address and phone inventory

[Page-and-placement inventory](./2026-10-06-name-contact-inventory.csv) lists each marketing URL and its title/header/main/footer occurrences. [Verified-page inventory](./2026-10-06-verified-pages.csv) lists all titles, descriptions and schema page types. The shared components explain why these facts repeat across the pages.

[Other public name placements](./2026-10-06-other-public-name-placements.csv) covers the six utility entries and 66 client-preview HTML files, distinguishing CEL3 attribution from client contact details. These entries use the live baseline utility HTML and the tracked static HTML source that was checked against the live route inventory.

| Location | Observed name/contact | Exact-match conclusion |
|---|---|---|
| All 22 marketing titles, canonical business graph, social metadata | CEL3 Interactive | Standardized full brand |
| Shared header and footer logo, `components/brand/Logo.tsx` | Stylized CEL + 3 + Interactive; accessible label CEL3 Interactive | Accessible name is exact; concatenated decorative HTML text can read CEL3Interactive |
| Shared footer, `components/sections/Footer.tsx` | CEL3 Interactive; info@cel3interactive.com | Full brand and email match; repeated on every marketing page |
| Homepage introduction / eyebrow | CEL3 Interactive; Richmond-based | Matches confirmed identity and location claim |
| Existing service-page body copy | CEL3 shorthand in several introductions | A brand abbreviation, not an exact full-name string; no different business is asserted |
| Work cards / case studies | CEL3 Interactive or CEL3 alongside the client's own name | Client names are not alternate CEL3 NAP records |
| Generated Organization graph on every marketing page | CEL3 Interactive; info@cel3interactive.com; Place “Richmond” | Same centralized facts across templates |
| All marketing contact areas | No public business phone or full postal address found | **Cannot confirm an exact phone/address match because these facts are absent** |
| Founding year | Not stated | **Cannot verify**; copyright year and illustrative uptime figures are not company history |
| Account/download/preview gates | Operational brand labels; intentional noindex | Not local landing pages |
| Client mockups and internal lead data | Other businesses' contact information | Excluded from CEL3 NAP; never copied into business schema |

This audit verifies the website, not all external listings. Off-site NAP consistency remains unconfirmed until the owner supplies approved details and profile URLs. The current facts do not establish a publicly visitable office or Google Business Profile eligibility.

## 5. Local drafts, content gaps and internal links

[Content and local drafts](./content-and-local-drafts.md) contains a fact ledger, customer-question evidence with source links, ten prioritized page/section proposals, fact-only copy, a Google Business Profile description, proposed categories, five post drafts and twelve contextual link recommendations. Every proposed page includes a title, URL, outline and incoming link. Unknown prices, timelines, contractual terms, location details and claims are explicitly marked for confirmation.

The main opportunities are cost and recurring expenses, custom-vs-existing-tool decisions, portal permissions/workflows, migration/data freshness, ownership/support and an evidenced Richmond service page. Existing pages already explain service capabilities, the $150 audit and human approval of AI actions; those are not falsely listed as entirely missing content. External discussion topics are qualitative evidence, not search-volume data. New local pages should add confirmed local substance instead of duplicating service copy with place names.

The orphan portal service page is already fixed through shared internal links. Further contextual links and new sections remain proposals for the owner's requested content review.

## 6. AI search

The homepage plainly identifies who CEL3 Interactive is and what it builds near the top. Existing service headings/introductory paragraphs and case-study summaries answer the main capability/project questions before longer supporting content. Those answers are present in server HTML. Business schema, canonical host, email and Richmond location use consistent facts. The founding year remains absent pending confirmation. Demo performance metrics are labelled as examples rather than added to factual company claims.

The robots file does not block search or AI crawlers from marketing content. It preserves the existing generic public permission while restricting private route families. The owner has been asked which AI crawlers to allow; no bot-specific decision has been assumed. Search-purpose bots and model-training bots can have separate controls. Google Search AI features share Googlebot behavior, and Google-Extended also affects some non-Search grounding uses. [OpenAI bot roles](https://developers.openai.com/api/docs/bots), [Google AI search controls](https://developers.google.com/search/docs/appearance/ai-features).

## Verification and remaining owner actions

- Seven SEO regression tests pass: metadata uniqueness/canonicals, entity references and breadcrumbs, injection-safe JSON-LD, sitemap merging/update dates, draft exclusion, robots/noindex compatibility and permanent host/private-header configuration.
- TypeScript passes. Vercel's optimized build passes with 216 generated pages.
- Protected preview crawl validates all 22 marketing pages, 66 client-preview noindex responses, six utility entries, sitemap/robots, social image and zero broken marketing page/fragment destinations.
- Browser checks cover seven mobile templates, image decoding and gallery selection, desktop homepage, visible hero without JavaScript, no horizontal mobile overflow and no client exceptions.
- Temporary preview verification access is revoked when each check completes.
- Owner decisions still needed: AI crawler policy; phone/address/founding year/geographic facts; GBP eligibility; approval of substantive content drafts.
- Field CWV/INP, indexing decisions, business listings and review collection require the separate [off-site checklist](./off-site-checklist.md).

The code PR does not publish Google Business Profile posts, send review requests, purchase listings, or add unconfirmed business claims.
