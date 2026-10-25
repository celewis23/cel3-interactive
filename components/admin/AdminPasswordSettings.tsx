"use client";

import { useState } from "react";

export default function AdminPasswordSettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError(""); setSuccess("");
    if (newPassword !== confirmation) { setError("New passwords do not match."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/auth/password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not change your password.");
      setCurrentPassword(""); setNewPassword(""); setConfirmation("");
      setSuccess("Password updated. Use your new password the next time you sign in.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change your password.");
    } finally { setSaving(false); }
  }

  const inputClass = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/50";
  return (
    <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
      <h2 className="text-sm font-semibold text-white">Change password</h2>
      <p className="mt-1 text-sm text-white/45">Choose a unique password with at least 12 characters.</p>
      <form onSubmit={handleSubmit} className="mt-5 max-w-lg space-y-4">
        <div>
          <label htmlFor="current-password" className="mb-1.5 block text-xs text-white/50">Current password</label>
          <input id="current-password" type="password" autoComplete="current-password" required maxLength={1024} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} disabled={saving} className={inputClass} />
        </div>
        <div>
          <label htmlFor="new-password" className="mb-1.5 block text-xs text-white/50">New password</label>
          <input id="new-password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={saving} className={inputClass} />
        </div>
        <div>
          <label htmlFor="confirm-password" className="mb-1.5 block text-xs text-white/50">Confirm new password</label>
          <input id="confirm-password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={saving} className={inputClass} />
        </div>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {success && <p role="status" className="text-sm text-emerald-300">{success}</p>}
        <button type="submit" disabled={saving} className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-sky-400 disabled:opacity-50">{saving ? "Updating…" : "Update password"}</button>
      </form>
    </section>
  );
}
