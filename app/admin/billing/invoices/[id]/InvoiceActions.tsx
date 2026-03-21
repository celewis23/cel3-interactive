"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InvoiceActions({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"send" | "void" | null>(null);
  const [error, setError] = useState("");

  const canSend = status === "draft" || status === "open";
  const canVoid = status === "open" || status === "draft";

  async function handleSend() {
    if (!confirm("Send this invoice to the customer?")) return;
    setError("");
    setLoading("send");
    try {
      const res = await fetch(`/api/admin/billing/invoices/${invoiceId}/send`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to send invoice.");
        return;
      }
      router.refresh();
    } catch {
      setError("Unexpected error sending invoice.");
    } finally {
      setLoading(null);
    }
  }

  async function handleVoid() {
    if (!confirm("Void this invoice? This cannot be undone.")) return;
    setError("");
    setLoading("void");
    try {
      const res = await fetch(`/api/admin/billing/invoices/${invoiceId}/void`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to void invoice.");
        return;
      }
      router.refresh();
    } catch {
      setError("Unexpected error voiding invoice.");
    } finally {
      setLoading(null);
    }
  }

  if (!canSend && !canVoid) return null;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        {canSend && (
          <button
            onClick={handleSend}
            disabled={loading !== null}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            {loading === "send" ? (
              <>
                <svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending...
              </>
            ) : (
              <>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
                Send Invoice
              </>
            )}
          </button>
        )}
        {canVoid && (
          <button
            onClick={handleVoid}
            disabled={loading !== null}
            className="flex items-center gap-2 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-white/60 hover:text-red-400 text-sm px-4 py-2 rounded-xl transition-colors"
          >
            {loading === "void" ? (
              <>
                <svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Voiding...
              </>
            ) : (
              "Void"
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
