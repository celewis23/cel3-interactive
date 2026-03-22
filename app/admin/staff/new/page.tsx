"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Role {
  _id: string;
  name: string;
  slug: string;
}

export default function InviteStaffPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleSlug, setRoleSlug] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/roles")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setRoles(list);
        // Default to "staff" role if available
        const staff = list.find((r: Role) => r.slug === "staff");
        if (staff) setRoleSlug(staff.slug);
        else if (list.length > 0) setRoleSlug(list[0].slug);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), roleSlug }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to send invite");
        return;
      }
      setDone({ name: name.trim(), email: email.trim() });
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-lg space-y-6">
        <div>
          <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Staff</div>
          <h1 className="text-2xl font-bold text-white">Invite Sent</h1>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-5 py-4">
          <div className="text-emerald-400 font-medium mb-1">Invite sent to {done.name}</div>
          <div className="text-sm text-emerald-400/70">{done.email}</div>
        </div>
        <p className="text-sm text-white/50">
          They will receive an email with a link to set up their account. The invite expires in 7 days.
        </p>
        <div className="flex gap-3">
          <Link
            href="/admin/staff"
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium transition-colors"
          >
            Back to Staff
          </Link>
          <button
            onClick={() => { setDone(null); setName(""); setEmail(""); }}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors"
          >
            Invite Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Staff</div>
        <h1 className="text-2xl font-bold text-white">Invite Team Member</h1>
      </div>

      <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Jane Smith"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-sky-400/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="jane@example.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-sky-400/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
              Role *
            </label>
            <select
              value={roleSlug}
              onChange={(e) => setRoleSlug(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400/50 appearance-none"
            >
              <option value="" className="bg-[#0f0f0f]">Select a role…</option>
              {roles.map((r) => (
                <option key={r._id} value={r.slug} className="bg-[#0f0f0f]">{r.name}</option>
              ))}
            </select>
            {roles.length === 0 && (
              <p className="text-xs text-yellow-400/70 mt-1">
                No roles found.{" "}
                <Link href="/admin/roles" className="underline">Seed default roles first</Link>.
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || !roleSlug}
              className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              {saving ? "Sending…" : "Send Invite"}
            </button>
            <Link
              href="/admin/staff"
              className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
