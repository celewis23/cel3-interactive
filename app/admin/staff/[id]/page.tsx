"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface StaffMember {
  _id: string;
  name: string;
  email: string;
  roleSlug: string;
  status: "active" | "inactive" | "pending";
  joinedAt: string;
  lastActiveAt: string | null;
  inviteAcceptedAt: string | null;
}

interface Role {
  _id: string;
  name: string;
  slug: string;
}

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  inactive: "bg-white/5 text-white/40 border-white/10",
  pending:  "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function StaffProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [member, setMember] = useState<StaffMember | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/staff/${id}`).then((r) => r.json()),
      fetch("/api/admin/roles").then((r) => r.json()),
    ]).then(([m, r]) => {
      if (m._id) {
        setMember(m);
        setEditName(m.name);
        setEditRole(m.roleSlug);
      }
      setRoles(Array.isArray(r) ? r : []);
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    if (!member) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/staff/${member._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), roleSlug: editRole }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to save");
        return;
      }
      const updated = await res.json();
      setMember((prev) => prev ? { ...prev, name: updated.name, roleSlug: updated.roleSlug } : prev);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    if (!member) return;
    const newStatus = member.status === "active" ? "inactive" : "active";
    const res = await fetch(`/api/admin/staff/${member._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) setMember((prev) => prev ? { ...prev, status: newStatus } : prev);
    else { const d = await res.json(); setError(d.error || "Failed"); }
  }

  async function handleDelete() {
    if (!member) return;
    const res = await fetch(`/api/admin/staff/${member._id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/staff");
    else { const d = await res.json(); setError(d.error || "Failed to delete"); setConfirmDelete(false); }
  }

  async function resendInvite() {
    if (!member) return;
    const res = await fetch(`/api/admin/staff/${member._id}/resend-invite`, { method: "POST" });
    if (res.ok) alert("Invite resent!");
    else { const d = await res.json(); alert(d.error || "Failed"); }
  }

  if (loading) return <div className="text-white/40 text-sm py-12 text-center">Loading…</div>;
  if (!member) return <div className="text-red-400 text-sm py-12 text-center">Staff member not found.</div>;

  const roleName = roles.find((r) => r.slug === member.roleSlug)?.name ?? member.roleSlug;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/staff" className="text-white/40 hover:text-white transition-colors text-sm">
          ← Staff
        </Link>
      </div>

      <div className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            {editing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-2xl font-bold text-white bg-white/5 border border-white/10 rounded-lg px-3 py-1 focus:outline-none focus:border-sky-400/50"
              />
            ) : (
              <h1 className="text-2xl font-bold text-white">{member.name}</h1>
            )}
            <div className="text-white/40 text-sm mt-1">{member.email}</div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize border ${STATUS_COLORS[member.status]}`}>
            {member.status}
          </span>
        </div>

        {/* Role */}
        <div>
          <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Role</div>
          {editing ? (
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-400/50 appearance-none"
            >
              {roles.map((r) => (
                <option key={r._id} value={r.slug} className="bg-[#0f0f0f]">{r.name}</option>
              ))}
            </select>
          ) : (
            <div className="text-white/70 text-sm">{roleName}</div>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/8">
          <div>
            <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Joined</div>
            <div className="text-sm text-white/70">{formatDate(member.joinedAt)}</div>
          </div>
          {member.lastActiveAt && (
            <div>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Last active</div>
              <div className="text-sm text-white/70">{formatDate(member.lastActiveAt)}</div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 border-t border-white/8 flex flex-wrap gap-3">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button
                onClick={() => { setEditing(false); setEditName(member.name); setEditRole(member.roleSlug); }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm rounded-xl transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm rounded-xl transition-colors"
              >
                Edit
              </button>
              {member.status === "pending" && (
                <button
                  onClick={resendInvite}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm rounded-xl transition-colors"
                >
                  Resend Invite
                </button>
              )}
              {member.status !== "pending" && (
                <button
                  onClick={toggleStatus}
                  className={`px-4 py-2 text-sm rounded-xl transition-colors ${
                    member.status === "active"
                      ? "bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400"
                      : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                  }`}
                >
                  {member.status === "active" ? "Deactivate" : "Reactivate"}
                </button>
              )}
              {confirmDelete ? (
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm text-white/40">Delete permanently?</span>
                  <button onClick={handleDelete} className="text-sm text-red-400 hover:text-red-300">Confirm</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-sm text-white/40 hover:text-white">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm rounded-xl transition-colors ml-auto"
                >
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
