# Activity Log

The admin navigation opens Activity Log at `/admin/audit`. Both history and job status require `auditLog:view`. No migration or backfill is required: new fields are optional, and older audit events show “Recorded · outcome unavailable.” Expanded tracking starts when this code is deployed.

## What is recorded

- Website API mutations, including admin, client portal, public submissions, and external integrations. Existing descriptive audit events are retained; other handlers record a request outcome and record ID when safely available.
- Billing collection checks, individual notices, confirmed late-fee invoices, skipped steps, suspension/restoration results, and failures.
- Scheduled job starts and finishes, including checks that find no work. Job cards compare the latest recorded attempt with the schedule in `vercel.json` and display the saved collections setting.
- Automation starts, action outcomes, waiting for approval or delays, resumptions, and failures. Related events share a run ID.

Filters cover search, source, outcome, date, job, and related run. Routine checks are hidden by default; clear that checkbox or use **View run history** to include them. CSV exports up to 5,000 matching events.

## Boundaries

The log covers actions handled by this website, not changes made directly in Stripe, Sanity, or another service unless the website processes them. Page views, analytics collection, and ordinary reads are not duplicated here. Requests rejected before reaching a route handler cannot be captured by its wrapper. Historical actions that were never logged cannot be reconstructed.

“Accepted for processing” is not a completed result. A successful send records the provider accepting the send operation; it does not confirm delivery or reading. Job cards show observed runs and expected schedules, not independent uptime monitoring. A process that stops after writing its start leaves a visible unfinished run.

Audit writes are awaited by request handlers and registered with Next.js `after()` for background work. Logging remains best effort: if the audit database is unavailable, the business action keeps its original response so a logging outage does not encourage duplicate actions. Server logs report failed audit writes. No automatic collections settings, billing rules, or schedules are enabled by this feature.

Request/response bodies, query strings, cookies, signing tokens, and uploads are not copied into generic request events. Explicit audit details redact common credential fields and limit nested values. Audit history has no delete endpoint or automatic retention cutoff.

## Maintaining coverage

Wrap new mutation handlers with `withActivity(routeTemplate, method, handler)` from `lib/audit/withActivity.ts`. Use `logAudit` for useful domain descriptions, resource IDs, and safe before/after values. Await `writeAudit` for standalone background actions. Record uncertain or queued outcomes explicitly instead of claiming success.

Register new scheduled jobs in `lib/audit/jobs.ts` and update the read-action list in `scripts/instrument-activity.mjs` for GET endpoints that perform work. The coverage script excludes `/api/analytics/collect`.

Validation commands:

```text
npm run check:activity
npm run test:activity
npm run test:billing
npm run test:calendar
npx tsc --noEmit --incremental false
```

Tests use mocked services and the installed GROQ evaluator. They do not run production jobs, create Stripe charges, or send client messages.
