"use client";

import { useState, useEffect, useRef, memo } from "react";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import type { BillingCustomer } from "@/lib/stripe/billing";

function fmt(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function fmtCents(cents: number | null | undefined, currency = "usd") {
  if (cents == null) return null;
  return fmt(cents, currency);
}

const DASH = <span className="text-white/20">—</span>;

// Async cell — fetches lifetime value per customer without blocking page load
const LifetimeValueCell = memo(function LifetimeValueCell({
  customerId,
  currency,
}: {
  customerId: string;
  currency: string;
}) {
  const [value, setValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/billing/customers/${customerId}/lifetime-value`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setValue(data.lifetimeValue ?? 0);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [customerId]);

  if (loading)
    return <div className="w-16 h-3.5 bg-white/8 rounded animate-pulse" />;
  if (value === null) return DASH;
  if (value === 0) return <span className="text-sm text-white/25">$0</span>;
  return (
    <span className="text-sm text-white font-medium">
      {fmt(value, currency)}
    </span>
  );
});

type Col = {
  id: string;
  label: string;
  defaultOn: boolean;
  always?: boolean;
  render: (c: BillingCustomer) => React.ReactNode;
};

const COLUMNS: Col[] = [
  {
    id: "name",
    label: "Customer",
    defaultOn: true,
    always: true,
    render: (c) => (
      <div className="min-w-0">
        <div className="text-sm text-white font-medium truncate">
          {c.name ?? <span className="text-white/30 italic">No name</span>}
        </div>
        {c.phone && <div className="text-xs text-white/40 mt-0.5">{c.phone}</div>}
        {c.description && (
          <div className="text-xs text-white/30 mt-0.5 truncate">{c.description}</div>
        )}
        <div className="text-xs text-white/20 mt-0.5 font-mono">{c.id}</div>
      </div>
    ),
  },
  {
    id: "email",
    label: "Email",
    defaultOn: true,
    render: (c) =>
      c.email ? (
        <span className="text-sm text-white/70 truncate block max-w-[180px]">{c.email}</span>
      ) : DASH,
  },
  {
    id: "phone",
    label: "Phone",
    defaultOn: false,
    render: (c) => <span className="text-sm text-white/60">{c.phone ?? DASH}</span>,
  },
  {
    id: "description",
    label: "Description",
    defaultOn: false,
    render: (c) => (
      <span className="text-sm text-white/50 truncate block max-w-[200px]">
        {c.description ?? DASH}
      </span>
    ),
  },
  {
    id: "addressLine1",
    label: "Address",
    defaultOn: false,
    render: (c) => <span className="text-sm text-white/60">{c.addressLine1 ?? DASH}</span>,
  },
  {
    id: "addressCity",
    label: "City",
    defaultOn: false,
    render: (c) => <span className="text-sm text-white/60">{c.addressCity ?? DASH}</span>,
  },
  {
    id: "addressState",
    label: "State",
    defaultOn: false,
    render: (c) => <span className="text-sm text-white/60">{c.addressState ?? DASH}</span>,
  },
  {
    id: "addressPostalCode",
    label: "Postal",
    defaultOn: false,
    render: (c) => <span className="text-sm text-white/60">{c.addressPostalCode ?? DASH}</span>,
  },
  {
    id: "country",
    label: "Country",
    defaultOn: true,
    render: (c) => <span className="text-sm text-white/50">{c.country ?? DASH}</span>,
  },
  {
    id: "balance",
    label: "Account Credit",
    defaultOn: false,
    render: (c) =>
      c.balance === 0 ? (
        <span className="text-white/25">—</span>
      ) : c.balance < 0 ? (
        <span className="text-emerald-400 text-sm whitespace-nowrap">
          {fmt(Math.abs(c.balance), c.currency)} credit
        </span>
      ) : (
        <span className="text-amber-400 text-sm whitespace-nowrap">
          {fmt(c.balance, c.currency)} debit
        </span>
      ),
  },
  {
    id: "currency",
    label: "Currency",
    defaultOn: false,
    render: (c) => (
      <span className="text-sm text-white/50 uppercase">{c.currency ?? DASH}</span>
    ),
  },
  {
    id: "cashBalance",
    label: "Cash Balance",
    defaultOn: false,
    render: (c) => {
      if (!c.cashBalance) return DASH;
      const entries = Object.entries(c.cashBalance);
      if (!entries.length) return DASH;
      return (
        <div className="text-sm text-white/70 space-y-0.5">
          {entries.map(([cur, amt]) => (
            <div key={cur}>{fmt(amt, cur)}</div>
          ))}
        </div>
      );
    },
  },
  {
    id: "invoiceCreditBalance",
    label: "Invoice Credit",
    defaultOn: false,
    render: (c) => {
      if (!c.invoiceCreditBalance) return DASH;
      const entries = Object.entries(c.invoiceCreditBalance);
      if (!entries.length) return DASH;
      return (
        <div className="text-sm text-emerald-400 space-y-0.5">
          {entries.map(([cur, amt]) => (
            <div key={cur}>{fmt(Math.abs(amt), cur)}</div>
          ))}
        </div>
      );
    },
  },
  {
    id: "defaultPaymentMethod",
    label: "Payment Method",
    defaultOn: false,
    render: (c) => {
      if (!c.defaultPaymentMethodType) return DASH;
      if (c.defaultPaymentMethodBrand && c.defaultPaymentMethodLast4) {
        return (
          <span className="text-sm text-white/70 whitespace-nowrap">
            {c.defaultPaymentMethodBrand} ••{c.defaultPaymentMethodLast4}
          </span>
        );
      }
      return <span className="text-sm text-white/60">{c.defaultPaymentMethodType}</span>;
    },
  },
  {
    id: "subscriptionStatus",
    label: "Subscription",
    defaultOn: false,
    render: (c) => {
      if (!c.subscriptionStatus) return DASH;
      const map: Record<string, string> = {
        active: "bg-emerald-500/20 text-emerald-400",
        trialing: "bg-sky-500/20 text-sky-400",
        past_due: "bg-amber-500/20 text-amber-400",
        canceled: "bg-white/10 text-white/40",
        unpaid: "bg-red-500/20 text-red-400",
        paused: "bg-white/10 text-white/40",
      };
      return (
        <span
          className={`text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap ${map[c.subscriptionStatus] ?? "bg-white/10 text-white/40"}`}
        >
          {c.subscriptionStatus}
        </span>
      );
    },
  },
  {
    id: "subscriptionPlan",
    label: "Plan",
    defaultOn: false,
    render: (c) => {
      if (!c.subscriptionPlanAmount) return DASH;
      const amount = fmtCents(c.subscriptionPlanAmount);
      const nickname = c.subscriptionPlanNickname;
      const interval = c.subscriptionPlanInterval;
      return (
        <div className="text-sm">
          {nickname && <div className="text-white/70">{nickname}</div>}
          {amount && (
            <div className="text-white/40 text-xs">
              {amount}/{interval ?? "mo"}
            </div>
          )}
          {c.subscriptionCurrentPeriodEnd && (
            <div className="text-white/25 text-xs">
              renews {DateTime.fromSeconds(c.subscriptionCurrentPeriodEnd).toFormat("LLL d, yyyy")}
            </div>
          )}
        </div>
      );
    },
  },
  {
    id: "discountCoupon",
    label: "Discount",
    defaultOn: false,
    render: (c) => {
      if (!c.discountCouponName && c.discountCouponPercentOff == null) return DASH;
      return (
        <div className="text-sm">
          {c.discountCouponName && (
            <div className="text-white/70 truncate max-w-[120px]">{c.discountCouponName}</div>
          )}
          {c.discountCouponPercentOff != null && (
            <div className="text-emerald-400 text-xs">{c.discountCouponPercentOff}% off</div>
          )}
        </div>
      );
    },
  },
  {
    id: "delinquent",
    label: "Delinquent",
    defaultOn: false,
    render: (c) =>
      c.delinquent ? (
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
          Yes
        </span>
      ) : c.delinquent === false ? (
        <span className="text-xs text-white/30">No</span>
      ) : (
        DASH
      ),
  },
  {
    id: "taxExempt",
    label: "Tax Exempt",
    defaultOn: false,
    render: (c) =>
      c.taxExempt && c.taxExempt !== "none" ? (
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 capitalize">
          {c.taxExempt}
        </span>
      ) : (
        DASH
      ),
  },
  {
    id: "metadata",
    label: "Metadata",
    defaultOn: false,
    render: (c) => {
      const entries = Object.entries(c.metadata ?? {});
      if (!entries.length) return DASH;
      return (
        <div className="text-xs text-white/40 space-y-0.5 max-w-[160px]">
          {entries.slice(0, 3).map(([k, v]) => (
            <div key={k} className="truncate">
              <span className="text-white/25">{k}:</span> {v}
            </div>
          ))}
          {entries.length > 3 && (
            <div className="text-white/25">+{entries.length - 3} more</div>
          )}
        </div>
      );
    },
  },
  {
    id: "nextInvoiceSequence",
    label: "Invoice #",
    defaultOn: false,
    render: (c) => (
      <span className="text-sm text-white/50">{c.nextInvoiceSequence ?? DASH}</span>
    ),
  },
  {
    id: "preferredLocales",
    label: "Locales",
    defaultOn: false,
    render: (c) =>
      c.preferredLocales?.length ? (
        <span className="text-sm text-white/50">{c.preferredLocales.join(", ")}</span>
      ) : (
        DASH
      ),
  },
  {
    id: "livemode",
    label: "Live Mode",
    defaultOn: false,
    render: (c) =>
      c.livemode ? (
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
          Live
        </span>
      ) : (
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
          Test
        </span>
      ),
  },
  {
    id: "lifetimeValue",
    label: "Lifetime Value",
    defaultOn: true,
    render: (c) => <LifetimeValueCell customerId={c.id} currency={c.currency} />,
  },
  {
    id: "created",
    label: "Created",
    defaultOn: true,
    render: (c) => (
      <div className="flex items-center gap-2.5 whitespace-nowrap">
        <span className="text-xs text-white/40">
          {DateTime.fromSeconds(c.created).toFormat("LLL d, yyyy")}
        </span>
        <a
          href={`https://dashboard.stripe.com/customers/${c.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/25 hover:text-sky-400 transition-colors"
          title="Open in Stripe"
          onClick={(e) => e.stopPropagation()}
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
      </div>
    ),
  },
];

const LS_KEY = "cel3_customers_columns";
const DEFAULT_ON = new Set(COLUMNS.filter((c) => c.defaultOn || c.always).map((c) => c.id));

interface Props {
  customers: BillingCustomer[];
  hasMore: boolean;
}

export default function CustomersTable({ customers, hasMore }: Props) {
  const router = useRouter();
  const [visible, setVisible] = useState<Set<string>>(DEFAULT_ON);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Load from localStorage after mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setVisible(new Set(JSON.parse(raw)));
    } catch { /* ignore */ }
  }, []);

  // Close picker on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    if (pickerOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  function toggle(id: string) {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try { localStorage.setItem(LS_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }

  const activeCols = COLUMNS.filter((col) => visible.has(col.id));

  if (customers.length === 0) {
    return (
      <div className="bg-white/3 border border-white/8 rounded-2xl p-12 text-center">
        <p className="text-white/40 text-sm">No customers yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
      {/* Column picker toolbar */}
      <div className="flex items-center justify-end px-4 py-2.5 border-b border-white/8">
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white bg-white/5 hover:bg-white/8 border border-white/8 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            Columns
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {pickerOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 bg-[#111] border border-white/10 rounded-xl shadow-2xl p-3 w-56 max-h-[420px] overflow-y-auto">
              <p className="text-xs text-white/30 uppercase tracking-wide mb-2 px-1">
                Visible columns
              </p>
              {COLUMNS.map((col) => (
                <label
                  key={col.id}
                  className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-white/5 transition-colors ${col.always ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={visible.has(col.id)}
                    onChange={() => !col.always && toggle(col.id)}
                    className="accent-sky-400 w-3.5 h-3.5"
                  />
                  <span className="text-sm text-white/70">{col.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="border-b border-white/8">
              {activeCols.map((col) => (
                <th
                  key={col.id}
                  className="text-left text-xs text-white/40 uppercase tracking-wide px-5 py-3 font-medium whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {customers.map((c) => (
              <tr
                key={c.id}
                onClick={() => router.push(`/admin/billing/customers/${c.id}`)}
                className="hover:bg-white/2 transition-colors cursor-pointer"
              >
                {activeCols.map((col) => (
                  <td key={col.id} className="px-5 py-3.5 align-top">
                    {col.render(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="px-5 py-3 border-t border-white/8 text-center text-xs text-white/30">
          Showing first 50 customers
        </div>
      )}
    </div>
  );
}
