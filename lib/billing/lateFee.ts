import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { sanityWriteClient } from "@/lib/sanity.write";
import { getInvoice, type BillingInvoice } from "@/lib/stripe/billing";
import { syncStripeInvoiceToSanity } from "@/lib/stripe/sync";
import { refreshCollectibleInvoice } from "@/lib/billing/collections";

type LateFeeRequest = {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  amountCents: number;
  existingFeeInvoiceId?: string | null;
};

type LateFeeOperation = LateFeeRequest & {
  _id: string;
  _type: "invoiceLateFeeOperation";
  invoiceStartedAt: string;
  itemStartedAt?: string;
  stripeInvoiceId?: string;
  sentAt?: string;
};

// Stripe may prune idempotency keys after 24 hours. When a write's outcome
// cannot be recovered, stop before that window ends instead of charging again.
const RETRY_WINDOW_MS = 23 * 60 * 60 * 1000;

function requireSafeRetry(startedAt: string) {
  const age = Date.now() - Date.parse(startedAt);
  if (!Number.isFinite(age) || age >= RETRY_WINDOW_MS) {
    throw new Error("Late-fee write could not be recovered; review it in Stripe before retrying.");
  }
}

/** Resume one durable late-fee operation per original invoice, including after
 * Stripe succeeds but a database write, sync, or either email fails. */
export async function ensureLateFeeInvoice(request: LateFeeRequest): Promise<BillingInvoice | null> {
  if (!Number.isSafeInteger(request.amountCents) || request.amountCents < 0) {
    throw new Error("Late fee must be a non-negative number of cents.");
  }
  if (!await refreshCollectibleInvoice(request.invoiceId, request.customerId)) return null;

  // Atomic create: overlapping runs use the same amount and request parameters,
  // even if the owner changes the fee setting while an operation is in progress.
  let operation = await sanityWriteClient.createIfNotExists<LateFeeOperation>({
    _id: `lateFee.${request.invoiceId}`,
    _type: "invoiceLateFeeOperation",
    ...request,
    invoiceStartedAt: new Date().toISOString(),
  });
  if (operation.invoiceId !== request.invoiceId || operation.customerId !== request.customerId) {
    throw new Error("Late-fee operation does not match the original invoice's customer.");
  }

  const key = `cel3:late-fee:${operation.invoiceId}`;
  const description = `Late payment fee — Invoice ${operation.invoiceNumber}`;
  const metadata = { cel3_fee_type: "late_payment", cel3_original_invoice_id: operation.invoiceId };
  const knownId = operation.stripeInvoiceId ?? operation.existingFeeInvoiceId ?? request.existingFeeInvoiceId;
  let fee: Stripe.Invoice | undefined;

  if (knownId) {
    // A missing/deleted recorded fee is an error, never permission to create another.
    fee = await stripe.invoices.retrieve(knownId);
  } else {
    // Use the paginated list API, not eventually consistent Stripe Search.
    // The description also recovers invoices created by the older implementation.
    for await (const candidate of stripe.invoices.list({ customer: operation.customerId, limit: 100 })) {
      const matches = candidate.metadata?.cel3_original_invoice_id === operation.invoiceId
        || candidate.description === description;
      if (!matches) continue;
      if (fee) throw new Error("Multiple late-fee invoices already exist; review them in Stripe.");
      fee = candidate;
    }

    if (!fee) {
      // Listing/recovering an earlier attempt can take time. Recheck immediately
      // before creating a new obligation, including on a retry after payment.
      if (!await refreshCollectibleInvoice(request.invoiceId, request.customerId)) return null;
      requireSafeRetry(operation.invoiceStartedAt);
      fee = await stripe.invoices.create({
        customer: operation.customerId,
        collection_method: "send_invoice",
        days_until_due: 7,
        description,
        metadata,
        pending_invoice_items_behavior: "exclude",
        auto_advance: false,
      }, { idempotencyKey: `${key}:invoice` });
    }
  }

  const customerId = typeof fee.customer === "string" ? fee.customer : fee.customer?.id;
  if (customerId !== operation.customerId || fee.description !== description
    || (fee.metadata?.cel3_original_invoice_id && fee.metadata.cel3_original_invoice_id !== operation.invoiceId)) {
    throw new Error("Recorded late-fee invoice does not match the original invoice.");
  }
  if (fee.status === "void" || fee.status === "uncollectible") {
    throw new Error("Late-fee invoice was voided or written off; review it instead of creating another.");
  }

  operation = await sanityWriteClient.patch(operation._id)
    .setIfMissing({ stripeInvoiceId: fee.id }).commit<LateFeeOperation>();
  if (operation.stripeInvoiceId !== fee.id) throw new Error("Conflicting late-fee invoice; review required.");

  // Mark the fee before syncing it into the invoice collection so it cannot
  // enter the collections ladder itself, and save the parent link before email.
  await sanityWriteClient.createIfNotExists({
    _id: `dunning.${fee.id}`,
    _type: "invoiceDunningState",
    invoiceId: fee.id,
    dunningStage: 0,
    isLateFee: true,
    lateFeeInvoiceId: null,
    lastDunningEmailAt: null,
  });
  await sanityWriteClient.createIfNotExists({
    _id: `dunning.${operation.invoiceId}`,
    _type: "invoiceDunningState",
    invoiceId: operation.invoiceId,
    dunningStage: 0,
    isLateFee: false,
    lastDunningEmailAt: null,
  });
  await sanityWriteClient.patch(`dunning.${operation.invoiceId}`)
    .set({ lateFeeInvoiceId: fee.id }).commit();

  if (fee.status === "draft") {
    let items = await stripe.invoiceItems.list({ invoice: fee.id, limit: 2 });
    if (items.data.length === 0) {
      operation = await sanityWriteClient.patch(operation._id)
        .setIfMissing({ itemStartedAt: new Date().toISOString() }).commit<LateFeeOperation>();
      requireSafeRetry(operation.itemStartedAt!);
      await stripe.invoiceItems.create({
        customer: operation.customerId,
        invoice: fee.id,
        currency: "usd",
        description: "Late payment fee",
        amount: operation.amountCents,
        metadata,
      }, { idempotencyKey: `${key}:item` });
      items = await stripe.invoiceItems.list({ invoice: fee.id, limit: 2 });
    }
    if (items.has_more || items.data.length !== 1 || items.data[0].amount !== operation.amountCents
      || items.data[0].currency !== "usd" || items.data[0].description !== "Late payment fee") {
      throw new Error("Late-fee invoice has unexpected line items; review it before sending.");
    }
    fee = await stripe.invoices.finalizeInvoice(fee.id, {}, { idempotencyKey: `${key}:finalize` });
  }

  const invoice = await getInvoice(fee.id);
  if (!invoice) throw new Error("Could not read the late-fee invoice from Stripe.");
  await syncStripeInvoiceToSanity(invoice);

  if (fee.status === "open" && !operation.sentAt) {
    if (!await refreshCollectibleInvoice(request.invoiceId, request.customerId)) return null;
    await stripe.invoices.sendInvoice(fee.id, {}, { idempotencyKey: `${key}:send` });
    await sanityWriteClient.patch(operation._id).set({ sentAt: new Date().toISOString() }).commit();
  }

  return invoice;
}
