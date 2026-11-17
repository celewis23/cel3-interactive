import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import ts from "typescript";
const require = createRequire(import.meta.url);
const { DateTime } = require("luxon");
function load(path, dependencies = {}) {
  const source = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  new Function("require", "exports", source)(name => {
    if (name in dependencies) return dependencies[name];
    if (!name.startsWith("@/")) return require(name);
    throw new Error(`Unexpected dependency ${name}`);
  }, loaded.exports);
  return loaded.exports;
}
const domain = load("lib/billing/annualStatements.ts");
const pdf = load("lib/billing/statementPdf.ts");

test("January 15 schedule and New York year boundaries", () => {
  assert.equal(domain.dueStatementYear(DateTime.fromISO("2027-01-15T04:59:59Z")), null);
  assert.equal(domain.dueStatementYear(DateTime.fromISO("2027-01-15T05:00:00Z")), 2026);
  const window = domain.yearWindow(2025);
  assert.equal(new Date(window.start * 1000).toISOString(), "2025-01-01T05:00:00.000Z");
  assert.equal(new Date(window.end * 1000).toISOString(), "2026-01-01T05:00:00.000Z");
  assert.throws(() => domain.yearWindow(2010));
});
test("totals keep currencies separate and successful refunds reduce net", () => {
  assert.deepEqual(domain.totalsByCurrency([
    { currency: "usd", amountCents: 10000 }, { currency: "usd", amountCents: -3000 }, { currency: "jpy", amountCents: 900 },
  ]), { USD: { payments: 10000, refunds: 3000, net: 7000 }, JPY: { payments: 900, refunds: 0, net: 900 } });
  assert.equal(domain.money(900, "JPY"), "¥900");
});
test("hosting allocations reconcile exactly and do not multiply shared invoices", () => {
  const payment = { provider: "Vercel", invoiceReference: "invoice1", currency: "USD", paidDate: "2025-02-01", amountCents: 2000, allocations: [{ projectId: "p1", amountCents: 700 }, { projectId: "shared", amountCents: 1300 }] };
  domain.validateHostingPayment(payment, new Set(["p1"]));
  assert.throws(() => domain.validateHostingPayment({ ...payment, amountCents: 2500 }, new Set(["p1"])), /add up/);
  assert.throws(() => domain.validateHostingPayment({ ...payment, allocations: [{ projectId: "foreign", amountCents: 2000 }] }, new Set(["p1"])));
  const rows = domain.hostingBreakdown([payment], [{ projectId: "p1", label: "Client One" }]);
  assert.equal(rows.reduce((sum, row) => sum + row.amountCents, 0), 2000);
  assert.equal(rows[0].client, "Client One");
  const refund = { ...payment, invoiceReference: "refund1", amountCents: -200, allocations: [{ projectId: "p1", amountCents: -200 }] };
  domain.validateHostingPayment(refund, new Set(["p1"]));
  assert.equal(domain.hostingBreakdown([payment, refund], [{ projectId: "p1", label: "Client One" }])[0].amountCents, 500);
});
test("CSV prevents formula injection while retaining Unicode and PDF paginates safely", () => {
  const csv = domain.csv([["=IMPORTXML(1)", "José, Owner", -123]]);
  assert.match(csv, /'=IMPORTXML/); assert.match(csv, /José, Owner/);
  const document = pdf.statementPdf(Array.from({ length: 120 }, (_, index) => `Payment (${index}) \\ reference`));
  const text = document.toString();
  assert.ok(text.startsWith("%PDF-1.4")); assert.match(text, /\/Count 3/);
  const xref = Number(text.match(/startxref\n(\d+)/)[1]);
  assert.equal(text.slice(xref, xref + 4), "xref");
});

function serviceHarness({ charges = [], refunds = [], providerFailure = false, writeFailure = false } = {}) {
  const records = new Map(); const sends = []; const customers = [];
  const list = values => ({ async *[Symbol.asyncIterator]() { yield* values; } });
  const client = { id: "cus_one", name: "Client One", email: "one@example.com" };
  const database = {
    getDocument: async id => records.get(id) ?? null,
    fetch: async query => query.includes("clientPortalUser") ? [{ stripeCustomerId: client.id }, { stripeCustomerId: client.id }] : [],
  };
  const writes = {
    createIfNotExists: async row => { if (!records.has(row._id)) records.set(row._id, row); return records.get(row._id); },
    createOrReplace: async row => { records.set(row._id, row); return row; },
    patch: id => ({ set: values => ({ commit: async () => { if (writeFailure) throw new Error("Write failed after provider accepted"); Object.assign(records.get(id), values); } }) }),
  };
  const service = load("lib/billing/annualStatementService.ts", {
    "@/lib/stripe": { stripe: {
      charges: { list: () => list(charges), retrieve: async id => charges.find(charge => charge.id === id) },
      refunds: { list: () => list(refunds) },
      customers: { retrieve: async id => { customers.push(id); return { ...client, livemode: true }; } },
    } },
    "@/lib/sanityServer": { sanityServer: database }, "@/lib/sanity.write": { sanityWriteClient: writes },
    "@/lib/meterwise/client": { getAnnualCosts: async () => ({ rows: [], warnings: [] }), listProjects: async () => [], listProviderAccounts: async () => [], listSyncLogs: async () => [] },
    "./annualStatements": domain, "./statementPdf": pdf,
    resend: { Resend: class { emails = { send: async (message, options) => { sends.push({ message, options }); if (providerFailure) throw new Error("Provider timed out"); return { data: { id: "email1" } }; } }; } },
  });
  return { service, records, sends, client, customers };
}
test("captured payments use capture date, exclude failed/test/unsettled charges, and include prior-year refunds", async () => {
  const date = Math.floor(Date.parse("2025-06-03T12:00:00Z") / 1000);
  const base = { id: "ch_one", customer: "cus_one", livemode: true, paid: true, captured: true, status: "succeeded", amount_captured: 10000, currency: "usd", balance_transaction: { created: date } };
  const h = serviceHarness({ charges: [base, { ...base, id: "failed", paid: false }, { ...base, id: "test", livemode: false }, { ...base, id: "old", balance_transaction: { created: 1 } }], refunds: [
    { id: "refund1", status: "succeeded", charge: { ...base, id: "prior_year" }, amount: 2500, currency: "usd", created: date },
    { id: "refund2", status: "pending", charge: base, amount: 100, currency: "usd", created: date },
    { id: "refund3", status: "succeeded", charge: { ...base, customer: "cus_other" }, amount: 100, currency: "usd", created: date },
  ] });
  const statement = await h.service.clientStatement(2025, h.client);
  assert.equal(statement.lines.length, 2); assert.equal(domain.totalsByCurrency(statement.lines).USD.net, 7500);
  assert.equal(statement.lines[0].date, "2025-06-03");
});
test("manual statements reject unknown clients, empty years, and incomplete years", async () => {
  const h = serviceHarness();
  await assert.rejects(h.service.sendIndividualStatement(2025, "cus_unknown"), /not found/);
  await assert.rejects(h.service.sendIndividualStatement(2025, h.client.id), /No payments/);
  await assert.rejects(h.service.sendIndividualStatement(new Date().getFullYear(), h.client.id), /completed calendar year/);
  assert.equal(h.sends.length, 0);
});

test("automatic recipients can be paused while manual delivery remains available", async () => {
  const date = Math.floor(Date.parse("2025-06-03T12:00:00Z") / 1000);
  const h = serviceHarness({ charges: [{ id: "ch_one", customer: "cus_one", livemode: true, paid: true, captured: true, status: "succeeded", amount_captured: 1000, currency: "usd", balance_transaction: { created: date } }] });
  process.env.RESEND_API_KEY = "test"; process.env.RESEND_FROM_EMAIL = "test@example.com";
  h.records.set("annualStatementSettings", { enabled: true, ownerEmail: "owner@example.com", mappings: [], disabledRecipients: ["cus_one", "owner-hosting"] });
  const run = await h.service.runAnnualStatements(2025);
  assert.deepEqual(run.results, []); assert.equal(h.sends.length, 0);
  assert.equal((await h.service.sendIndividualStatement(2025, h.client.id)).status, "sent");
  assert.equal((await h.service.sendIndividualStatement(2025, h.client.id)).status, "already_sent");
  assert.equal(h.sends.length, 1);
});

test("receipt status reads recorded sends and distinguishes unavailable storage", async () => {
  const status = load("lib/billing/receiptStatus.ts", { "@/lib/sanityServer": { sanityServer: { fetch: async (_query, { ids }) => {
    assert.ok(ids.includes("invoiceReceipt.live.in_one"));
    return [{ _id: "invoiceReceipt.live.in_one", sentAt: "2025-01-01T00:00:00Z", to: "client@example.com" }];
  } } } });
  assert.equal((await status.invoiceReceiptStatuses(["in_one"])).in_one.to, "client@example.com");
  const failed = load("lib/billing/receiptStatus.ts", { "@/lib/sanityServer": { sanityServer: { fetch: async () => { throw new Error("offline"); } } } });
  assert.equal((await failed.invoiceReceiptStatuses(["in_one"])).in_one.unavailable, true);
});

test("only clients linked in CEL3 records are enrolled, with duplicate customer IDs removed", async () => {
  const h = serviceHarness(); const clients = await h.service.statementClients();
  assert.equal(clients.length, 1); assert.deepEqual(h.customers, ["cus_one"]);
});
test("delivery freezes content and recipient, and already-sent statements are not resent", async () => {
  process.env.RESEND_API_KEY = "test"; process.env.RESEND_FROM_EMAIL = "test@example.com";
  const h = serviceHarness();
  const first = await h.service.deliverStatement(2025, "cus_one", "one@example.com", "Subject", "Body", []);
  assert.equal(first.status, "sent");
  assert.equal((await h.service.deliverStatement(2025, "cus_one", "changed@example.com", "Changed", "Changed", [])).status, "already_sent");
  assert.equal(h.sends.length, 1); assert.equal(h.sends[0].message.to, "one@example.com");
});
test("uncertain provider acceptance retries with the same content/key, and stops before idempotency expiry", async () => {
  const h = serviceHarness({ writeFailure: true });
  await assert.rejects(h.service.deliverStatement(2025, "cus_one", "one@example.com", "Subject", "Body", []));
  await assert.rejects(h.service.deliverStatement(2025, "cus_one", "changed@example.com", "Changed", "Changed", []));
  assert.equal(h.sends[0].options.idempotencyKey, h.sends[1].options.idempotencyKey);
  assert.equal(h.sends[1].message.to, "one@example.com");
  [...h.records.values()][0].startedAt = new Date(Date.now() - 24 * 3600000).toISOString();
  await assert.rejects(h.service.deliverStatement(2025, "cus_one", "one@example.com", "Subject", "Body", []), /reconciliation/);
  assert.equal(h.sends.length, 2);
});
test("hosting attachments keep Meterwise billed/estimated amounts outside confirmed payment totals", () => {
  const h = serviceHarness();
  const attachments = h.service.hostingAttachments({ year: 2025, payments: [{ paidDate: "2025-02-01", provider: "Vercel", invoiceReference: "invoice1", currency: "USD", amountCents: 2000, allocations: [{ projectId: "p1", amountCents: 700 }, { projectId: "shared", amountCents: 1300 }] }], breakdown: [], warnings: ["Reconcile provider costs"], costs: { rows: [{ projectName: "Client One", provider: "railway", currency: "USD", amount: 99, costType: "estimated", confidence: "derived_from_usage" }] } });
  assert.equal(attachments.length, 3);
  assert.ok(!attachments[1].content.toString().includes("99"));
  assert.ok(attachments[2].content.toString().includes("99"));
  assert.match(attachments[1].content.toString(), /"700"/);
  assert.match(attachments[1].content.toString(), /"1300"/);
  assert.doesNotMatch(attachments[1].content.toString(), /"2000"/);
});

test("cron requires the bearer secret; spoofed Vercel headers cannot trigger email", async () => {
  process.env.CRON_SECRET = "test-cron-secret";
  let runs = 0;
  const route = load("app/api/cron/annual-statements/route.ts", {
    "@/lib/audit/withActivity": { withActivity: (_path, _method, handler) => handler },
    "next/server": { NextResponse: { json: (body, options) => ({ status: options?.status ?? 200, body }) } },
    "@/lib/billing/annualStatements": { dueStatementYear: () => null },
    "@/lib/billing/annualStatementService": { runAnnualStatements: async () => { runs++; } },
  });
  const request = headers => ({ headers: new Headers(headers) });
  assert.equal((await route.GET(request({ "x-vercel-cron": "1" }))).status, 401);
  assert.equal((await route.GET(request({ authorization: "Bearer wrong-secret" }))).status, 401);
  assert.equal((await route.GET(request({ authorization: "Bearer test-cron-secret" }))).status, 200);
  assert.equal(runs, 0);
});
test("annual statement previews and settings are owner-only", async () => {
  let session = null;
  const route = load("app/api/admin/annual-statements/route.ts", {
    "@/lib/audit/withActivity": { withActivity: (_path, _method, handler) => handler },
    "@/lib/audit/log": { logAudit() {} },
    "next/server": { NextResponse: { json: (body, options) => ({ status: options?.status ?? 200, body }) } },
    "@/lib/admin/permissions": { getSessionInfo: () => session },
    "@/lib/sanityServer": {}, "@/lib/sanity.write": {}, "@/lib/meterwise/client": {},
    "@/lib/billing/annualStatementService": {}, "@/lib/billing/annualStatements": domain,
  });
  assert.equal((await route.GET({})).status, 401);
  session = { isOwner: false };
  assert.equal((await route.GET({})).status, 403);
  assert.equal((await route.POST({})).status, 403);
});
test("Meterwise annual report scopes every database read and preserves cost confidence", async () => {
  const queries = [];
  let allowed = true;
  const capture = result => async query => { queries.push(query); return result; };
  const route = load("integrations/meterwise/annual-costs-route.ts.txt", {
    "next/server": { NextResponse: { json: (body, options) => ({ status: options?.status ?? 200, body }) } },
    "@/lib/api-auth": { requireAuth: async () => ({ workspaceId: "workspace1" }), requireScope: (_ctx, scope) => { assert.equal(scope, "read"); if (!allowed) throw new Error("Forbidden: missing scope 'read'"); } },
    "@/lib/prisma": { prisma: {
      costSnapshot: { groupBy: capture([{ projectId: "p1", providerAccountId: "a1", currency: "USD", costType: "estimated", confidence: "derived_from_usage", _sum: { amount: 10 } }]), count: capture(0) },
      project: { findMany: capture([{ id: "p1", name: "Project" }]) },
      providerAccount: { findMany: capture([{ id: "a1", provider: { key: "railway" } }]) },
    } },
  });
  const req = { nextUrl: new URL("https://example.com/api/v1/reports/annual-costs?year=2025") };
  const result = await route.GET(req);
  assert.equal(result.status, 200);
  assert.equal(result.body.data.rows[0].costType, "estimated");
  assert.equal(result.body.data.rows[0].confidence, "derived_from_usage");
  assert.ok(queries.every(query => query.where.workspaceId === "workspace1"));
  allowed = false;
  assert.equal((await route.GET(req)).status, 403);
});
