import { getInvoice } from "@/lib/stripe/billing";
import { syncStripeInvoiceToSanity } from "@/lib/stripe/sync";

/** Saved invoices identify candidates only. Stripe must confirm the debt before
 * any collections action; unavailable or mismatched records fail closed. */
export async function refreshCollectibleInvoice(invoiceId: string, customerId: string) {
  const invoice = await getInvoice(invoiceId);
  if (!invoice) throw new Error("Could not verify the invoice in Stripe; collections skipped.");
  if (!customerId || invoice.customerId !== customerId) {
    throw new Error("Stripe invoice customer does not match the saved billing account.");
  }
  await syncStripeInvoiceToSanity(invoice);
  const today = new Date().toISOString().slice(0, 10);
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate * 1000).toISOString().slice(0, 10) : null;
  if (invoice.status !== "open" || !(invoice.amountRemaining > 0) || !dueDate || dueDate >= today) return null;
  return invoice;
}
