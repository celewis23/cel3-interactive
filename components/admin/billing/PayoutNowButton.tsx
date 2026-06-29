"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BalanceOption = {
  amount: number;
  currency: string;
  sourceTypes: Record<string, number> | null;
};

type PayoutMethod = "standard" | "instant";

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

function positiveBalances(balances: BalanceOption[]) {
  return balances.filter((item) => item.amount > 0);
}

function getPreferredBalance(balances: BalanceOption[], currency?: string) {
  if (currency) {
    const matching = balances.find((item) => item.currency === currency && item.amount > 0);
    if (matching) return matching;
  }
  return balances.find((item) => item.currency === "usd" && item.amount > 0) ?? balances.find((item) => item.amount > 0) ?? null;
}

export default function PayoutNowButton({
  available,
  instantAvailable = [],
}: {
  available: BalanceOption[];
  instantAvailable?: BalanceOption[];
}) {
  const router = useRouter();
  const standardBalances = positiveBalances(available);
  const instantBalances = positiveBalances(instantAvailable);
  const defaultMethod: PayoutMethod = standardBalances.length > 0 ? "standard" : "instant";
  const defaultBalance =
    getPreferredBalance(defaultMethod === "instant" ? instantBalances : standardBalances) ??
    getPreferredBalance(instantBalances) ??
    getPreferredBalance(standardBalances);
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState(defaultBalance?.currency ?? "usd");
  const [method, setMethod] = useState<PayoutMethod>(defaultMethod);
  const [sourceType, setSourceType] = useState("");
  const selectedBalances = method === "instant" ? instantBalances : standardBalances;
  const selectedBalance = getPreferredBalance(selectedBalances, currency);
  const [amount, setAmount] = useState(defaultBalance ? dollars(defaultBalance.amount) : "");
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
    const nextBalance = getPreferredBalance(selectedBalances, nextCurrency);
    setAmount(nextBalance ? dollars(nextBalance.amount) : "");
    setSourceType("");
  }

  function updateMethod(nextMethod: PayoutMethod) {
    setMethod(nextMethod);
    const nextBalances = nextMethod === "instant" ? instantBalances : standardBalances;
    const nextBalance = getPreferredBalance(nextBalances, currency) ?? getPreferredBalance(nextBalances);
    setCurrency(nextBalance?.currency ?? currency);
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
          balanceType: method === "instant" ? "instant_available" : "available",
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

  if (standardBalances.length === 0 && instantBalances.length === 0) {
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
          {standardBalances.length === 0 && method === "instant" && (
            <p className="mb-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs leading-5 text-emerald-200">
              Instant payout is using eligible instant-available funds. Stripe includes eligible pending funds here when they can be paid out to an instant destination.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Currency</label>
              <select value={currency} onChange={(e) => updateCurrency(e.target.value)} className={inputClass}>
                {selectedBalances.map((item) => (
                    <option key={item.currency} value={item.currency}>
                      {item.currency.toUpperCase()} {method === "instant" ? "instant" : "available"}: {money(item.amount, item.currency)}
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
              <select value={method} onChange={(e) => updateMethod(e.target.value as PayoutMethod)} className={inputClass}>
                <option value="standard" disabled={standardBalances.length === 0}>Standard</option>
                <option value="instant" disabled={instantBalances.length === 0}>Instant to debit card, if eligible</option>
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
            Standard payouts use available balance. Instant payouts use Stripe's instant-available
            balance, which can include eligible pending funds for a debit-card payout.
          </p>
          {success && <p className="mt-3 text-xs text-emerald-400">{success}</p>}
          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
