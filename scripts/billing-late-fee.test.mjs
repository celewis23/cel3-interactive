import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInThisContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const validationClient = require("@sanity/client").createClient({
  projectId: "test", dataset: "test", apiVersion: "2025-01-01", useCdn: false,
});
const DAY = 86400000;
const request = { invoiceId: "in_original", invoiceNumber: "INV-123", customerId: "cus_client", amountCents: 2500 };
const description = "Late payment fee — Invoice INV-123";

// Exercise the real helper and cron route using in-memory Stripe/Sanity APIs.
// No credentials are loaded and no invoices or emails are sent to real clients.
function loadModule(path, dependencies, Clock) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const loaded = { exports: {} };
  const load = (name) => {
    if (name === "@/lib/audit/withActivity") return { withActivity: (_route, _method, handler) => handler };
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    if (name === "next/server") return require(name);
    throw new Error(`Unexpected dependency: ${name}`);
  };
  const quietConsole = { error() {} };
  runInThisContext(`(function(require, module, exports, Date, console) { ${outputText}\n})`, { filename: path })(
    load, loaded, loaded.exports, Clock, quietConsole,
  );
  return loaded.exports;
}

function fixture() {
  let now = Date.parse("2026-09-20T13:00:00Z");
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const docs = new Map([["dunning.in_original", {
    _id: "dunning.in_original", _type: "invoiceDunningState", invoiceId: "in_original",
    dunningStage: 1, isLateFee: false, lateFeeInvoiceId: null,
  }]]);
  const fees = new Map();
  const items = new Map();
  const idempotency = new Map();
  const faults = new Set();
  const calls = { created: 0, items: 0, finalized: 0, sent: 0, synced: 0, notices: 0 };
  const original = { id: request.invoiceId, customerId: request.customerId, status: "open", amountRemaining: 7500,
    dueDate: Date.parse("2026-09-15T00:00:00Z") / 1000, hostedInvoiceUrl: "https://example.com/invoice" };
  let beforeOriginalRead = () => {};
  const originalSyncs = [];
  const autoSuspended = [];
  docs.set("client", { _id: "client", name: "Client", websiteStatus: "active" });
  function fail(point) {
    if (faults.delete(point)) throw new Error(`Simulated failure: ${point}`);
  }
  function write(kind, params, options, action) {
    assert.ok(options?.idempotencyKey, `${kind} must have an idempotency key`);
    const fingerprint = JSON.stringify({ kind, params });
    const cached = idempotency.get(options.idempotencyKey);
    if (cached && now - cached.at < DAY) {
      assert.equal(cached.fingerprint, fingerprint, "retry parameters must stay unchanged");
      return structuredClone(cached.value);
    }
    fail(`${kind}.before`);
    const value = action();
    idempotency.set(options.idempotencyKey, { fingerprint, value: structuredClone(value), at: now });
    fail(`${kind}.after`); // Stripe committed the write but the response was lost.
    return structuredClone(value);
  }
  function seedFee(overrides = {}) {
    const fee = { id: `in_fee_${fees.size + 1}`, customer: request.customerId, description,
      metadata: { cel3_fee_type: "late_payment", cel3_original_invoice_id: request.invoiceId },
      status: "draft", total: 0, ...overrides };
    fees.set(fee.id, fee);
    items.set(fee.id, []);
    return fee;
  }
  const stripe = {
    invoices: {
      list: (params) => ({ async *[Symbol.asyncIterator]() {
        fail("invoice.list");
        // Snapshot mimics two workers both listing before either creates.
        const snapshot = [...fees.values()].filter((x) => x.customer === params.customer).map((x) => structuredClone(x));
        for (const fee of snapshot) yield fee;
      } }),
      retrieve: async (id) => {
        if (!fees.has(id)) throw new Error("Invoice not found");
        return structuredClone(fees.get(id));
      },
      create: async (params, options) => write("invoice.create", params, options, () => {
        assert.equal(params.pending_invoice_items_behavior, "exclude");
        assert.equal(params.auto_advance, false);
        calls.created++;
        return seedFee({ ...params });
      }),
      finalizeInvoice: async (id, params, options) => write("invoice.finalize", { id, ...params }, options, () => {
        const fee = fees.get(id);
        assert.equal(fee.status, "draft");
        assert.equal(items.get(id).length, 1);
        fee.total = items.get(id)[0].amount;
        fee.status = fee.total ? "open" : "paid";
        calls.finalized++;
        return fee;
      }),
      sendInvoice: async (id, params, options) => write("invoice.send", { id, ...params }, options, () => {
        assert.equal(fees.get(id).status, "open");
        assert.equal(docs.get("dunning.in_original").lateFeeInvoiceId, id);
        calls.sent++;
        return fees.get(id);
      }),
    },
    invoiceItems: {
      list: async ({ invoice, limit }) => ({ data: structuredClone(items.get(invoice).slice(0, limit)), has_more: items.get(invoice).length > limit }),
      create: async (params, options) => write("item.create", params, options, () => {
        assert.equal(fees.get(params.invoice).status, "draft");
        calls.items++;
        const item = { id: `ii_${calls.items}`, ...params };
        items.get(params.invoice).push(item);
        return item;
      }),
    },
  };
  const sanity = {
    createIfNotExists: async (doc) => {
      // Building (never committing) a real transaction checks Sanity's ID rules.
      validationClient.transaction().createIfNotExists(doc);
      fail(`create:${doc._id}`);
      if (!docs.has(doc._id)) docs.set(doc._id, structuredClone(doc));
      return structuredClone(docs.get(doc._id));
    },
    createOrReplace: async (doc) => {
      validationClient.transaction().createOrReplace(doc);
      fail(`replace:${doc._id}`);
      docs.set(doc._id, structuredClone(doc));
      return structuredClone(doc);
    },
    patch: (id) => {
      let changes = {}, missing = {};
      const patch = {
        set: (values) => { changes = { ...changes, ...values }; return patch; },
        setIfMissing: (values) => { missing = { ...missing, ...values }; return patch; },
        commit: async () => {
          fail(`patch:${id}`);
          const doc = docs.get(id);
          assert.ok(doc, `document ${id} must exist`);
          for (const [key, value] of Object.entries(missing)) if (doc[key] == null) doc[key] = value;
          Object.assign(doc, changes);
          return structuredClone(doc);
        },
      };
      return patch;
    },
  };
  const collections = loadModule("lib/billing/collections.ts", {
    "@/lib/stripe/billing": { getInvoice: async () => {
      fail("original.read");
      beforeOriginalRead();
      return structuredClone(original);
    } },
    "@/lib/stripe/sync": { syncStripeInvoiceToSanity: async invoice => {
      fail("original.sync");
      originalSyncs.push(invoice);
    } },
  }, Clock);
  const helper = loadModule("lib/billing/lateFee.ts", {
    "@/lib/billing/collections": collections,
    "@/lib/stripe": { stripe },
    "@/lib/sanity.write": { sanityWriteClient: sanity },
    "@/lib/stripe/billing": { getInvoice: async (id) => {
      fail("invoice.read");
      return structuredClone(fees.get(id));
    } },
    "@/lib/stripe/sync": { syncStripeInvoiceToSanity: async (fee) => {
      assert.equal(docs.get(`dunning.${fee.id}`).isLateFee, true, "fee must be exempt before syncing");
      fail("sync");
      calls.synced++;
    } },
  }, Clock);
  const route = loadModule("app/api/cron/billing-enforcement/route.ts", {
    "@/lib/billing/collections": collections,
    "@/lib/billing/lateFee": helper,
    "@/lib/sanity.write": { sanityWriteClient: sanity },
    "@/lib/sanityServer": { sanityServer: { fetch: async (query) => {
      if (query.includes('_type == "invoice"')) return [{ _id: request.invoiceId, clientId: "client", clientName: "Client",
        clientEmail: "client@example.com", stripeCustomerId: request.customerId, number: request.invoiceNumber,
        dueDate: "2026-09-15", amountDueCents: 7500, hostedInvoiceUrl: "https://example.com/invoice" }];
      if (query.includes('_type == "invoiceDunningState"')) return [structuredClone(docs.get("dunning.in_original"))];
      if (query.includes("websiteStatusReason")) return autoSuspended;
      if (query.includes('_type == "pipelineContact"')) return [{ _id: "client", name: "Client" }];
      throw new Error(`Unexpected query: ${query}`);
    } } },
    "@/lib/billing/enforcementSettings": { getEnforcementSettings: async () => ({ autoSuspendEnabled: true,
      firstNoticeDays: 1, secondNoticeDays: 5, finalNoticeDays: 10, suspendDays: 11, lateFeeCents: 2500 }) },
    "@/lib/billing/dunningEmails": { sendFirstNoticeEmail: async invoice => { calls.notices++; calls.noticeAmount = invoice.amountDueCents; },
      sendInterruptionNoticeEmail: async () => { calls.notices++; },
      sendSecondNoticeEmail: async (_invoice, amount) => {
      assert.equal(amount, fees.values().next().value.total);
      calls.notices++;
      fail("notice");
    } },
    "@/lib/automations/engine": { automationEngine: { fire() {} } },
    "@/lib/notifications/push": { sendPushNotificationToAudience: async () => {} },
    "@/lib/audit/log": { logAudit() {}, AuditAction: {} },
    "@/lib/billing/websiteStatusSync": { syncVercelWebsiteStatus: async () => ({ ok: true }) },
  }, Clock);
  return { helper, route, docs, fees, items, calls, faults, seedFee, original, originalSyncs, autoSuspended,
    beforeOriginalRead: fn => { beforeOriginalRead = fn; },
    advance: (ms) => { now += ms; },
    run: (overrides = {}) => helper.ensureLateFeeInvoice({ ...request, ...overrides }),
    cron: async () => (await route.GET({ headers: new Headers({ "x-vercel-cron": "1" }) })).json(),
  };
}

