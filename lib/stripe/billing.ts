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
  collectionMethod: Stripe.Invoice.CollectionMethod | null;
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
  collectionMethod: Stripe.Subscription.CollectionMethod;
  daysUntilDue: number | null;
  defaultPaymentMethodBrand: string | null;
  defaultPaymentMethodLast4: string | null;
  defaultPaymentMethodType: string | null;
  items: {
    id: string;
    priceId: string;
    productName: string | null;
    amount: number;
    currency: string;
    interval: string;
    intervalCount: number;
  }[];
};

export type BillingBalance = {
  available: {
    amount: number;
    currency: string;
    sourceTypes: Record<string, number> | null;
  }[];
  instantAvailable: {
    amount: number;
    currency: string;
    sourceTypes: Record<string, number> | null;
  }[];
  pending: {
    amount: number;
    currency: string;
    sourceTypes: Record<string, number> | null;
  }[];
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

export type CreatedBillingPayout = BillingPayout & {
  method: string;
  destination: string | null;
};

function normalizeSourceTypes(sourceTypes?: {
  bank_account?: number;
  card?: number;
  fpx?: number;
}): Record<string, number> | null {
  if (!sourceTypes) return null;
  return Object.fromEntries(
    Object.entries(sourceTypes).filter(([, value]) => typeof value === "number")
  );
}

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
    collectionMethod: inv.collection_method ?? null,
  };
}

