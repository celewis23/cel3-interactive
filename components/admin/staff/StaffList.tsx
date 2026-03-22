"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface StaffMember {
  _id: string;
  name: string;
  email: string;
  roleSlug: string;
  status: "active" | "inactive" | "pending";
  joinedAt: string;
  lastActiveAt: string | null;
  inviteToken: string | null;
  inviteExpiry: string | null;
  inviteAcceptedAt: string | null;
}

interface Role {
  _id: string;
  name: string;
  slug: string;
}

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-emerald-500/10 text-emerald-400",
  inactive: "bg-white/5 text-white/40",
  pending:  "bg-yellow-500/10 text-yellow-400",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export default function StaffList() {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "pending">("all");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/staff").then((r) => r.json()),
      fetch("/api/admin/roles").then((r) => r.json()),
    ])
      .then(([m, r]) => {
        setMembers(Array.isArray(m) ? m : []);
        setRoles(Array.isArray(r) ? r : []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const roleName = (slug: string) => roles.find((r) => r.slug === slug)?.name ?? slug;

  async function resendInvite(id: string) {
    setResendingId(id);
    try {
      const res = await fetch(`/api/admin/staff/${id}/resend-invite`, { method: "POST" });
      if (res.ok) alert("Invite resent!");
      else { const d = await res.json(); alert(d.error || "Failed"); }
    } finally {
      setResendingId(null);
    }
  }

  async function toggleStatus(member: StaffMember) {
    const newStatus = member.status === "active" ? "inactive" : "active";
    const res = await fetch(`/api/admin/staff/${member._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setMembers((prev) => prev.map((m) => m._id === member._id ? { ...m, status: newStatus } : m));
    } else {
      const d = await res.json();
      alert(d.error || "Failed");
    }
    setConfirmDeactivate(null);
  }

  const filtered = statusFilter === "all" ? members : members.filter((m) => m.status === statusFilter);

  if (loading) {
    return <div className="text-white/40 text-sm text-center py-12">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "active", "inactive", "pending"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-colors ${
              statusFilter === s
                ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                : "bg-white/3 text-white/40 hover:text-white border border-white/8"
            }`}
          >
            {s} {s !== "all" && `(${members.filter((m) => m.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-white/30 text-sm">No staff members found.</div>
      ) : (
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8">
                <th className="text-left px-5 py-3 text-xs text-white/40 uppercase tracking-wider font-medium">Name</th>
                <th className="text-left px-5 py-3 text-xs text-white/40 uppercase tracking-wider font-medium hidden sm:table-cell">Role</th>
                <th className="text-left px-5 py-3 text-xs text-white/40 uppercase tracking-wider font-medium hidden md:table-cell">Joined</th>
                <th className="text-left px-5 py-3 text-xs text-white/40 uppercase tracking-wider font-medium hidden lg:table-cell">Last active</th>
                <th className="text-left px-5 py-3 text-xs text-white/40 uppercase tracking-wider font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={m._id} className={i > 0 ? "border-t border-white/5" : ""}>
                  <td className="px-5 py-4">
                    <Link href={`/admin/staff/${m._id}`} className="hover:text-sky-400 transition-colors">
                      <div className="text-white font-medium">{m.name}</div>
                      <div className="text-white/40 text-xs mt-0.5">{m.email}</div>
                    </Link>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <span className="text-white/60">{roleName(m.roleSlug)}</span>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell text-white/40">
                    {formatDate(m.joinedAt)}
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell text-white/40">
                    {m.lastActiveAt ? formatRelative(m.lastActiveAt) : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[m.status]}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {m.status === "pending" && (
                        <button
                          onClick={() => resendInvite(m._id)}
                          disabled={resendingId === m._id}
                          className="text-xs text-sky-400 hover:text-sky-300 disabled:opacity-50 transition-colors"
                        >
                          {resendingId === m._id ? "Sending…" : "Resend invite"}
                        </button>
                      )}
                      {m.status !== "pending" && (
                        confirmDeactivate === m._id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/40">
                              {m.status === "active" ? "Deactivate?" : "Reactivate?"}
                            </span>
                            <button
                              onClick={() => toggleStatus(m)}
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeactivate(null)}
                              className="text-xs text-white/40 hover:text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeactivate(m._id)}
                            className={`text-xs transition-colors ${
                              m.status === "active"
                                ? "text-white/30 hover:text-red-400"
                                : "text-white/30 hover:text-emerald-400"
                            }`}
                          >
                            {m.status === "active" ? "Deactivate" : "Reactivate"}
                          </button>
                        )
                      )}
                      <Link
                        href={`/admin/staff/${m._id}`}
                        className="text-xs text-white/30 hover:text-white transition-colors"
                      >
                        View →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
