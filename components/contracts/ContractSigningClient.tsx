"use client";

import { useState } from "react";
import SignatureCanvas from "./SignatureCanvas";

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
  body: string;
  signerName: string | null;
}

interface Props {
  contract: Contract;
  token: string;
}

type SigTab = "draw" | "type" | "upload";

export default function ContractSigningClient({ contract, token }: Props) {
  const [status, setStatus] = useState(contract.status);
  const [signerName, setSignerName] = useState(contract.clientName || "");
  const [sigTab, setSigTab] = useState<SigTab>("draw");
  const [drawnSig, setDrawnSig] = useState<string | null>(null);
  const [typedSig, setTypedSig] = useState("");
  const [uploadedSig, setUploadedSig] = useState<string | null>(null);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"signed" | "declined" | null>(
    ["signed", "declined", "expired"].includes(contract.status)
      ? (contract.status as "signed" | "declined")
      : null
  );

  function getSignatureData(): string | null {
    if (sigTab === "draw") return drawnSig;
    if (sigTab === "type" && typedSig.trim()) {
      // Render typed signature to canvas
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 200;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 600, 200);
      ctx.font = "italic 52px Georgia, serif";
      ctx.fillStyle = "#111";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(typedSig.trim(), 300, 100);
      return canvas.toDataURL("image/png");
    }
    if (sigTab === "upload") return uploadedSig;
    return null;
  }

  async function handleSign() {
    setError(null);
    const signatureData = getSignatureData();
    if (!signatureData) {
      setError("Please provide a signature.");
      return;
    }
    if (!signerName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!agreementChecked) {
      setError("Please confirm your agreement to sign electronically.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/contracts/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sign",
          signatureData,
          signatureType: sigTab,
          signerName: signerName.trim(),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to sign.");
        return;
      }
      setStatus("signed");
      setDone("signed");
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecline() {
    if (!confirm("Are you sure you want to decline this contract?")) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/contracts/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to decline.");
        return;
      }
      setStatus("declined");
      setDone("declined");
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") setUploadedSig(result);
    };
    reader.readAsDataURL(file);
  }

  if (done === "signed") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-green-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Contract Signed</h1>
          <p className="text-gray-600">
            Thank you, <strong>{contract.clientName}</strong>. Contract {contract.number} has been signed.
            A confirmation has been sent to{" "}
            {contract.clientEmail ? <strong>{contract.clientEmail}</strong> : "you"}.
          </p>
        </div>
      </div>
    );
  }

  if (done === "declined") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
            <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-gray-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Contract Declined</h1>
          <p className="text-gray-600">You have declined contract {contract.number}. You can close this window.</p>
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Contract Expired</h1>
          <p className="text-gray-600">This contract has expired. Please contact us for a new version.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-gray-900">CEL3 Interactive</div>
            <div className="text-sm text-gray-500">Contract for Signature</div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-gray-900">{contract.number}</div>
            <div className="text-sm text-gray-500">{contract.date}</div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Client info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Prepared for</div>
          <div className="font-semibold text-gray-900 text-lg">{contract.clientName}</div>
          {contract.clientCompany && <div className="text-gray-500">{contract.clientCompany}</div>}
          {contract.clientEmail && <div className="text-gray-500 text-sm">{contract.clientEmail}</div>}
        </div>

        {/* Contract body */}
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div
            className="prose prose-gray max-w-none text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: contract.body }}
          />
        </div>

        {/* Signing form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 print:hidden">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Sign this contract</h2>

          <div className="space-y-5">
            {/* Signer name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Your full legal name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Signature method tabs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Signature <span className="text-red-500">*</span>
              </label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-3 w-fit">
                {(["draw", "type", "upload"] as SigTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSigTab(tab)}
                    className={`px-4 py-2 text-sm font-medium transition-colors capitalize ${
                      sigTab === tab
                        ? "bg-sky-500 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {sigTab === "draw" && (
                <SignatureCanvas onChange={setDrawnSig} />
              )}

              {sigTab === "type" && (
                <div>
                  <input
                    type="text"
                    value={typedSig}
                    onChange={(e) => setTypedSig(e.target.value)}
                    placeholder="Type your name"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-2xl italic focus:outline-none focus:ring-2 focus:ring-sky-500"
                    style={{ fontFamily: "Georgia, serif" }}
                  />
                  {typedSig && (
                    <p className="text-xs text-gray-400 mt-1">
                      This typed signature will be rendered in italic script.
                    </p>
                  )}
                </div>
              )}

              {sigTab === "upload" && (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    className="block text-sm text-gray-600"
                  />
                  {uploadedSig && (
                    <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden bg-white inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={uploadedSig} alt="Uploaded signature" className="h-20 w-auto" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Agreement checkbox */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreementChecked}
                onChange={(e) => setAgreementChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-sky-500 focus:ring-sky-500"
              />
              <span className="text-sm text-gray-600">
                I agree to sign this contract electronically. I understand my electronic signature has the same legal effect as a handwritten signature.
              </span>
            </label>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSign}
                disabled={submitting}
                className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {submitting ? "Signing…" : "Sign Contract"}
              </button>
              <button
                type="button"
                onClick={handleDecline}
                disabled={submitting}
                className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm transition-colors"
              >
                Decline
              </button>
            </div>
          </div>
        </div>

        {/* Legal footer */}
        <p className="text-center text-xs text-gray-400 print:hidden pb-8">
          This contract was prepared by CEL3 Interactive. Your signature is legally binding.
          The signing timestamp and IP address are recorded for legal record-keeping.
        </p>
      </div>
    </div>
  );
}
