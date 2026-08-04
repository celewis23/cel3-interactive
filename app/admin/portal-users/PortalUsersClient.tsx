"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

type PortalUser = {
  _id: string;
  email: string;
  name: string | null;
  company: string | null;
  stripeCustomerId: string | null;
  pipelineContactId: string | null;
  driveRootFolderId: string | null;
  siteUrl: string | null;
  managementUrl: string | null;
  status: string;
  lastLoginAt: string | null;
  invitationSentAt: string | null;
  mustChangePassword: boolean | null;
  _createdAt: string;
};

type ClientOption = {
  _id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  stripeCustomerId: string | null;
  siteUrl: string | null;
  managementUrl: string | null;
  portalSiteUrl: string | null;
  portalManagementUrl: string | null;
  portalUserId: string | null;
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

type LoginLinkResult = {
  loginEmail: string;
  loginUrl: string;
  expiresAt: string;
  emailSent: boolean;
  copiedToClipboard: boolean;
};

function emptyForm(searchParams: ReturnType<typeof useSearchParams>) {
  return {
    email: searchParams.get("clientEmail") ?? "",
    name: searchParams.get("clientName") ?? "",
    company: searchParams.get("clientCompany") ?? "",
    stripeCustomerId: searchParams.get("stripeCustomerId") ?? "",
    pipelineContactId: searchParams.get("pipelineContactId") ?? "",
    driveRootFolderId: "",
    siteUrl: "",
    managementUrl: "",
  };
}

function clientLabel(client: ClientOption) {
  return [client.company, client.name, client.email].filter(Boolean).join(" - ");
}

function formatDate(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;
}

export default function PortalUsersClient({
  initialUsers,
  clientOptions,
}: {
  initialUsers: PortalUser[];
  clientOptions: ClientOption[];
}) {
  const searchParams = useSearchParams();
  const shouldShowForm = searchParams.get("showForm") === "1";
  const [users, setUsers] = useState<PortalUser[]>(initialUsers);
  const [showForm, setShowForm] = useState(shouldShowForm);
  const [selectedClientId, setSelectedClientId] = useState(searchParams.get("pipelineContactId") ?? "");
  const [form, setForm] = useState(() => emptyForm(searchParams));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [createResult, setCreateResult] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<InvitationResult | null>(null);
  const [loginLinkResult, setLoginLinkResult] = useState<LoginLinkResult | null>(null);
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({});
  const [loginLinkErrors, setLoginLinkErrors] = useState<Record<string, string>>({});
  const [resending, setResending] = useState<string | null>(null);
  const [sendingLoginLink, setSendingLoginLink] = useState<string | null>(null);
  const [copyingLoginLink, setCopyingLoginLink] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    company: "",
    stripeCustomerId: "",
    pipelineContactId: "",
    driveRootFolderId: "",
    siteUrl: "",
    managementUrl: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const usedPipelineContactIds = new Set(users.map((user) => user.pipelineContactId).filter(Boolean));

  function handleClientSelect(clientId: string) {
    setSelectedClientId(clientId);
    if (!clientId) return;

    const client = clientOptions.find((option) => option._id === clientId);
    if (!client) return;

    setForm((current) => ({
      ...current,
      email: client.email ?? "",
      name: client.name ?? "",
      company: client.company ?? "",
      stripeCustomerId: client.stripeCustomerId ?? "",
      pipelineContactId: client._id,
      siteUrl: client.portalSiteUrl ?? client.siteUrl ?? "",
      managementUrl: client.portalManagementUrl ?? client.managementUrl ?? "",
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim()) return;
    setSaving(true);
    setFormError("");
    setCreateResult(null);
    setInviteResult(null);
    setLoginLinkResult(null);
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
          siteUrl: form.siteUrl.trim() || undefined,
          managementUrl: form.managementUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to create user");
        return;
      }
      setUsers((prev) => [data, ...prev]);
      setCreateResult("Portal access is ready. Send the portal invitation when you're ready for the client to log in.");
      setSelectedClientId("");
      setForm({ email: "", name: "", company: "", stripeCustomerId: "", pipelineContactId: "", driveRootFolderId: "", siteUrl: "", managementUrl: "" });
    } catch {
      setFormError("Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  async function handleResend(userId: string) {
    setResending(userId);
    setInviteErrors((prev) => ({ ...prev, [userId]: "" }));
    setLoginLinkResult(null);
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

  async function handleSendLoginLink(userId: string, copyOnly = false) {
    if (copyOnly) setCopyingLoginLink(userId);
    else setSendingLoginLink(userId);
    setLoginLinkErrors((prev) => ({ ...prev, [userId]: "" }));
    setInviteResult(null);
    try {
      const res = await fetch(`/api/admin/portal-users/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login-link", delivery: copyOnly ? "copy" : "email" }),
      });
      const data = await res.json();
      if (res.ok) {
        if (copyOnly) {
          await navigator.clipboard.writeText(data.loginUrl);
        }
        setLoginLinkResult({
          loginEmail: data.loginEmail,
          loginUrl: data.loginUrl,
          expiresAt: data.expiresAt,
          emailSent: data.emailSent,
          copiedToClipboard: copyOnly,
        });
      } else {
        setLoginLinkErrors((prev) => ({ ...prev, [userId]: data.error || "Failed to send portal login link" }));
      }
    } catch {
      setLoginLinkErrors((prev) => ({
        ...prev,
        [userId]: copyOnly ? "Failed to copy portal login link" : "Failed to send portal login link",
      }));
    } finally {
      if (copyOnly) setCopyingLoginLink(null);
      else setSendingLoginLink(null);
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

  function handleEdit(user: PortalUser) {
    setEditingUserId(user._id);
    setEditError("");
    setEditForm({
      name: user.name ?? "",
      company: user.company ?? "",
      stripeCustomerId: user.stripeCustomerId ?? "",
      pipelineContactId: user.pipelineContactId ?? "",
      driveRootFolderId: user.driveRootFolderId ?? "",
      siteUrl: user.siteUrl ?? "",
      managementUrl: user.managementUrl ?? "",
    });
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUserId) return;
    setEditSaving(true);
    setEditError("");
    try {
      const res = await fetch(`/api/admin/portal-users/${editingUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim() || null,
          company: editForm.company.trim() || null,
          stripeCustomerId: editForm.stripeCustomerId.trim() || null,
          pipelineContactId: editForm.pipelineContactId.trim() || null,
          driveRootFolderId: editForm.driveRootFolderId.trim() || null,
          siteUrl: editForm.siteUrl.trim() || null,
          managementUrl: editForm.managementUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Failed to update portal user");
        return;
      }
      setUsers((prev) => prev.map((user) => (
        user._id === editingUserId ? { ...user, ...data } : user
      )));
      setEditingUserId(null);
    } catch {
      setEditError("Failed to update portal user");
    } finally {
      setEditSaving(false);
    }
  }

  function renderUserActions(user: PortalUser, layout: "card" | "table") {
    const inviteError = inviteErrors[user._id];
    const loginLinkError = loginLinkErrors[user._id];
    const alignClass = layout === "table" ? "items-end text-right" : "items-stretch";
    const rowClass = layout === "table" ? "justify-end" : "justify-start";
    const buttonBase = "rounded-lg border border-white/10 px-3 py-2 text-xs transition-colors disabled:opacity-40";

    return (
      <div className={`flex flex-col gap-2 ${alignClass}`}>
        <div className={`flex flex-wrap gap-2 ${rowClass}`}>
          <button
            onClick={() => handleEdit(user)}
            className={`${buttonBase} bg-white/5 text-white/65 hover:border-white/20 hover:text-white`}
          >
            Edit
          </button>
          <button
            onClick={() => handleSendLoginLink(user._id)}
            disabled={sendingLoginLink === user._id || user.status === "suspended"}
            className={`${buttonBase} bg-sky-500/10 text-sky-300 hover:border-sky-400/40 hover:text-sky-200`}
          >
            {sendingLoginLink === user._id ? "Sending..." : "Resend login link"}
          </button>
          <button
            onClick={() => handleSendLoginLink(user._id, true)}
            disabled={copyingLoginLink === user._id || user.status === "suspended"}
            className={`${buttonBase} bg-white/5 text-sky-200/80 hover:border-sky-400/40 hover:text-sky-100`}
          >
            {copyingLoginLink === user._id ? "Copying..." : "Copy login link"}
          </button>
          <button
            onClick={() => handleResend(user._id)}
            disabled={resending === user._id || user.status === "suspended"}
            className={`${buttonBase} bg-white/5 text-white/55 hover:border-white/20 hover:text-white`}
          >
            {resending === user._id
              ? "Sending..."
              : user.invitationSentAt
                ? "Reset password"
                : "Send invitation"}
          </button>
          <button
            onClick={() => handleStatusToggle(user)}
            className={`${buttonBase} ${user.status === "suspended" ? "bg-green-500/10 text-green-400 hover:border-green-500/30" : "bg-yellow-500/10 text-yellow-400 hover:border-yellow-500/30"}`}
          >
            {user.status === "suspended" ? "Restore" : "Suspend"}
          </button>
          <button
            onClick={() => handleDelete(user._id)}
            className={`${buttonBase} bg-red-500/10 text-red-300/80 hover:border-red-500/30 hover:text-red-300`}
          >
            Delete
          </button>
        </div>
        {loginLinkError && (
          <span className="text-xs text-red-400">{loginLinkError}</span>
        )}
        {inviteError && (
          <span className="text-xs text-red-400">{inviteError}</span>
        )}
        {user.mustChangePassword && user.status !== "suspended" && (
          <span className="text-xs text-white/25">Will be prompted to change password on first login</span>
        )}
      </div>
    );
  }

  function detailValue(value: string | null, fallback = "-") {
    return value?.trim() ? value : fallback;
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
          onClick={() => { setShowForm(!showForm); setInviteResult(null); setLoginLinkResult(null); setCreateResult(null); setFormError(""); }}
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

      {loginLinkResult && (
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-2xl p-5">
          <p className="text-sm text-sky-300 mb-3">
            {loginLinkResult.copiedToClipboard
              ? "Portal login link copied. You can copy it again below if needed."
              : loginLinkResult.emailSent
              ? "Portal login link sent. You can also copy the one-use link below."
              : "Email delivery failed, but the one-use login link is ready to share manually."}
          </p>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)]">
            <div>
              <p className="text-xs text-white/35 mb-1">Login email</p>
              <div className="break-words px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white">
                {loginLinkResult.loginEmail}
              </div>
            </div>
            <div>
              <p className="text-xs text-white/35 mb-1">One-use login link</p>
              <div className="flex min-w-0 items-center gap-2">
                <input
                  readOnly
                  value={loginLinkResult.loginUrl}
                  className="min-w-0 flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white outline-none"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={() => navigator.clipboard.writeText(loginLinkResult.loginUrl)}
                  className="shrink-0 text-xs text-white/40 hover:text-white transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-white/35 mt-3">
            This link expires {new Date(loginLinkResult.expiresAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} and can only be used once.
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
            <div className="sm:col-span-2">
              <label className="text-xs text-white/50 mb-1.5 block">Select existing client</label>
              <select
                value={selectedClientId}
                onChange={(e) => handleClientSelect(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 [color-scheme:dark]"
              >
                <option value="">Manual entry</option>
                {clientOptions.map((client) => {
                  const alreadyLinked = Boolean(client.portalUserId) || usedPipelineContactIds.has(client._id);
                  return (
                    <option key={client._id} value={client._id} disabled={alreadyLinked}>
                      {clientLabel(client)}{alreadyLinked ? " (portal access exists)" : ""}
                    </option>
                  );
                })}
              </select>
              <p className="mt-1 text-[11px] text-white/30">
                Choosing a client fills name, email, organization, Stripe ID, client ID, and portal site links when saved.
              </p>
            </div>
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
              <label className="text-xs text-white/50 mb-1.5 block">Organization</label>
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
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Live Site URL</label>
              <input
                type="url"
                value={form.siteUrl}
                onChange={(e) => setForm((f) => ({ ...f, siteUrl: e.target.value }))}
                placeholder="https://clientsite.com"
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Management URL</label>
              <input
                type="url"
                value={form.managementUrl}
                onChange={(e) => setForm((f) => ({ ...f, managementUrl: e.target.value }))}
                placeholder="https://admin.clientsite.com"
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

      {editingUserId && (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Edit portal client</h2>
              <p className="text-xs text-white/35 mt-1">
                Organization changes also update the linked pipeline contact, Stripe customer, and Google Contact when linked.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingUserId(null)}
              className="text-xs text-white/40 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
          {editError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl p-3 mb-4">
              {editError}
            </div>
          )}
          <form onSubmit={handleSaveEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Display name</label>
              <input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Organization</label>
              <input
                value={editForm.company}
                onChange={(e) => setEditForm((f) => ({ ...f, company: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Stripe Customer ID</label>
              <input
                value={editForm.stripeCustomerId}
                onChange={(e) => setEditForm((f) => ({ ...f, stripeCustomerId: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Pipeline Contact ID</label>
              <input
                value={editForm.pipelineContactId}
                onChange={(e) => setEditForm((f) => ({ ...f, pipelineContactId: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-white/50 mb-1.5 block">Drive Folder ID</label>
              <input
                value={editForm.driveRootFolderId}
                onChange={(e) => setEditForm((f) => ({ ...f, driveRootFolderId: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Live Site URL</label>
              <input
                value={editForm.siteUrl}
                onChange={(e) => setEditForm((f) => ({ ...f, siteUrl: e.target.value }))}
                placeholder="https://clientsite.com"
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
              />
              <p className="mt-1 text-[11px] text-white/30">Where the portal&apos;s &ldquo;Open Site&rdquo; button points. Changes silently and syncs to the contact record.</p>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Management URL</label>
              <input
                value={editForm.managementUrl}
                onChange={(e) => setEditForm((f) => ({ ...f, managementUrl: e.target.value }))}
                placeholder="https://admin.clientsite.com"
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono placeholder-white/20 outline-none focus:border-sky-500/50 transition-colors"
              />
              <p className="mt-1 text-[11px] text-white/30">Where the portal&apos;s &ldquo;Manage Site&rdquo; button points. Changes silently and syncs to the contact record.</p>
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={editSaving}
                className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-black font-semibold text-sm transition-colors"
              >
                {editSaving ? "Saving…" : "Save changes"}
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
        <div className="space-y-3">
          <div className="grid gap-3 lg:hidden">
            {users.map((u) => (
              <article key={u._id} className="min-w-0 rounded-2xl border border-white/8 bg-white/3 p-4">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium text-white">{u.name || u.email}</p>
                    {u.name && <p className="mt-0.5 break-words text-xs text-white/45">{u.email}</p>}
                    {u.company && <p className="mt-0.5 break-words text-xs text-white/35">{u.company}</p>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[u.status] || "text-white/30"}`}>
                    {u.status}
                  </span>
                </div>

                <dl className="mt-4 grid min-w-0 gap-3 text-xs sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="text-white/35">Stripe customer</dt>
                    <dd className="mt-1 break-all font-mono text-white/60">{detailValue(u.stripeCustomerId)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-white/35">Pipeline contact</dt>
                    <dd className="mt-1 break-all font-mono text-white/60">{detailValue(u.pipelineContactId)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-white/35">Drive folder</dt>
                    <dd className="mt-1 break-all font-mono text-white/60">{detailValue(u.driveRootFolderId)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-white/35">Created</dt>
                    <dd className="mt-1 text-white/60">{formatDate(u._createdAt) ?? "-"}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-white/35">Invitation</dt>
                    <dd className="mt-1 text-white/60">{formatDate(u.invitationSentAt) ?? "Not sent"}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-white/35">Last login</dt>
                    <dd className="mt-1 text-white/60">{formatDate(u.lastLoginAt) ?? "Never"}</dd>
                  </div>
                  <div className="min-w-0 sm:col-span-2">
                    <dt className="text-white/35">Live site</dt>
                    <dd className="mt-1 min-w-0">
                      {u.siteUrl ? (
                        <a href={u.siteUrl} target="_blank" rel="noopener noreferrer" className="break-all text-sky-300 hover:text-sky-200">
                          {u.siteUrl}
                        </a>
                      ) : (
                        <span className="text-white/25">-</span>
                      )}
                    </dd>
                  </div>
                  <div className="min-w-0 sm:col-span-2">
                    <dt className="text-white/35">Management URL</dt>
                    <dd className="mt-1 min-w-0">
                      {u.managementUrl ? (
                        <a href={u.managementUrl} target="_blank" rel="noopener noreferrer" className="break-all text-sky-300 hover:text-sky-200">
                          {u.managementUrl}
                        </a>
                      ) : (
                        <span className="text-white/25">-</span>
                      )}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 border-t border-white/8 pt-4">
                  {renderUserActions(u, "card")}
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-white/8 bg-white/3 lg:block">
            <table className="w-full min-w-[1040px]">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Links</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40">IDs</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Activity</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u._id} className="align-top transition-colors hover:bg-white/2">
                    <td className="px-4 py-3">
                      <p className="max-w-[220px] break-words text-sm text-white">{u.name || u.email}</p>
                      {u.name && <p className="mt-0.5 max-w-[220px] break-words text-xs text-white/40">{u.email}</p>}
                      {u.company && <p className="mt-0.5 max-w-[220px] break-words text-xs text-white/30">{u.company}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-[220px] flex-col gap-1 text-xs">
                        {u.siteUrl ? (
                          <a href={u.siteUrl} target="_blank" rel="noopener noreferrer" className="truncate text-sky-300 hover:text-sky-200">
                            Open site
                          </a>
                        ) : (
                          <span className="text-white/20">No live site</span>
                        )}
                        {u.managementUrl ? (
                          <a href={u.managementUrl} target="_blank" rel="noopener noreferrer" className="truncate text-sky-300 hover:text-sky-200">
                            Manage site
                          </a>
                        ) : (
                          <span className="text-white/20">No management URL</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-[230px] flex-col gap-1 text-xs">
                        <span className="break-all font-mono text-white/35">Stripe: {detailValue(u.stripeCustomerId)}</span>
                        <span className="break-all font-mono text-white/25">Pipeline: {detailValue(u.pipelineContactId)}</span>
                        <span className="break-all font-mono text-white/25">Drive: {detailValue(u.driveRootFolderId)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[u.status] || "text-white/30"}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-[130px] flex-col gap-1 text-xs text-white/40">
                        <span>Invite: {formatDate(u.invitationSentAt) ?? "Not sent"}</span>
                        <span>Login: {formatDate(u.lastLoginAt) ?? "Never"}</span>
                        <span>Created: {formatDate(u._createdAt) ?? "-"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {renderUserActions(u, "table")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