test("creates one separate fee and reuses it on later runs, even after Stripe keys expire", async () => {
  const f = fixture();
  const first = await f.run();
  f.advance(3 * DAY);
  const second = await f.run({ amountCents: 5000 });
  assert.equal(first.id, second.id);
  assert.equal(second.total, 2500);
  assert.equal(f.calls.created, 1);
  assert.equal(f.calls.items, 1);
  assert.equal(f.calls.sent, 1);
  assert.equal(f.docs.get("dunning.in_original").dunningStage, 1);
});

test("Gmail failure retries the notice without creating or emailing another fee invoice", async () => {
  const f = fixture();
  f.faults.add("notice");
  assert.equal((await f.cron()).errors, 1);
  assert.equal(f.docs.get("dunning.in_original").dunningStage, 1);
  assert.ok(f.docs.get("dunning.in_original").lateFeeInvoiceId);
  f.advance(DAY);
  const result = await f.cron();
  assert.equal(result.errors, 0);
  assert.equal(result.secondNotice, 1);
  assert.equal(f.docs.get("dunning.in_original").dunningStage, 2);
  assert.equal(f.calls.notices, 2);
  assert.equal(f.calls.created, 1);
  assert.equal(f.calls.items, 1);
  assert.equal(f.calls.sent, 1);
});

