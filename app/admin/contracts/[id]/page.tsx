"use client";

import { useEffect, useRef, useState } from "react";
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

const VARIABLE_ORDER = [
  "clientName",
  "clientEmail",
  "clientCompany",
  "projectName",
  "contractNumber",
  "contractDate",
  "startDate",
  "launchTarget",
  "endDate",
  "minimumTerm",
  "totalAmount",
  "paymentTerms",
];

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
  _createdAt: string;
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [signingLink, setSigningLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [variableSaving, setVariableSaving] = useState(false);
  const [variableSaved, setVariableSaved] = useState(false);
  const [variableError, setVariableError] = useState<string | null>(null);
  const variableSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/admin/contracts/${id}`)
      .then((r) => r.json())
      .then((d) => { setContract(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    return () => {
      if (variableSaveTimer.current) clearTimeout(variableSaveTimer.current);
    };
  }, []);

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

  function inputTypeForVariable(key: string) {
    return key.toLowerCase().includes("date") || key === "launchTarget" ? "date" : "text";
  }

  function updateVariable(key: string, value: string) {
    if (!contract) return;
    const nextVariables = { ...(contract.variables ?? {}), [key]: value };
    setContract({ ...contract, variables: nextVariables });
    setVariableSaved(false);
    setVariableError(null);

    if (variableSaveTimer.current) clearTimeout(variableSaveTimer.current);
    variableSaveTimer.current = setTimeout(async () => {
      setVariableSaving(true);
      try {
        const res = await fetch(`/api/admin/contracts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variables: nextVariables }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Failed to save variables");
        setContract(data);
        setVariableSaved(true);
        window.setTimeout(() => setVariableSaved(false), 1800);
      } catch (err) {
        setVariableError(err instanceof Error ? err.message : "Failed to save variables");
      } finally {
        setVariableSaving(false);
      }
    }, 550);
  }

  if (loading) {
    return <div className="py-20 text-center text-white/30 text-sm">Loading…</div>;
  }

  if (!contract) {
    return <div className="py-20 text-center text-white/30 text-sm">Contract not found.</div>;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const signingLinkFull = signingLink ?? `${siteUrl}/contracts/${contract.signingToken}`;
  const variableEntries = Object.entries(contract.variables ?? {}).sort(([a], [b]) => {
    const ai = VARIABLE_ORDER.indexOf(a);
    const bi = VARIABLE_ORDER.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return a.localeCompare(b);
  });
  const projectTimeline = [
    { label: "Start Date", value: contract.variables?.startDate },
    { label: "Target Launch", value: contract.variables?.launchTarget },
    { label: "End Date", value: contract.variables?.endDate },
    { label: "Minimum Term", value: contract.variables?.minimumTerm },
  ].filter((item) => item.value?.trim());
  const activityTimeline = [
    { label: "Created", date: contract._createdAt },
    { label: "Sent", date: contract.sentAt },
    { label: "Viewed", date: contract.viewedAt },
    { label: "Signed", date: contract.signedAt },
    { label: "Declined", date: contract.declinedAt },
  ].filter((item): item is { label: string; date: string } => Boolean(item.date));

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
          <div className="contract-document rounded-xl p-6 overflow-auto max-h-[500px]">
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
            <div className="space-y-4 text-sm">
              {projectTimeline.length > 0 && (
                <div>
                  <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-sky-200/60">Project</div>
                  <div className="space-y-2">
                    {projectTimeline.map(({ label, value }) => (
                      <div key={label} className="flex justify-between gap-3">
                        <span className="text-white/40">{label}</span>
                        <span className="text-right text-white/70">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activityTimeline.length > 0 && (
                <div>
                  {projectTimeline.length > 0 && <div className="mb-2 h-px bg-white/8" />}
                  <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/25">Activity</div>
                  <div className="space-y-2">
                    {activityTimeline.map(({ label, date }) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-white/40">{label}</span>
                        <span className="text-white/60 text-xs">{new Date(date).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {projectTimeline.length === 0 && activityTimeline.length === 0 && (
                <div className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-white/35">
                  No timeline values have been recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Variables */}
          {variableEntries.length > 0 && (
            <div className="bg-white/3 border border-white/8 rounded-xl p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-white/40 uppercase tracking-wider">Variables</div>
                  <p className="mt-1 text-[11px] text-white/28">Autosaves and updates the contract preview.</p>
                </div>
                <div className="min-w-[64px] text-right text-[11px] text-white/30">
                  {variableSaving ? "Saving..." : variableSaved ? "Saved" : ""}
                </div>
              </div>
              <div className="space-y-3">
                {variableEntries.map(([key, value]) => (
                  <label key={key} className="block">
                    <span className="mb-1 block text-xs text-white/30 font-mono">{`{{${key}}}`}</span>
                    <input
                      type={inputTypeForVariable(key)}
                      value={value ?? ""}
                      onChange={(e) => updateVariable(key, e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/72 outline-none transition-colors placeholder:text-white/20 focus:border-sky-400/50"
                    />
                  </label>
                ))}
              </div>
              {variableError && (
                <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {variableError}
                </div>
              )}
              <div className="mt-3 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2 text-[11px] leading-relaxed text-white/34">
                Variables update the rendered contract body. Client profile fields remain unchanged unless edited elsewhere.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
