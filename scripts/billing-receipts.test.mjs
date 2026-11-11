import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInThisContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(path, deps) {
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const loadedModule = { exports: {} };
  runInThisContext(`(function(require,module,exports,console){${outputText}\n})`)(
    name => name === "next/server" ? require(name) : deps[name], loadedModule, loadedModule.exports, { error() {} },
  );
  return loadedModule.exports;
}

test("paid receipts persist their payload, deduplicate, and stop unsafe late retries", async () => {
  const previous = { key: process.env.RESEND_API_KEY, from: process.env.RESEND_FROM_EMAIL };
  process.env.RESEND_API_KEY = "test";
  process.env.RESEND_FROM_EMAIL = "Billing <billing@example.com>";
  try {
    const docs = new Map(), sends = [];
    let failCommit = true;
    const store = {
      async createIfNotExists(doc) {
        if (!docs.has(doc._id)) docs.set(doc._id, structuredClone(doc));
        return structuredClone(docs.get(doc._id));
      },
      patch(id) { return { set(values) { return { async commit() {
        if (failCommit) { failCommit = false; throw new Error("DB unavailable after acceptance"); }
        Object.assign(docs.get(id), values);
      } }; } }; },
    };
    const { sendPaidInvoiceReceipt: send } = load("lib/billing/receipts.ts", {
      "@/lib/sanity.write": { sanityWriteClient: store },
      "@/lib/stripe": { stripe: {} },
      resend: { Resend: class { emails = { async send(message, opts) {
        sends.push({ message, opts }); return { data: { id: "email_1" } };
      } }; } },
    });
    const invoice = { id: "in_1", livemode: true, status: "open", customer_email: "client@example.com",
      customer_name: "Client", number: "INV-1", currency: "jpy", amount_paid: 5000,
      status_transitions: { paid_at: 1793750400 }, hosted_invoice_url: "https://invoice.stripe.com/test" };
    await send(invoice);
    assert.equal(sends.length, 0);
    invoice.status = "paid";
    await assert.rejects(send(invoice), /DB unavailable/);
    invoice.customer_email = "changed@example.com";
    await send(invoice);
    assert.deepEqual(sends[0], sends[1], "same key and frozen message after uncertain acceptance");
    assert.match(sends[0].message.text, /5,000/);
    await send(invoice);
    assert.equal(sends.length, 2, "recorded success never sends again");
    const doc = [...docs.values()][0];
    delete doc.sentAt;
    doc.startedAt = new Date(Date.now() - 24 * 3600000).toISOString();
    await assert.rejects(send(invoice), /reconciliation/);
    assert.equal(sends.length, 2);
  } finally {
    for (const [name, value] of [["RESEND_API_KEY", previous.key], ["RESEND_FROM_EMAIL", previous.from]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});

test("webhook verifies the raw body and asks Stripe to retry delivery failures", async () => {
  const old = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = "secret";
  try {
    let sends = 0;
    const { POST } = load("app/api/stripe/webhook/route.ts", {
      "@/lib/stripe": { stripe: { webhooks: { constructEvent(body, signature, secret) {
        assert.equal(body, "raw"); assert.equal(secret, "secret");
        if (signature !== "valid") throw new Error("bad signature");
        return { type: "invoice.paid", data: { object: { id: "in_1" } } };
      } } } },
      "@/lib/billing/receipts": { async sendPaidInvoiceReceipt() { sends++; throw new Error("provider down"); } },
    });
    const request = signature => new Request("https://example.com/api/stripe/webhook", {
      method: "POST", body: "raw", headers: { "stripe-signature": signature },
    });
    assert.equal((await POST(request("bad"))).status, 400);
    assert.equal(sends, 0);
    assert.equal((await POST(request("valid"))).status, 500);
    assert.equal(sends, 1);
  } finally {
    if (old === undefined) delete process.env.STRIPE_WEBHOOK_SECRET; else process.env.STRIPE_WEBHOOK_SECRET = old;
  }
});
