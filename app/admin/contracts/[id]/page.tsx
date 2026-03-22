"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-400",
  sent: "bg-blue-500/10 text-blue-400",
  viewed: "bg-yellow-500/10 text-yellow-400",
  signed: "bg-green-500/10 text-green-400",
  declined: "bg-red-500/10 text-red-400",
  expired: "bg-orange-500/10 text-orange-400",
};

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
  body: string;
  variables: Record<string, string>;
  notes: string | null;
  signingToken: string;
  signerName: string | null;
  signatureType: string | null;
  signatureData: string | null;
  signatureIp: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  signedAt: string | null;
  declinedAt: string | null;
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [signingLink, setSigningLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/contracts/${id}`)
      .then((r) => r.json())
      .then((d) => { setContract(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleSend() {
    setSending(true);
    try {
      const res = await fetch(`/api/admin/contracts/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (data.signingLink) setSigningLink(data.signingLink);
      if (data.sent && contract) {
        setContract({ ...contract, status: "sent", sentAt: new Date().toISOString() });
      }
      if (!data.sent && data.error) {
        alert(`Email failed: ${data.error}\n\nSigning link: ${data.signingLink}`);
      }
    } catch {
      alert("Failed to send.");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete() {
    if (!contract || !confirm(`Delete contract ${contract.number}?`)) return;
    await fetch(`/api/admin/contracts/${id}`, { method: "DELETE" });
    router.push("/admin/contracts");
  }

  async function handleDuplicate() {
    const res = await fetch(`/api/admin/contracts/${id}/duplicate`, { method: "POST" });
    if (res.ok) {
      const dup = await res.json();
      router.push(`/admin/contracts/${dup._id}`);
    }
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return <div className="py-20 text-center text-white/30 text-sm">Loading…</div>;
  }

  if (!contract) {
    return <div className="py-20 text-center text-white/30 text-sm">Contract not found.</div>;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const signingLinkFull = signingLink ?? `${siteUrl}/contracts/${contract.signingToken}`;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Contracts</div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{contract.number}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_STYLES[contract.status] ?? "bg-gray-500/10 text-gray-400"}`}>
              {contract.status}
            </span>
          </div>
          {contract.templateName && (
            <div className="text-sm text-white/40 mt-1">{contract.templateName}</div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {["draft", "sent", "viewed"].includes(contract.status) && (
            <button
              onClick={handleSend}
              disabled={sending}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {sending ? "Sending…" : contract.status === "draft" ? "Send to Client" : "Resend"}
            </button>
          )}
          <Link
            href={`/admin/contracts/${id}/print`}
            target="_blank"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors"
          >
            Print / PDF
          </Link>
          <button
            onClick={handleDuplicate}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors"
          >
            Duplicate
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 rounded-xl bg-red-500/5 hover:bg-red-500/10 text-red-400/60 hover:text-red-400 text-sm transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Signing link */}
      {["sent", "viewed", "draft"].includes(contract.status) && (
        <div className="bg-white/3 border border-white/8 rounded-xl p-4">
          <div className="text-xs text-white/40 mb-2 uppercase tracking-wider">Signing Link</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-sky-400 bg-black/30 px-3 py-2 rounded-lg break-all">
              {signingLinkFull}
            </code>
            <button
              onClick={() => copyLink(signingLinkFull)}
              className="text-xs px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors flex-shrink-0"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contract details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Client info */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-5">
            <div className="text-xs text-white/40 uppercase tracking-wider mb-3">Client</div>
            <div className="text-white font-semibold">{contract.clientName}</div>
            {contract.clientCompany && <div className="text-white/50 text-sm">{contract.clientCompany}</div>}
            {contract.clientEmail && <div className="text-white/40 text-sm">{contract.clientEmail}</div>}
          </div>

          {/* Contract body preview */}
          <div className="bg-white rounded-xl p-6 overflow-auto max-h-[500px]">
            <div
              className="prose prose-gray max-w-none text-sm"
              dangerouslySetInnerHTML={{ __html: contract.body }}
            />
          </div>

          {/* Signature */}
          {contract.status === "signed" && contract.signatureData && (
            <div className="bg-white/3 border border-green-500/20 rounded-xl p-5">
              <div className="text-xs text-green-400 uppercase tracking-wider mb-3">Signature</div>
              <div className="flex items-start gap-4 flex-wrap">
                <div className="bg-white rounded-lg p-2 inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={contract.signatureData} alt="Signature" className="h-16 w-auto" />
                </div>
                <div className="text-sm space-y-1">
                  <div className="text-white/70">Signed by: <span className="text-white font-medium">{contract.signerName}</span></div>
                  {contract.signedAt && (
                    <div className="text-white/50">Date: {new Date(contract.signedAt).toLocaleString()}</div>
                  )}
                  <div className="text-white/30 text-xs">Type: {contract.signatureType}</div>
                  {contract.signatureIp && (
                    <div className="text-white/30 text-xs">IP: {contract.signatureIp}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {contract.notes && (
            <div className="bg-white/3 border border-white/8 rounded-xl p-5">
              <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Internal Notes</div>
              <div className="text-sm text-white/60">{contract.notes}</div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Dates */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-5">
            <div className="text-xs text-white/40 uppercase tracking-wider mb-3">Details</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/40">Contract Date</span>
                <span className="text-white/70">{contract.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Expires</span>
                <span className="text-white/70">{contract.expiryDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Category</span>
                <span className="text-white/70 capitalize">{contract.category?.replace(/-/g, " ")}</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-5">
            <div className="text-xs text-white/40 uppercase tracking-wider mb-3">Timeline</div>
            <div className="space-y-2 text-sm">
              {[
                { label: "Created", date: null },
                { label: "Sent", date: contract.sentAt },
                { label: "Viewed", date: contract.viewedAt },
                { label: "Signed", date: contract.signedAt },
                { label: "Declined", date: contract.declinedAt },
              ].map(({ label, date }) =>
                date ? (
                  <div key={label} className="flex justify-between">
                    <span className="text-white/40">{label}</span>
                    <span className="text-white/60 text-xs">{new Date(date).toLocaleDateString()}</span>
                  </div>
                ) : null
              )}
            </div>
          </div>

          {/* Variables */}
          {contract.variables && Object.keys(contract.variables).length > 0 && (
            <div className="bg-white/3 border border-white/8 rounded-xl p-5">
              <div className="text-xs text-white/40 uppercase tracking-wider mb-3">Variables</div>
              <div className="space-y-1.5">
                {Object.entries(contract.variables)
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k}>
                      <div className="text-xs text-white/30 font-mono">{`{{${k}}}`}</div>
                      <div className="text-xs text-white/60">{v}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
