"use client";

import { useState, useEffect, useCallback } from "react";
import { MODULES } from "@/lib/admin/permissions";

type PermissionMap = { [module: string]: { [action: string]: boolean } };

interface Role {
  _id: string;
  name: string;
  slug: string;
  isSystem: boolean;
  permissions: PermissionMap;
}

const MODULE_LABELS: Record<string, string> = {
  dashboard:       "Dashboard",
  clients:         "Clients",
  leads:           "Leads / Pipeline",
  projects:        "Projects",
  timeTracking:    "Time Tracking",
  billing:         "Billing",
  invoices:        "Invoices",
  estimates:       "Estimates",
  contracts:       "Contracts",
  email:           "Email",
  calendar:        "Calendar",
  drive:           "Drive",
  forms:           "Forms",
  photos:          "Photos",
  chat:            "Chat",
  meet:            "Meet / Video",
  onboarding:      "Onboarding",
  analytics:       "Analytics",
  staffManagement: "Staff Management",
  auditLog:        "Audit Log",
  settings:        "Settings",
};

interface Props {
  role: Role;
  onSaved?: (role: Role) => void;
  onCancel?: () => void;
}

export default function RoleEditor({ role, onSaved, onCancel }: Props) {
  const [name, setName] = useState(role.name);
  const [perms, setPerms] = useState<PermissionMap>(() => {
    // Ensure all modules/actions are present
    const p: PermissionMap = {};
    for (const [mod, actions] of Object.entries(MODULES)) {
      p[mod] = {};
      for (const action of actions as readonly string[]) {
        p[mod][action] = role.permissions?.[mod]?.[action] ?? false;
      }
    }
    return p;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(mod: string, action: string) {
    setPerms((prev) => ({
      ...prev,
      [mod]: { ...prev[mod], [action]: !prev[mod][action] },
    }));
  }

  function setAllForModule(mod: string, value: boolean) {
    setPerms((prev) => ({
      ...prev,
      [mod]: Object.fromEntries(Object.keys(prev[mod]).map((a) => [a, value])),
    }));
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = { permissions: perms };
      if (!role.isSystem) body.name = name.trim();

      const res = await fetch(`/api/admin/roles/${role._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to save");
        return;
      }
      const updated = await res.json();
      if (onSaved) onSaved(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Role name */}
      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
          Role Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={role.isSystem}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400/50 disabled:opacity-40"
        />
        {role.isSystem && (
          <p className="text-xs text-white/30 mt-1">System role names cannot be changed.</p>
        )}
      </div>

      {/* Permission matrix */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3">Permissions</div>

        <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
          {Object.entries(MODULES).map(([mod, actions], i) => {
            const allOn = (actions as readonly string[]).every((a) => perms[mod]?.[a]);
            const someOn = (actions as readonly string[]).some((a) => perms[mod]?.[a]);
            return (
              <div key={mod} className={`flex items-center gap-4 px-5 py-3 ${i > 0 ? "border-t border-white/5" : ""}`}>
                {/* Module toggle (all/none) */}
                <button
                  onClick={() => setAllForModule(mod, !allOn)}
                  className={`flex-shrink-0 w-9 h-5 rounded-full transition-colors relative ${
                    allOn ? "bg-sky-500" : someOn ? "bg-sky-500/40" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      allOn ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/80">{MODULE_LABELS[mod] ?? mod}</div>
                </div>

                {/* Per-action checkboxes */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {(actions as readonly string[]).map((action) => (
                    <label key={action} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={perms[mod]?.[action] ?? false}
                        onChange={() => toggle(mod, action)}
                        className="h-3.5 w-3.5 rounded border-white/30 text-sky-500 focus:ring-sky-500"
                      />
                      <span className="text-xs text-white/40 capitalize">{action}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          {saving ? "Saving…" : "Save Role"}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