function mapSubscription(sub: Stripe.Subscription, productNames?: Record<string, string | null>): BillingSubscription {
  const customer =
    typeof sub.customer === "object" && sub.customer !== null
      ? (sub.customer as Stripe.Customer)
      : null;
  const dpm = sub.default_payment_method;
  const dpmObj = typeof dpm === "object" && dpm !== null ? (dpm as Stripe.PaymentMethod) : null;

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
    collectionMethod: sub.collection_method,
    daysUntilDue: sub.days_until_due ?? null,
    defaultPaymentMethodBrand: dpmObj?.card?.brand ?? null,
    defaultPaymentMethodLast4: dpmObj?.card?.last4 ?? null,
    defaultPaymentMethodType: dpmObj?.type ?? null,
    items: sub.items.data.map((item) => {
      const product = item.price.product;
      const productName =
        typeof product === "object" && product !== null
          ? (product as Stripe.Product).name ?? null
          : productNames?.[typeof product === "string" ? product : ""] ?? null;
      return {
        id: item.id,
        priceId: item.price.id,
        productName,
        amount: item.price.unit_amount ?? 0,
        currency: item.price.currency,
        interval: item.price.recurring?.interval ?? "month",
        intervalCount: item.price.recurring?.interval_count ?? 1,
      };
    }),
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
  addressLine1?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressPostalCode?: string | null;
  addressCountry?: string | null;
}): Promise<BillingCustomer> {
  const normalizeNullableField = (value: string | null | undefined) => (
    value === null ? "" : value
  );

  const c = await stripe.customers.update(customerId, {
    ...(params.name !== undefined ? { name: params.name } : {}),
    ...(params.email !== undefined ? { email: normalizeNullableField(params.email) } : {}),
    ...(params.phone !== undefined ? { phone: normalizeNullableField(params.phone) } : {}),
    ...(params.description !== undefined ? { description: normalizeNullableField(params.description) } : {}),
    ...(
      params.addressLine1 !== undefined ||
      params.addressCity !== undefined ||
      params.addressState !== undefined ||
      params.addressPostalCode !== undefined ||
      params.addressCountry !== undefined
        ? {
            address: {
              ...(params.addressLine1 !== undefined ? { line1: normalizeNullableField(params.addressLine1) } : {}),
              ...(params.addressCity !== undefined ? { city: normalizeNullableField(params.addressCity) } : {}),
              ...(params.addressState !== undefined ? { state: normalizeNullableField(params.addressState) } : {}),
              ...(params.addressPostalCode !== undefined ? { postal_code: normalizeNullableField(params.addressPostalCode) } : {}),
              ...(params.addressCountry !== undefined ? { country: normalizeNullableField(params.addressCountry) } : {}),
            },
          }
        : {}
    ),
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
  dueDate?: number;
  description?: string;
  lineItems: { description: string; amount: number; quantity?: number }[];
  collectionMethod?: Stripe.InvoiceCreateParams.CollectionMethod;
  finalize?: boolean;
  send?: boolean;
}): Promise<BillingInvoice> {
  const collectionMethod = params.collectionMethod ?? "send_invoice";
  // Create the invoice
  const inv = await stripe.invoices.create({
    customer: params.customerId,
    collection_method: collectionMethod,
    ...(collectionMethod === "send_invoice"
      ? params.dueDate
        ? { due_date: params.dueDate }
        : { days_until_due: params.daysUntilDue ?? 30 }
      : {}),
    ...(params.description ? { description: params.description } : {}),
    auto_advance: false,
  });

  // Add line items
  for (const item of params.lineItems) {
    const quantity = Math.max(1, Math.round(item.quantity ?? 1));
    const lineTotalCents = Math.round(item.amount * 100);

    if (quantity > 1) {
      await stripe.invoiceItems.create({
        customer: params.customerId,
        invoice: inv.id,
        currency: "usd",
        description: item.description,
        quantity,
        unit_amount_decimal: (lineTotalCents / quantity).toFixed(12).replace(/\.?0+$/, ""),
      });
      continue;
    }

    await stripe.invoiceItems.create({
      customer: params.customerId,
      invoice: inv.id,
      amount: lineTotalCents, // dollars -> cents
      currency: "usd",
      description: item.description,
    });
  }

  if (params.finalize === false && !params.send) {
    const draft = await stripe.invoices.retrieve(inv.id, { expand: ["customer"] });
    return mapInvoice(draft);
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
  const current = await stripe.invoices.retrieve(invoiceId);
  const invoiceToSend = current.status === "draft"
    ? await stripe.invoices.finalizeInvoice(invoiceId)
    : current;
  const inv = await stripe.invoices.sendInvoice(invoiceToSend.id);
  return mapInvoice(inv);
}

export async function voidInvoice(invoiceId: string): Promise<BillingInvoice> {
  const inv = await stripe.invoices.voidInvoice(invoiceId);
  return mapInvoice(inv);
}

export async function updateInvoice(invoiceId: string, params: {
  description?: string | null;
  dueDate?: number | null;
  daysUntilDue?: number | null;
  collectionMethod?: Stripe.InvoiceUpdateParams.CollectionMethod;
}): Promise<BillingInvoice> {
  const current = await stripe.invoices.retrieve(invoiceId);
  if (current.status === "paid" || current.status === "void" || current.status === "uncollectible") {
    throw new Error("Paid, void, or uncollectible invoices cannot be edited.");
  }

  const collectionMethod = params.collectionMethod ?? current.collection_method;
  const updated = await stripe.invoices.update(invoiceId, {
    ...(params.description !== undefined ? { description: params.description ?? "" } : {}),
    ...(collectionMethod ? { collection_method: collectionMethod } : {}),
    ...(collectionMethod === "send_invoice" && params.dueDate !== undefined && params.dueDate !== null
      ? { due_date: params.dueDate }
      : {}),
    ...(collectionMethod === "send_invoice" && params.daysUntilDue !== undefined && params.daysUntilDue !== null
      ? { days_until_due: params.daysUntilDue }
      : {}),
  });

  return mapInvoice(updated);
}

export async function replaceInvoice(invoiceId: string, params: {
  description?: string;
  lineItems: { description: string; amount: number; quantity?: number }[];
  daysUntilDue?: number;
  dueDate?: number;
  collectionMethod?: Stripe.InvoiceCreateParams.CollectionMethod;
  send?: boolean;
  voidOriginal?: boolean;
}): Promise<{ replacement: BillingInvoice; original?: BillingInvoice }> {
  const current = await stripe.invoices.retrieve(invoiceId);
  if (current.status === "paid" || current.status === "void" || current.status === "uncollectible") {
    throw new Error("Paid, void, or uncollectible invoices cannot be replaced.");
  }

  const customerId =
    typeof current.customer === "string"
      ? current.customer
      : (current.customer as Stripe.Customer | null)?.id;
  if (!customerId) throw new Error("Invoice has no customer.");

  const replacement = await createInvoice({
    customerId,
    description: params.description ?? current.description ?? undefined,
    lineItems: params.lineItems,
    daysUntilDue: params.daysUntilDue,
    dueDate: params.dueDate,
    collectionMethod: params.collectionMethod ?? current.collection_method ?? "send_invoice",
    send: params.send,
  });

  let original: BillingInvoice | undefined;
  if (params.voidOriginal && (current.status === "open" || current.status === "draft")) {
    if (current.status === "draft") {
      await stripe.invoices.del(invoiceId);
    } else {
      original = await voidInvoice(invoiceId);
    }
  }

  return { replacement, original };
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
    // Stripe caps property expansion at 4 levels, so "data.items.data.price.product"
    // (5 levels) is rejected — expand to price only and resolve product names below.
    expand: ["data.customer", "data.default_payment_method", "data.items.data.price"],
  });

  const productIds = Array.from(
    new Set(
      result.data.flatMap((sub) =>
        sub.items.data
          .map((item) => item.price.product)
          .filter((product): product is string => typeof product === "string")
      )
    )
  );
  const products = await Promise.all(productIds.map((id) => stripe.products.retrieve(id)));
  const productNames = Object.fromEntries(products.map((p) => [p.id, p.name ?? null]));

  const subscriptions: BillingSubscription[] = result.data.map((sub) => mapSubscription(sub, productNames));

  return { subscriptions, hasMore: result.has_more };
}

