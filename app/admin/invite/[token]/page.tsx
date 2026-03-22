"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

interface InviteInfo {
  name: string;
  email: string;
  roleName: string;
}

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/staff/accept-invite?token=${token}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json();
          setError(d.error || "Invalid or expired invite");
        } else {
          setInfo(await r.json());
        }
      })
      .catch(() => setError("Something went wrong"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    if (password !== confirm) {
      setSaveError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setSaveError("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/staff/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const d = await res.json();
        setSaveError(d.error || "Failed to accept invite");
        return;
      }
      router.push("/admin");
    } catch {
      setSaveError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-xs tracking-widest uppercase text-sky-400 mb-2">Backoffice</div>
          <h1 className="text-2xl font-semibold text-white">CEL3 Interactive</h1>
          <p className="text-sm text-white/40 mt-1">Set up your account</p>
        </div>

        {loading && (
          <div className="text-center text-white/40 text-sm">Validating invite…</div>
        )}

        {!loading && error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-4 text-sm text-red-400 text-center">
            {error}
          </div>
        )}

        {!loading && info && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-sm">
              <div className="text-white/50 mb-1">Invited as</div>
              <div className="text-white font-medium">{info.name}</div>
              <div className="text-white/40">{info.email} · {info.roleName}</div>
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1.5 tracking-wide uppercase">
                Password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-sky-400/60 transition-colors"
                placeholder="At least 8 characters"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5 tracking-wide uppercase">
                Confirm Password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-sky-400/60 transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            {saveError && (
              <p className="text-sm text-red-400 text-center">{saveError}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              {saving ? "Setting up…" : "Create account & sign in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
