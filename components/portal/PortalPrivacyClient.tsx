"use client";

import { useState } from "react";

export default function PortalPrivacyClient() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/portal/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to change password");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Your password has been updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Privacy</h1>
        <p className="text-sm text-white/40 mt-1">How your portal access and shared materials are handled.</p>
      </div>

      <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white mb-1">Account scope</h2>
          <p className="text-sm text-white/60">
            Your portal is scoped to your own account, projects, requests, invoices, files, and related records only.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white mb-1">Uploaded files</h2>
          <p className="text-sm text-white/60">
            Files you upload through the portal are stored in your dedicated shared Google Drive folder for your account.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white mb-1">Session security</h2>
          <p className="text-sm text-white/60">
            You can sign out at any time from the account menu. We also require a password change when temporary credentials are first issued.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Change password</h2>
          <p className="text-sm text-white/45 mt-1">Update your password without leaving the portal.</p>
        </div>

        <div>
          <label className="text-xs text-white/50 mb-1.5 block">Current password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1.5 block">New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1.5 block">Confirm new password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
          />
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
          {saving ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