test("failure saving the completed stage reuses the fee on the next cron run", async () => {
  const f = fixture();
  f.faults.add("replace:dunning.in_original");
  assert.equal((await f.cron()).errors, 1);
  f.advance(DAY);
  assert.equal((await f.cron()).errors, 0);
  assert.equal(f.docs.get("dunning.in_original").dunningStage, 2);
  assert.equal(f.calls.created, 1);
  assert.equal(f.calls.items, 1);
  assert.equal(f.calls.sent, 1);
});

for (const point of ["invoice.create.after", "patch:lateFee.in_original", "item.create.after",
  "invoice.finalize.after", "create:dunning.in_fee_1", "invoice.read", "sync", "invoice.send.before"]) {
  test(`recovers ${point} after 25 hours without a duplicate fee or line item`, async () => {
    const f = fixture();
    f.faults.add(point);
    await assert.rejects(f.run(), /Simulated failure/);
    f.advance(25 * 60 * 60 * 1000);
    await f.run();
    assert.equal(f.calls.created, 1);
    assert.equal(f.calls.items, 1);
    assert.equal(f.fees.size, 1);
    assert.equal(f.calls.sent, 1);
  });
}

test("a lost Stripe email response never creates another invoice or line item", async () => {
  const f = fixture();
  f.faults.add("invoice.send.after");
  await assert.rejects(f.run(), /Simulated failure/);
  await f.run();
  assert.equal(f.calls.created, 1);
  assert.equal(f.calls.items, 1);
  assert.equal(f.calls.sent, 1);
});

