"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CLS_INPUT =
  "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-sky-400/50 transition-colors";
const CLS_LABEL = "block text-sm font-medium text-white mb-1.5";

type LineItem = { description: string; amount: string };
type PipelineContact = {
  _id: string;
  name: string;
  email: string | null;
  company: string | null;
  stripeCustomerId: string | null;
};

export default function NewInvoicePage() {
  const router = useRouter();

  const [contacts, setContacts] = useState<PipelineContact[]>([]);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [pipelineContactId, setPipelineContactId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [description, setDescription] = useState("");
  const [daysUntilDue, setDaysUntilDue] = useState(30);
  const [sendImmediately, setSendImmediately] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", amount: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successId, setSuccessId] = useState<string | null>(null);

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
        if (!cancelled && records.length) {
          setContacts(
            records
              .map((contact: Record<string, unknown>) => ({
                _id: String(contact._id),
                name: String(contact.name ?? ""),
                email: typeof contact.email === "string" ? contact.email : null,
                company: typeof contact.company === "string" ? contact.company : null,
                stripeCustomerId:
                  typeof contact.stripeCustomerId === "string" ? contact.stripeCustomerId : null,
              }))
              .sort((a: PipelineContact, b: PipelineContact) => a.name.localeCompare(b.name))
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setContactsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact._id === pipelineContactId) ?? null,
    [contacts, pipelineContactId]
  );

  function addLineItem() {
    setLineItems((prev) => [...prev, { description: "", amount: "" }]);
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLineItem(index: number, field: keyof LineItem, value: string) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!customerId.trim() && !pipelineContactId) {
      setError("Choose a backoffice client or enter a Stripe customer ID.");
      return;
    }
    if (lineItems.length === 0) {
      setError("At least one line item is required.");
      return;
    }
    for (const item of lineItems) {
      if (!item.description.trim()) {
        setError("All line items must have a description.");
        return;
      }
      if (!item.amount || isNaN(parseFloat(item.amount)) || parseFloat(item.amount) <= 0) {
        setError("All line items must have a valid positive amount.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/billing/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerId.trim() || undefined,
          pipelineContactId: pipelineContactId || undefined,
          description: description.trim() || undefined,
          daysUntilDue: Number(daysUntilDue),
          lineItems: lineItems.map((l) => ({
            description: l.description.trim(),
            amount: parseFloat(l.amount),
          })),
          send: sendImmediately,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? (res.status === 403 ? "You do not have permission to create invoices." : "Failed to create invoice."));
        return;
      }

      setSuccessId(data.id);
      // Navigate to the new invoice
      router.push(`/admin/billing/invoices/${data.id}`);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (successId) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="text-emerald-400 text-lg font-medium mb-2">Invoice created!</div>
        <Link
          href={`/admin/billing/invoices/${successId}`}
          className="text-sky-400 hover:text-sky-300 text-sm transition-colors"
        >
          View invoice
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/billing/invoices"
          className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors mb-4"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back
        </Link>
        <h1 className="text-2xl font-semibold text-white">New Invoice</h1>
        <p className="text-sm text-white/40 mt-1">Create and optionally send a Stripe invoice</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className={CLS_LABEL}>Backoffice Client</label>
          <select
            value={pipelineContactId}
            onChange={(e) => {
              const nextId = e.target.value;
              setPipelineContactId(nextId);
              const contact = contacts.find((item) => item._id === nextId);
              setCustomerId(contact?.stripeCustomerId ?? "");
            }}
            className={CLS_INPUT}
          >
            <option value="">Select a client (optional)</option>
            {contacts.map((contact) => (
              <option key={contact._id} value={contact._id}>
                {contact.name}
                {contact.company ? ` — ${contact.company}` : ""}
                {contact.email ? ` (${contact.email})` : ""}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-white/30">
            {selectedContact
              ? selectedContact.stripeCustomerId
                ? `Linked Stripe customer: ${selectedContact.stripeCustomerId}`
                : "No Stripe customer linked yet. One will be created automatically when you create the invoice."
              : contactsLoaded
              ? "Choose a backoffice client to keep the invoice tied to your shared client record."
              : "Loading backoffice clients..."}
          </p>
        </div>

        {/* Customer ID */}
        <div>
          <label className={CLS_LABEL}>Stripe Customer ID</label>
          <input
            type="text"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="cus_xxx"
            className={CLS_INPUT}
            required={!pipelineContactId}
          />
          <p className="mt-1.5 text-xs text-white/30">
            Enter a Stripe customer directly, or choose a backoffice client above and let the system keep the linkage for you. You can still use{" "}
            <Link href="/admin/billing/customers" className="text-sky-400 hover:text-sky-300">
              All Customers
            </Link>
          </p>
        </div>

        {/* Description */}
        <div>
          <label className={CLS_LABEL}>
            Description{" "}
            <span className="text-white/30 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Q1 2025 retainer"
            className={CLS_INPUT}
          />
        </div>

        {/* Days until due */}
        <div>
          <label className={CLS_LABEL}>Days Until Due</label>
          <input
            type="number"
            value={daysUntilDue}
            onChange={(e) => setDaysUntilDue(Number(e.target.value))}
            min={1}
            max={365}
            className={CLS_INPUT}
          />
        </div>

        {/* Line items */}
        <div>
          <label className={CLS_LABEL}>Line Items</label>
          <div className="space-y-3">
            {lineItems.map((item, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-1">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateLineItem(index, "description", e.target.value)}
                    placeholder="Description"
                    className={CLS_INPUT}
                    required
                  />
                </div>
                <div className="w-32">
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-sm pointer-events-none">
                      $
                    </span>
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) => updateLineItem(index, "amount", e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0.01"
                      className={`${CLS_INPUT} pl-7`}
                      required
                    />
                  </div>
                </div>
                {lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    className="mt-0.5 p-3 text-white/30 hover:text-red-400 transition-colors rounded-xl border border-white/10 hover:border-red-500/30 hover:bg-red-500/5"
                    title="Remove line item"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addLineItem}
            className="mt-3 flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Line Item
          </button>
        </div>

        {/* Send immediately */}
        <div className="flex items-center gap-3 p-4 bg-white/3 border border-white/8 rounded-xl">
          <input
            type="checkbox"
            id="sendImmediately"
            checked={sendImmediately}
            onChange={(e) => setSendImmediately(e.target.checked)}
            className="w-4 h-4 rounded accent-sky-400"
          />
          <div>
            <label htmlFor="sendImmediately" className="text-sm text-white cursor-pointer">
              Send invoice immediately after creation
            </label>
            <p className="text-xs text-white/30 mt-0.5">
              The invoice will be emailed to the customer right away
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-6 py-3 rounded-xl transition-colors"
          >
            {submitting ? (
              <>
                <svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating...
              </>
            ) : (
              "Create Invoice"
            )}
          </button>
          <Link
            href="/admin/billing/invoices"
            className="text-sm text-white/40 hover:text-white transition-colors px-4 py-3"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
