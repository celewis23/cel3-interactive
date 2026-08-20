"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Settings = {
  autoSuspendEnabled: boolean;
  firstNoticeDays: number;
  secondNoticeDays: number;
  finalNoticeDays: number;
  suspendDays: number;
  lateFeeCents: number;
  updatedAt: string | null;
  updatedBy: string | null;
};

export default function BillingEnforcementSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [firstNoticeDays, setFirstNoticeDays] = useState("1");
  const [secondNoticeDays, setSecondNoticeDays] = useState("5");
  const [finalNoticeDays, setFinalNoticeDays] = useState("10");
  const [suspendDays, setSuspendDays] = useState("11");
  const [lateFee, setLateFee] = useState("25");
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
        setFirstNoticeDays(String(data.firstNoticeDays));
        setSecondNoticeDays(String(data.secondNoticeDays));
        setFinalNoticeDays(String(data.finalNoticeDays));
        setSuspendDays(String(data.suspendDays));
        setLateFee(String(data.lateFeeCents / 100));
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
    setSaving(true);
    try {
      const res = await fetch("/api/admin/billing-enforcement/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoSuspendEnabled: enabled,
          firstNoticeDays: Number(firstNoticeDays),
          secondNoticeDays: Number(secondNoticeDays),
          finalNoticeDays: Number(finalNoticeDays),
          suspendDays: Number(suspendDays),
          lateFeeCents: Math.round(Number(lateFee) * 100),
        }),
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

  function dayInput(label: string, value: string, onChange: (v: string) => void, hint: string) {
    return (
      <div>
        <label className="mb-1.5 block text-xs text-white/50">{label}</label>
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full max-w-[120px] rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-sky-500/50"
        />
        <p className="mt-1 text-[11px] text-white/30">{hint}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/settings" className="text-sm text-white/40 hover:text-white/70">← Settings</Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">Overdue invoice collections</h1>
        <p className="mt-1 text-sm text-white/40">
          Checked once daily against each invoice&apos;s due date. Escalates through email reminders, a late
          fee, and finally suspends the client&apos;s website (blocks their admin console login and puts their
          site into maintenance mode). You can still suspend or restore any individual client manually from
          the Client Sites page or their contact record regardless of this setting, and a client can be
          exempted from auto-suspend via &ldquo;auto-suspend exempt&rdquo; on their contact record.
        </p>
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
        {loading ? (
          <div className="h-20 animate-pulse rounded-xl bg-white/5" />
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 accent-sky-500"
              />
              <span className="text-sm text-white">Run the collections sequence automatically</span>
            </label>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {dayInput("First notice", firstNoticeDays, setFirstNoticeDays, "Days past due — payment reminder email")}
              {dayInput("Late fee notice", secondNoticeDays, setSecondNoticeDays, "Days past due — 2nd email + late fee")}
              {dayInput("Interruption notice", finalNoticeDays, setFinalNoticeDays, "Days past due — final warning email")}
              {dayInput("Suspend", suspendDays, setSuspendDays, "Days past due — website actually suspended")}
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-white/50">Late fee amount ($)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={lateFee}
                onChange={(e) => setLateFee(e.target.value)}
                className="w-full max-w-[120px] rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-sky-500/50"
              />
              <p className="mt-1 text-[11px] text-white/30">
                Charged as a separate one-time Stripe invoice, sent when the late fee notice fires.
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