test("overlapping runs create one invoice and one line item", async () => {
  const f = fixture();
  const results = await Promise.allSettled(Array.from({ length: 5 }, () => f.run()));
  for (const result of results) assert.equal(result.status, "fulfilled", result.reason?.message);
  assert.equal(new Set(results.map((r) => r.value.id)).size, 1);
  assert.equal(f.calls.created, 1);
  assert.equal(f.calls.items, 1);
  assert.equal(f.calls.sent, 1);
});

test("a changed fee setting cannot change retry parameters or duplicate a pending charge", async () => {
  const f = fixture();
  f.faults.add("item.create.after");
  await assert.rejects(f.run());
  const result = await f.run({ amountCents: 5000 });
  assert.equal(result.total, 2500);
  assert.equal(f.calls.items, 1);
});

test("recovers an older implementation's fee using its original invoice reference", async () => {
  const f = fixture();
  const old = f.seedFee({ status: "open", total: 2500, metadata: {} });
  assert.equal((await f.run()).id, old.id);
  assert.equal(f.calls.created, 0);
  assert.equal(f.calls.items, 0);
});

test("does not recreate a recorded invoice that was deleted or voided", async () => {
  const f = fixture();
  await assert.rejects(f.run({ existingFeeInvoiceId: "in_deleted" }), /not found/);
  assert.equal(f.calls.created, 0);
  const g = fixture();
  const fee = g.seedFee({ status: "void" });
  await assert.rejects(g.run({ existingFeeInvoiceId: fee.id }), /voided/);
  assert.equal(g.calls.created, 0);
});

test("an uncertain invoice creation past Stripe's retry window stops for review", async () => {
  const f = fixture();
  f.faults.add("invoice.create.before");
  await assert.rejects(f.run());
  f.advance(25 * 60 * 60 * 1000);
  await assert.rejects(f.run(), /review it in Stripe/);
  assert.equal(f.calls.created, 0);
});

test("an uncertain item creation past Stripe's retry window stops for review", async () => {
  const f = fixture();
  f.faults.add("item.create.before");
  await assert.rejects(f.run());
  f.advance(25 * 60 * 60 * 1000);
  await assert.rejects(f.run(), /review it in Stripe/);
  assert.equal(f.calls.created, 1);
  assert.equal(f.calls.items, 0);
  assert.equal(f.calls.finalized, 0);
});

test("multiple existing fees are flagged instead of creating or sending another", async () => {
  const f = fixture();
  f.seedFee();
  f.seedFee();
  await assert.rejects(f.run(), /Multiple late-fee invoices/);
  assert.equal(f.calls.created, 0);
  assert.equal(f.calls.sent, 0);
});

test("unexpected draft line items are not finalized or emailed", async () => {
  const f = fixture();
  const fee = f.seedFee();
  f.items.get(fee.id).push({ amount: 10000, currency: "usd", description: "Another service" });
  await assert.rejects(f.run(), /unexpected line items/);
  assert.equal(f.calls.created, 0);
  assert.equal(f.calls.items, 0);
  assert.equal(f.calls.finalized, 0);
  assert.equal(f.calls.sent, 0);
});

test("an already-paid fee is reused without emailing a new demand for that fee", async () => {
  const f = fixture();
  const fee = f.seedFee({ status: "paid", total: 2500 });
  assert.equal((await f.run()).id, fee.id);
  assert.equal(f.calls.created, 0);
  assert.equal(f.calls.sent, 0);
});

for (const stage of [0, 1, 2, 3]) {
  test(`a stale unpaid record cannot trigger stage ${stage + 1} after Stripe payment`, async () => {
    const f = fixture();
    f.docs.get("dunning.in_original").dunningStage = stage;
    f.advance(15 * DAY);
    Object.assign(f.original, { status: "paid", amountRemaining: 0 });
    const result = await f.cron();
    assert.equal(result.errors, 0);
    assert.equal(result.suspended, 0);
    assert.equal(f.calls.created, 0);
    assert.equal(f.calls.sent, 0);
    assert.equal(f.calls.notices, 0);
    assert.equal(f.originalSyncs[0].status, "paid");
    assert.equal(f.docs.get("dunning.in_original").dunningStage, stage);
  });
}

