"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AnnualSettings } from "@/lib/billing/annualStatementService";
import { money, totalsByCurrency, type ClientStatement } from "@/lib/billing/annualStatements";

type Project = { id: string; name: string };
type Client = { id: string; name: string; email: string };
type HostingPreview = { year: number; warnings: string[]; breakdown: { client: string; provider: string; currency: string; amountCents: number }[] };
type Delivery = { _id: string; recipientKey: string; sentAt?: string; startedAt?: string; status?: string };

export default function AnnualStatementsPage() {
  const [settings, setSettings] = useState<AnnualSettings | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [customerId, setCustomerId] = useState("");
  const [preview, setPreview] = useState<ClientStatement | null>(null);
  const [hosting, setHosting] = useState<HostingPreview | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState("vercel");
  const [invoiceReference, setInvoiceReference] = useState("");
  const [paidDate, setPaidDate] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [allocations, setAllocations] = useState([{ projectId: "shared", amount: "" }]);
  const [confirmed, setConfirmed] = useState(false);
  const inputClass = "w-full rounded-lg border border-white/20 bg-black p-2 text-white";
  const buttonClass = "rounded-lg border border-white/20 px-4 py-2 text-sm text-white disabled:opacity-40";
  const panelClass = "space-y-4 rounded-2xl border border-white/10 p-5";

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    fetch(`/api/admin/annual-statements?year=${year}`, { cache: "no-store" }).then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (!cancelled) { setSettings(data.settings); setProjects(data.projects); setClients(data.clients); setDeliveries(data.deliveries); setError(""); setPreview(null); setHosting(null); }
    }).catch(err => { if (!cancelled) setError(err.message); }).finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [year]);

  async function post(body: unknown) {
    const res = await fetch("/api/admin/annual-statements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }
  async function action(work: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await work(); } catch (err) { setError(err instanceof Error ? err.message : "Request failed"); } finally { setBusy(false); }
  }
  async function loadPreview(kind: "client" | "hosting") {
    await action(async () => {
      const res = await fetch(`/api/admin/annual-statements?year=${year}&action=${kind}${kind === "client" ? `&customerId=${encodeURIComponent(customerId)}` : ""}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (kind === "client") setPreview(data.statement); else setHosting(data.report);
    });
  }
  async function sendOne(recipientKey: string) {
    await action(async () => {
      const result = await post({ action: "send", year, recipientKey, confirmSend: true });
      const res = await fetch(`/api/admin/annual-statements?year=${year}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setDeliveries(data.deliveries);
      setNotice(result.status === "already_sent" ? "This statement has already been sent. No duplicate was sent." : "Statement sent successfully.");
    });
  }
  function minorUnits(value: string) {
    const digits = new Intl.NumberFormat("en-US", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
    if (!/^-?\d+(\.\d+)?$/.test(value)) throw new Error("Enter a payment amount, or a negative amount for a refund");
    const exact = Number(value) * 10 ** digits;
    if (Math.abs(exact - Math.round(exact)) > 0.00001) throw new Error(`Use no more than ${digits} decimal places for ${currency}`);
    return Math.round(exact);
  }
  return <div className="mx-auto max-w-4xl space-y-6 pb-24 text-sm text-white/80">
    <Link href="/admin/billing" className="text-sky-300">← Billing</Link>
    <h1 className="text-2xl font-semibold text-white">Annual statements</h1>
    <p>Statements for the previous calendar year are sent starting January 15, in New York time. Each client receives their own payment statement. Hosting payments and internal platform costs are sent only to you.</p>
    {error && <p role="alert" className="rounded-xl border border-red-400/30 p-4 text-red-300">{error}</p>}
    {notice && <p role="status" className="text-emerald-300">{notice}</p>}
    {settings && <section className={panelClass}>
      <h2 className="text-lg font-semibold text-white">Automatic delivery</h2>
      <label className="flex gap-2"><input type="checkbox" checked={settings.enabled} onChange={event => setSettings({ ...settings, enabled: event.target.checked })} /> Send annual statements automatically on January 15</label>
      <label className="block">Your hosting statement email<input className={inputClass} type="email" value={settings.ownerEmail} onChange={event => setSettings({ ...settings, ownerEmail: event.target.value })} /></label>
      <p>Turn automatic sending on or off for each recipient below. Save settings to apply changes. Manual sending remains available when automatic delivery is off.</p>
      <div className="space-y-3">{[{ id: "owner-hosting", name: "Your hosting statement", email: settings.ownerEmail }, ...clients].map(client => {
        const delivery = deliveries.find(row => row.recipientKey === client.id);
        return <div key={client.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 p-3">
          <div className="min-w-0 break-words"><p className="font-semibold">{client.name}</p><p className="text-white/50">{client.email || "Missing email"}</p><p>{delivery?.sentAt ? `Sent ${new Date(delivery.sentAt).toLocaleString()}` : delivery?.status ?? (delivery?.startedAt ? "Delivery pending — retry safely or inspect provider logs" : "Not sent for selected year")}</p></div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!settings.disabledRecipients?.includes(client.id)} onChange={event => setSettings({ ...settings, disabledRecipients: event.target.checked ? (settings.disabledRecipients ?? []).filter(key => key !== client.id) : [...(settings.disabledRecipients ?? []), client.id] })} />Automatic</label>
        </div>;
      })}</div>
      <p className="text-white/50">Clients are matched by their Stripe customer ID in CEL3 records, not by project-name guesses. Link each Meterwise project below; internal projects can stay with CEL3.</p>
      <div className="max-h-80 space-y-3 overflow-y-auto">
        {projects.map(project => <label key={project.id} className="grid gap-2 sm:grid-cols-2"><span>{project.name}</span>
          <select className={inputClass} value={settings.mappings.find(mapping => mapping.projectId === project.id)?.customerId ?? (settings.mappings.some(mapping => mapping.projectId === project.id) ? "internal" : "")}
            onChange={event => {
              const value = event.target.value;
              const mappings = settings.mappings.filter(mapping => mapping.projectId !== project.id);
              if (value) mappings.push({ projectId: project.id, customerId: value === "internal" ? null : value, label: "" });
              setSettings({ ...settings, mappings });
            }}>
            <option value="">Needs client mapping</option><option value="internal">CEL3 / internal project</option>
            {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </label>)}
      </div>
      <button disabled={busy} className={buttonClass} onClick={() => action(async () => { await post({ action: "settings", ...settings }); setNotice("Annual statement settings saved."); })}>Save settings</button>
    </section>}
    <section className={panelClass}>
      <h2 className="text-lg font-semibold text-white">Review statements</h2>
      <label className="block">Calendar year<input className={inputClass} type="number" min="2020" max={new Date().getFullYear()} value={year} onChange={event => setYear(Number(event.target.value))} /></label>
      <select aria-label="Client statement" className={inputClass} value={customerId} onChange={event => setCustomerId(event.target.value)}><option value="">Choose a client</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select>
      <div className="flex flex-wrap gap-3"><button className={buttonClass} disabled={busy || !customerId} onClick={() => loadPreview("client")}>Preview client statement</button><button className={buttonClass} disabled={busy} onClick={() => loadPreview("hosting")}>Preview hosting statement</button></div>
      {busy && <p role="status">Loading…</p>}
      {preview && <div className="space-y-2"><h3 className="font-semibold">{preview.name} — {preview.year}</h3>
        {Object.entries(totalsByCurrency(preview.lines)).map(([currency, total]) => <p key={currency}>Paid: {money(total.payments, currency)} · Refunds: {money(total.refunds, currency)} · Net: {money(total.net, currency)}</p>)}
        {!preview.lines.length && <p>No Stripe payments or refunds recorded in this year.</p>}
        <a className="text-sky-300" href={`/api/admin/annual-statements?action=client&year=${preview.year}&customerId=${preview.customerId}&download=pdf`}>Download client PDF</a>
        <p>Send to {preview.email || "missing email"}. Review the statement before sending.</p>
        <button className={buttonClass} disabled={busy || year >= new Date().getFullYear() || !preview.lines.length || !preview.email || !!deliveries.find(row => row.recipientKey === preview.customerId)?.sentAt} onClick={() => sendOne(preview.customerId)}>Send this client statement</button>
        <ul className="space-y-2">{preview.lines.map(line => <li key={line.id} className="break-words border-t border-white/10 pt-2">{line.date} · {line.description} · {money(line.amountCents, line.currency)}</li>)}</ul>
      </div>}
      {hosting && <div className="space-y-2"><h3 className="font-semibold">Confirmed hosting payments</h3>
        <a className="text-sky-300" href={`/api/admin/annual-statements?action=hosting&year=${hosting.year}&download=pdf`}>Download hosting PDF</a>
        {hosting.breakdown.map((row, index) => <p key={index}>{row.client} · {row.provider} · {money(row.amountCents, row.currency)}</p>)}
        <h3 className="font-semibold text-amber-200">Reconciliation notes</h3><ul className="list-inside list-disc space-y-2 text-amber-100/80">{hosting.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
        <p>Send to saved hosting statement email: {settings?.ownerEmail}. Save any email changes before sending.</p>
        <button className={buttonClass} disabled={busy || year >= new Date().getFullYear() || !!deliveries.find(row => row.recipientKey === "owner-hosting")?.sentAt} onClick={() => sendOne("owner-hosting")}>Send my hosting statement</button>
      </div>}
      {!!deliveries.length && <div><h3 className="font-semibold">Delivery history</h3><ul className="space-y-2">{deliveries.map(row => <li key={row._id}>{clients.find(client => client.id === row.recipientKey)?.name ?? row.recipientKey} — {row.sentAt ? `Sent ${new Date(row.sentAt).toLocaleDateString()}` : row.status ?? "Pending — inspect provider logs if more than 23 hours old"}</li>)}</ul></div>}
    </section>
    <section className={panelClass}>
      <h2 className="text-lg font-semibold text-white">Record a paid hosting invoice</h2>
      <p>Use the actual amount and payment date from a provider receipt. Enter refunds as negative amounts with their own refund reference. Estimates and recurring plan prices stay outside paid totals. Split shared invoices across projects, or keep them in shared overhead.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>Platform<input className={inputClass} value={provider} onChange={event => setProvider(event.target.value)} /></label>
        <label>Provider invoice / payment / refund reference<input className={inputClass} value={invoiceReference} onChange={event => setInvoiceReference(event.target.value)} /></label>
        <label>Payment date<input className={inputClass} type="date" value={paidDate} onChange={event => setPaidDate(event.target.value)} /></label>
        <label>Currency<select className={inputClass} value={currency} onChange={event => setCurrency(event.target.value)}>{["USD", "EUR", "GBP", "CAD", "AUD", "JPY"].map(code => <option key={code}>{code}</option>)}</select></label>
        <label>Total paid (negative for a refund)<input className={inputClass} inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} /></label>
      </div>
      {allocations.map((row, index) => <div key={index} className="flex flex-wrap gap-2">
        <select aria-label={`Project allocation ${index + 1}`} className={`${inputClass} sm:!w-auto sm:flex-1`} value={row.projectId} onChange={event => setAllocations(allocations.map((item, i) => i === index ? { ...item, projectId: event.target.value } : item))}><option value="shared">Shared overhead</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
        <input aria-label={`Allocated amount ${index + 1}`} className={`${inputClass} sm:!w-32`} inputMode="decimal" placeholder="Amount" value={row.amount} onChange={event => setAllocations(allocations.map((item, i) => i === index ? { ...item, amount: event.target.value } : item))} />
        {allocations.length > 1 && <button className={buttonClass} onClick={() => setAllocations(allocations.filter((_, i) => i !== index))}>Remove</button>}
      </div>)}
      <button className={buttonClass} onClick={() => setAllocations([...allocations, { projectId: "shared", amount: "" }])}>Split across another project</button>
      <label className="flex gap-2"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /> I confirm this payment is supported by a provider invoice or receipt.</label>
      <button className={buttonClass} disabled={busy || !confirmed} onClick={() => action(async () => {
        await post({ action: "hostingPayment", confirmedPaid: confirmed, payment: { provider, invoiceReference, paidDate, currency, amountCents: minorUnits(amount), allocations: allocations.map(row => ({ projectId: row.projectId, amountCents: minorUnits(row.amount || (allocations.length === 1 ? amount : "")) })) } });
        setNotice("Paid hosting invoice recorded. Preview the hosting statement to review it."); setInvoiceReference(""); setAmount(""); setConfirmed(false); setAllocations([{ projectId: "shared", amount: "" }]);
      })}>Record payment</button>
    </section>
  </div>;
}
