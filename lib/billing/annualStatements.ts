import { DateTime } from "luxon";

export const STATEMENT_TIMEZONE = "America/New_York";
export type StatementLine = { id: string; date: string; description: string; currency: string; amountCents: number; reference?: string };
export type ClientStatement = { year: number; customerId: string; name: string; email: string; lines: StatementLine[] };
export type ClientMapping = { projectId: string; customerId: string | null; label: string };
export type HostingPayment = {
  _id: string; provider: string; invoiceReference: string; paidDate: string; currency: string; amountCents: number;
  allocations: { projectId: string; amountCents: number }[];
};

export function yearWindow(year: number) {
  if (!Number.isInteger(year) || year < 2020 || year > DateTime.now().setZone(STATEMENT_TIMEZONE).year) throw new Error("Invalid statement year");
  const start = DateTime.fromObject({ year, month: 1, day: 1 }, { zone: STATEMENT_TIMEZONE });
  return { start: start.toUnixInteger(), end: start.plus({ years: 1 }).toUnixInteger() };
}
export function dueStatementYear(now = DateTime.now()) {
  const local = now.setZone(STATEMENT_TIMEZONE);
  // Keep retrying after January 15; each recipient/year has a durable delivery record.
  return local < local.startOf("year").plus({ days: 14 }) ? null : local.year - 1;
}
export function totalsByCurrency(lines: StatementLine[]) {
  const totals: Record<string, { payments: number; refunds: number; net: number }> = {};
  for (const line of lines) {
    const currency = line.currency.toUpperCase();
    const value = totals[currency] ??= { payments: 0, refunds: 0, net: 0 };
    if (line.amountCents >= 0) value.payments += line.amountCents;
    else value.refunds -= line.amountCents;
    value.net += line.amountCents;
  }
  return totals;
}
export function money(amount: number, currency: string) {
  const format = new Intl.NumberFormat("en-US", { style: "currency", currency });
  return format.format(amount / 10 ** (format.resolvedOptions().maximumFractionDigits ?? 2));
}
export function csv(rows: (string | number)[][]) {
  // Prevent spreadsheet formula execution, including values supplied by clients.
  return "\uFEFF" + rows.map(row => row.map(value => {
    const text = typeof value === "number" ? String(value) : /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
    return `"${text.replaceAll('"', '""')}"`;
  }).join(",")).join("\r\n");
}
export function validateHostingPayment(input: Omit<HostingPayment, "_id">, projectIds: Set<string>) {
  if (!input.provider?.trim() || !input.invoiceReference?.trim()) throw new Error("Provider and invoice reference are required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.paidDate) || !DateTime.fromISO(input.paidDate).isValid || input.paidDate > DateTime.now().setZone(STATEMENT_TIMEZONE).toISODate()!) throw new Error("Enter the actual payment date");
  if (!/^[A-Z]{3}$/.test(input.currency) || !Number.isSafeInteger(input.amountCents) || input.amountCents === 0) throw new Error("Invalid payment amount or currency");
  money(input.amountCents, input.currency);
  if (!Array.isArray(input.allocations) || input.allocations.length === 0) throw new Error("Allocate the payment to a project or shared overhead");
  const seen = new Set<string>();
  for (const allocation of input.allocations) {
    if ((!projectIds.has(allocation.projectId) && allocation.projectId !== "shared") || seen.has(allocation.projectId) || !Number.isSafeInteger(allocation.amountCents) || Math.sign(allocation.amountCents) !== Math.sign(input.amountCents)) throw new Error("Invalid or duplicate project allocation");
    seen.add(allocation.projectId);
  }
  if (input.allocations.reduce((sum, row) => sum + row.amountCents, 0) !== input.amountCents) throw new Error("Allocations must add up to the invoice payment exactly");
}
export function hostingBreakdown(payments: HostingPayment[], mappings: ClientMapping[]) {
  const groups = new Map<string, { client: string; projectId: string; provider: string; currency: string; amountCents: number }>();
  for (const payment of payments) for (const allocation of payment.allocations) {
    const mapping = mappings.find(item => item.projectId === allocation.projectId);
    const key = JSON.stringify([allocation.projectId, payment.provider.toLowerCase(), payment.currency]);
    const group = groups.get(key) ?? { client: mapping?.label ?? (allocation.projectId === "shared" ? "Shared overhead" : "Unmapped project"), projectId: allocation.projectId, provider: payment.provider, currency: payment.currency, amountCents: 0 };
    group.amountCents += allocation.amountCents;
    groups.set(key, group);
  }
  return [...groups.values()];
}
