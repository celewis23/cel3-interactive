"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateCustomerForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createBackofficeClient, setCreateBackofficeClient] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", phone: "", description: "" });

  function reset() {
    setForm({ name: "", email: "", phone: "", description: "" });
    setCreateBackofficeClient(true);
    setError(null);
  }

  function close() {
    reset();
    setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/billing/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create customer");
        return;
      }
      if (createBackofficeClient) {
        const importRes = await fetch("/api/admin/pipeline/contacts/import-stripe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId: data.id }),
        });
        const importData = await importRes.json().catch(() => ({}));
        if (!importRes.ok) {
          setError(importData.error ?? "Stripe customer was created, but backoffice import failed.");
          return;
        }
      }
      close();
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        New Customer
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />

          {/* Modal */}
          <div className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <h2 className="text-base font-semibold text-white">New Customer</h2>
              <button onClick={close} className="text-white/40 hover:text-white transition-colors">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs text-white/50 mb-1.5">Name <span className="text-red-400">*</span></label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Acme Corp"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-sky-500/60 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="billing@acme.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-sky-500/60 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+1 555 000 0000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-sky-500/60 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1.5">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional note"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-sky-500/60 transition-colors"
                />
              </div>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/8">
                <input
                  type="checkbox"
                  checked={createBackofficeClient}
                  onChange={(e) => setCreateBackofficeClient(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-sky-400"
                />
                <span>
                  <span className="block text-sm text-white">Also create a backoffice client</span>
                  <span className="block text-xs text-white/35 mt-1">
                    Keeps the Stripe customer linked to pipeline, AI, and invoice records.
                  </span>
                </span>
              </label>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={close}
                  className="flex-1 bg-white/5 hover:bg-white/8 text-white/60 hover:text-white text-sm font-medium py-2 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-xl transition-colors"
                >
                  {loading ? "Creating…" : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