export async function getSubscription(subscriptionId: string): Promise<BillingSubscription | null> {
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["customer", "default_payment_method", "items.data.price.product"],
    });
    return mapSubscription(sub);
  } catch {
    return null;
  }
}

export async function createSubscription(params: {
  customerId: string;
  productName: string;
  amount: number;
  currency?: string;
  interval: "day" | "week" | "month" | "year";
  intervalCount?: number;
  billingCycleAnchor?: number;
  collectionMethod?: Stripe.SubscriptionCreateParams.CollectionMethod;
  daysUntilDue?: number;
  description?: string;
}): Promise<BillingSubscription> {
  const collectionMethod = params.collectionMethod ?? "charge_automatically";
  const product = await stripe.products.create({
    name: params.productName,
    ...(params.description ? { description: params.description } : {}),
  });
  const sub = await stripe.subscriptions.create({
    customer: params.customerId,
    collection_method: collectionMethod,
    ...(collectionMethod === "send_invoice" ? { days_until_due: params.daysUntilDue ?? 30 } : {}),
    ...(params.billingCycleAnchor ? { billing_cycle_anchor: params.billingCycleAnchor } : {}),
    ...(collectionMethod === "charge_automatically" ? { payment_behavior: "default_incomplete" } : {}),
    proration_behavior: "none",
    metadata: params.description ? { description: params.description } : undefined,
    items: [
      {
        price_data: {
          currency: params.currency ?? "usd",
          product: product.id,
          unit_amount: Math.round(params.amount * 100),
          recurring: {
            interval: params.interval,
            interval_count: Math.max(1, Math.round(params.intervalCount ?? 1)),
          },
        },
      },
    ],
    expand: ["customer", "default_payment_method", "items.data.price.product"],
  });

  return mapSubscription(sub);
}

