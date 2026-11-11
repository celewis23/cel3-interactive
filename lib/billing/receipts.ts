import type Stripe from "stripe";
import { Resend } from "resend";
import { stripe } from "@/lib/stripe";
import { sanityWriteClient } from "@/lib/sanity.write";

type ReceiptDelivery = {
  _id: string;
  _type: string;
  startedAt: string;
  sentAt?: string;
  message: { from: string; to: string; subject: string; text: string };
};

/** A separate record survives invoice synchronization and webhook redelivery. */
export async function sendPaidInvoiceReceipt(invoice: Stripe.Invoice) {
  if (invoice.status !== "paid") return;
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    throw new Error("Receipt delivery requires RESEND_API_KEY and a verified RESEND_FROM_EMAIL");
  }
  let email = invoice.customer_email;
  if (!email && invoice.customer) {
    const customer = typeof invoice.customer === "string"
      ? await stripe.customers.retrieve(invoice.customer)
      : invoice.customer;
    if (!customer.deleted) email = customer.email;
  }
  if (!email) throw new Error(`Paid invoice ${invoice.id} has no customer email`);

  const number = invoice.number ?? invoice.id;
  const currency = new Intl.NumberFormat("en-US", {
    style: "currency", currency: invoice.currency,
  });
  // Stripe amounts use currency minor units (JPY, for example, has no decimals).
  const digits = currency.resolvedOptions().maximumFractionDigits ?? 2;
  const amount = currency.format(invoice.amount_paid / 10 ** digits);
  const paidDate = invoice.status_transitions.paid_at
    ? new Date(invoice.status_transitions.paid_at * 1000).toISOString().slice(0, 10)
    : null;
  const delivery = await sanityWriteClient.createIfNotExists({
    _id: `invoiceReceipt.${invoice.livemode ? "live" : "test"}.${invoice.id}`,
    _type: "invoiceReceiptDelivery",
    startedAt: new Date().toISOString(),
    message: {
      from: process.env.RESEND_FROM_EMAIL,
      to: email,
      subject: `Receipt — Invoice ${number}`,
      text: [
        `Hi ${invoice.customer_name ?? "there"},`,
        `Invoice ${number} is paid in full. Thank you!`,
        `Amount paid: ${amount}`,
        ...(paidDate ? [`Paid on: ${paidDate} (UTC)`] : []),
        ...(invoice.hosted_invoice_url ? [`View paid invoice: ${invoice.hosted_invoice_url}`] : []),
        "CEL3 Interactive",
      ].join("\n\n"),
    },
  }) as ReceiptDelivery;
  if (delivery.sentAt) return;
  // Resend retains keys for 24h. Stop before expiry if acceptance is uncertain;
  // an operator must reconcile provider logs before retrying an older delivery.
  if (Date.now() - Date.parse(delivery.startedAt) >= 23 * 60 * 60 * 1000) {
    throw new Error(`Receipt ${delivery._id} needs delivery reconciliation before retry`);
  }
  const { data, error } = await new Resend(process.env.RESEND_API_KEY).emails.send(
    delivery.message, { idempotencyKey: delivery._id },
  );
  if (error || !data?.id) throw new Error(`Receipt delivery failed: ${error?.message ?? "No message ID"}`);
  await sanityWriteClient.patch(delivery._id).set({
    sentAt: new Date().toISOString(), providerMessageId: data.id,
  }).commit();
}
