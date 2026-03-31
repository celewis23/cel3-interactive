"use client";

import { useState } from "react";

type PortalProfile = {
  displayName: string;
  company: string | null;
  email: string;
  phone: string | null;
  addressLine1: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressPostalCode: string | null;
  addressCountry: string | null;
};

export default function PortalSettingsClient({ initialProfile }: { initialProfile: PortalProfile }) {
  const [form, setForm] = useState({
    displayName: initialProfile.displayName,
    email: initialProfile.email,
    phone: initialProfile.phone ?? "",
    addressLine1: initialProfile.addressLine1 ?? "",
    addressCity: initialProfile.addressCity ?? "",
    addressState: initialProfile.addressState ?? "",
    addressPostalCode: initialProfile.addressPostalCode ?? "",
    addressCountry: initialProfile.addressCountry ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function setField<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/portal/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({})) as { error?: string; displayName?: string; email?: string; phone?: string | null; addressLine1?: string | null; addressCity?: string | null; addressState?: string | null; addressPostalCode?: string | null; addressCountry?: string | null };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to update profile");
      }

      setForm((prev) => ({
        ...prev,
        displayName: data.displayName ?? prev.displayName,
        email: data.email ?? prev.email,
        phone: data.phone ?? "",
        addressLine1: data.addressLine1 ?? "",
        addressCity: data.addressCity ?? "",
        addressState: data.addressState ?? "",
        addressPostalCode: data.addressPostalCode ?? "",
        addressCountry: data.addressCountry ?? "",
      }));
      setSuccess("Your profile has been updated everywhere it is linked.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-white/40 mt-1">Update your contact details for your portal account, billing profile, and connected contact records.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-5">
        {initialProfile.company && (
          <div className="rounded-xl bg-white/4 border border-white/8 px-4 py-3">
            <p className="text-xs text-white/35 mb-1">Business</p>
            <p className="text-sm text-white">{initialProfile.company}</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Display name</label>
            <input
              value={form.displayName}
              onChange={(e) => setField("displayName", e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Phone number</label>
            <input
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              type="tel"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-white/50 mb-1.5 block">Email address</label>
            <input
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              type="email"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-white/50 mb-1.5 block">Street address</label>
            <input
              value={form.addressLine1}
              onChange={(e) => setField("addressLine1", e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">City</label>
            <input
              value={form.addressCity}
              onChange={(e) => setField("addressCity", e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">State / Region</label>
            <input
              value={form.addressState}
              onChange={(e) => setField("addressState", e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Postal code</label>
            <input
              value={form.addressPostalCode}
              onChange={(e) => setField("addressPostalCode", e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Country</label>
            <input
              value={form.addressCountry}
              onChange={(e) => setField("addressCountry", e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black font-semibold text-sm transition-colors"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