for (const state of [{ status: "void" }, { status: "uncollectible" }, { status: "draft" },
  { amountRemaining: 0 }, { dueDate: null }, { dueDate: Date.parse("2026-10-01") / 1000 }]) {
  test(`no fee for a non-collectible invoice: ${JSON.stringify(state)}`, async () => {
    const f = fixture();
    Object.assign(f.original, state);
    assert.equal(await f.run(), null);
    assert.equal(f.calls.created, 0);
    assert.equal(f.docs.has("lateFee.in_original"), false);
  });
}

for (const point of ["original.read", "original.sync"]) {
  test(`${point} failure skips collections and does not restore a suspended site`, async () => {
    const f = fixture();
    f.autoSuspended.push({ _id: "client", name: "Client" });
    f.faults.add(point);
    const result = await f.cron();
    assert.equal(result.errors, 1);
    assert.equal(result.restored, 0);
    assert.equal(f.calls.created, 0);
    assert.equal(f.calls.notices, 0);
  });
}

test("verified payment permits restoration even when the saved invoice is overdue", async () => {
  const f = fixture();
  f.autoSuspended.push({ _id: "client", name: "Client" });
  Object.assign(f.original, { status: "paid", amountRemaining: 0 });
  assert.equal((await f.cron()).restored, 1);
});

test("a customer mismatch fails closed", async () => {
  const f = fixture();
  f.original.customerId = "cus_other";
  await assert.rejects(f.run(), /does not match/);
  assert.equal(f.calls.created, 0);
});

test("payment during fee recovery prevents creation", async () => {
  const f = fixture();
  let reads = 0;
  f.beforeOriginalRead(() => { if (++reads === 2) Object.assign(f.original, { status: "paid", amountRemaining: 0 }); });
  assert.equal(await f.run(), null);
  assert.equal(f.calls.created, 0);
});

test("a retry after payment does not create or send another fee", async () => {
  const f = fixture();
  f.faults.add("invoice.send.before");
  await assert.rejects(f.run());
  Object.assign(f.original, { status: "paid", amountRemaining: 0 });
  assert.equal(await f.run(), null);
  assert.equal(f.calls.created, 1);
  assert.equal(f.calls.sent, 0);
});

test("reminders use the current remaining balance after a partial payment", async () => {
  const f = fixture();
  f.docs.get("dunning.in_original").dunningStage = 0;
  f.original.amountRemaining = 2500;
  assert.equal((await f.cron()).firstNotice, 1);
  assert.equal(f.calls.noticeAmount, 2500);
});

test("Stripe sync preserves the actual payment date and remaining balance independently of the original amount due", async () => {
  const paidAt = Date.parse("2026-09-17T13:02:00Z") / 1000;
  const billing = loadModule("lib/stripe/billing.ts", {
    "stripe": require("stripe"),
    "@/lib/stripe": { stripe: { invoices: { retrieve: async () => ({
      id: "in_paid", customer: { id: "cus_client", name: "Client", email: "client@example.com" },
      status: "paid", amount_due: 15000, amount_paid: 15000, amount_remaining: 0,
      created: Date.parse("2026-09-01T00:00:00Z") / 1000, status_transitions: { paid_at: paidAt },
      lines: { data: [] }, total: 15000, subtotal: 15000, currency: "usd",
    }) } } },
  }, Date);
  let saved;
  const sync = loadModule("lib/stripe/sync.ts", {
    "@/lib/stripe/billing": billing,
    "@/lib/sanityServer": { sanityServer: { fetch: async query => query.includes('"pipelineContact"') ? { _id: "client", name: "Client" } : { _id: "in_paid", status: "open" } } },
    "@/lib/sanity.write": { sanityWriteClient: { createOrReplace: async doc => { saved = doc; } } },
  }, Date);
  const invoice = await billing.getInvoice("in_paid");
  await sync.syncStripeInvoiceToSanity(invoice);
  assert.equal(saved.status, "paid");
  assert.equal(saved.amountDueCents, 15000);
  assert.equal(saved.amountRemainingCents, 0);
  assert.equal(saved.paidAt, "2026-09-17T13:02:00.000Z");
  assert.equal(saved.issuedAt, "2026-09-01T00:00:00.000Z");
});
