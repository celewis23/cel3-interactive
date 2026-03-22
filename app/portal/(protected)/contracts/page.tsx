"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Contract {
  _id: string;
  number: string;
  date: string;
  expiryDate: string;
  status: string;
  clientName: string;
  templateName: string | null;
  category: string;
  signingToken: string;
  signedAt: string | null;
  declinedAt: string | null;
  sentAt: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-yellow-100 text-yellow-700",
  signed: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
};

export default function PortalContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/contracts")
      .then((r) => r.json())
      .then((d) => { setContracts(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-16 text-center text-gray-400 text-sm">Loading contracts…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
        <p className="text-gray-500 text-sm mt-1">Review and sign contracts prepared for you.</p>
      </div>

      {contracts.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No contracts yet.</div>
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => {
            const needsSignature = ["sent", "viewed"].includes(c.status);
            return (
              <div
                key={c._id}
                className={`bg-white rounded-xl border p-5 ${
                  needsSignature ? "border-sky-200 ring-1 ring-sky-100" : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-900">{c.number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {c.status}
                      </span>
                    </div>
                    {c.templateName && (
                      <div className="text-sm text-gray-600">{c.templateName}</div>
                    )}
                    <div className="text-xs text-gray-400 mt-0.5">{c.date}</div>
                    {c.signedAt && (
                      <div className="text-xs text-green-600 mt-1">
                        Signed {new Date(c.signedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {needsSignature && (
                      <Link
                        href={`/contracts/${c.signingToken}`}
                        className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium transition-colors"
                      >
                        Review &amp; Sign
                      </Link>
                    )}
                    {c.status === "signed" && (
                      <Link
                        href={`/contracts/${c.signingToken}`}
                        className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm transition-colors"
                      >
                        View Contract
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
