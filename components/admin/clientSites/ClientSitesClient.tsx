"use client";
import { useState } from "react";
import Link from "next/link";

type ClientSite = {
  _id: string;
  name: string;
  company: string | null;
  siteUrl: string | null;
  vercelDomain: string | null;
  vercelProjectId: string | null;
  websiteStatus?: string | null;
  websiteStatusReason?: string | null;
  websiteSuspendedAt?: string | null;
  websiteRestoredAt?: string | null;
  websiteAutoSuspendExempt?: boolean | null;
};

function formatDate(value: string | null | undefined) {
  return value
    ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;
}

export default function ClientSitesClient({ initialClients }: { initialClients: ClientSite[] }) {
  const [clients, setClients] = useState<ClientSite[]>(initialClients);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ vercelProjectId: "", vercelDomain: "" });
  const [editSaving, setEditSaving] = useState(false);

  async function handleToggle(client: ClientSite) {
    const nextStatus = client.websiteStatus === "suspended" ? "active" : "suspended";
    if (nextStatus === "suspended" && !confirm(`Suspend ${client.name}'s website? This blocks their admin console login and puts the site into maintenance mode.`)) return;
    setSavingId(client._id);
    setWarnings((w) => ({ ...w, [client._id]: "" }));
    try {
      const res = await fetch(`/api/admin/pipeline/contacts/${client._id}/website-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setClients((prev) => prev.map((c) => (
          c._id === client._id
            ? { ...c, websiteStatus: nextStatus, websiteStatusReason: nextStatus === "suspended" ? "manual" : null }
            : c
        )));
        if (data.vercelSync && data.vercelSync.ok === false) {
          setWarnings((w) => ({ ...w, [client._id]: `Status updated, but the live site wasn't updated: ${data.vercelSync.error}` }));
        }
      } else {
        setWarnings((w) => ({ ...w, [client._id]: data.error || "Failed to update website status" }));
      }
    } finally {
      setSavingId(null);
    }
  }

  function startEdit(client: ClientSite) {
    setEditingId(client._id);
    setEditForm({ vercelProjectId: client.vercelProjectId ?? "", vercelDomain: client.vercelDomain ?? "" });
  }

  async function handleSaveEdit(clientId: string) {
    setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/pipeline/contacts/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vercelProjectId: editForm.vercelProjectId.trim() || null,
          vercelDomain: editForm.vercelDomain.trim() || null,
        }),
      });
      if (res.ok) {
        setClients((prev) => prev.map((c) => (
          c._id === clientId
            ? { ...c, vercelProjectId: editForm.vercelProjectId.trim() || null, vercelDomain: editForm.vercelDomain.trim() || null }
            : c
        )));
        setEditingId(null);
      }
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Client Sites</h1>
        <p className="text-sm text-white/40 mt-1">
          {clients.length} client website{clients.length !== 1 ? "s" : ""} — suspend or restore live sites, manually or via the automated collections sequence.
        </p>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-8 text-center">
          <p className="text-white/40 text-sm">No clients with a website on file yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => {
            const suspended = client.websiteStatus === "suspended";
            const warning = warnings[client._id];
            const isEditing = editingId === client._id;
            return (
              <article key={client._id} className="rounded-2xl border border-white/8 bg-white/3 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/pipeline/contacts/${client._id}`} className="text-sm font-medium text-white hover:text-sky-300">
                        {client.company || client.name}
                      </Link>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${suspended ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                        {suspended ? `Suspended${client.websiteStatusReason === "auto_nonpayment" ? " (auto)" : ""}` : "Active"}
                      </span>
                      {client.websiteAutoSuspendExempt && (
                        <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50">Exempt</span>
                      )}
                    </div>
                    {client.company && client.name !== client.company && (
                      <p className="mt-0.5 text-xs text-white/40">{client.name}</p>
                    )}
                    {client.siteUrl && (
                      <a href={client.siteUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block truncate text-xs text-sky-300 hover:text-sky-200">
                        {client.siteUrl}
                      </a>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle(client)}
                    disabled={savingId === client._id}
                    className={`shrink-0 rounded-xl px-3 py-2 text-sm transition-colors disabled:opacity-40 ${suspended ? "bg-green-500/10 text-green-400 hover:bg-green-500/15" : "bg-red-500/10 text-red-300 hover:bg-red-500/15"}`}
                  >
                    {savingId === client._id ? "Saving…" : suspended ? "Restore" : "Suspend"}
                  </button>
                </div>

                {warning && <p className="mt-2 text-xs text-amber-400">{warning}</p>}

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-white/35">
                  {client.websiteSuspendedAt && suspended && <span>Suspended {formatDate(client.websiteSuspendedAt)}</span>}
                  {client.websiteRestoredAt && !suspended && <span>Restored {formatDate(client.websiteRestoredAt)}</span>}
                </div>

                <div className="mt-3 border-t border-white/8 pt-3">
                  {isEditing ? (
                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label className="mb-1 block text-[11px] text-white/40">Vercel Project ID</label>
                        <input
                          value={editForm.vercelProjectId}
                          onChange={(e) => setEditForm((f) => ({ ...f, vercelProjectId: e.target.value }))}
                          placeholder="prj_..."
                          className="w-48 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-sky-500/50"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-white/40">Vercel Domain</label>
                        <input
                          value={editForm.vercelDomain}
                          onChange={(e) => setEditForm((f) => ({ ...f, vercelDomain: e.target.value }))}
                          placeholder="clientsite.com"
                          className="w-48 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-sky-500/50"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(client._id)}
                        disabled={editSaving}
                        className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-sky-400 disabled:opacity-50"
                      >
                        {editSaving ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-xs text-white/40 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => startEdit(client)} className="text-xs text-white/35 hover:text-white/60">
                      {client.vercelDomain
                        ? <>Vercel: <span className="font-mono">{client.vercelDomain}</span> — edit</>
                        : "Set Vercel Project ID / Domain to enable live suspend enforcement"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
