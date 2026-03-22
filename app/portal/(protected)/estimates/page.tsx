"use client";
import { useState, useEffect } from "react";

type Estimate = {
  _id: string;
  number: string;
  date: string;
  expiryDate: string;
  status: string;
  clientName: string;
  clientCompany: string | null;
  total: number;
  currency: string;
  approvalToken: string;
  sentAt: string | null;
  approvedAt: string | null;
  declinedAt: string | null;
  stripeInvoiceId: string | null;
  lineItems: Array<{ _key: string; description: string; quantity: number; rate: number; amount: number }>;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  notes: string | null;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  sent: { label: "Awaiting response", cls: "bg-sky-500/10 text-sky-400" },
  viewed: { label: "Viewed — awaiting response", cls: "bg-yellow-500/10 text-yellow-400" },
  approved: { label: "Approved", cls: "bg-green-500/10 text-green-400" },
  declined: { label: "Declined", cls: "bg-red-500/10 text-red-400" },
  expired: { label: "Expired", cls: "bg-white/5 text-white/30" },
};

function money(dollars: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dollars);
}

export default function PortalEstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Estimate | null>(null);
  const [acting, setActing] = useState(false);
  const [actionResult, setActionResult] = useState<Record<string, "approved" | "declined">>({});

  useEffect(() => {
    fetch("/api/portal/estimates")
      .then((r) => r.json())
      .then((d) => { setEstimates(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleAction(estimateId: string, action: "approve" | "decline") {
    setActing(true);
    try {
      const res = await fetch("/api/portal/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimateId, action }),
      });
      if (res.ok) {
        const newStatus = action === "approve" ? "approved" : "declined";
        setActionResult((prev) => ({ ...prev, [estimateId]: newStatus }));
        setEstimates((prev) =>
          prev.map((e) => (e._id === estimateId ? { ...e, status: newStatus } : e))
        );
        if (selected?._id === estimateId) {
          setSelected((prev) => prev ? { ...prev, status: newStatus } : null);
        }
      }
    } finally {
      setActing(false);
    }
  }

  const pending = estimates.filter((e) => ["sent", "viewed"].includes(e.status));
  const others = estimates.filter((e) => !["sent", "viewed"].includes(e.status));

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-32 bg-white/5 rounded-lg animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-white/3 border border-white/8 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Estimates</h1>
        <p className="text-sm text-white/40 mt-1">{estimates.length} total</p>
      </div>

      {estimates.length === 0 && (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-8 text-center">
          <p className="text-white/40 text-sm">No estimates yet.</p>
        </div>
      )}

      {pending.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
            Awaiting your response
          </h2>
          <div className="flex flex-col gap-3">
            {pending.map((e) => {
              const effectiveStatus = actionResult[e._id] ? (actionResult[e._id] === "approved" ? "approved" : "declined") : e.status;
              const done = ["approved", "declined"].includes(effectiveStatus);
              return (
                <div
                  key={e._id}
                  className="bg-white/3 border border-sky-500/20 rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-base font-medium text-white">{e.number}</h3>
                      <p className="text-xs text-white/40 mt-0.5">
                        Valid until{" "}
                        {new Date(e.expiryDate).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-white flex-shrink-0">{money(e.total)}</p>
                  </div>

                  {/* Line items preview */}
                  {e.lineItems?.length > 0 && (
                    <div className="border-t border-white/8 pt-3 mb-4">
                      {e.lineItems.map((item) => (
                        <div key={item._key} className="flex justify-between text-sm py-0.5">
                          <span className="text-white/60">{item.description}</span>
                          <span className="text-white/60">{money(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {e.notes && (
                    <p className="text-xs text-white/40 mb-4 leading-relaxed">{e.notes}</p>
                  )}

                  {done ? (
                    <div className={`text-sm px-3 py-2 rounded-lg ${effectiveStatus === "approved" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                      {effectiveStatus === "approved" ? "You approved this estimate." : "You declined this estimate."}
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAction(e._id, "approve")}
                        disabled={acting}
                        className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-black font-semibold text-sm transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(e._id, "decline")}
                        disabled={acting}
                        className="px-4 py-2 rounded-xl border border-white/10 hover:border-white/20 text-white/60 hover:text-white text-sm transition-colors"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => setSelected(e)}
                        className="px-4 py-2 rounded-xl border border-white/10 hover:border-white/20 text-white/60 hover:text-white text-sm transition-colors ml-auto"
                      >
                        View details
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
            History
          </h2>
          <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Number</th>
                  <th className="px-4 py-3 text-left text-xs text-white/40 font-medium hidden sm:table-cell">Date</th>
                  <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Status</th>
                  <th className="px-4 py-3 text-right text-xs text-white/40 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {others.map((e) => {
                  const s = STATUS[e.status] ?? { label: e.status, cls: "text-white/40" };
                  return (
                    <tr
                      key={e._id}
                      className="hover:bg-white/2 cursor-pointer transition-colors"
                      onClick={() => setSelected(e)}
                    >
                      <td className="px-4 py-3 text-sm text-white">{e.number}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-white/40">
                          {new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-white">{money(e.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/60" onClick={() => setSelected(null)} />
          <div className="w-full max-w-md bg-[#111] border-l border-white/8 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/8">
              <h3 className="text-base font-medium text-white">{selected.number}</h3>
              <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white transition-colors">✕</button>
            </div>
            <div className="flex-1 p-5 flex flex-col gap-5">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Date</span>
                <span className="text-white">{new Date(selected.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
              </div>
              {selected.lineItems?.map((item) => (
                <div key={item._key} className="flex justify-between text-sm">
                  <span className="text-white/70">{item.description} × {item.quantity}</span>
                  <span className="text-white">{money(item.amount)}</span>
                </div>
              ))}
              <div className="border-t border-white/8 pt-3">
                {selected.subtotal !== selected.total && (
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/50">Subtotal</span>
                    <span className="text-white">{money(selected.subtotal)}</span>
                  </div>
                )}
                {selected.taxAmount > 0 && (
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/50">Tax</span>
                    <span className="text-white">{money(selected.taxAmount)}</span>
                  </div>
                )}
                {selected.discountAmount > 0 && (
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/50">Discount</span>
                    <span className="text-green-400">−{money(selected.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold pt-1">
                  <span className="text-white">Total</span>
                  <span className="text-white">{money(selected.total)}</span>
                </div>
              </div>
              {selected.notes && (
                <p className="text-xs text-white/40 leading-relaxed">{selected.notes}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
