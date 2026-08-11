"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Status = {
  configured: boolean;
  baseUrl?: string;
  keyMasked?: string;
  connectedAt?: string;
};

export default function MeterwiseSettingsPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadStatus() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/meterwise/config", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setStatus(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!baseUrl.trim() || !apiKey.trim()) {
      setError("Base URL and API key are both required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/meterwise/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to connect to Meterwise");
      setStatus(data);
      setApiKey("");
      setSuccess("Meterwise connected.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to Meterwise");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    setError("");
    setSuccess("");
    setDisconnecting(true);
    try {
      const res = await fetch("/api/admin/meterwise/config", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to disconnect");
      setStatus({ configured: false });
      setBaseUrl("");
      setApiKey("");
      setSuccess("Meterwise disconnected.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/settings" className="text-sm text-white/40 hover:text-white/70">← Settings</Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">Meterwise</h1>
        <p className="mt-1 text-sm text-white/40">Connect Meterwise to see its dashboard in the backoffice. Nothing from Meterwise is stored here — data is fetched live on each visit.</p>
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
        {loading ? (
          <div className="h-20 animate-pulse rounded-xl bg-white/5" />
        ) : status?.configured ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-sm font-medium text-white">Connected</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs text-white/40">Base URL</div>
                <div className="mt-1 text-sm text-white/80">{status.baseUrl}</div>
              </div>
              <div>
                <div className="text-xs text-white/40">API key</div>
                <div className="mt-1 font-mono text-sm text-white/80">{status.keyMasked}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/15 disabled:opacity-50"
            >
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs text-white/50">Meterwise base URL</label>
              <input
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder="https://api.meterwise.io"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-sky-500/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-white/50">API key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="Paste your Meterwise API key"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-sky-500/50"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-sky-400 disabled:opacity-50"
            >
              {saving ? "Connecting..." : "Connect"}
            </button>
          </form>
        )}

        {error && <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        {success && <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{success}</div>}
      </div>
    </div>
  );
}
