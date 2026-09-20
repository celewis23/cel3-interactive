import { listInvoices, type BillingInvoice } from "@/lib/stripe/billing";

export type PortalBillingAccess = {
  stripeCustomerId: string | null;
  // Explicit, server-managed grants. Never infer billing access from an email,
  // business name, client-supplied customer ID, or other project access.
  managedStripeCustomerIds?: string[] | null;
};

export function getPortalBillingCustomerIds(user: PortalBillingAccess): string[] {
  return [...new Set([user.stripeCustomerId, ...(user.managedStripeCustomerIds ?? [])]
    .filter((id): id is string => typeof id === "string" && id.startsWith("cus_")))];
}

export function canAccessPortalInvoice(user: PortalBillingAccess, invoice: Pick<BillingInvoice, "customerId" | "status">) {
  return invoice.status !== "draft" && getPortalBillingCustomerIds(user).includes(invoice.customerId);
}

export async function listPortalInvoices(user: PortalBillingAccess, statuses: Array<"open" | "paid"> = ["open", "paid"]) {
  const batches = await Promise.all(getPortalBillingCustomerIds(user).flatMap(customerId => statuses.map(async status => {
    const invoices: BillingInvoice[] = [];
    let startingAfter: string | undefined;
    for (;;) {
      const page = await listInvoices({ customerId, status, limit: 100, startingAfter });
      invoices.push(...page.invoices.filter(invoice => canAccessPortalInvoice(user, invoice)));
      if (!page.hasMore || !page.invoices.length) break;
      const lastId = page.invoices[page.invoices.length - 1].id;
      if (lastId === startingAfter) throw new Error("Invoice pagination did not advance.");
      startingAfter = lastId;
    }
    return invoices;
  })));
  return { invoices: [...new Map(batches.flat().map(invoice => [invoice.id, invoice])).values()]
    .sort((a, b) => b.created - a.created) };
}
