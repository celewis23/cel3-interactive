"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Role {
  _id: string;
  name: string;
  slug: string;
  isSystem: boolean;
  _createdAt: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string[] | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/roles")
      .then((r) => r.json())
      .then((d) => setRoles(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function seedDefaults() {
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/roles/seed", { method: "POST" });
      const d = await res.json();
      setSeedResult(d.results ?? []);
      load();
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Staff</div>
          <h1 className="text-2xl font-bold text-white">Roles & Permissions</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={seedDefaults}
            disabled={seeding}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors border border-white/8 disabled:opacity-50"
          >
            {seeding ? "Seeding…" : "Seed Default Roles"}
          </button>
          <Link
            href="/admin/staff"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors border border-white/8"
          >
            ← Staff
          </Link>
        </div>
      </div>

      {seedResult && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-400 space-y-1">
          {seedResult.map((r, i) => <div key={i}>{r}</div>)}
        </div>
      )}

      {loading ? (
        <div className="text-white/40 text-sm text-center py-12">Loading…</div>
      ) : roles.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-white/40 text-sm">No roles defined yet.</p>
          <button
            onClick={seedDefaults}
            disabled={seeding}
            className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {seeding ? "Seeding…" : "Seed Default Roles"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <Link
              key={role._id}
              href={`/admin/roles/${role._id}`}
              className="bg-white/3 border border-white/8 hover:border-sky-500/30 rounded-2xl p-5 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-white font-semibold group-hover:text-sky-400 transition-colors">
                  {role.name}
                </div>
                {role.isSystem && (
                  <span className="px-2 py-0.5 bg-white/5 text-white/30 text-xs rounded-full border border-white/8">
                    system
                  </span>
                )}
              </div>
              <div className="text-xs text-white/30 font-mono">{role.slug}</div>
              <div className="mt-3 text-xs text-sky-400 group-hover:text-sky-300 transition-colors">
                Edit permissions →
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
