"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type StripeCustomerSummary = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  description: string | null;
  created: number;
};

type ImportedContact = {
  _id: string;
  name: string;
  stripeCustomerId: string | null;
};

export default function StripeImportClient({
  customers,
  importedContacts,
}: {
  customers: StripeCustomerSummary[];
  importedContacts: ImportedContact[];
}) {
  const [query, setQuery] = useState("");
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importedMap, setImportedMap] = useState<Record<string, ImportedContact>>(
    Object.fromEntries(
      importedContacts
        .filter((contact) => contact.stripeCustomerId)
        .map((contact) => [contact.stripeCustomerId as string, contact])
    )
  );
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.email, customer.description, customer.id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [customers, query]);

  async function handleImport(customerId: string) {
    setImportingId(customerId);
    setError(null);
    try {
      const res = await fetch("/api/admin/pipeline/contacts/import-stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to import Stripe customer");
      }

      setImportedMap((prev) => ({
        ...prev,
        [customerId]: data.contact,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import Stripe customer");
    } finally {
      setImportingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/admin/pipeline/contacts" className="text-sm text-white/35 hover:text-white/70 transition-colors">
            ← Contacts
          </Link>
          <h1 className="text-2xl font-semibold text-white mt-2">Import From Stripe</h1>
          <p className="text-sm text-white/40 mt-1">
            Pull Stripe customers into your pipeline so billing, AI, and client records stay linked.
          </p>
        </div>
      </div>

      <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Stripe customers by name, email, or ID..."
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/25 outline-none focus:border-sky-500/50 transition-colors"
        />
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1.3fr_1fr_auto] gap-4 px-5 py-3 border-b border-white/8 text-xs text-white/40 uppercase tracking-wide">
          <span>Customer</span>
          <span>Stripe</span>
          <span>Action</span>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-white/30">No Stripe customers match that search.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((customer) => {
              const imported = importedMap[customer.id];
              return (
                <div key={customer.id} className="grid grid-cols-[1.3fr_1fr_auto] gap-4 px-5 py-4 items-center">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {customer.name ?? customer.email ?? customer.id}
                    </div>
                    {customer.email && <div className="text-xs text-white/45 mt-0.5 truncate">{customer.email}</div>}
                    {customer.description && <div className="text-xs text-white/25 mt-0.5 truncate">{customer.description}</div>}
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs text-white/30 font-mono truncate">{customer.id}</div>
                    {imported ? (
                      <Link
                        href={`/admin/pipeline/contacts/${imported._id}`}
                        className="inline-flex mt-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        Linked to {imported.name}
                      </Link>
                    ) : (
                      <div className="text-xs text-white/25 mt-1">Not imported yet</div>
                    )}
                  </div>

                  {imported ? (
                    <Link
                      href={`/admin/pipeline/contacts/${imported._id}`}
                      className="px-3 py-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 text-xs font-medium hover:bg-emerald-500/15 transition-colors"
                    >
                      View Client
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleImport(customer.id)}
                      disabled={importingId === customer.id}
                      className="px-3 py-1.5 rounded-lg border border-sky-500/25 bg-sky-500/10 text-sky-300 text-xs font-medium hover:bg-sky-500/15 transition-colors disabled:opacity-50"
                    >
                      {importingId === customer.id ? "Importing..." : "Import Client"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
