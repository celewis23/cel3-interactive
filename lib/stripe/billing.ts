// lib/stripe/billing.ts
// Required env var: STRIPE_SECRET_KEY (already configured in lib/stripe.ts)

import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BillingCustomer = {
  // Core
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  description: string | null;
  created: number; // unix
  livemode: boolean;

  // Balance
  balance: number; // in cents
  currency: string;
  cashBalance: Record<string, number> | null; // available cash per currency
  invoiceCreditBalance: Record<string, number> | null;

  // Status
  delinquent: boolean | null;
  taxExempt: string | null; // 'none' | 'exempt' | 'reverse'
  nextInvoiceSequence: number | null;
  preferredLocales: string[];
  metadata: Record<string, string>;

  // Address
  country: string | null; // address.country (kept for compat)
  addressLine1: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressPostalCode: string | null;

  // Shipping
  shippingName: string | null;
  shippingPhone: string | null;
  shippingAddressLine1: string | null;
  shippingAddressCity: string | null;
  shippingAddressState: string | null;
  shippingAddressPostalCode: string | null;

  // Payment method (expanded)
  defaultPaymentMethodBrand: string | null;
  defaultPaymentMethodLast4: string | null;
  defaultPaymentMethodType: string | null;
  defaultSource: string | null;

  // Subscription (expanded, first active)
  subscriptionStatus: string | null;
  subscriptionCurrentPeriodEnd: number | null;
  subscriptionPlanNickname: string | null;
  subscriptionPlanAmount: number | null;
  subscriptionPlanInterval: string | null;

  // Discount / coupon
  discountCouponName: string | null;
  discountCouponPercentOff: number | null;
};

export type BillingInvoice = {
  id: string;
  number: string | null;
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  status: Stripe.Invoice.Status | null;
  amountDue: number;
  amountPaid: number;
  currency: string;
  created: number;
  dueDate: number | null;
  description: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  lines: BillingInvoiceLine[];
  periodStart: number;
  periodEnd: number;
  subtotal: number;
  tax: number | null;
  total: number;
};

export type BillingInvoiceLine = {
  id: string;
  description: string | null;
  amount: number;
  currency: string;
  quantity: number | null;
};

export type BillingSubscription = {
  id: string;
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  status: Stripe.Subscription.Status;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  canceledAt: number | null;
  items: {
    id: string;
    priceId: string;
    productName: string | null;
    amount: number;
    currency: string;
    interval: string;
  }[];
};

export type BillingBalance = {
  available: { amount: number; currency: string }[];
  pending: { amount: number; currency: string }[];
  livemode: boolean;
};

