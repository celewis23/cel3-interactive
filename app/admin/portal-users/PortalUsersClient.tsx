"use client";
import { useState } from "react";

type PortalUser = {
  _id: string;
  email: string;
  name: string | null;
  company: string | null;
  stripeCustomerId: string | null;
  pipelineContactId: string | null;
  driveRootFolderId: string | null;
  status: string;
  lastLoginAt: string | null;
  invitationSentAt: string | null;
  mustChangePassword: boolean | null;
  _createdAt: string;
};

const STATUS_BADGE: Record<string, string> = {
  ready: "bg-white/10 text-white/60",
  active: "bg-green-500/10 text-green-400",
  invited: "bg-yellow-500/10 text-yellow-400",
  suspended: "bg-red-500/10 text-red-400",
};

type InvitationResult = {
  loginEmail: string;
  loginUrl: string;
  temporaryPassword: string;
  emailSent: boolean;
};

export default function PortalUsersClient({ initialUsers }: { initialUsers: PortalUser[] }) {
  const [users, setUsers] = useState<PortalUser[]>(initialUsers);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    email: "", name: "", company: "", stripeCustomerId: "", pipelineContactId: "", driveRootFolderId: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [createResult, setCreateResult] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<InvitationResult | null>(null);
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({});
  const [resending, setResending] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim()) return;
    setSaving(true);
    setFormError("");
    setCreateResult(null);
    setInviteResult(null);
    try {
      const res = await fetch("/api/admin/portal-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          name: form.name.trim() || undefined,
          company: form.company.trim() || undefined,
          stripeCustomerId: form.stripeCustomerId.trim() || undefined,
          pipelineContactId: form.pipelineContactId.trim() || undefined,
          driveRootFolderId: form.driveRootFolderId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to create user");
        return;
      }
      setUsers((prev) => [data, ...prev]);
      setCreateResult("Portal access is ready. Send the portal invitation when you're ready for the client to log in.");
      setForm({ email: "", name: "", company: "", stripeCustomerId: "", pipelineContactId: "", driveRootFolderId: "" });
    } catch {
      setFormError("Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  async function handleResend(userId: string) {
    setResending(userId);
    setInviteErrors((prev) => ({ ...prev, [userId]: "" }));
    try {
      const res = await fetch(`/api/admin/portal-users/${userId}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setInviteResult({
          loginEmail: data.loginEmail,
          loginUrl: data.loginUrl,
          temporaryPassword: data.temporaryPassword,
          emailSent: data.emailSent,
        });
        setUsers((prev) => prev.map((user) => (
          user._id === userId
            ? {
              ...user,
              status: "invited",
              invitationSentAt: data.invitationSentAt ?? new Date().toISOString(),
              mustChangePassword: true,
            }
            : user
        )));
      } else {
        setInviteErrors((prev) => ({ ...prev, [userId]: data.error || "Failed to send portal invitation" }));
      }
    } finally {
      setResending(null);
    }
  }

  async function handleStatusToggle(user: PortalUser) {
    const newStatus = user.status === "suspended"
      ? (user.lastLoginAt ? "active" : user.invitationSentAt ? "invited" : "ready")
      : "suspended";
    const res = await fetch(`/api/admin/portal-users/${user._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u._id === user._id ? { ...u, status: newStatus } : u));
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Delete this portal user? They will lose access immediately.")) return;
    const res = await fetch(`/api/admin/portal-users/${userId}`, { method: "DELETE" });
    if (res.ok) setUsers((prev) => prev.filter((u) => u._id !== userId));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Portal Users</h1>
          <p className="text-sm text-white/40 mt-1">
            {users.length} client{users.length !== 1 ? "s" : ""} with portal access
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setInviteResult(null); setCreateResult(null); setFormError(""); }}
          className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-semibold text-sm transition-colors"
        >
          {showForm ? "Cancel" : "+ Add portal access"}
        </button>
      </div>

      {inviteResult && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5">
          <p className="text-sm text-green-400 mb-3">
            {inviteResult.emailSent
              ? "Portal invitation sent. These are the credentials that were generated."
              : "Email delivery failed, but the credentials are ready for you to share manually."}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-white/35 mb-1">Login email</p>
              <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white">
                {inviteResult.loginEmail}
              </div>
            </div>
            <div>
              <p className="text-xs text-white/35 mb-1">Temporary password</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={inviteResult.temporaryPassword}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={() => navigator.clipboard.writeText(inviteResult.temporaryPassword)}
                  className="text-xs text-white/40 hover:text-white transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs text-white/35 mb-1">Portal login URL</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={inviteResult.loginUrl}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={() => navigator.clipboard.writeText(inviteResult.loginUrl)}
                  className="text-xs text-white/40 hover:text-white transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-white/35 mt-3">
            The client will be asked to change this password the first time they sign in.
          </p>
        </div>
      )}

      {showForm && (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Prepare portal access</h2>
          {formError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl p-3 mb-4">
              {formError}
            </div>
          )}
          {createResult && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-4">
              <p className="text-sm text-green-400">
                {createResult}
              </p>
            </div>
          )}
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Email <span className="text-red-400">*</span></label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="client@company.com"
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Jane Smith"
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Company</label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                placeholder="Acme Corp"
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Stripe Customer ID</label>
              <input
                type="text"
                value={form.stripeCustomerId}
                onChange={(e) => setForm((f) => ({ ...f, stripeCustomerId: e.target.value }))}
                placeholder="cus_..."
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Pipeline Contact ID</label>
              <input
                type="text"
                value={form.pipelineContactId}
                onChange={(e) => setForm((f) => ({ ...f, pipelineContactId: e.target.value }))}
                placeholder="Sanity _id"
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Drive Folder ID</label>
              <input
                type="text"
                value={form.driveRootFolderId}
                onChange={(e) => setForm((f) => ({ ...f, driveRootFolderId: e.target.value }))}
                placeholder="Google Drive folder ID"
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving || !form.email.trim()}
                className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-black font-semibold text-sm transition-colors"
              >
                {saving ? "Creating…" : "Create portal access"}
              </button>
            </div>
          </form>
        </div>
      )}

      {users.length === 0 ? (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-8 text-center">
          <p className="text-white/40 text-sm">No portal users yet. Invite your first client above.</p>
        </div>
      ) : (
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/8">
                <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Client</th>
                <th className="px-4 py-3 text-left text-xs text-white/40 font-medium hidden md:table-cell">Linked to</th>
                <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Status</th>
                <th className="px-4 py-3 text-left text-xs text-white/40 font-medium hidden lg:table-cell">Invitation</th>
                <th className="px-4 py-3 text-left text-xs text-white/40 font-medium hidden lg:table-cell">Last login</th>
                <th className="px-4 py-3 text-right text-xs text-white/40 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => {
                const inviteError = inviteErrors[u._id];
                return (
                  <tr key={u._id} className="hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm text-white">{u.name || u.email}</p>
                      {u.name && <p className="text-xs text-white/40">{u.email}</p>}
                      {u.company && <p className="text-xs text-white/30">{u.company}</p>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-col gap-0.5">
                        {u.stripeCustomerId && (
                          <span className="text-xs text-white/30 font-mono">{u.stripeCustomerId}</span>
                        )}
                        {u.pipelineContactId && (
                          <span className="text-xs text-white/20 font-mono">{u.pipelineContactId.slice(0, 16)}…</span>
                        )}
                        {!u.stripeCustomerId && !u.pipelineContactId && (
                          <span className="text-xs text-white/20">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[u.status] || "text-white/30"}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-white/40">
                        {u.invitationSentAt
                          ? new Date(u.invitationSentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : "Not sent"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-white/40">
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : "Never"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleResend(u._id)}
                            disabled={resending === u._id || u.status === "suspended"}
                            className="text-xs text-white/40 hover:text-white transition-colors disabled:opacity-40"
                          >
                            {resending === u._id
                              ? "Sending…"
                              : u.invitationSentAt
                                ? "Reset password & resend"
                                : "Send invitation"}
                          </button>
                          <button
                            onClick={() => handleStatusToggle(u)}
                            className={`text-xs transition-colors ${u.status === "suspended" ? "text-green-400 hover:text-green-300" : "text-yellow-400 hover:text-yellow-300"}`}
                          >
                            {u.status === "suspended" ? "Restore" : "Suspend"}
                          </button>
                          <button
                            onClick={() => handleDelete(u._id)}
                            className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                        {inviteError && (
                          <span className="text-xs text-red-400">{inviteError}</span>
                        )}
                        {u.mustChangePassword && u.status !== "suspended" && (
                          <span className="text-xs text-white/25">Will be prompted to change password on first login</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
