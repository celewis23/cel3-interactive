"use client";

import { useState } from "react";
import Link from "next/link";

interface Contract {
  _id: string;
  number: string;
  date: string;
  expiryDate: string;
  status: string;
  clientName: string;
  clientEmail: string | null;
  clientCompany: string | null;
  templateName: string | null;
  category: string;
  signerName: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  signedAt: string | null;
  declinedAt: string | null;
  _createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-400",
  sent: "bg-blue-500/10 text-blue-400",
  viewed: "bg-yellow-500/10 text-yellow-400",
  signed: "bg-green-500/10 text-green-400",
  declined: "bg-red-500/10 text-red-400",
  expired: "bg-orange-500/10 text-orange-400",
};

const ALL_STATUSES = ["draft", "sent", "viewed", "signed", "declined", "expired"];

interface Props {
  contracts: Contract[];
}

export default function ContractList({ contracts: initial }: Props) {
  const [contracts, setContracts] = useState(initial);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [signingLinks, setSigningLinks] = useState<Record<string, string>>({});

  const today = new Date().toISOString().slice(0, 10);
  const staleSentThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const filtered = contracts.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.clientName.toLowerCase().includes(q) ||
        c.number.toLowerCase().includes(q) ||
        c.clientEmail?.toLowerCase().includes(q) ||
        c.clientCompany?.toLowerCase().includes(q) ||
        c.templateName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const isStale = (c: Contract) =>
    c.status === "sent" && c.sentAt && c.sentAt < staleSentThreshold;

  async function handleSend(id: string) {
    setSending(id);
    try {
      const res = await fetch(`/api/admin/contracts/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (data.sent) {
        setContracts((prev) =>
          prev.map((c) => (c._id === id ? { ...c, status: "sent", sentAt: new Date().toISOString() } : c))
        );
      }
      if (data.signingLink) {
        setSigningLinks((prev) => ({ ...prev, [id]: data.signingLink }));
        if (!data.sent) alert(`Email failed. Signing link:\n${data.signingLink}`);
      }
    } catch {
      alert("Failed to send.");
    } finally {
      setSending(null);
    }
  }

  async function handleDuplicate(id: string) {
    const res = await fetch(`/api/admin/contracts/${id}/duplicate`, { method: "POST" });
    if (res.ok) {
      const dup = await res.json();
      setContracts((prev) => [dup, ...prev]);
    }
  }

  async function handleDelete(id: string, number: string) {
    if (!confirm(`Delete contract ${number}? This cannot be undone.`)) return;
    await fetch(`/api/admin/contracts/${id}`, { method: "DELETE" });
    setContracts((prev) => prev.filter((c) => c._id !== id));
  }

  // Stats
  const stats = {
    total: contracts.length,
    pending: contracts.filter((c) => ["sent", "viewed"].includes(c.status)).length,
    signed: contracts.filter((c) => c.status === "signed").length,
    draft: contracts.filter((c) => c.status === "draft").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total },
          { label: "Draft", value: stats.draft },
          { label: "Pending Signature", value: stats.pending },
          { label: "Signed", value: stats.signed },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white/3 border border-white/8 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-xs text-white/40 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search client, number, company…"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-sky-400/50"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400/50 appearance-none"
        >
          <option value="" className="bg-[#0f0f0f]">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s} className="bg-[#0f0f0f] capitalize">{s}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-white/30 text-sm">No contracts found.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div
              key={c._id}
              className={`bg-white/3 border rounded-xl px-5 py-4 hover:bg-white/5 transition-colors ${
                isStale(c) ? "border-yellow-500/30" : "border-white/8"
              }`}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Link
                      href={`/admin/contracts/${c._id}`}
                      className="font-semibold text-white hover:text-sky-400 transition-colors"
                    >
                      {c.number}
                    </Link>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[c.status] ?? "bg-gray-500/10 text-gray-400"}`}>
                      {c.status}
                    </span>
                    {isStale(c) && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                        Stale — no response in 7+ days
                      </span>
                    )}
                    {c.expiryDate < today && c.status !== "signed" && c.status !== "declined" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">
                        Expired
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-white/70 truncate">{c.clientName}</div>
                  {c.clientCompany && <div className="text-xs text-white/40">{c.clientCompany}</div>}
                  {c.templateName && (
                    <div className="text-xs text-white/30 mt-0.5">{c.templateName}</div>
                  )}
                  <div className="text-xs text-white/30 mt-1">{c.date}</div>
                  {c.signedAt && c.signerName && (
                    <div className="text-xs text-green-400 mt-1">
                      Signed by {c.signerName} — {new Date(c.signedAt).toLocaleDateString()}
                    </div>
                  )}
                  {signingLinks[c._id] && (
                    <div className="text-xs text-sky-400 mt-1 break-all">
                      Signing link: {signingLinks[c._id]}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  {["draft", "sent", "viewed"].includes(c.status) && (
                    <button
                      onClick={() => handleSend(c._id)}
                      disabled={sending === c._id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors border border-sky-500/20 disabled:opacity-50"
                    >
                      {sending === c._id ? "Sending…" : c.status === "draft" ? "Send" : "Resend"}
                    </button>
                  )}
                  <Link
                    href={`/admin/contracts/${c._id}`}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleDuplicate(c._id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => handleDelete(c._id, c.number)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-500/5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
