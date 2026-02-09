"use client";

import { useState } from "react";

export default function AssessmentPaymentCard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function startCheckout() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/stripe/assessment", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; url?: string; message?: string };

      if (!res.ok || !data.url) {
        throw new Error(data.message || "Unable to start checkout.");
      }

      window.location.href = data.url;
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 p-6 lg:sticky lg:top-6 lg:h-fit">
      <h2 className="text-xl font-semibold">Pay to book your assessment</h2>

      <p className="mt-2 text-white/50">
        Payment is required before scheduling. This ensures focused sessions and protects time.
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between text-[rgb(var(--accent))]">
          <span className="font-semibold">Digital Systems Assessment</span>
          <span className="text-lg font-semibold">$150</span>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          After payment, you’ll be guided to scheduling and next steps.
        </p>
      </div>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      <button
        onClick={startCheckout}
        disabled={loading}
        className="mt-6 w-full rounded-xl bg-[rgb(var(--accent))] px-4 py-2.5 font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Redirecting…" : "Pay $150 to Continue"}
      </button>

      <p className="mt-4 text-xs text-white/50">
        You can cancel anytime before completing payment.
      </p>
    </div>
  );
}