export async function updateSubscription(subscriptionId: string, params: {
  productName?: string;
  amount?: number;
  currency?: string;
  interval?: "day" | "week" | "month" | "year";
  intervalCount?: number;
  billingCycleAnchor?: number;
  collectionMethod?: Stripe.SubscriptionUpdateParams.CollectionMethod;
  daysUntilDue?: number | null;
  cancelAtPeriodEnd?: boolean;
}): Promise<BillingSubscription> {
  const current = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price.product"],
  });
  const firstItem = current.items.data[0];
  const currentPrice = firstItem?.price;
  const currentProduct =
    typeof currentPrice?.product === "object" && currentPrice.product !== null
      ? (currentPrice.product as Stripe.Product)
      : null;
  const shouldReplacePrice =
    params.amount !== undefined ||
    params.interval !== undefined ||
    params.intervalCount !== undefined ||
    params.productName !== undefined;

  const updateParams: Stripe.SubscriptionUpdateParams = {
    proration_behavior: "none",
    ...(params.collectionMethod !== undefined ? { collection_method: params.collectionMethod } : {}),
    ...(params.daysUntilDue !== undefined ? { days_until_due: params.daysUntilDue ?? undefined } : {}),
    ...(params.cancelAtPeriodEnd !== undefined ? { cancel_at_period_end: params.cancelAtPeriodEnd } : {}),
    expand: ["customer", "default_payment_method", "items.data.price.product"],
  };

  if (params.billingCycleAnchor) {
    (updateParams as unknown as Record<string, unknown>).billing_cycle_anchor = params.billingCycleAnchor;
  }

  if (shouldReplacePrice && firstItem) {
    const product = await stripe.products.create({
      name: params.productName ?? currentProduct?.name ?? "Recurring service",
    });
    const amountCents = params.amount !== undefined
      ? Math.round(params.amount * 100)
      : currentPrice?.unit_amount ?? 0;
    updateParams.items = [
      {
        id: firstItem.id,
        price_data: {
          currency: params.currency ?? currentPrice?.currency ?? "usd",
          product: product.id,
          unit_amount: amountCents,
          recurring: {
            interval: params.interval ?? currentPrice?.recurring?.interval ?? "month",
            interval_count: Math.max(
              1,
              Math.round(params.intervalCount ?? currentPrice?.recurring?.interval_count ?? 1)
            ),
          },
        },
      } as unknown as Stripe.SubscriptionUpdateParams.Item,
    ];
  }

  const updated = await stripe.subscriptions.update(subscriptionId, updateParams);
  return mapSubscription(updated);
}

export async function cancelSubscription(subscriptionId: string, params?: {
  atPeriodEnd?: boolean;
}): Promise<BillingSubscription> {
  if (params?.atPeriodEnd) {
    return updateSubscription(subscriptionId, { cancelAtPeriodEnd: true });
  }

  const canceled = await stripe.subscriptions.cancel(subscriptionId, {
    expand: ["customer", "default_payment_method", "items.data.price.product"],
  });
  return mapSubscription(canceled);
}

export async function createCustomerAutoPaySetupLink(params: {
  customerId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; id: string }> {
  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: params.customerId,
    payment_method_types: ["card"],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  if (!session.url) throw new Error("Stripe did not return a setup URL.");
  return { id: session.id, url: session.url };
}

// ─── Balance & Payouts ────────────────────────────────────────────────────────

export async function getBalance(): Promise<BillingBalance> {
  const balance = await stripe.balance.retrieve();
  return {
    available: balance.available.map((b) => ({
      amount: b.amount,
      currency: b.currency,
      sourceTypes: normalizeSourceTypes(b.source_types),
    })),
    instantAvailable: (balance.instant_available ?? []).map((b) => ({
      amount: b.amount,
      currency: b.currency,
      sourceTypes: normalizeSourceTypes(b.source_types),
    })),
    pending: balance.pending.map((b) => ({
      amount: b.amount,
      currency: b.currency,
      sourceTypes: normalizeSourceTypes(b.source_types),
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

export async function createPayout(params: {
  amount: number;
  currency?: string;
  method?: Stripe.PayoutCreateParams.Method;
  sourceType?: Stripe.PayoutCreateParams.SourceType;
  description?: string;
  statementDescriptor?: string;
}): Promise<CreatedBillingPayout> {
  const payout = await stripe.payouts.create({
    amount: Math.round(params.amount * 100),
    currency: params.currency ?? "usd",
    ...(params.method ? { method: params.method } : {}),
    ...(params.sourceType ? { source_type: params.sourceType } : {}),
    ...(params.description ? { description: params.description } : {}),
    ...(params.statementDescriptor
      ? { statement_descriptor: params.statementDescriptor.slice(0, 22) }
      : {}),
  });

  return {
    id: payout.id,
    amount: payout.amount,
    currency: payout.currency,
    arrivalDate: payout.arrival_date,
    status: payout.status,
    description: payout.description ?? null,
    created: payout.created,
    method: payout.method,
    destination:
      typeof payout.destination === "string"
        ? payout.destination
        : payout.destination?.id ?? null,
  };
}
