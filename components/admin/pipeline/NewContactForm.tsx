"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const DEFAULT_STAGES = [
  { id: "new-lead", name: "New Lead" },
  { id: "contacted", name: "Contacted" },
  { id: "proposal", name: "Proposal Sent" },
  { id: "negotiating", name: "Negotiating" },
  { id: "won", name: "Won" },
  { id: "lost", name: "Lost" },
];

const SOURCE_OPTIONS = ["Referral", "Website", "LinkedIn", "Cold Outreach", "Event", "Other"];

export default function NewContactForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStage = searchParams.get("stage") || "new-lead";

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    source: "",
    notes: "",
    owner: "",
    estimatedValue: "",
    stage: initialStage,
    createStripeCustomer: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/pipeline/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          company: form.company.trim() || null,
          source: form.source || null,
          notes: form.notes.trim() || null,
          owner: form.owner.trim() || null,
          estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : null,
          stage: form.stage,
          createStripeCustomer: form.createStripeCustomer,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create contact");
      }

      const contact = await res.json();
      router.push(`/admin/pipeline/contacts/${contact._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label className="block text-xs text-white/50 mb-1.5">Name <span className="text-red-400">*</span></label>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Full name"
          className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
          required
        />
      </div>

      {/* Email + Phone */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="email@example.com"
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+1 555 000 0000"
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Company */}
      <div>
        <label className="block text-xs text-white/50 mb-1.5">Company</label>
        <input
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
          placeholder="Company name"
          className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
        />
      </div>

      {/* Source + Stage */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Source</label>
          <select
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 [color-scheme:dark]"
          >
            <option value="">— None —</option>
            {SOURCE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Initial Stage</label>
          <select
            value={form.stage}
            onChange={(e) => setForm({ ...form, stage: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 [color-scheme:dark]"
          >
            {DEFAULT_STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Owner + Estimated Value */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Owner</label>
          <input
            value={form.owner}
            onChange={(e) => setForm({ ...form, owner: e.target.value })}
            placeholder="Name or email"
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1.5">Estimated Value ($)</label>
          <input
            type="number"
            min={0}
            value={form.estimatedValue}
            onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
            placeholder="0"
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs text-white/50 mb-1.5">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Any initial notes…"
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors resize-none"
        />
      </div>

      <label className="flex items-start gap-3 p-4 rounded-xl bg-white/3 border border-white/8">
        <input
          type="checkbox"
          checked={form.createStripeCustomer}
          onChange={(e) => setForm({ ...form, createStripeCustomer: e.target.checked })}
          className="mt-0.5 w-4 h-4 rounded accent-sky-400"
        />
        <span>
          <span className="block text-sm text-white">Create and link a Stripe customer</span>
          <span className="block text-xs text-white/35 mt-1">
            Turn this client into a Stripe customer immediately so invoices and payments stay connected.
          </span>
        </span>
      </label>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href="/admin/pipeline"
          className="text-sm text-white/40 hover:text-white transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saving || !form.name.trim()}
          className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-black font-semibold text-sm transition-colors"
        >
          {saving ? "Creating…" : "Create Contact"}
        </button>
      </div>
    </form>
  );
}
