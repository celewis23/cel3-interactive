"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import RoleEditor from "@/components/admin/staff/RoleEditor";

interface Role {
  _id: string;
  name: string;
  slug: string;
  isSystem: boolean;
  permissions: Record<string, Record<string, boolean>>;
}

export default function RoleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/roles/${id}`)
      .then((r) => r.json())
      .then((d) => { if (d._id) setRole(d); })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    setDeleteError(null);
    const res = await fetch(`/api/admin/roles/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/roles");
    else {
      const d = await res.json();
      setDeleteError(d.error || "Failed to delete");
      setConfirmDelete(false);
    }
  }

  if (loading) return <div className="text-white/40 text-sm py-12 text-center">Loading…</div>;
  if (!role) return <div className="text-red-400 text-sm py-12 text-center">Role not found.</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/roles" className="text-white/40 hover:text-white transition-colors text-sm">
          ← Roles
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Role</div>
          <h1 className="text-2xl font-bold text-white">{role.name}</h1>
          <div className="text-white/30 text-xs font-mono mt-1">{role.slug}</div>
        </div>
        <div className="flex items-center gap-2">
          {role.isSystem && (
            <span className="px-2.5 py-1 bg-white/5 text-white/30 text-xs rounded-full border border-white/8">
              system role
            </span>
          )}
        </div>
      </div>

      {saved && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-400">
          Role saved successfully.
        </div>
      )}

      <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
        <RoleEditor
          role={role}
          onSaved={(updated) => {
            setRole((prev) => prev ? { ...prev, ...updated } : prev);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
          }}
        />
      </div>

      {!role.isSystem && (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
          <div className="text-sm font-medium text-white/60 mb-3">Danger Zone</div>
          {deleteError && (
            <p className="text-sm text-red-400 mb-3">{deleteError}</p>
          )}
          {confirmDelete ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/50">Delete this role permanently?</span>
              <button onClick={handleDelete} className="text-sm text-red-400 hover:text-red-300">Confirm</button>
              <button onClick={() => setConfirmDelete(false)} className="text-sm text-white/40 hover:text-white">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm rounded-xl transition-colors"
            >
              Delete Role
            </button>
          )}
        </div>
      )}
    </div>
  );
}
