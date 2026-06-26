"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BillingInvoice } from "@/lib/stripe/billing";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-400/50";
const labelClass = "mb-1.5 block text-xs font-medium text-white/50";

type LineItem = { description: string; amount: string; quantity: string };

function dateFromUnix(value: number | null) {
  if (!value) return "";
  return new Date(value * 1000).toISOString().slice(0, 10);
}

function dollars(cents: number) {
  return (cents / 100).toFixed(2);
}

export default function InvoiceManagementPanel({ invoice }: { invoice: BillingInvoice }) {
  const router = useRouter();
  const [description, setDescription] = useState(invoice.description ?? "");
  const [dueDate, setDueDate] = useState(dateFromUnix(invoice.dueDate));
  const [daysUntilDue, setDaysUntilDue] = useState("30");
  const [collectionMethod, setCollectionMethod] = useState(
    invoice.collectionMethod ?? "send_invoice"
  );
  const [lineItems, setLineItems] = useState<LineItem[]>(
    invoice.lines.length
      ? invoice.lines.map((line) => ({
          description: line.description ?? "",
          amount: dollars(line.amount),
          quantity: String(line.quantity ?? 1),
        }))
      : [{ description: "", amount: "", quantity: "1" }]
  );
  const [voidOriginal, setVoidOriginal] = useState(true);
  const [sendReplacement, setSendReplacement] = useState(false);
  const [loading, setLoading] = useState<"update" | "replace" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canManage =
    invoice.status !== "paid" &&
    invoice.status !== "void" &&
    invoice.status !== "uncollectible";

  function updateLine(index: number, field: keyof LineItem, value: string) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function addLine() {
    setLineItems((prev) => [...prev, { description: "", amount: "", quantity: "1" }]);
  }

  function removeLine(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  function normalizedLines() {
    return lineItems.map((item) => ({
      description: item.description.trim(),
      amount: Number(item.amount),
      quantity: Number(item.quantity) || 1,
    }));
  }

  async function updateInvoice() {
    setError("");
    setMessage("");
    setLoading("update");
    try {
      const res = await fetch(`/api/admin/billing/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          dueDate: collectionMethod === "send_invoice" ? dueDate || undefined : undefined,
          daysUntilDue:
            collectionMethod === "send_invoice" && !dueDate ? Number(daysUntilDue) : undefined,
          collectionMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update invoice.");
        return;
      }
      setMessage("Invoice settings updated.");
      router.refresh();
    } catch {
      setError("Unexpected error updating invoice.");
    } finally {
      setLoading(null);
    }
  }

  async function replaceInvoice() {
    if (!confirm("Create a replacement invoice with these line items?")) return;
    setError("");
    setMessage("");
    setLoading("replace");
    try {
      const res = await fetch(`/api/admin/billing/invoices/${invoice.id}/replace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          lineItems: normalizedLines(),
          dueDate: collectionMethod === "send_invoice" ? dueDate || undefined : undefined,
          daysUntilDue:
            collectionMethod === "send_invoice" && !dueDate ? Number(daysUntilDue) : undefined,
          collectionMethod,
          send: sendReplacement,
          voidOriginal,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to replace invoice.");
        return;
      }
      router.push(`/admin/billing/invoices/${data.replacement.id}`);
    } catch {
      setError("Unexpected error replacing invoice.");
    } finally {
      setLoading(null);
    }
  }

  if (!canManage) return null;

  return (
    <div className="mb-6 rounded-2xl border border-white/8 bg-white/3 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-medium text-white">Manage invoice</h2>
          <p className="mt-1 text-xs leading-5 text-white/40">
            Update payment terms directly. To change the amount, create a replacement invoice and
            void the original when appropriate.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="md:col-span-3">
          <label className={labelClass}>Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Collection</label>
          <select
            value={collectionMethod}
            onChange={(e) =>
              setCollectionMethod(e.target.value as "charge_automatically" | "send_invoice")
            }
            className={inputClass}
          >
            <option value="send_invoice">Send invoice</option>
            <option value="charge_automatically">Auto-charge</option>
          </select>
        </div>
        {collectionMethod === "send_invoice" && (
          <>
            <div>
              <label className={labelClass}>Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Days until due</label>
              <input
                type="number"
                min={1}
                max={365}
                value={daysUntilDue}
                onChange={(e) => setDaysUntilDue(e.target.value)}
                className={inputClass}
              />
            </div>
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={updateInvoice}
          disabled={loading !== null}
          className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-400 disabled:opacity-50"
        >
          {loading === "update" ? "Saving..." : "Save invoice terms"}
        </button>
      </div>

      <div className="mt-6 border-t border-white/8 pt-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30">
          Replacement invoice amount
        </h3>
        <div className="mt-3 space-y-3">
          {lineItems.map((item, index) => (
            <div key={index} className="grid gap-3 sm:grid-cols-[1fr_120px_90px_auto]">
              <input
                value={item.description}
                onChange={(e) => updateLine(index, "description", e.target.value)}
                placeholder="Description"
                className={inputClass}
              />
              <input
                value={item.amount}
                onChange={(e) => updateLine(index, "amount", e.target.value)}
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Amount"
                className={inputClass}
              />
              <input
                value={item.quantity}
                onChange={(e) => updateLine(index, "quantity", e.target.value)}
                type="number"
                min="1"
                step="1"
                placeholder="Qty"
                className={inputClass}
              />
              {lineItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/50 transition-colors hover:border-red-500/30 hover:text-red-400"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addLine}
          className="mt-3 text-sm text-sky-400 transition-colors hover:text-sky-300"
        >
          Add line item
        </button>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/3 p-3 text-sm text-white/70">
            <input
              type="checkbox"
              checked={voidOriginal}
              onChange={(e) => setVoidOriginal(e.target.checked)}
              className="mt-1 h-4 w-4 accent-sky-400"
            />
            Void original invoice after creating replacement
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/3 p-3 text-sm text-white/70">
            <input
              type="checkbox"
              checked={sendReplacement}
              onChange={(e) => setSendReplacement(e.target.checked)}
              className="mt-1 h-4 w-4 accent-sky-400"
            />
            Send replacement immediately
          </label>
        </div>

        <button
          type="button"
          onClick={replaceInvoice}
          disabled={loading !== null}
          className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-400/20 disabled:opacity-50"
        >
          {loading === "replace" ? "Creating..." : "Create replacement invoice"}
        </button>
      </div>

      {message && <p className="mt-4 text-xs text-emerald-400">{message}</p>}
      {error && <p className="mt-4 text-xs text-red-400">{error}</p>}
    </div>
  );
}
