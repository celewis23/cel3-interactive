"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BalanceOption = {
  amount: number;
  currency: string;
  sourceTypes: Record<string, number> | null;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-400/50";
const labelClass = "mb-1.5 block text-xs font-medium text-white/50";

function money(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function dollars(cents: number) {
  return (cents / 100).toFixed(2);
}

export default function PayoutNowButton({ available }: { available: BalanceOption[] }) {
  const router = useRouter();
  const usdBalance = available.find((item) => item.currency === "usd") ?? available[0] ?? null;
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState(usdBalance?.currency ?? "usd");
  const selectedBalance = available.find((item) => item.currency === currency) ?? usdBalance;
  const [amount, setAmount] = useState(selectedBalance ? dollars(selectedBalance.amount) : "");
  const [method, setMethod] = useState<"standard" | "instant">("standard");
  const [sourceType, setSourceType] = useState("");
  const [description, setDescription] = useState("Manual admin payout");
  const [statementDescriptor, setStatementDescriptor] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const sourceTypeEntries = Object.entries(selectedBalance?.sourceTypes ?? {}).filter(
    ([, value]) => value > 0
  );

  function updateCurrency(nextCurrency: string) {
    setCurrency(nextCurrency);
    const nextBalance = available.find((item) => item.currency === nextCurrency);
    setAmount(nextBalance ? dollars(nextBalance.amount) : "");
    setSourceType("");
  }

  async function submitPayout() {
    if (!confirm(`Initiate a ${method} payout for ${currency.toUpperCase()} ${amount}?`)) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/billing/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency,
          method,
          sourceType: sourceType || undefined,
          description,
          statementDescriptor,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create payout.");
        return;
      }
      setSuccess(`Payout ${data.id} created for ${money(data.amount, data.currency)}.`);
      router.refresh();
    } catch {
      setError("Unexpected error creating payout.");
    } finally {
      setLoading(false);
    }
  }

  if (!usdBalance || available.every((item) => item.amount <= 0)) {
    return (
      <button
        type="button"
        disabled
        className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/30"
      >
        No available payout balance
      </button>
    );
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-400"
      >
        Pay out now
      </button>

      {open && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/35 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Currency</label>
              <select value={currency} onChange={(e) => updateCurrency(e.target.value)} className={inputClass}>
                {available
                  .filter((item) => item.amount > 0)
                  .map((item) => (
                    <option key={item.currency} value={item.currency}>
                      {item.currency.toUpperCase()} available: {money(item.amount, item.currency)}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Amount</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value as "standard" | "instant")} className={inputClass}>
                <option value="standard">Standard</option>
                <option value="instant">Instant, if eligible</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Source type</label>
              <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className={inputClass}>
                <option value="">Default balance</option>
                {sourceTypeEntries.map(([key, value]) => (
                  <option key={key} value={key}>
                    {key.replace("_", " ")}: {money(value, currency)}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Statement descriptor</label>
              <input
                value={statementDescriptor}
                maxLength={22}
                onChange={(e) => setStatementDescriptor(e.target.value)}
                className={inputClass}
                placeholder="Optional, 22 chars max"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={submitPayout}
              disabled={loading}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-400 disabled:opacity-50"
            >
              {loading ? "Creating payout..." : "Confirm payout"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/8 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <p className="mt-3 text-xs leading-5 text-white/35">
            Stripe will reject the payout if the selected balance, destination, or instant payout
            eligibility is not available.
          </p>
          {success && <p className="mt-3 text-xs text-emerald-400">{success}</p>}
          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