export type BillingPayout = {
  id: string;
  amount: number;
  currency: string;
  arrivalDate: number;
  status: string;
  description: string | null;
  created: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapInvoice(inv: Stripe.Invoice): BillingInvoice {
  const customer =
    typeof inv.customer === "object" && inv.customer !== null
      ? (inv.customer as Stripe.Customer)
      : null;
  return {
    id: inv.id ?? "",
    number: inv.number ?? null,
    customerId:
      typeof inv.customer === "string"
        ? inv.customer
        : (inv.customer as Stripe.Customer)?.id ?? "",
    customerName: customer?.name ?? null,
    customerEmail: customer?.email ?? null,
    status: inv.status ?? null,
    amountDue: inv.amount_due,
    amountPaid: inv.amount_paid,
    currency: inv.currency,
    created: inv.created,
    dueDate: inv.due_date ?? null,
    description: inv.description ?? null,
    hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
    invoicePdf: inv.invoice_pdf ?? null,
    lines: inv.lines.data.map((line) => ({
      id: line.id,
      description: line.description ?? null,
      amount: line.amount,
      currency: line.currency,
      quantity: line.quantity ?? null,
    })),
    periodStart: inv.period_start,
    periodEnd: inv.period_end,
    subtotal: inv.subtotal,
    tax: null,
    total: inv.total,
  };
}

// ─── Customers ────────────────────────────────────────────────────────────────

const CUSTOMER_EXPAND = [
  "subscriptions",
  "invoice_settings.default_payment_method",
  "cash_balance",
] as const;

function mapCustomer(c: Stripe.Customer): BillingCustomer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = c as any;

  // Default payment method (expanded object or string id)
  const dpm = c.invoice_settings?.default_payment_method;
  const dpmObj = typeof dpm === "object" && dpm !== null ? (dpm as Stripe.PaymentMethod) : null;

  // First subscription (expanded list)
  const firstSub = c.subscriptions?.data?.[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subRaw = firstSub as any;

  // Cash balance (expanded CashBalance object)
  const cashBalAvailable = raw.cash_balance?.available as Record<string, number> | null | undefined;

  // Invoice credit balance (newer Stripe field)
  const icb = raw.invoice_credit_balance as Record<string, number> | null | undefined;

  // Discount coupon (cast because Stripe SDK types Discount.coupon as DeletedCoupon | Coupon)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coupon = (c.discount as any)?.coupon as Stripe.Coupon | null | undefined;

  return {
    id: c.id,
    name: c.name ?? null,
    email: c.email ?? null,
    phone: c.phone ?? null,
    description: c.description ?? null,
    created: c.created,
    livemode: c.livemode,

    balance: c.balance,
    currency: c.currency ?? "usd",
    cashBalance: cashBalAvailable ?? null,
    invoiceCreditBalance: icb ?? null,

    delinquent: c.delinquent ?? null,
    taxExempt: c.tax_exempt ?? null,
    nextInvoiceSequence: c.next_invoice_sequence ?? null,
    preferredLocales: c.preferred_locales ?? [],
    metadata: (c.metadata as Record<string, string>) ?? {},

    country: c.address?.country ?? null,
    addressLine1: c.address?.line1 ?? null,
    addressCity: c.address?.city ?? null,
    addressState: c.address?.state ?? null,
    addressPostalCode: c.address?.postal_code ?? null,

    shippingName: c.shipping?.name ?? null,
    shippingPhone: c.shipping?.phone ?? null,
    shippingAddressLine1: c.shipping?.address?.line1 ?? null,
    shippingAddressCity: c.shipping?.address?.city ?? null,
    shippingAddressState: c.shipping?.address?.state ?? null,
    shippingAddressPostalCode: c.shipping?.address?.postal_code ?? null,

    defaultPaymentMethodBrand: dpmObj?.card?.brand ?? null,
    defaultPaymentMethodLast4: dpmObj?.card?.last4 ?? null,
    defaultPaymentMethodType: dpmObj?.type ?? null,
    defaultSource:
      typeof c.default_source === "string"
        ? c.default_source
        : (c.default_source as Stripe.PaymentMethod | null)?.id ?? null,

    subscriptionStatus: firstSub?.status ?? null,
    subscriptionCurrentPeriodEnd: subRaw?.current_period_end ?? null,
    subscriptionPlanNickname: subRaw?.plan?.nickname ?? null,
    subscriptionPlanAmount: subRaw?.plan?.amount ?? null,
    subscriptionPlanInterval: subRaw?.plan?.interval ?? null,

    discountCouponName: coupon?.name ?? null,
    discountCouponPercentOff: coupon?.percent_off ?? null,
  };
}

export async function listCustomers(opts?: {
  limit?: number;
  startingAfter?: string;
  email?: string;
}): Promise<{ customers: BillingCustomer[]; hasMore: boolean }> {
  const result = await stripe.customers.list({
    limit: opts?.limit ?? 20,
    ...(opts?.startingAfter ? { starting_after: opts.startingAfter } : {}),
    ...(opts?.email ? { email: opts.email } : {}),
    expand: CUSTOMER_EXPAND.map((f) => `data.${f}`),
  });

  return {
    customers: result.data.map(mapCustomer),
    hasMore: result.has_more,
  };
}

export async function getCustomer(customerId: string): Promise<BillingCustomer | null> {
  const c = await stripe.customers.retrieve(customerId, {
    expand: CUSTOMER_EXPAND as unknown as string[],
  });
  if ((c as Stripe.DeletedCustomer).deleted) return null;
  return mapCustomer(c as Stripe.Customer);
}

export async function createCustomer(params: {
  name: string;
  email?: string;
  phone?: string;
  description?: string;
}): Promise<BillingCustomer> {
  const c = await stripe.customers.create({
    name: params.name,
    ...(params.email ? { email: params.email } : {}),
    ...(params.phone ? { phone: params.phone } : {}),
    ...(params.description ? { description: params.description } : {}),
  });
  return mapCustomer(c);
}

export async function updateCustomer(customerId: string, params: {
  name?: string;
  email?: string | null;
  phone?: string | null;
  description?: string | null;
}): Promise<BillingCustomer> {
  const normalizeNullableField = (value: string | null | undefined) => (
    value === null ? "" : value
  );

  const c = await stripe.customers.update(customerId, {
    ...(params.name !== undefined ? { name: params.name } : {}),
    ...(params.email !== undefined ? { email: normalizeNullableField(params.email) } : {}),
    ...(params.phone !== undefined ? { phone: normalizeNullableField(params.phone) } : {}),
    ...(params.description !== undefined ? { description: normalizeNullableField(params.description) } : {}),
  });
  return mapCustomer(c);
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export async function listInvoices(opts?: {
  customerId?: string;
  status?: Stripe.Invoice.Status;
  limit?: number;
  startingAfter?: string;
}): Promise<{ invoices: BillingInvoice[]; hasMore: boolean }> {
  const result = await stripe.invoices.list({
    ...(opts?.customerId ? { customer: opts.customerId } : {}),
    ...(opts?.status ? { status: opts.status } : {}),
    limit: opts?.limit ?? 20,
    ...(opts?.startingAfter ? { starting_after: opts.startingAfter } : {}),
    expand: ["data.customer"],
  });

  return {
    invoices: result.data.map(mapInvoice),
    hasMore: result.has_more,
  };
}

export async function getInvoice(invoiceId: string): Promise<BillingInvoice | null> {
  try {
    const inv = await stripe.invoices.retrieve(invoiceId, {
      expand: ["customer"],
    });
    return mapInvoice(inv);
  } catch {
    return null;
  }
}

export async function createInvoice(params: {
  customerId: string;
  daysUntilDue?: number;
  description?: string;
  lineItems: { description: string; amount: number; quantity?: number }[];
  send?: boolean;
}): Promise<BillingInvoice> {
  // Create the invoice
  const inv = await stripe.invoices.create({
    customer: params.customerId,
    collection_method: "send_invoice",
    days_until_due: params.daysUntilDue ?? 30,
    ...(params.description ? { description: params.description } : {}),
    auto_advance: false,
  });

  // Add line items
  for (const item of params.lineItems) {
    await stripe.invoiceItems.create({
      customer: params.customerId,
      invoice: inv.id,
      amount: Math.round(item.amount * 100), // dollars -> cents
      currency: "usd",
      description: item.description,
      quantity: item.quantity ?? 1,
    });
  }

  // Finalize
  const finalized = await stripe.invoices.finalizeInvoice(inv.id);

  // Optionally send
  if (params.send) {
    const sent = await stripe.invoices.sendInvoice(finalized.id);
    return mapInvoice(sent);
  }

  return mapInvoice(finalized);
}

export async function sendInvoice(invoiceId: string): Promise<BillingInvoice> {
  const inv = await stripe.invoices.sendInvoice(invoiceId);
  return mapInvoice(inv);
}

export async function voidInvoice(invoiceId: string): Promise<BillingInvoice> {
  const inv = await stripe.invoices.voidInvoice(invoiceId);
  return mapInvoice(inv);
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export async function listSubscriptions(opts?: {
  customerId?: string;
  status?: string;
  limit?: number;
  startingAfter?: string;
}): Promise<{ subscriptions: BillingSubscription[]; hasMore: boolean }> {
  // Stripe doesn't accept "all" or empty string for status — omit it in those cases
  const statusValue =
    opts?.status && opts.status !== "all" ? opts.status : undefined;

  const result = await stripe.subscriptions.list({
    ...(opts?.customerId ? { customer: opts.customerId } : {}),
    ...(statusValue ? { status: statusValue as Stripe.SubscriptionListParams.Status } : {}),
    limit: opts?.limit ?? 20,
    ...(opts?.startingAfter ? { starting_after: opts.startingAfter } : {}),
    expand: ["data.customer"],
  });

  const subscriptions: BillingSubscription[] = result.data.map((sub) => {
    const customer =
      typeof sub.customer === "object" && sub.customer !== null
        ? (sub.customer as Stripe.Customer)
        : null;

    return {
      id: sub.id,
      customerId: typeof sub.customer === "string" ? sub.customer : customer?.id ?? "",
      customerName: customer?.name ?? null,
      customerEmail: customer?.email ?? null,
      status: sub.status,
      currentPeriodStart: (sub as unknown as Record<string, number>).current_period_start ?? 0,
      currentPeriodEnd: (sub as unknown as Record<string, number>).current_period_end ?? 0,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      canceledAt: (sub as unknown as Record<string, number | null>).canceled_at ?? null,
      items: sub.items.data.map((item) => ({
        id: item.id,
        priceId: item.price.id,
        productName: typeof item.price.product === "object" ? (item.price.product as Stripe.Product).name ?? null : null,
        amount: item.price.unit_amount ?? 0,
        currency: item.price.currency,
        interval: item.price.recurring?.interval ?? "month",
      })),
    };
  });

  return { subscriptions, hasMore: result.has_more };
}

// ─── Balance & Payouts ────────────────────────────────────────────────────────

export async function getBalance(): Promise<BillingBalance> {
  const balance = await stripe.balance.retrieve();
  return {
    available: balance.available.map((b) => ({
      amount: b.amount,
      currency: b.currency,
    })),
    pending: balance.pending.map((b) => ({
      amount: b.amount,
      currency: b.currency,
    })),
    livemode: balance.livemode,
  };
}

export async function listPayouts(limit?: number): Promise<BillingPayout[]> {
  const result = await stripe.payouts.list({ limit: limit ?? 10 });
  return result.data.map((p) => ({
    id: p.id,
    amount: p.amount,
    currency: p.currency,
    arrivalDate: p.arrival_date,
    status: p.status,
    description: p.description ?? null,
    created: p.created,
  }));
}
