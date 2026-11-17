import { createHash } from "crypto";
import { DateTime } from "luxon";
import { Resend } from "resend";
import { stripe } from "@/lib/stripe";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { getAnnualCosts, listProjects, listProviderAccounts, listSyncLogs } from "@/lib/meterwise/client";
import { csv, hostingBreakdown, money, STATEMENT_TIMEZONE, totalsByCurrency, yearWindow, type ClientMapping, type ClientStatement, type HostingPayment } from "./annualStatements";
import { statementPdf } from "./statementPdf";

export type AnnualSettings = { _id: string; enabled: boolean; ownerEmail: string; mappings: ClientMapping[]; disabledRecipients?: string[] };
const SETTINGS_ID = "annualStatementSettings";
export async function annualSettings(): Promise<AnnualSettings> {
  const ownerEmail = [process.env.ADMIN_NOTIFICATION_EMAIL, process.env.ADMIN_EMAIL, process.env.ADMIN_USERNAME]
    .find(value => value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) ?? "";
  return await sanityServer.getDocument<AnnualSettings>(SETTINGS_ID) ?? {
    _id: SETTINGS_ID, enabled: true, ownerEmail, mappings: [],
  };
}
export async function statementClients() {
  const records = await sanityServer.fetch<{ stripeCustomerId: string }[]>(
    `*[_type in ["clientPortalUser", "pipelineContact"] && defined(stripeCustomerId)]{stripeCustomerId}`,
  );
  const ids = [...new Set(records.map(record => record.stripeCustomerId).filter(id => /^cus_/.test(id)))];
  const clients: { id: string; name: string; email: string }[] = [];
  for (const id of ids) {
    const customer = await stripe.customers.retrieve(id);
    if (!customer.deleted && customer.livemode) clients.push({ id, name: customer.name ?? customer.email ?? id, email: customer.email ?? "" });
  }
  return clients;
}
export async function clientStatement(year: number, customer: { id: string; name: string; email: string }): Promise<ClientStatement> {
  const window = yearWindow(year);
  const lines: ClientStatement["lines"] = [];
  const date = (seconds: number) => DateTime.fromSeconds(seconds, { zone: STATEMENT_TIMEZONE }).toISODate()!;
  // Do not filter out old authorizations captured during this year.
  for await (const charge of stripe.charges.list({ customer: customer.id, created: { lt: window.end }, limit: 100, expand: ["data.balance_transaction"] })) {
    if (!charge.livemode || !charge.paid || !charge.captured || charge.status !== "succeeded") continue;
    const transaction = charge.balance_transaction;
    if (!transaction || typeof transaction === "string") throw new Error(`Missing capture date for ${charge.id}`);
    if (transaction.created < window.start || transaction.created >= window.end) continue;
    lines.push({ id: charge.id, date: date(transaction.created), amountCents: charge.amount_captured, currency: charge.currency, description: charge.description || "Payment to CEL3 Interactive", reference: charge.receipt_url ?? charge.id });
  }
  // List refunds independently: a refund this year can relate to a prior-year payment.
  for await (const refund of stripe.refunds.list({ created: { gte: window.start, lt: window.end }, limit: 100, expand: ["data.charge"] })) {
    if (refund.status !== "succeeded") continue;
    const charge = typeof refund.charge === "string" ? await stripe.charges.retrieve(refund.charge) : refund.charge;
    if (!charge || !charge.livemode) continue;
    const customerId = typeof charge.customer === "string" ? charge.customer : charge.customer?.id;
    if (customerId !== customer.id) continue;
    lines.push({ id: refund.id, date: date(refund.created), amountCents: -refund.amount, currency: refund.currency, description: `Refund for ${charge.description || charge.id}`, reference: charge.id });
  }
  lines.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return { year, customerId: customer.id, name: customer.name, email: customer.email, lines };
}
export async function hostingStatement(year: number) {
  yearWindow(year);
  const settings = await annualSettings();
  const [payments, projects, accounts, syncLogs, costs] = await Promise.all([
    sanityServer.fetch<HostingPayment[]>(`*[_type == "annualHostingPayment" && paidDate >= $start && paidDate < $end] | order(paidDate asc)`, { start: `${year}-01-01`, end: `${year + 1}-01-01` }),
    listProjects(), listProviderAccounts(), listSyncLogs({ limit: "30" }), getAnnualCosts(year),
  ]);
  const latestSyncs = [...new Map(syncLogs.slice().reverse().map(log => [log.account.id, log])).values()];
  return {
    year, payments, projects, accounts, costs,
    breakdown: hostingBreakdown(payments, settings.mappings),
    warnings: [
      ...accounts.filter(account => account.credentialStatus !== "valid").map(account => `${account.provider.name}: credential ${account.credentialStatus}; current cost coverage may be incomplete.`),
      ...latestSyncs.filter(log => log.status !== "success").map(log => `${log.provider.name}: latest sync ${log.status}. ${log.errors?.join("; ") ?? ""}`),
      ...projects.filter(project => !settings.mappings.some(mapping => mapping.projectId === project.id)).map(project => `Client mapping needed: ${project.name}`),
      ...costs.warnings,
      ...(payments.length === 0 ? ["No confirmed hosting payments recorded for this year. Meterwise costs are not proof of payment."] : []),
    ],
  };
}
export function clientAttachments(statement: ClientStatement) {
  const totals = totalsByCurrency(statement.lines);
  const summary = Object.entries(totals).flatMap(([currency, total]) => [
    `${currency}: payments ${money(total.payments, currency)}, refunds ${money(total.refunds, currency)}, net ${money(total.net, currency)}`,
  ]);
  const text = [
    `CEL3 Interactive - ${statement.year} Annual Payment Statement`, statement.name,
    "Calendar year, America/New_York. Payments recorded through Stripe.",
    "Captured payments and successful refunds are listed separately; currencies are not combined.",
    "Refunds appear in the year issued, including refunds of prior-year payments.",
    "This payment summary is not an IRS tax form. Contact CEL3 about any payment recorded outside Stripe.", "", ...summary, "",
    ...statement.lines.map(line => `${line.date} | ${line.description} | ${money(line.amountCents, line.currency)} | ${line.id}`),
  ];
  return [
    { filename: `CEL3-${statement.year}-payments.pdf`, content: statementPdf(text) },
    { filename: `CEL3-${statement.year}-payments.csv`, content: Buffer.from(csv([
      ["Date", "Description", "Currency", "Amount (minor units)", "Formatted amount", "Payment reference", "Receipt"],
      ...statement.lines.map(line => [line.date, line.description, line.currency.toUpperCase(), line.amountCents, money(line.amountCents, line.currency), line.id, line.reference ?? ""]),
    ])) },
  ];
}
export function hostingAttachments(report: Awaited<ReturnType<typeof hostingStatement>>) {
  const text = [
    `CEL3 Interactive - ${report.year} Hosting Payment Statement`,
    "Confirmed payments entered from provider invoices/receipts, grouped by client/project and platform.",
    "Meterwise billed costs and estimates are supplemental and excluded from confirmed paid totals.", "",
    ...report.breakdown.map(row => `${row.client} | ${row.provider} | ${money(row.amountCents, row.currency)} | ${row.projectId}`),
    "", "Reconciliation / missing data", ...report.warnings,
    "", "Meterwise recorded costs (not confirmed payments)",
    ...report.costs.rows.map(row => `${row.projectName ?? "Unallocated"} | ${row.provider} | ${row.currency} ${row.amount.toFixed(2)} | ${row.costType} / ${row.confidence}`),
  ];
  return [
    { filename: `CEL3-${report.year}-hosting.pdf`, content: statementPdf(text) },
    { filename: `CEL3-${report.year}-hosting-payments.csv`, content: Buffer.from(csv([
      ["Payment date", "Provider", "Invoice / refund reference", "Currency", "Project", "Allocated payment (minor units)", "Formatted allocated payment"],
      ...report.payments.flatMap(payment => payment.allocations.map(allocation => [payment.paidDate, payment.provider, payment.invoiceReference, payment.currency, allocation.projectId, allocation.amountCents, money(allocation.amountCents, payment.currency)])),
    ])) },
    { filename: `CEL3-${report.year}-meterwise-reconciliation.csv`, content: Buffer.from(csv([
      ["Project", "Provider", "Currency", "Recorded amount", "Cost type", "Confidence", "Payment verified"],
      ...report.costs.rows.map(row => [row.projectName ?? "Unallocated", row.provider, row.currency, row.amount, row.costType, row.confidence, "No - reconcile with provider invoice/payment"]),
    ])) },
  ];
}
type Attachment = { filename: string; content: Buffer };
type Delivery = { _id: string; startedAt: string; sentAt?: string; providerId?: string; message: { from: string; to: string; subject: string; text: string; attachments: { filename: string; content: string }[] } };
export async function deliverStatement(year: number, recipientKey: string, to: string, subject: string, text: string, attachments: Attachment[]) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) throw new Error("Statement email delivery is not configured");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error("A valid recipient email is required");
  const id = `annualStatement.live.${year}.${createHash("sha256").update(recipientKey).digest("hex").slice(0, 32)}`;
  // Freeze the exact recipient, content and attachments before the first attempt.
  const record = await sanityWriteClient.createIfNotExists({
    _id: id, _type: "annualStatementDelivery", year, recipientKey, startedAt: new Date().toISOString(),
    message: { from: process.env.RESEND_FROM_EMAIL, to, subject, text, attachments: attachments.map(attachment => ({ filename: attachment.filename, content: attachment.content.toString("base64") })) },
  }) as Delivery;
  if (record.sentAt) return { status: "already_sent", id };
  if (!record.message || !record.startedAt) throw new Error("This year was marked as having no payments. Review the delivery record before sending");
  if (Date.now() - Date.parse(record.startedAt) >= 23 * 60 * 60 * 1000) throw new Error(`Delivery ${id} requires provider-log reconciliation before retrying`);
  const { data, error } = await new Resend(process.env.RESEND_API_KEY).emails.send(record.message, { idempotencyKey: id });
  if (error || !data?.id) throw new Error(error?.message ?? "No statement delivery ID returned");
  await sanityWriteClient.patch(id).set({ sentAt: new Date().toISOString(), providerId: data.id }).commit();
  return { status: "sent", id };
}
export async function runAnnualStatements(year: number) {
  const settings = await annualSettings();
  if (!settings.enabled) return { skipped: "disabled" };
  const clients = await statementClients();
  const deliveries = await sanityServer.fetch<{ recipientKey: string; sentAt?: string; status?: string }[]>(`*[_type == "annualStatementDelivery" && year == $year]{recipientKey,sentAt,status}`, { year });
  const attempts = await sanityServer.fetch<{ recipientKey: string; lastAttempt: string }[]>(`*[_type == "annualStatementAttempt" && year == $year]{recipientKey,lastAttempt}`, { year });
  const done = new Set(deliveries.filter(row => row.sentAt || row.status === "no_payments").map(row => row.recipientKey));
  const results: { recipientKey: string; status: string }[] = [];
  const errors: { recipientKey: string; error: string }[] = [];
  // Bounded batches allow cron retries without timing out or resending prior clients.
  const pending = clients.filter(row => !done.has(row.id) && !settings.disabledRecipients?.includes(row.id)).sort((a, b) => (attempts.find(row => row.recipientKey === a.id)?.lastAttempt ?? "").localeCompare(attempts.find(row => row.recipientKey === b.id)?.lastAttempt ?? ""));
  for (const client of pending.slice(0, 3)) {
    try {
      await sanityWriteClient.createOrReplace({ _id: `annualStatementAttempt.${year}.${client.id}`, _type: "annualStatementAttempt", year, recipientKey: client.id, lastAttempt: new Date().toISOString() });
      const statement = await clientStatement(year, client);
      if (!statement.lines.length || !client.email) {
        const status = !statement.lines.length ? "no_payments" : "missing_email";
        const hash = createHash("sha256").update(client.id).digest("hex").slice(0, 32);
        if (status === "no_payments") await sanityWriteClient.createIfNotExists({ _id: `annualStatement.live.${year}.${hash}`, _type: "annualStatementDelivery", year, recipientKey: client.id, status });
        results.push({ recipientKey: client.id, status });
        continue;
      }
      const result = await deliverStatement(year, client.id, client.email, `Your ${year} CEL3 Interactive payment statement`, `Hi ${client.name},\n\nAttached is your ${year} annual payment summary for your records, with payments and refunds itemized. Please reply if anything needs clarification.\n\nCEL3 Interactive`, clientAttachments(statement));
      results.push({ recipientKey: client.id, status: result.status });
    } catch (error) { errors.push({ recipientKey: client.id, error: error instanceof Error ? error.message : "Delivery failed" }); }
  }
  if (!done.has("owner-hosting") && !settings.disabledRecipients?.includes("owner-hosting")) {
    try {
      const report = await hostingStatement(year);
      const result = await deliverStatement(year, "owner-hosting", settings.ownerEmail, `Your ${year} CEL3 hosting costs and reconciliation`, `Attached are your recorded hosting payments by client and platform, plus Meterwise costs and missing-data notes. Meterwise estimates/billed amounts are separate from confirmed payments. Review the reconciliation section for incomplete records.`, hostingAttachments(report));
      results.push({ recipientKey: "owner-hosting", status: result.status });
    } catch (error) { errors.push({ recipientKey: "owner-hosting", error: error instanceof Error ? error.message : "Hosting report failed" }); }
  }
  return { year, results, errors };
}

export async function sendIndividualStatement(year: number, recipientKey: string) {
  yearWindow(year);
  if (year >= DateTime.now().setZone(STATEMENT_TIMEZONE).year) throw new Error("Choose a completed calendar year before sending a statement");
  if (recipientKey === "owner-hosting") {
    const settings = await annualSettings();
    const report = await hostingStatement(year);
    return deliverStatement(year, recipientKey, settings.ownerEmail, `Your ${year} CEL3 hosting costs and reconciliation`, "Attached are your recorded hosting payments by client and platform, plus Meterwise costs and missing-data notes. Estimates are separate from confirmed payments.", hostingAttachments(report));
  }
  const client = (await statementClients()).find(row => row.id === recipientKey);
  if (!client) throw new Error("Client not found in CEL3 records");
  const statement = await clientStatement(year, client);
  if (!statement.lines.length) throw new Error("No payments or refunds recorded for this client and year");
  return deliverStatement(year, client.id, client.email, `Your ${year} CEL3 Interactive payment statement`, `Hi ${client.name},\n\nAttached is your ${year} annual payment summary for your records, with payments and refunds itemized. Please reply if anything needs clarification.\n\nCEL3 Interactive`, clientAttachments(statement));
}
