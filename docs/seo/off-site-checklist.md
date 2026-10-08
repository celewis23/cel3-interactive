# CEL3 Interactive — owner off-site checklist

Prepared 6 October 2026. These actions are separate from the code PR. No profiles, listings, review requests or posts have been published or sent.

## First: confirm the business facts

- [ ] Confirm the public name **CEL3 Interactive**, public phone, founding year, Richmond state/country, service area and business hours.
- [ ] Decide whether there is a customer-facing address or an eligible service-area business with a private address.
- [ ] Confirm in-person customer contact before creating or maintaining a Google Business Profile. Online-only businesses generally are not eligible. [Google eligibility](https://support.google.com/business/answer/13763036?hl=en).
- [ ] Approve a crawler policy: AI search only, search plus training, or traditional search only with the Googlebot limitation described in the draft report.
- [ ] Review [content and local drafts](./content-and-local-drafts.md); approve substantial new copy separately.

## Google Business Profile

- [ ] Find and claim the existing profile; avoid creating a duplicate. Record the verified profile URL and owner access.
- [ ] Use the confirmed name, phone, address/service area and hours consistently. Hide a non-customer-facing address when required; do not use a virtual office or invented location. [Representation rules](https://support.google.com/business/answer/3038177?hl=en).
- [ ] Review proposed **Software company** primary and **Website designer** secondary categories in the current category selector. Select only accurate categories. [Category guidance](https://support.google.com/business/answer/7249669?hl=en).
- [ ] Approve the drafted description and five posts; verify current audit pricing before posting.
- [ ] Add approved brand/project photos and the canonical site URL `https://cel3interactive.com/`.
- [ ] Add services based on existing site capabilities. Do not list unconfirmed hours, certifications, guarantees or pricing.
- [ ] Record the profile ID/URL so a verified `sameAs` can be considered for the site schema later.

## Google Search Console

- [ ] Verify the domain property for `cel3interactive.com` with the owner-controlled DNS account, or confirm existing access.
- [ ] After the PR is merged and deployed, submit `https://cel3interactive.com/sitemap.xml`; retire the obsolete submitted sitemap if needed.
- [ ] Inspect the homepage, all six service pages, `/assessment`, `/build-your-platform`, `/work`, and a case study. Confirm the selected canonical and rendered content.
- [ ] Check Pages reports for excluded, duplicate, discovered-not-indexed and crawled-not-indexed URLs. Treat intentional noindex utility/preview URLs as expected exclusions.
- [ ] If mockups or account/utility URLs are already indexed, use temporary removals when urgent and keep permanent noindex/access controls in place. Do not rely on robots blocking alone to remove an indexed URL.
- [ ] Run Google's Rich Results Test on deployed case-study/breadcrumb markup. Organization and Service markup do not imply a guaranteed rich result. [Rich Results Test](https://search.google.com/test/rich-results).
- [ ] Export the last three months of queries/pages and compare branded vs nonbranded performance. Use actual query data to prioritize the proposed content gaps.
- [ ] Check mobile Core Web Vitals after enough real traffic accumulates. Track 75th-percentile LCP, INP and CLS; a Lighthouse result is not a field CWV pass. [Core Web Vitals](https://web.dev/articles/vitals).
- [ ] Review results at two and four weeks after deployment; keep a deployment-date annotation in the reporting sheet.

## Bing Webmaster Tools

- [ ] Verify/import the site in [Bing Webmaster Tools](https://www.bing.com/webmasters/about).
- [ ] Submit the canonical sitemap after deployment and inspect representative URLs.
- [ ] Review crawl errors, index coverage, canonical selection and mobile rendering.
- [ ] Consider IndexNow only if content changes warrant it; it is not required to complete this PR.

## Reviews

- [ ] Ask actual customers for honest reviews through the verified business profile's review link.
- [ ] Request feedback consistently, without incentives, fabricated accounts or filtering requests to only happy customers. [Google review guidance](https://support.google.com/business/answer/3474122?hl=en).
- [ ] Reply factually without exposing customer project or personal information.
- [ ] Get permission before publishing a customer's name, quote, logo or quantified project result on the website.
- [ ] Do not add self-serving LocalBusiness star-rating markup to manufacture search stars.

## Business listings and local references

- [ ] Audit existing Google, Bing, Apple, company social and directory profiles for name, phone, address/service-area and website discrepancies. No off-site NAP match has been verified yet because the owner-approved details and profile URLs are missing.
- [ ] Review [Bing Places](https://www.bingplaces.com/Home/Index) and [Apple Business](https://business.apple.com/business-connect/) eligibility and claim existing listings where appropriate.
- [ ] If Richmond, Virginia is confirmed, review the [ChamberRVA directory](https://go.chamberrva.com/list). Membership can have costs; evaluate business value before purchasing it. No membership or paid listing is authorized or purchased here.
- [ ] Prefer relevant, established directories and genuine partner/client references over bulk paid listing packages.
- [ ] Keep a listing ledger: provider, URL, owner login, exact name, public phone, address visibility, service area, website and last verified date.
- [ ] Confirm official social/profile URLs before adding `sameAs` links to Organization schema.

## Release verification

- [ ] Review and merge the SEO PR, then verify the production deployment succeeds.
- [ ] Check `/robots.txt`, `/sitemap.xml`, `/opengraph-image`, one service page, one case study and one nested mockup response.
- [ ] Confirm `https://www.cel3interactive.com/work?utm_source=check` redirects permanently to the same path/query on the bare HTTPS host.
- [ ] Re-run mobile lab measurements on the public production host to remove preview-host/protection differences from the comparison.
- [ ] Revoke any temporary deployment test access; keep protected previews out of the index.
