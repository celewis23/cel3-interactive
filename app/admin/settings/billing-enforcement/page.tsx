"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Settings = {
  autoSuspendEnabled: boolean;
  daysLateThreshold: number;
  updatedAt: string | null;
  updatedBy: string | null;
};

export default function BillingEnforcementSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [days, setDays] = useState("14");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/billing-enforcement/config", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setSettings(data);
        setEnabled(data.autoSuspendEnabled);
        setDays(String(data.daysLateThreshold));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const daysLateThreshold = Number(days);
    if (!Number.isFinite(daysLateThreshold) || daysLateThreshold < 1) {
      setError("Days late must be a positive number");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/billing-enforcement/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoSuspendEnabled: enabled, daysLateThreshold }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to save settings");
      setSettings(data);
      setSuccess("Settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/settings" className="text-sm text-white/40 hover:text-white/70">← Settings</Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">Website suspension for non-payment</h1>
        <p className="mt-1 text-sm text-white/40">
          Automatically suspend a client&apos;s website (blocks their admin console login and puts their site
          into maintenance mode) once an invoice has been overdue this many days. You can still suspend or
          restore any individual client manually from their contact page regardless of this setting.
        </p>
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
        {loading ? (
          <div className="h-20 animate-pulse rounded-xl bg-white/5" />
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 accent-sky-500"
              />
              <span className="text-sm text-white">Automatically suspend overdue clients&apos; websites</span>
            </label>

            <div>
              <label className="mb-1.5 block text-xs text-white/50">Days late before suspension</label>
              <input
                type="number"
                min={1}
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="w-full max-w-[160px] rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-sky-500/50"
              />
              <p className="mt-1.5 text-[11px] text-white/30">
                Checked once daily. A client is exempt if you&apos;ve turned on &ldquo;auto-suspend exempt&rdquo; on
                their contact record.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-sky-400 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>

            {settings?.updatedAt && (
              <p className="text-[11px] text-white/25">
                Last updated {new Date(settings.updatedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                {settings.updatedBy ? ` by ${settings.updatedBy}` : ""}
              </p>
            )}
          </form>
        )}

        {error && <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        {success && <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{success}</div>}
      </div>
    </div>
  );
}
