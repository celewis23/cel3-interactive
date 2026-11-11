# Invoice delivery and paid receipts

Invoices currently use Stripe's own email service. App email changes do not fix
Stripe's sender authentication. In Stripe Settings, configure and verify a custom
email domain, publishing the exact DNS records Stripe supplies. Check the
Authentication-Results header of an affected email for SPF, DKIM and DMARC results
before changing DNS. Do not add guessed SPF includes or a second SPF record.
See https://docs.stripe.com/invoicing/send-email and
https://support.stripe.com/questions/custom-email-domain.

Public DNS checked November 4, 2026: the apex SPF authorizes ImprovMX and DMARC
uses p=none. These records alone cannot diagnose a Stripe email's spam placement;
Stripe may send using its own domain or a separately authenticated subdomain.

## Activate receipts

1. Configure RESEND_API_KEY and RESEND_FROM_EMAIL on the deployed server. The
   sender domain must be verified in Resend with its required DNS records.
2. Add a Stripe snapshot webhook endpoint at
   https://cel3interactive.com/api/stripe/webhook subscribed to invoice.paid.
   Set STRIPE_WEBHOOK_SECRET to this endpoint's signing secret.
3. Deploy and test in Stripe test mode with a separate test endpoint/secret.
   Verify payment, manually marking paid, invalid signatures, and redelivery.
4. Check Stripe's existing successful-payment receipt settings so the app and
   Stripe do not both send a receipt. Choose one receipt sender before enabling
   production. Stripe continues sending the original invoices.

The receipt includes the invoice number, amount paid, paid date, and Stripe's
paid-invoice link. invoice.paid covers successful collection and marking paid out
of band. Old paid invoices are not automatically emailed. No customer messages
are sent by the automated tests.

Delivery records use invoiceReceipt.live.INVOICE_ID (or .test.) in the document
store. The complete message is frozen for retries. Resend idempotency protects
concurrent deliveries and a crash after provider acceptance. A recorded success
prevents all future sends. Pending records older than 23 hours fail for manual
reconciliation rather than risking a duplicate after Resend's 24-hour window.
If this occurs, check Resend logs: record sentAt and providerMessageId if already
accepted; only reset startedAt after establishing that no message was accepted.
Monitor non-2xx webhook responses in Stripe, and delivery/bounce events in Resend.
