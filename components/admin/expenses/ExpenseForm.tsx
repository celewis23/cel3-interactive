"use client";

import { useState, useEffect, useRef } from "react";

export type ExpenseCategory = {
  _id: string;
  name: string;
  color: string;
  taxRelevant: boolean;
  isDefault?: boolean;
};

export type Expense = {
  _id: string;
  date: string;
  amountCents: number;
  currency: string;
  vendor: string;
  categoryId?: string | null;
  description?: string | null;
  paymentMethod: string;
  taxDeductible: boolean;
  clientName?: string | null;
  projectId?: string | null;
  notes?: string | null;
  receipts?: { _key: string; name: string; url?: string | null; driveFileId?: string | null; uploadedAt: string }[];
};

interface Props {
  expense?: Expense | null;
  categories: ExpenseCategory[];
  onSave: (expense: Expense) => void;
  onClose: () => void;
}

const PAYMENT_METHODS = [
  { value: "card",          label: "Credit/Debit Card" },
  { value: "cash",          label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "check",         label: "Check" },
  { value: "other",         label: "Other" },
];

export default function ExpenseForm({ expense, categories, onSave, onClose }: Props) {
  const isEdit = !!expense;

  const [date,          setDate]          = useState(expense?.date ?? new Date().toISOString().slice(0, 10));
  const [amountStr,     setAmountStr]     = useState(expense ? (expense.amountCents / 100).toFixed(2) : "");
  const [currency,      setCurrency]      = useState(expense?.currency ?? "USD");
  const [vendor,        setVendor]        = useState(expense?.vendor ?? "");
  const [categoryId,    setCategoryId]    = useState(expense?.categoryId ?? "");
  const [description,   setDescription]  = useState(expense?.description ?? "");
  const [paymentMethod, setPaymentMethod] = useState(expense?.paymentMethod ?? "card");
  const [taxDeductible, setTaxDeductible] = useState(expense?.taxDeductible ?? false);
  const [clientName,    setClientName]    = useState(expense?.clientName ?? "");
  const [notes,         setNotes]         = useState(expense?.notes ?? "");
  const [receipts,      setReceipts]      = useState(expense?.receipts ?? []);
  const [saving,        setSaving]        = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-set taxDeductible based on category
  useEffect(() => {
    const cat = categories.find((c) => c._id === categoryId);
    if (cat) setTaxDeductible(cat.taxRelevant);
  }, [categoryId, categories]);

  async function handleSave() {
    if (!date || !vendor.trim() || !amountStr) return;
    const amountCents = Math.round(parseFloat(amountStr) * 100);
    if (isNaN(amountCents) || amountCents <= 0) return;

    setSaving(true);
    try {
      const body = { date, amountCents, currency, vendor: vendor.trim(), categoryId: categoryId || null,
        description: description.trim() || null, paymentMethod, taxDeductible,
        clientName: clientName.trim() || null, notes: notes.trim() || null };

      const url = isEdit ? `/api/admin/expenses/${expense._id}` : "/api/admin/expenses";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json() as Expense;
      onSave({ ...saved, receipts });
    } catch {
      alert("Failed to save expense.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!isEdit || !expense) {
      alert("Save the expense first, then attach receipts.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/expenses/${expense._id}/receipt`, { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const receipt = await res.json();
      setReceipts((prev) => [...prev, receipt]);
    } catch {
      alert("Failed to upload receipt.");
    } finally {
      setUploadingFile(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleRemoveReceipt(key: string) {
    if (!isEdit || !expense) return;
    try {
      await fetch(`/api/admin/expenses/${expense._id}/receipt`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      setReceipts((prev) => prev.filter((r) => r._key !== key));
    } catch {
      alert("Failed to remove receipt.");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70">
      <div className="w-full sm:max-w-lg bg-[#111] border border-white/10 rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[92dvh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
          <h2 className="text-sm font-semibold text-white">{isEdit ? "Edit Expense" : "New Expense"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Date + Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50" />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Amount</label>
              <div className="flex gap-1">
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white outline-none focus:border-sky-500/50 w-20">
                  {["USD","EUR","GBP","CAD","AUD"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="number" step="0.01" min="0" placeholder="0.00" value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50" />
              </div>
            </div>
          </div>

          {/* Vendor */}
          <div>
            <label className="block text-xs text-white/40 mb-1">Vendor / Payee</label>
            <input type="text" placeholder="e.g. Adobe, AWS, Starbucks" value={vendor} onChange={(e) => setVendor(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50" />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs text-white/40 mb-1">Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50">
              <option value="">— Select category —</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-xs text-white/40 mb-1">Payment Method</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50">
              {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-white/40 mb-1">Description</label>
            <input type="text" placeholder="Optional short description" value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50" />
          </div>

          {/* Client / Project */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/40 mb-1">Client</label>
              <input type="text" placeholder="Optional" value={clientName} onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50" />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Notes</label>
              <input type="text" placeholder="Optional" value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50" />
            </div>
          </div>

          {/* Tax deductible toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setTaxDeductible(!taxDeductible)}
              className={`relative w-9 h-5 rounded-full transition-colors ${taxDeductible ? "bg-sky-500" : "bg-white/15"}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${taxDeductible ? "translate-x-4" : "translate-x-0"}`} />
            </div>
            <span className="text-sm text-white/70">Tax deductible</span>
          </label>

          {/* Receipts */}
          {isEdit && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/40">Receipts</span>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingFile}
                  className="text-xs text-sky-400 hover:text-sky-300 transition-colors disabled:opacity-40"
                >
                  {uploadingFile ? "Uploading…" : "+ Attach"}
                </button>
                <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
              </div>
              {receipts.length === 0 ? (
                <p className="text-xs text-white/20">No receipts attached</p>
              ) : (
                <div className="space-y-1">
                  {receipts.map((r) => (
                    <div key={r._key} className="flex items-center gap-2 bg-white/3 border border-white/8 rounded-lg px-3 py-2">
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-white/30 flex-shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25" />
                      </svg>
                      {r.url ? (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-xs text-sky-400 hover:text-sky-300 truncate">{r.name}</a>
                      ) : (
                        <span className="flex-1 text-xs text-white/50 truncate">{r.name}</span>
                      )}
                      <button onClick={() => handleRemoveReceipt(r._key)} className="text-white/20 hover:text-red-400 transition-colors">
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-white/8 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-white/60 hover:text-white hover:border-white/25 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !date || !vendor.trim() || !amountStr}
            className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-sm font-semibold text-black transition-colors"
          >
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Expense"}
          </button>
        </div>
      </div>
    </div>
  );
}
