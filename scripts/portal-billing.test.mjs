import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInThisContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
function loadModule(path, dependencies) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const loaded = { exports: {} };
  runInThisContext(`(function(require,module,exports){${outputText}\n})`, { filename: path })(name => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    if (name === "next/server") return require(name);
    throw new Error(`Unexpected dependency: ${name}`);
  }, loaded, loaded.exports);
  return loaded.exports;
}

function fixture() {
  const user = { stripeCustomerId: "cus_primary", managedStripeCustomerIds: ["cus_managed", "cus_primary"], status: "active" };
  const invoices = [
    { id: "in_own", customerId: "cus_primary", status: "paid", created: 1 },
    { id: "in_managed", customerId: "cus_managed", status: "paid", created: 3 },
    { id: "in_open", customerId: "cus_managed", status: "open", created: 4 },
    { id: "in_other", customerId: "cus_other", status: "paid", created: 5 },
    { id: "in_draft", customerId: "cus_managed", status: "draft", created: 6 },
  ];
  const queries = [];
  const billing = {
    listInvoices: async ({ customerId, status, startingAfter }) => {
      queries.push({ customerId, status, startingAfter });
      assert.ok(customerId, "An unscoped Stripe list must never be requested");
      const matches = invoices.filter(invoice => invoice.customerId === customerId && invoice.status === status);
      const start = startingAfter ? matches.findIndex(invoice => invoice.id === startingAfter) + 1 : 0;
      return { invoices: matches.slice(start, start + 1), hasMore: start + 1 < matches.length };
    },
    getInvoice: async id => invoices.find(invoice => invoice.id === id) ?? null,
  };
  const access = loadModule("lib/portal/billingAccess.ts", { "@/lib/stripe/billing": billing });
  const dependencies = {
    "@/lib/stripe/billing": billing,
    "@/lib/portal/billingAccess": access,
    "@/lib/portal/auth": { PORTAL_COOKIE: "session", verifyPortalSessionToken: token => token === "valid" ? { userId: "user" } : null },
    "@/lib/sanityServer": { sanityServer: { fetch: async query => {
      assert.match(query, /managedStripeCustomerIds/);
      assert.match(query, /status != "suspended"/);
      return user.status === "suspended" ? null : user;
    } } },
  };
  const list = loadModule("app/api/portal/invoices/route.ts", dependencies);
  const detail = loadModule("app/api/portal/invoices/[id]/route.ts", dependencies);
  const req = { cookies: { get: () => ({ value: "valid" }) } };
  return { user, invoices, queries, access, list: () => list.GET(req), detail: id => detail.GET(req, { params: Promise.resolve({ id }) }),
    anonymous: () => list.GET({ cookies: { get: () => undefined } }) };
}

test("invoice API lists primary and explicitly managed accounts, deduplicates grants, and follows pagination", async () => {
  const f = fixture();
  f.invoices.push({ id: "in_older", customerId: "cus_managed", status: "paid", created: 2 });
  const response = await f.list();
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).invoices.map(i => i.id), ["in_open", "in_managed", "in_older", "in_own"]);
  assert.equal(f.queries.filter(q => q.customerId === "cus_primary" && q.status === "paid").length, 1);
  assert.ok(f.queries.some(q => q.startingAfter === "in_managed"));
});

test("managed invoice details are accessible, unrelated customers and drafts are denied", async () => {
  const f = fixture();
  assert.equal((await f.detail("in_managed")).status, 200);
  assert.equal((await f.detail("in_own")).status, 200);
  assert.equal((await f.detail("in_other")).status, 403);
  assert.equal((await f.detail("in_draft")).status, 403);
  assert.equal((await f.detail("in_missing")).status, 404);
});

test("removing a managed grant immediately removes both list and detail access", async () => {
  const f = fixture();
  f.user.managedStripeCustomerIds = [];
  assert.deepEqual((await (await f.list()).json()).invoices.map(i => i.id), ["in_own"]);
  assert.equal((await f.detail("in_managed")).status, 403);
});

test("a manager without a primary billing account can access only their grants", async () => {
  const f = fixture();
  f.user.stripeCustomerId = null;
  f.user.managedStripeCustomerIds = ["cus_managed"];
  assert.equal((await f.detail("in_managed")).status, 200);
  assert.equal((await f.detail("in_own")).status, 403);
});

test("no linked accounts returns no invoices without an unscoped Stripe request", async () => {
  const f = fixture();
  f.user.stripeCustomerId = null;
  f.user.managedStripeCustomerIds = [];
  assert.deepEqual((await (await f.list()).json()).invoices, []);
  assert.equal(f.queries.length, 0);
});

test("anonymous and suspended users cannot access invoice lists or details", async () => {
  const f = fixture();
  assert.equal((await f.anonymous()).status, 401);
  f.user.status = "suspended";
  assert.equal((await f.list()).status, 404);
  assert.equal((await f.detail("in_managed")).status, 404);
  assert.equal(f.queries.length, 0);
});
