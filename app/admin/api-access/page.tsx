"use client";

import { useEffect, useState } from "react";
import type { ExternalAppIntegration, AppType, Scope } from "@/lib/integrations/db";

type PortalUser = {
  _id: string;
  email: string;
  name: string | null;
  company: string | null;
  status: string;
};

type PageData = {
  integrations: ExternalAppIntegration[];
  portalUsers: PortalUser[];
  appTypes: readonly string[];
  scopes: readonly string[];
};

const SCOPE_LABELS: Record<string, string> = {
  "messaging:read": "Read messages",
  "messaging:write": "Send messages",
  "messaging:notifications:read": "Read notifications",
  "messaging:notifications:write": "Manage notifications",
  "conversations:read": "List conversations",
  "conversations:write": "Create conversations",
  "users:read:minimal": "Read user info",
};

const STATUS_STYLES = {
  active: "bg-emerald-500/15 text-emerald-300",
  revoked: "bg-red-500/15 text-red-300",
};

export default function ApiAccessPage() {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newSecret, setNewSecret] = useState<{ integrationId: string; secret: string; clientId: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/integrations");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function handleCreated(integration: ExternalAppIntegration, secret: string) {
    setData((prev) =>
      prev ? { ...prev, integrations: [integration, ...prev.integrations] } : prev
    );
    setNewSecret({ integrationId: integration.id, secret, clientId: integration.clientId });
    setShowCreate(false);
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this integration? The external app will immediately lose access.")) return;
    setActionLoading(id + "_revoke");
    try {
      const res = await fetch(`/api/admin/integrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to revoke");
      setData((prev) =>
        prev
          ? { ...prev, integrations: prev.integrations.map((i) => (i.id === id ? json.integration : i)) }
          : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRegenerate(id: string, clientId: string) {
    if (!confirm("Regenerate secret? The old secret will stop working immediately.")) return;
    setActionLoading(id + "_regen");
    try {
      const res = await fetch(`/api/admin/integrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to regenerate");
      setData((prev) =>
        prev
          ? { ...prev, integrations: prev.integrations.map((i) => (i.id === id ? json.integration : i)) }
          : prev
      );
      setNewSecret({ integrationId: id, secret: json.secret, clientId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">API Access</h1>
          <p className="mt-1 text-sm text-white/40">
            Issue credentials for external client admin consoles to access the messaging system securely.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="shrink-0 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-black hover:bg-sky-400 transition-colors"
        >
          New Integration
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* One-time secret reveal */}
      {newSecret && (
        <SecretReveal
          clientId={newSecret.clientId}
          secret={newSecret.secret}
          onDismiss={() => setNewSecret(null)}
        />
      )}

      {/* Create form */}
      {showCreate && data && (
        <CreateForm
          portalUsers={data.portalUsers}
          appTypes={data.appTypes}
          scopes={data.scopes}
          onCreated={handleCreated}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Integrations list */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="rounded-2xl border border-white/8 bg-white/3 p-6 text-sm text-white/40">
            Loading integrations…
          </div>
        ) : data?.integrations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/12 p-8 text-center text-sm text-white/30">
            No integrations yet. Create one to get started.
          </div>
        ) : (
          data?.integrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              actionLoading={actionLoading}
              onRevoke={handleRevoke}
              onRegenerate={handleRegenerate}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One-time secret reveal banner
// ---------------------------------------------------------------------------
function SecretReveal({
  clientId,
  secret,
  onDismiss,
}: {
  clientId: string;
  secret: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState<"clientId" | "secret" | null>(null);

  function copy(text: string, field: "clientId" | "secret") {
    void navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/8 p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-amber-300">
          Save these credentials now — the secret will not be shown again.
        </p>
        <button type="button" onClick={onDismiss} className="text-white/40 hover:text-white/70 text-xs">
          Dismiss
        </button>
      </div>
      <div className="space-y-3">
        <CredField
          label="Client ID"
          value={clientId}
          copied={copied === "clientId"}
          onCopy={() => copy(clientId, "clientId")}
        />
        <CredField
          label="Client Secret"
          value={secret}
          copied={copied === "secret"}
          onCopy={() => copy(secret, "secret")}
          sensitive
        />
      </div>
      <p className="mt-3 text-xs text-amber-300/60">
        The secret is hashed and stored. Once you dismiss this, it cannot be recovered. Use &quot;Regenerate&quot; to get a new one.
      </p>
    </div>
  );
}

function CredField({
  label,
  value,
  copied,
  onCopy,
  sensitive,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  sensitive?: boolean;
}) {
  const [reveal, setReveal] = useState(!sensitive);
  return (
    <div>
      <p className="text-xs text-white/40 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-lg bg-black/40 px-3 py-2 text-xs text-white/85 font-mono break-all">
          {reveal ? value : "•".repeat(Math.min(value.length, 40))}
        </code>
        {sensitive && (
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            className="text-xs text-white/40 hover:text-white/70 px-2"
          >
            {reveal ? "Hide" : "Show"}
          </button>
        )}
        <button
          type="button"
          onClick={onCopy}
          className="rounded-lg bg-white/8 px-3 py-2 text-xs text-white/60 hover:bg-white/12 hover:text-white transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Integration card
// ---------------------------------------------------------------------------
function IntegrationCard({
  integration,
  actionLoading,
  onRevoke,
  onRegenerate,
}: {
  integration: ExternalAppIntegration;
  actionLoading: string | null;
  onRevoke: (id: string) => Promise<void>;
  onRegenerate: (id: string, clientId: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const isActive = integration.isActive;

  return (
    <div className={`rounded-2xl border bg-white/3 ${isActive ? "border-white/8" : "border-white/5 opacity-65"}`}>
      <div className="flex flex-wrap items-center gap-3 p-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-white truncate">{integration.name}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${isActive ? STATUS_STYLES.active : STATUS_STYLES.revoked}`}>
              {isActive ? "Active" : "Revoked"}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/8 text-white/45">
              {integration.appType.replace(/([A-Z])/g, " $1").trim()}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-white/40">
            {integration.portalUserEmail ?? integration.portalUserId}
            {" · "}
            Created {new Date(integration.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {integration.lastUsedAt && (
              <> · Last used {new Date(integration.lastUsedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/50 hover:bg-white/8 hover:text-white/70 transition-colors"
          >
            {expanded ? "Hide details" : "Details"}
          </button>
          {isActive && (
            <>
              <button
                type="button"
                disabled={actionLoading === integration.id + "_regen"}
                onClick={() => void onRegenerate(integration.id, integration.clientId)}
                className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/50 hover:bg-white/8 hover:text-white/70 disabled:opacity-40 transition-colors"
              >
                {actionLoading === integration.id + "_regen" ? "…" : "Regenerate"}
              </button>
              <button
                type="button"
                disabled={actionLoading === integration.id + "_revoke"}
                onClick={() => void onRevoke(integration.id)}
                className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/18 disabled:opacity-40 transition-colors"
              >
                {actionLoading === integration.id + "_revoke" ? "…" : "Revoke"}
              </button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/6 px-5 pb-5 pt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-white/35 mb-1.5">Client ID</p>
            <code className="block rounded-lg bg-black/30 px-3 py-2 text-xs font-mono text-white/70 break-all">
              {integration.clientId}
            </code>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-white/35 mb-1.5">Scopes</p>
            <div className="flex flex-wrap gap-1.5">
              {integration.scopes.map((s) => (
                <span key={s} className="rounded-full bg-sky-500/12 px-2 py-0.5 text-[11px] text-sky-300">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-white/35 mb-1.5">Allowed Origins</p>
            {integration.allowedOrigins.length === 0 ? (
              <p className="text-xs text-white/30">None configured</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {integration.allowedOrigins.map((o) => (
                  <span key={o} className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-white/55">
                    {o}
                  </span>
                ))}
              </div>
            )}
          </div>
          {integration.revokedAt && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/35 mb-1.5">Revoked At</p>
              <p className="text-xs text-red-300">
                {new Date(integration.revokedAt).toLocaleString("en-US")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create form
// ---------------------------------------------------------------------------
function CreateForm({
  portalUsers,
  appTypes,
  scopes,
  onCreated,
  onCancel,
}: {
  portalUsers: PortalUser[];
  appTypes: readonly string[];
  scopes: readonly string[];
  onCreated: (integration: ExternalAppIntegration, secret: string) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    appType: "ClientAdminPortal" as AppType,
    portalUserId: "",
    allowedOrigins: "",
    selectedScopes: ["messaging:read", "messaging:write", "conversations:read", "conversations:write"] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleScope(scope: string) {
    setForm((prev) => ({
      ...prev,
      selectedScopes: prev.selectedScopes.includes(scope)
        ? prev.selectedScopes.filter((s) => s !== scope)
        : [...prev.selectedScopes, scope],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const origins = form.allowedOrigins
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/admin/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          appType: form.appType,
          portalUserId: form.portalUserId,
          allowedOrigins: origins,
          allowedRedirectUrls: null,
          scopes: form.selectedScopes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      onCreated(data.integration, data.secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create integration");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-sky-500/25 bg-sky-500/5 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">New Integration</h2>
        <button type="button" onClick={onCancel} className="text-sm text-white/40 hover:text-white/70">
          Cancel
        </button>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs text-white/50">App name</label>
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="My Client Dashboard"
            required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/20 focus:border-sky-500/50"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-white/50">App type</label>
          <select
            value={form.appType}
            onChange={(e) => setForm((p) => ({ ...p, appType: e.target.value as AppType }))}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/50 [color-scheme:dark]"
          >
            {appTypes.map((t) => (
              <option key={t} value={t}>{t.replace(/([A-Z])/g, " $1").trim()}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs text-white/50">Portal user (client this integration belongs to)</label>
          <select
            value={form.portalUserId}
            onChange={(e) => setForm((p) => ({ ...p, portalUserId: e.target.value }))}
            required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/50 [color-scheme:dark]"
          >
            <option value="">— Select a portal user —</option>
            {portalUsers.map((u) => (
              <option key={u._id} value={u._id}>
                {u.email}{u.name ? ` (${u.name})` : ""}{u.company ? ` — ${u.company}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs text-white/50">
            Allowed origins (one per line or comma-separated)
          </label>
          <textarea
            value={form.allowedOrigins}
            onChange={(e) => setForm((p) => ({ ...p, allowedOrigins: e.target.value }))}
            rows={3}
            placeholder={"https://client-dashboard.com\nhttps://admin.client.com\nhttp://localhost:3000"}
            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/20 focus:border-sky-500/50"
          />
          <p className="mt-1 text-xs text-white/30">
            Browser requests from unlisted origins will be rejected. Server-to-server requests bypass this check.
          </p>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-2 block text-xs text-white/50">Scopes</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {scopes.map((scope) => (
              <label key={scope} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 hover:border-white/15 transition-colors">
                <input
                  type="checkbox"
                  checked={form.selectedScopes.includes(scope)}
                  onChange={() => toggleScope(scope)}
                  className="accent-sky-500"
                />
                <div>
                  <p className="text-xs font-medium text-white/80">{scope}</p>
                  <p className="text-[11px] text-white/35">{SCOPE_LABELS[scope] ?? scope}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="sm:col-span-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="sm:col-span-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl bg-white/6 px-4 py-2 text-sm text-white/60 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !form.name.trim() || !form.portalUserId || form.selectedScopes.length === 0}
            className="rounded-xl bg-sky-500 px-5 py-2 text-sm font-semibold text-black hover:bg-sky-400 disabled:opacity-40 transition-colors"
          >
            {saving ? "Creating…" : "Create & generate credentials"}
          </button>
        </div>
      </form>
    </div>
  );
}
