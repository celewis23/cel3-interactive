import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { createCustomer, getCustomer, listInvoices, type BillingCustomer, type BillingInvoice } from "@/lib/stripe/billing";

type PipelineContact = {
  _id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  owner: string | null;
  stage: string;
  stripeCustomerId: string | null;
  siteUrl?: string | null;
  managementUrl?: string | null;
  managementUsername?: string | null;
};

type SyncStripeCustomerOptions = {
  stage?: string;
  source?: string;
  owner?: string | null;
  notes?: string | null;
};

function isoDateFromUnix(seconds: number | null): string | null {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

function isoDateTimeFromUnix(seconds: number | null): string | null {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

export async function findPipelineContactByStripeCustomerId(stripeCustomerId: string) {
  return sanityServer.fetch<PipelineContact | null>(
    `*[_type == "pipelineContact" && stripeCustomerId == $stripeCustomerId][0]{
      _id, name, email, phone, company, source, owner, stage, stripeCustomerId,
      siteUrl, managementUrl, managementUsername
    }`,
    { stripeCustomerId }
  );
}

export async function findPipelineContactByEmail(email: string) {
  return sanityServer.fetch<PipelineContact | null>(
    `*[_type == "pipelineContact" && lower(email) == lower($email)][0]{
      _id, name, email, phone, company, source, owner, stage, stripeCustomerId,
      siteUrl, managementUrl, managementUsername
    }`,
    { email }
  );
}

export async function syncStripeCustomerToPipelineContact(
  customer: BillingCustomer,
  options?: SyncStripeCustomerOptions
) {
  let existing = await findPipelineContactByStripeCustomerId(customer.id);
  if (!existing && customer.email) {
    existing = await findPipelineContactByEmail(customer.email);
  }

  const patch = {
    name: customer.name ?? existing?.name ?? customer.email ?? customer.id,
    email: customer.email ?? existing?.email ?? null,
    phone: customer.phone ?? existing?.phone ?? null,
    company: existing?.company ?? customer.description ?? null,
    owner: existing?.owner ?? options?.owner ?? null,
    source: existing?.source ?? options?.source ?? "Stripe",
    stage: existing?.stage ?? options?.stage ?? "won",
    notes: options?.notes ?? null,
    stripeCustomerId: customer.id,
  };

  if (existing) {
    await sanityWriteClient
      .patch(existing._id)
      .set({
        name: patch.name,
        email: patch.email,
        phone: patch.phone,
        company: patch.company,
        owner: patch.owner,
        source: patch.source,
        stage: patch.stage,
        stripeCustomerId: patch.stripeCustomerId,
      })
      .commit();

    return {
      ...existing,
      name: patch.name,
      email: patch.email,
      phone: patch.phone,
      company: patch.company,
      owner: patch.owner,
      source: patch.source,
      stage: patch.stage,
      stripeCustomerId: patch.stripeCustomerId,
      notes: patch.notes,
    };
  }

  const now = new Date().toISOString();
  const created = await sanityWriteClient.create({
    _type: "pipelineContact",
    name: patch.name,
    email: patch.email,
    phone: patch.phone,
    company: patch.company,
    source: patch.source,
    notes: patch.notes,
    owner: patch.owner,
    stage: patch.stage,
    stageEnteredAt: now,
    estimatedValue: null,
    stripeCustomerId: patch.stripeCustomerId,
    closedAt: patch.stage === "won" || patch.stage === "lost" ? now : null,
    driveFileUrl: null,
    driveFileName: null,
    followUpEventId: null,
    siteUrl: null,
    managementUrl: null,
    managementUsername: null,
    managementPasswordEncrypted: null,
    managementPasswordIv: null,
  });

  await sanityWriteClient.create({
    _type: "pipelineActivity",
    contactId: created._id,
    type: "converted",
    text: `Imported from Stripe customer (${customer.id})`,
    fromStage: null,
    toStage: patch.stage,
    author: "Admin",
  });

  return created as unknown as PipelineContact & { notes?: string | null };
}

export async function ensureStripeCustomerForPipelineContact(contactId: string) {
  const contact = await sanityServer.fetch<PipelineContact | null>(
    `*[_type == "pipelineContact" && _id == $id][0]{
      _id, name, email, phone, company, source, owner, stage, stripeCustomerId,
      siteUrl, managementUrl, managementUsername
    }`,
    { id: contactId }
  );

  if (!contact) {
    throw new Error("Client not found");
  }

  if (contact.stripeCustomerId) {
    const existingCustomer = await getCustomer(contact.stripeCustomerId).catch(() => null);
    if (existingCustomer) {
      return { contact, customer: existingCustomer };
    }
  }

  const customer = await createCustomer({
    name: contact.name,
    email: contact.email ?? undefined,
    phone: contact.phone ?? undefined,
    description: contact.company ?? undefined,
  });

  await sanityWriteClient.patch(contact._id).set({ stripeCustomerId: customer.id }).commit();

  return {
    contact: {
      ...contact,
      stripeCustomerId: customer.id,
    },
    customer,
  };
}

export async function syncStripeInvoiceToSanity(invoice: BillingInvoice) {
  const existing = await sanityServer.fetch<{ _id: string; status: string | null } | null>(
    `*[_type == "invoice" && _id == $id][0]{ _id, status }`,
    { id: invoice.id }
  );

  let contact: PipelineContact | null = null;
  if (invoice.customerId) {
    contact = await findPipelineContactByStripeCustomerId(invoice.customerId);
  }
  if (!contact && invoice.customerEmail) {
    contact = await findPipelineContactByEmail(invoice.customerEmail);
  }

  const doc = {
    _id: invoice.id,
    _type: "invoice",
    stripeInvoiceId: invoice.id,
    stripeCustomerId: invoice.customerId,
    clientId: contact?._id ?? null,
    clientName: contact?.name ?? invoice.customerName ?? invoice.customerEmail ?? invoice.customerId,
    clientEmail: contact?.email ?? invoice.customerEmail ?? null,
    number: invoice.number ?? invoice.id,
    status: invoice.status ?? "draft",
    amountCents: invoice.total,
    amountDueCents: invoice.amountDue,
    amountPaidCents: invoice.amountPaid,
    subtotalCents: invoice.subtotal,
    taxCents: invoice.tax ?? 0,
    totalCents: invoice.total,
    currency: invoice.currency,
    dueDate: isoDateFromUnix(invoice.dueDate),
    description: invoice.description ?? null,
    hostedInvoiceUrl: invoice.hostedInvoiceUrl,
    invoicePdf: invoice.invoicePdf,
    issuedAt: isoDateTimeFromUnix(invoice.created),
    paidAt: invoice.status === "paid" ? isoDateTimeFromUnix(invoice.created) : null,
    lineItems: invoice.lines.map((line, index) => ({
      _key: line.id || `${invoice.id}-${index}`,
      stripeLineItemId: line.id,
      description: line.description ?? "Line item",
      quantity: line.quantity ?? 1,
      amountCents: line.amount,
      currency: line.currency,
    })),
  };

  await sanityWriteClient.createOrReplace(doc);

  return {
    id: doc._id,
    statusChanged: existing?.status !== doc.status,
    previousStatus: existing?.status ?? null,
    clientId: doc.clientId,
  };
}

export async function syncRecentStripeInvoicesToSanity(limit = 100) {
  const { invoices } = await listInvoices({ limit });
  return Promise.all(invoices.map((invoice) => syncStripeInvoiceToSanity(invoice)));
}
