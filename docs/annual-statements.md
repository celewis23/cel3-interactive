# Annual client and hosting statements

Owner controls: `/admin/settings/annual-statements`.

## Delivery

January 15 starts delivery for the preceding calendar year in `America/New_York`.
The cron runs every 15 minutes January 15–31, in batches of three clients, so retries
can finish without resending earlier recipients. `CRON_SECRET` bearer authentication
is required; an `x-vercel-cron` header alone is not accepted. `RESEND_API_KEY` and
`RESEND_FROM_EMAIL` must be configured. Set the owner's delivery email in settings.

Only live Stripe customers explicitly linked by `stripeCustomerId` in CEL3 portal
or pipeline records are enrolled. This Stripe account hosts other businesses too:
the job intentionally does not email every customer in the shared Stripe account.
Customers without activity receive no email; missing addresses are retried and need
correction in Stripe. Failed recipients rotate behind unattempted clients.

Client attachments are a PDF summary and a Unicode CSV ledger. They report captured
payments by capture date, plus successful refunds issued in the selected year,
including refunds of earlier-year payments. Amounts remain in each original currency.
Invoices, payment intents and charges are not added together. Payments outside Stripe
are not included. This is a record summary, not an IRS information return.

Each recipient/year has a durable delivery document. Recipient/content/attachments
are frozen before sending. Resend receives the same idempotency key on retries.
An uncertain attempt older than 23 hours is held for provider-log reconciliation;
never clear its record and blindly resend. The provider retains keys for 24 hours:
https://resend.com/docs/dashboard/emails/idempotency-keys

## Hosting records and Meterwise

Meterwise has service-period costs, confidence labels and project/provider attribution.
These do **not** establish when a provider invoice was paid. Annual hosting attachments
therefore have separate sections/files:

- Confirmed provider payments, entered from receipts/invoices and allocated to projects.
- Meterwise billed, estimated and forecast costs, clearly labeled and excluded from paid totals.
- Missing mappings, failed syncs, missing annual endpoint and cross-year-period notes.

Record a provider invoice once, with its actual payment date, currency and invoice/payment
reference. Record provider refunds as negative amounts with their own refund reference.
The reference plus provider identifies duplicates. Allocations must sum exactly
to that payment. Shared overhead can stay unassigned; it is not guessed or copied to every
client. Map Meterwise projects to known Stripe customer IDs, or designate them internal.
Payments and client mappings are separate from prices charged to clients.

The report endpoint belongs in the Meterwise repo at:
`src/app/api/v1/reports/annual-costs/route.ts`.
The companion source is retained at `integrations/meterwise/annual-costs-route.ts.txt`.
It uses existing Prisma tables and requires the connected API key's `read` scope.
Deploy Meterwise alongside this backoffice change. A missing endpoint is explicitly noted
in the owner report; it never makes recorded platform costs look like zero paid costs.

## Deployment inventory audit — November 17, 2026

- Vercel: 41 projects, initially 40 recorded resources in Meterwise. Refreshing its
  Vercel provider added `cel3studio-site`; all 41 are now represented.
- Railway: all 13 deployed projects are now represented in Meterwise, including
  `cel3studio` and `cel3-pulse`, which were missing during the initial audit.
  After the owner reconnected Railway, its credential validated and the latest sync
  succeeded without errors. Railway costs still come from estimated usage, not paid
  invoices. No backend service was created or billed by this work.
- Local source was available for 40 of the 41 Vercel projects. Several have explicit
  backend/Docker/.NET configuration (including Pulse, E&J, Sacred Vibes, SocialHub,
  family chat and Flowforge). Backend dependencies support the need to track more
  than Vercel; code alone cannot establish a provider's actual paid invoice amount.
- Other provider health issues observed: Anthropic credential marked invalid, OpenAI
  sync missing `api.model.read`. Reports surface sync/credential gaps rather than
  silently certifying complete costs.

No real statements were sent during implementation. Browser QA uses mocked data and
intercepts API requests. Tests: `npm run test:annual-statements`.

Billing → Annual statements provides global and per-recipient automatic delivery controls,
previews, delivery history, and individual sends for completed years. Save settings before
sending. Manual sends work when automation is paused and share the scheduled job's
duplicate protection. Already-sent statements cannot be sent again from these controls.
Paid invoices display recorded receipt send time and recipient in the invoice list and
detail page; “sent” means email-provider acceptance, not confirmed inbox delivery.

Validation: 15 annual-statement tests cover manual delivery and receipt status. TypeScript, changed-file ESLint, and desktop/mobile
browser flows passed. The previous notification change's eight tests also pass.
The full backoffice production build was stopped after prolonged compilation without
completion; a full Meterwise type-check was not completed because dependency downloads
were unusually slow and the optional install was stopped. Its new endpoint was exercised
with workspace isolation and confidence-preservation tests. Neither repository has been
committed or pushed as part of this implementation.
