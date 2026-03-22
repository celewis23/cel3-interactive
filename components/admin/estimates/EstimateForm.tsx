"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type LineItem = {
  _key: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
};

type Estimate = {
  _id: string;
  number: string;
  date: string;
  expiryDate: string;
  status: string;
  clientName: string;
  clientEmail: string | null;
  clientCompany: string | null;
  pipelineContactId: string | null;
  stripeCustomerId: string | null;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountType: "percent" | "fixed" | null;
  discountValue: number | null;
  discountAmount: number;
  total: number;
  notes: string | null;
  currency: string;
  approvalToken: string;
  stripeInvoiceId: string | null;
};

type Contact = {
  _id: string;
  name: string;
  email: string | null;
  company: string | null;
};

type Props = {
  estimate?: Estimate;
  contacts: Contact[];
};

function randomKey() {
  return Math.random().toString(36).slice(2);
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount || 0);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function in30Days() {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default function EstimateForm({ estimate, contacts }: Props) {
  const router = useRouter();
  const isEditing = !!estimate;

  const [clientName, setClientName] = useState(estimate?.clientName ?? "");
  const [clientEmail, setClientEmail] = useState(estimate?.clientEmail ?? "");
  const [clientCompany, setClientCompany] = useState(estimate?.clientCompany ?? "");
  const [pipelineContactId, setPipelineContactId] = useState(estimate?.pipelineContactId ?? "");
  const [date, setDate] = useState(estimate?.date ?? todayStr());
  const [expiryDate, setExpiryDate] = useState(estimate?.expiryDate ?? in30Days());
  const [status, setStatus] = useState(estimate?.status ?? "draft");
  const [notes, setNotes] = useState(estimate?.notes ?? "");
  const [taxRate, setTaxRate] = useState(estimate?.taxRate ?? 0);
  const [discountType, setDiscountType] = useState<"percent" | "fixed" | "">(
    estimate?.discountType ?? ""
  );
  const [discountValue, setDiscountValue] = useState(estimate?.discountValue ?? 0);
  const [lineItems, setLineItems] = useState<LineItem[]>(
    estimate?.lineItems?.length
      ? estimate.lineItems
      : [{ _key: randomKey(), description: "", quantity: 1, rate: 0, amount: 0 }]
  );

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: boolean; approvalLink: string; error?: string } | null>(null);

  const [duplicating, setDuplicating] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertResult, setConvertResult] = useState<{ invoiceId: string; hostedInvoiceUrl: string | null } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Computed totals
  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.rate, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const discountAmount =
    discountType === "percent"
      ? subtotal * (discountValue / 100)
      : discountType === "fixed"
      ? discountValue
      : 0;
  const total = subtotal + taxAmount - discountAmount;

  const updateLineItem = useCallback(
    (key: string, field: keyof LineItem, value: string | number) => {
      setLineItems((prev) =>
        prev.map((item) => {
          if (item._key !== key) return item;
          const updated = { ...item, [field]: value };
          updated.amount = updated.quantity * updated.rate;
          return updated;
        })
      );
    },
    []
  );

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { _key: randomKey(), description: "", quantity: 1, rate: 0, amount: 0 },
    ]);
  };

  const removeLineItem = (key: string) => {
    setLineItems((prev) => prev.filter((i) => i._key !== key));
  };

  const handleContactSelect = (contactId: string) => {
    setPipelineContactId(contactId);
    if (!contactId) return;
    const contact = contacts.find((c) => c._id === contactId);
    if (!contact) return;
    setClientName(contact.name);
    setClientEmail(contact.email ?? "");
    setClientCompany(contact.company ?? "");
  };

  const buildPayload = () => ({
    clientName,
    clientEmail: clientEmail || null,
    clientCompany: clientCompany || null,
    pipelineContactId: pipelineContactId || null,
    date,
    expiryDate,
    status,
    notes: notes || null,
    taxRate,
    discountType: discountType || null,
    discountValue: discountValue || null,
    lineItems: lineItems.map((item) => ({
      _key: item._key,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.quantity * item.rate,
    })),
    subtotal,
    taxAmount,
    discountAmount,
    total,
    currency: "usd",
  });

  async function handleSave() {
    if (!clientName.trim()) {
      setSaveError("Client name is required.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      if (isEditing) {
        const res = await fetch(`/api/admin/estimates/${estimate._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error ?? "Save failed");
        }
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const res = await fetch("/api/admin/estimates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error ?? "Create failed");
        }
        const created = await res.json();
        router.push(`/admin/estimates/${created._id}`);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch(`/api/admin/estimates/${estimate!._id}/send`, {
        method: "POST",
      });
      const data = await res.json();
      setSendResult(data);
    } catch {
      setSendResult({ sent: false, approvalLink: "", error: "Request failed" });
    } finally {
      setSending(false);
    }
  }

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/admin/estimates/${estimate!._id}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Duplicate failed");
      const created = await res.json();
      router.push(`/admin/estimates/${created._id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Duplicate failed");
    } finally {
      setDuplicating(false);
    }
  }

  async function handleConvert() {
    setConverting(true);
    setConvertResult(null);
    try {
      const res = await fetch(`/api/admin/estimates/${estimate!._id}/convert`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Convert failed");
      setConvertResult(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Convert failed");
    } finally {
      setConverting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this estimate? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/estimates/${estimate!._id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      router.push("/admin/estimates");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Edit-mode action bar */}
      {isEditing && (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-4 flex flex-wrap gap-3 items-center">
          <button
            onClick={handleSend}
            disabled={sending}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send to Client"}
          </button>

          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            className="px-4 py-2 rounded-xl border border-white/10 hover:border-white/20 text-white/60 hover:text-white text-sm transition-colors disabled:opacity-50"
          >
            {duplicating ? "Duplicating..." : "Duplicate"}
          </button>

          {estimate.status === "approved" && (
            <button
              onClick={handleConvert}
              disabled={converting || !!estimate.stripeInvoiceId}
              className="px-4 py-2 rounded-xl border border-white/10 hover:border-white/20 text-white/60 hover:text-white text-sm transition-colors disabled:opacity-50"
            >
              {converting
                ? "Converting..."
                : estimate.stripeInvoiceId
                ? "Invoice Created"
                : "Convert to Invoice"}
            </button>
          )}

          <Link
            href={`/admin/estimates/${estimate._id}/print`}
            target="_blank"
            className="px-4 py-2 rounded-xl border border-white/10 hover:border-white/20 text-white/60 hover:text-white text-sm transition-colors"
          >
            Print / PDF
          </Link>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm transition-colors disabled:opacity-50 ml-auto"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      )}

      {/* Send result */}
      {sendResult && (
        <div className={`rounded-2xl p-4 text-sm ${sendResult.sent ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
          {sendResult.sent ? (
            <div>Email sent successfully.</div>
          ) : (
            <div className="mb-2">Email failed{sendResult.error ? `: ${sendResult.error}` : ""}. Copy the approval link below:</div>
          )}
          {sendResult.approvalLink && (
            <div className="mt-2 bg-black/20 rounded-lg px-3 py-2 font-mono text-xs break-all text-white/70 select-all">
              {sendResult.approvalLink}
            </div>
          )}
        </div>
      )}

      {/* Convert result */}
      {convertResult && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl p-4 text-sm">
          Stripe invoice created: {convertResult.invoiceId}
          {convertResult.hostedInvoiceUrl && (
            <a
              href={convertResult.hostedInvoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 underline"
            >
              View invoice
            </a>
          )}
        </div>
      )}

      {/* Client info */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Client Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {contacts.length > 0 && (
            <div className="sm:col-span-2">
              <label className="block text-xs text-white/50 mb-1.5">Import from Pipeline</label>
              <select
                value={pipelineContactId}
                onChange={(e) => handleContactSelect(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors [color-scheme:dark]"
              >
                <option value="">— select contact —</option>
                {contacts.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}{c.company ? ` — ${c.company}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs text-white/50 mb-1.5">Client Name *</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Full name"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1.5">Email</label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="client@example.com"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1.5">Company</label>
            <input
              type="text"
              value={clientCompany}
              onChange={(e) => setClientCompany(e.target.value)}
              placeholder="Company name"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Dates + Status */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 transition-colors [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Expiry Date</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 transition-colors [color-scheme:dark]"
            />
          </div>
          {isEditing && (
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 transition-colors [color-scheme:dark]"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="viewed">Viewed</option>
                <option value="approved">Approved</option>
                <option value="declined">Declined</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Line Items</h2>
        <div className="space-y-2">
          {/* Header row */}
          <div className="hidden sm:grid grid-cols-[1fr_80px_112px_112px_36px] gap-2 text-xs text-white/40 px-1">
            <span>Description</span>
            <span className="text-center">Qty</span>
            <span className="text-right">Rate</span>
            <span className="text-right">Amount</span>
            <span />
          </div>

          {lineItems.map((item) => (
            <div key={item._key} className="grid grid-cols-[1fr_80px_112px_112px_36px] gap-2 items-center">
              <input
                type="text"
                value={item.description}
                onChange={(e) => updateLineItem(item._key, "description", e.target.value)}
                placeholder="Description"
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
              />
              <input
                type="number"
                value={item.quantity}
                min={0}
                onChange={(e) => updateLineItem(item._key, "quantity", parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 transition-colors text-center"
              />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">$</span>
                <input
                  type="number"
                  value={item.rate}
                  min={0}
                  step={0.01}
                  onChange={(e) => updateLineItem(item._key, "rate", parseFloat(e.target.value) || 0)}
                  className="w-full pl-6 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 transition-colors text-right"
                />
              </div>
              <div className="px-3 py-2.5 text-white/60 text-sm text-right">
                {formatCurrency(item.quantity * item.rate)}
              </div>
              <button
                onClick={() => removeLineItem(item._key)}
                disabled={lineItems.length === 1}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-0"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          <button
            onClick={addLineItem}
            className="text-sm text-sky-400 hover:text-sky-300 transition-colors mt-2"
          >
            + Add line item
          </button>
        </div>

        {/* Totals */}
        <div className="mt-6 border-t border-white/8 pt-4 flex justify-end">
          <div className="min-w-[260px] space-y-2">
            <div className="flex justify-between text-sm text-white/60">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-white/60 whitespace-nowrap">Tax %</label>
              <input
                type="number"
                value={taxRate}
                min={0}
                max={100}
                step={0.1}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 transition-colors text-right"
              />
              <span className="text-sm text-white/40 ml-auto">{formatCurrency(taxAmount)}</span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed" | "")}
                className="text-sm px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white outline-none focus:border-sky-500/50 transition-colors [color-scheme:dark]"
              >
                <option value="">No discount</option>
                <option value="percent">% off</option>
                <option value="fixed">$ off</option>
              </select>
              {discountType && (
                <input
                  type="number"
                  value={discountValue}
                  min={0}
                  step={0.01}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 transition-colors text-right"
                />
              )}
              {discountType && (
                <span className="text-sm text-white/40 ml-auto">-{formatCurrency(discountAmount)}</span>
              )}
            </div>

            <div className="flex justify-between text-base font-semibold text-white border-t border-white/10 pt-2">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes for the client..."
          rows={4}
          className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors resize-none"
        />
      </div>

      {/* Save / Cancel */}
      {saveError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl p-3">
          {saveError}
        </div>
      )}
      {saveSuccess && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-xl p-3">
          Saved successfully.
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-semibold text-sm transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Estimate"}
        </button>
        <Link
          href="/admin/estimates"
          className="px-4 py-2 rounded-xl border border-white/10 hover:border-white/20 text-white/60 hover:text-white text-sm transition-colors"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
