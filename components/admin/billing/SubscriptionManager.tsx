"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import type { BillingSubscription } from "@/lib/stripe/billing";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-400/50";
const labelClass = "mb-1.5 block text-xs font-medium text-white/50";

type PipelineContact = {
  _id: string;
  name: string;
  email: string | null;
  company: string | null;
  stripeCustomerId: string | null;
};

function fmt(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function dateFromUnix(value: number) {
  return value ? new Date(value * 1000).toISOString().slice(0, 10) : "";
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-400",
    trialing: "bg-sky-500/20 text-sky-400",
    past_due: "bg-amber-500/20 text-amber-400",
    canceled: "bg-red-500/20 text-red-400",
    incomplete: "bg-amber-500/20 text-amber-400",
    incomplete_expired: "bg-red-500/20 text-red-400",
    unpaid: "bg-amber-500/20 text-amber-400",
    paused: "bg-white/10 text-white/40",
  };
  const cls = map[status] ?? "bg-white/10 text-white/40";
  return <span className={`rounded-full px-1.5 py-0.5 text-xs ${cls}`}>{status}</span>;
}

function SubscriptionEditor({ sub }: { sub: BillingSubscription }) {
  const router = useRouter();
  const firstItem = sub.items[0];
  const [productName, setProductName] = useState(firstItem?.productName ?? "Recurring service");
  const [amount, setAmount] = useState(firstItem ? (firstItem.amount / 100).toFixed(2) : "");
  const [interval, setInterval] = useState(firstItem?.interval ?? "month");
  const [intervalCount, setIntervalCount] = useState(String(firstItem?.intervalCount ?? 1));
  const [billingDate, setBillingDate] = useState(dateFromUnix(sub.currentPeriodEnd));
  const [collectionMethod, setCollectionMethod] = useState(sub.collectionMethod);
  const [daysUntilDue, setDaysUntilDue] = useState(String(sub.daysUntilDue ?? 30));
  const [loading, setLoading] = useState<"save" | "cancelPeriod" | "cancelNow" | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function save() {
    setError("");
    setMessage("");
    setLoading("save");
    try {
      const res = await fetch(`/api/admin/billing/subscriptions/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          amount,
          interval,
          intervalCount,
          billingDate,
          collectionMethod,
          daysUntilDue: collectionMethod === "send_invoice" ? daysUntilDue : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update subscription.");
        return;
      }
      setMessage("Subscription updated.");
      router.refresh();
    } catch {
      setError("Unexpected error updating subscription.");
    } finally {
      setLoading(null);
    }
  }

  async function cancel(atPeriodEnd: boolean) {
    const label = atPeriodEnd ? "schedule cancellation at period end" : "cancel this subscription immediately";
    if (!confirm(`Are you sure you want to ${label}?`)) return;
    setError("");
    setMessage("");
    setLoading(atPeriodEnd ? "cancelPeriod" : "cancelNow");
    try {
      const res = await fetch(
        `/api/admin/billing/subscriptions/${sub.id}?atPeriodEnd=${atPeriodEnd ? "true" : "false"}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to cancel subscription.");
        return;
      }
      setMessage(atPeriodEnd ? "Cancellation scheduled." : "Subscription canceled.");
      router.refresh();
    } catch {
      setError("Unexpected error canceling subscription.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
      <div className="grid gap-3 md:grid-cols-6">
        <div className="md:col-span-2">
          <label className={labelClass}>Name</label>
          <input value={productName} onChange={(e) => setProductName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Amount</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0.01" step="0.01" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Every</label>
          <input value={intervalCount} onChange={(e) => setIntervalCount(e.target.value)} type="number" min="1" step="1" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Frequency</label>
          <select value={interval} onChange={(e) => setInterval(e.target.value)} className={inputClass}>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
            <option value="day">Day</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Next billing date</label>
          <input value={billingDate} onChange={(e) => setBillingDate(e.target.value)} type="date" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Collection</label>
          <select
            value={collectionMethod}
            onChange={(e) => setCollectionMethod(e.target.value as BillingSubscription["collectionMethod"])}
            className={inputClass}
          >
            <option value="charge_automatically">Auto-pay</option>
            <option value="send_invoice">Send invoice</option>
          </select>
        </div>
        {collectionMethod === "send_invoice" && (
          <div>
            <label className={labelClass}>Days due</label>
            <input value={daysUntilDue} onChange={(e) => setDaysUntilDue(e.target.value)} type="number" min="1" max="365" className={inputClass} />
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={loading !== null}
          className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-400 disabled:opacity-50"
        >
          {loading === "save" ? "Saving..." : "Save changes"}
        </button>
        {!sub.cancelAtPeriodEnd && sub.status !== "canceled" && (
          <button
            type="button"
            onClick={() => cancel(true)}
            disabled={loading !== null}
            className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-2 text-sm text-amber-200 transition-colors hover:bg-amber-400/20 disabled:opacity-50"
          >
            {loading === "cancelPeriod" ? "Scheduling..." : "Cancel at period end"}
          </button>
        )}
        {sub.status !== "canceled" && (
          <button
            type="button"
            onClick={() => cancel(false)}
            disabled={loading !== null}
            className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
          >
            {loading === "cancelNow" ? "Canceling..." : "Cancel now"}
          </button>
        )}
      </div>
      {message && <p className="mt-3 text-xs text-emerald-400">{message}</p>}
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function NewSubscriptionForm() {
  const router = useRouter();
  const [contacts, setContacts] = useState<PipelineContact[]>([]);
  const [pipelineContactId, setPipelineContactId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [productName, setProductName] = useState("Monthly service");
  const [amount, setAmount] = useState("");
  const [interval, setInterval] = useState("month");
  const [intervalCount, setIntervalCount] = useState("1");
  const [billingDate, setBillingDate] = useState("");
  const [collectionMethod, setCollectionMethod] = useState("charge_automatically");
  const [daysUntilDue, setDaysUntilDue] = useState("30");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/pipeline/contacts")
      .then((res) => res.json())
      .then((data) => {
        const records: Array<Record<string, unknown>> = Array.isArray(data)
          ? data
          : Array.isArray(data?.contacts)
            ? data.contacts
            : [];
        if (!cancelled) {
          setContacts(
            records
              .map((contact) => ({
                _id: String(contact._id),
                name: String(contact.name ?? ""),
                email: typeof contact.email === "string" ? contact.email : null,
                company: typeof contact.company === "string" ? contact.company : null,
                stripeCustomerId:
                  typeof contact.stripeCustomerId === "string" ? contact.stripeCustomerId : null,
              }))
              .sort((a, b) => a.name.localeCompare(b.name))
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact._id === pipelineContactId) ?? null,
    [contacts, pipelineContactId]
  );

  async function createSubscription(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/billing/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pipelineContactId: pipelineContactId || undefined,
          customerId: customerId || undefined,
          productName,
          amount,
          interval,
          intervalCount,
          billingDate,
          collectionMethod,
          daysUntilDue,
          description,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create subscription.");
        return;
      }
      router.refresh();
      setAmount("");
      setDescription("");
    } catch {
      setError("Unexpected error creating subscription.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={createSubscription} className="mb-8 rounded-2xl border border-white/8 bg-white/3 p-5">
      <h2 className="text-sm font-medium text-white">New recurring payment</h2>
      <p className="mt-1 text-xs text-white/40">
        Use auto-pay when the customer has a saved payment method, or send each recurring invoice.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-6">
        <div className="md:col-span-2">
          <label className={labelClass}>Backoffice client</label>
          <select
            value={pipelineContactId}
            onChange={(e) => {
              const nextId = e.target.value;
              setPipelineContactId(nextId);
              const contact = contacts.find((item) => item._id === nextId);
              setCustomerId(contact?.stripeCustomerId ?? "");
            }}
            className={inputClass}
          >
            <option value="">Select a client</option>
            {contacts.map((contact) => (
              <option key={contact._id} value={contact._id}>
                {contact.name}
                {contact.company ? ` - ${contact.company}` : ""}
                {contact.email ? ` (${contact.email})` : ""}
              </option>
            ))}
          </select>
          {selectedContact && (
            <p className="mt-1 text-xs text-white/30">
              {selectedContact.stripeCustomerId
                ? `Stripe customer: ${selectedContact.stripeCustomerId}`
                : "A Stripe customer will be created for this client."}
            </p>
          )}
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Stripe customer ID</label>
          <input value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="cus_xxx" className={inputClass} />
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Name</label>
          <input value={productName} onChange={(e) => setProductName(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Amount</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0.01" step="0.01" className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Every</label>
          <input value={intervalCount} onChange={(e) => setIntervalCount(e.target.value)} type="number" min="1" step="1" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Frequency</label>
          <select value={interval} onChange={(e) => setInterval(e.target.value)} className={inputClass}>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
            <option value="day">Day</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>First billing date</label>
          <input value={billingDate} onChange={(e) => setBillingDate(e.target.value)} type="date" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Collection</label>
          <select value={collectionMethod} onChange={(e) => setCollectionMethod(e.target.value)} className={inputClass}>
            <option value="charge_automatically">Auto-pay</option>
            <option value="send_invoice">Send invoice</option>
          </select>
        </div>
        {collectionMethod === "send_invoice" && (
          <div>
            <label className={labelClass}>Days due</label>
            <input value={daysUntilDue} onChange={(e) => setDaysUntilDue(e.target.value)} type="number" min="1" max="365" className={inputClass} />
          </div>
        )}
        <div className="md:col-span-6">
          <label className={labelClass}>Notes</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="mt-5 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-400 disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create recurring payment"}
      </button>
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
    </form>
  );
}

export default function SubscriptionManager({
  subscriptions,
  hasMore,
}: {
  subscriptions: BillingSubscription[];
  hasMore: boolean;
}) {
  return (
    <div>
      <NewSubscriptionForm />

      {subscriptions.length === 0 ? (
        <div className="rounded-2xl border border-white/8 bg-white/3 p-12 text-center">
          <p className="text-sm text-white/40">No subscriptions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="rounded-2xl border border-white/8 bg-white/3 p-5 transition-colors hover:border-white/15"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {sub.customerName ?? sub.customerEmail ?? sub.customerId}
                    </span>
                    <StatusBadge status={sub.status} />
                    {sub.cancelAtPeriodEnd && (
                      <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-400">
                        cancels at period end
                      </span>
                    )}
                  </div>
                  {sub.customerName && sub.customerEmail && (
                    <div className="mb-2 text-xs text-white/40">{sub.customerEmail}</div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sub.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/5 px-2.5 py-1"
                      >
                        <span className="text-xs text-white/70">
                          {item.productName ?? item.priceId}
                        </span>
                        <span className="text-xs text-white/30">·</span>
                        <span className="text-xs font-medium text-white">
                          {fmt(item.amount, item.currency)}/
                          {item.intervalCount > 1 ? `${item.intervalCount} ` : ""}
                          {item.interval}
                        </span>
                      </div>
                    ))}
                    <span className="rounded-lg border border-white/8 bg-white/5 px-2.5 py-1 text-xs text-white/50">
                      {sub.collectionMethod === "charge_automatically" ? "Auto-pay" : "Sends invoice"}
                    </span>
                    {sub.defaultPaymentMethodLast4 && (
                      <span className="rounded-lg border border-emerald-400/15 bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-300">
                        {sub.defaultPaymentMethodBrand} {sub.defaultPaymentMethodLast4}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="mb-1 text-xs text-white/40">Current period</div>
                  <div className="text-xs text-white/60">
                    {DateTime.fromSeconds(sub.currentPeriodStart).toFormat("LLL d")}
                    {" - "}
                    {DateTime.fromSeconds(sub.currentPeriodEnd).toFormat("LLL d, yyyy")}
                  </div>
                  {sub.canceledAt && (
                    <div className="mt-1 text-xs text-red-400">
                      Canceled {DateTime.fromSeconds(sub.canceledAt).toFormat("LLL d, yyyy")}
                    </div>
                  )}
                </div>
              </div>

              <SubscriptionEditor sub={sub} />

              <div className="mt-3 border-t border-white/5 pt-3">
                <span className="font-mono text-xs text-white/20">{sub.id}</span>
                <a
                  href={`https://dashboard.stripe.com/subscriptions/${sub.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-3 text-xs text-white/30 transition-colors hover:text-sky-400"
                >
                  View in Stripe
                </a>
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="py-2 text-center text-xs text-white/30">
              Showing first 20 subscriptions
            </div>
          )}
        </div>
      )}
    </div>
  );
}
