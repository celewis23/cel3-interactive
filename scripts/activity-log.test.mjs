import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInThisContext } from "node:vm";
import ts from "typescript";
import { parse, evaluate } from "groq-js";

const require = createRequire(import.meta.url);
const next = require("next/server");
function load(path, dependencies = {}) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  const loaded = { exports: {} };
  runInThisContext(`(function(require,module,exports,console){${outputText}\n})`, { filename: path })((name) => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    if (name.startsWith("node:")) return require(name);
    if (name === "next/server") return next;
    throw new Error(`Unexpected dependency: ${name}`);
  }, loaded, loaded.exports, { error() {} });
  return loaded.exports;
}
const context = load("lib/audit/context.ts");
const jobs = load("lib/audit/jobs.ts", { "@/vercel.json": JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8")) });
const query = load("lib/audit/query.ts");

function fixture(options = {}) {
  const events = new Map();
  const writes = [];
  const afterTasks = [];
  let sequence = 0;
  const save = async (doc) => {
    if (options.failWrites) throw new Error("Database unavailable");
    if (options.beforeWrite) await options.beforeWrite();
    const saved = { _id: `event-${++sequence}`, ...structuredClone(doc) };
    events.set(saved._id, saved); writes.push(saved);
    return saved;
  };
  const logger = load("lib/audit/log.ts", {
    "next/server": { ...next, after: (promise) => afterTasks.push(promise) },
    "@/lib/admin/auth": { COOKIE_NAME: "admin", verifySessionToken: (token) => token === "owner" ? { step: "full" } : token === "staff" ? { step: "full", staffId: "staff-1" } : null },
    "@/lib/portal/auth": { PORTAL_COOKIE: "portal", verifyPortalSessionToken: (token) => token === "valid" ? { userId: "client-1", email: "client@example.com" } : null },
    "@/lib/sanityServer": { sanityServer: { fetch: async () => ({ name: "Staff member", email: "staff@example.com" }) } },
    "@/lib/sanity.write": { sanityWriteClient: { create: save, createOrReplace: save } },
    "./context": context,
  });
  const wrapper = load("lib/audit/withActivity.ts", { "./context": context, "./jobs": jobs, "./log": logger });
  return { ...wrapper, logger, events, writes, afterTasks, rows: () => [...events.values()] };
}
function request(path = "/api/admin/tasks", options = {}) {
  return new next.NextRequest(`https://example.com${path}`, { method: "POST", headers: { cookie: "admin=owner" }, ...options });
}

test("manual actions preserve parameters, response body and status while recording the actor", async () => {
  const f = fixture();
  const req = request("/api/admin/tasks?token=private-url-secret", { body: JSON.stringify({ password: "body-secret" }) });
  const params = { params: Promise.resolve({ id: "task-1" }) };
  const handler = f.withActivity("/api/admin/tasks", "POST", async (received, context) => {
    assert.equal(received, req); assert.equal(context, params);
    assert.equal((await received.json()).password, "body-secret");
    return next.NextResponse.json({ id: "task-1", privateValue: "response-secret" }, { status: 201 });
  });
  const response = await handler(req, params);
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { id: "task-1", privateValue: "response-secret" });
  assert.equal(f.rows().length, 1);
  assert.equal(f.rows()[0].userName, "Owner");
  assert.equal(f.rows()[0].source, "manual");
  assert.equal(f.rows()[0].status, "success");
  const serialized = JSON.stringify(f.rows());
  for (const secret of ["private-url-secret", "body-secret", "response-secret", "admin=owner"]) assert.ok(!serialized.includes(secret));
});

test("awaits detailed audit writes and avoids an extra generic success row", async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const f = fixture({ beforeWrite: () => gate });
  let finished = false;
  const handler = f.withActivity("/api/admin/billing/invoices", "POST", async (req) => {
    f.logger.logAudit(req, { action: "billing.invoice_created", resourceType: "invoice", description: "Invoice INV-1 created" });
    return next.NextResponse.json({ ok: true });
  });
  const pending = handler(request()).then((response) => { finished = true; return response; });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(finished, false);
  release(); await pending;
  assert.equal(f.rows().length, 1);
  assert.equal(f.rows()[0].action, "billing.invoice_created");
  assert.ok(f.rows()[0].runId);
  assert.equal(f.afterTasks.length, 1);
});

test("a job persists a running record before execution and completes the same record", async () => {
  const f = fixture();
  const handler = f.withActivity("/api/cron/billing-enforcement", "GET", async () => {
    assert.equal(f.rows()[0].status, "running");
    return next.NextResponse.json({ ok: true, firstNotice: 2, secondNotice: 0, errors: 0 });
  });
  await handler(request("/api/cron/billing-enforcement"));
  assert.equal(f.rows().length, 1);
  assert.equal(f.rows()[0].status, "success");
  assert.equal(f.rows()[0].metadata.firstNotice, 2);
  assert.equal(f.rows()[0].source, "automatic");
  assert.equal(f.writes[0]._id, f.writes[1]._id);
});

test("disabled billing is a visible skipped check, not a sent-reminder success", async () => {
  const f = fixture();
  await f.withActivity("/api/cron/billing-enforcement", "GET", async () => next.NextResponse.json({
    ok: true, firstNotice: 0, restored: 0, overdueCount: 4, reason: "Automatic collections are off; only restoration checks run.",
  }))(request());
  assert.equal(f.rows()[0].status, "skipped");
  assert.equal(f.rows()[0].routine, true);
  assert.match(f.rows()[0].description, /collections are off/);
  assert.equal(f.rows()[0].metadata.overdueCount, 4);
});

test("job errors returned with HTTP 200 are reported as partial or failed", async () => {
  const f = fixture();
  assert.equal(f.jobOutcome({ firstNotice: 2, errors: 1 }, 200).status, "partial");
  assert.equal(f.jobOutcome({ errors: 1 }, 200).status, "failed");
  assert.equal(f.jobOutcome({ notified: 1, errors: ["private provider error"] }, 200).status, "partial");
  assert.equal(f.jobOutcome({ saved: 3, ok: false }, 200).status, "partial");
});

test("manual batch and application-level failures are not labelled successful", async () => {
  const f = fixture();
  await f.withActivity("/api/admin/leads/import", "POST", async () => next.NextResponse.json({ sent: 2, failed: 1 }))(request());
  assert.equal(f.rows()[0].status, "partial");
  const g = fixture();
  await g.withActivity("/api/admin/lead-generator/run", "POST", async () => next.NextResponse.json({ ok: false }))(request());
  assert.equal(g.rows()[0].status, "failed");
  const h = fixture();
  await h.withActivity("/api/admin/tasks/[id]", "PATCH", async () => next.NextResponse.json({ error: "Save failed" }))(request("/api/admin/tasks/task-1"));
  assert.equal(h.rows()[0].status, "failed");
  assert.equal(h.rows()[0].resourceId, "task-1");
});

test("uncaught errors are logged and rethrown without copying exception secrets", async () => {
  const f = fixture();
  const original = new Error("Bearer exception-secret");
  await assert.rejects(f.withActivity("/api/admin/tasks", "POST", async () => { throw original; })(request()), (err) => err === original);
  assert.equal(f.rows()[0].status, "failed");
  assert.ok(!JSON.stringify(f.rows()).includes("exception-secret"));
});

test("logging outages never turn a successful action into a retryable business failure", async () => {
  const f = fixture({ failWrites: true });
  let mutations = 0;
  const response = await f.withActivity("/api/cron/task-reminders", "GET", async () => { mutations++; return next.NextResponse.json({ sent: 1 }); })(request());
  assert.equal(response.status, 200);
  assert.equal(mutations, 1);
});

test("permissions and errors retain their original responses", async () => {
  const f = fixture();
  const response = await f.withActivity("/api/admin/tasks", "POST", async () => next.NextResponse.json({ error: "Forbidden" }, { status: 403 }))(request());
  assert.equal(response.status, 403);
  assert.equal(f.rows()[0].status, "failed");
});

test("streams and queued responses are accepted, never falsely marked completed", async () => {
  const f = fixture();
  const response = await f.withActivity("/api/admin/ai/chat", "POST", async () => new Response("data: processing\n\n", { headers: { "content-type": "text/event-stream" } }))(request());
  assert.equal(await response.text(), "data: processing\n\n");
  assert.equal(f.rows()[0].status, "accepted");
});

test("portal and external actions are distinguished from scheduled jobs", async () => {
  const f = fixture();
  await f.withActivity("/api/portal/requests", "POST", async () => next.NextResponse.json({ ok: true }))(
    request("/api/portal/requests", { headers: { cookie: "portal=valid" } }));
  assert.equal(f.rows()[0].userId, "client-1");
  assert.equal(f.rows()[0].source, "manual");
  const g = fixture();
  await g.withActivity("/api/ext/messages", "POST", async () => next.NextResponse.json({ ok: true }))(request());
  assert.equal(g.rows()[0].source, "external");
  const h = fixture();
  await h.withActivity("/api/contracts/[token]", "POST", async () => next.NextResponse.json({ ok: true }))(request("/api/contracts/private-signing-token"));
  assert.equal(h.rows()[0].resourceId, null);
  assert.ok(!JSON.stringify(h.rows()).includes("private-signing-token"));
});

test("sensitive fields are removed from explicit domain audit details", async () => {
  const f = fixture();
  await f.logger.writeAudit(request(), { action: "settings.updated", resourceType: "settings", description: "Updated settings",
    after: { enabled: true, password: "secret-password", nested: { refreshToken: "secret-token", value: "Bearer bearer-secret" } },
    metadata: { url: "https://user:pass@example.com?client_secret=secret-url", htmlBody: "private message", apiKey: "private-api-key", body_html: "private html" },
  });
  const row = f.rows()[0];
  assert.equal(row.after.enabled, true);
  for (const value of ["secret-password", "secret-token", "bearer-secret", "secret-url", "private message", "user:pass", "private-api-key", "private html"]) assert.ok(!JSON.stringify(row).includes(value));
});

test("filters are parameterized and action OR clauses cannot bypass other filters", () => {
  const result = query.buildActivityQuery(new URLSearchParams({ action: 'billing" || true', resourceId: "invoice-1", offset: "-50", limit: "NaN", q: '"secret"' }));
  assert.match(result.where, /\(action == \$action \|\| action match \$actionPrefix\)/);
  assert.ok(!result.where.includes('billing"'));
  assert.equal(result.params.resourceId, "invoice-1");
  assert.equal(result.offset, 0); assert.equal(result.limit, 50);
  assert.equal(query.buildActivityQuery(new URLSearchParams({ limit: "9999" })).limit, 200);
});

test("date filtering includes the complete final day and honors browser timezone offsets", () => {
  const result = query.buildActivityQuery(new URLSearchParams({ from: "2026-09-16T00:00:00-04:00", to: "2026-09-16" }));
  assert.equal(result.params.from, "2026-09-16T04:00:00.000Z");
  assert.equal(result.params.to, "2026-09-16T23:59:59.999Z");
});

test("CSV cells quote newlines and cannot execute user-provided spreadsheet formulas", () => {
  assert.equal(query.csvCell('Hello "world"\nnext'), '"Hello ""world""\nnext"');
  assert.equal(query.csvCell("=HYPERLINK(\"bad\")"), '"\'=HYPERLINK(""bad"")"');
});

test("job health distinguishes an unobserved, missing, and interrupted run", () => {
  const now = Date.parse("2026-09-16T15:00:00Z");
  assert.equal(jobs.jobHealth("0 13 * * *", null, now), "unobserved");
  assert.equal(jobs.jobHealth("0 13 * * *", { timestamp: "2026-09-15T13:00:00Z", status: "success" }, now), "overdue");
  assert.equal(jobs.jobHealth("* * * * *", { timestamp: "2026-09-16T14:00:00Z", status: "running" }, now), "unfinished");
  assert.equal(jobs.jobHealth("0 13 * * *", { timestamp: "2026-09-16T13:00:00Z", status: "skipped" }, now), "skipped");
  assert.equal(jobs.findActivityJob("/api/admin/automations/process-pending", "GET"), undefined);
  assert.equal(jobs.ACTIVITY_JOBS.find((job) => job.id === "campaigns").schedule, null);
});

test("activity endpoints enforce audit permissions before reading history or job settings", async () => {
  for (const path of ["app/api/admin/audit/route.ts", "app/api/admin/audit/jobs/route.ts"]) {
    let reads = 0;
    const api = load(path, {
      "@/lib/admin/permissions": { requirePermission: async (_req, module, action) => {
        assert.equal(module, "auditLog"); assert.equal(action, "view");
        return next.NextResponse.json({ error: "Forbidden" }, { status: 403 });
      } },
      "@/lib/sanityServer": { sanityServer: { fetch: async () => { reads++; } } },
      "@/lib/audit/query": query, "@/lib/audit/jobs": jobs,
      "@/lib/billing/enforcementSettings": { getEnforcementSettings: async () => { reads++; } },
    });
    assert.equal((await api.GET(request())).status, 403);
    assert.equal(reads, 0);
  }
});

function historyApi(path, dataset) {
  return load(path, {
    "@/lib/admin/permissions": { requirePermission: async () => null },
    "@/lib/sanityServer": { sanityServer: { fetch: async (groq, params) => (await evaluate(parse(groq), { dataset, params })).get() } },
    "@/lib/audit/query": query, "@/lib/audit/jobs": jobs,
    "@/lib/billing/enforcementSettings": { getEnforcementSettings: async () => ({ autoSuspendEnabled: false }) },
  });
}

test("history queries include legacy events and filter matching invoices without OR leakage", async () => {
  const base = { _type: "auditEvent", timestamp: "2026-09-16T13:00:00.000Z", userName: "Owner", action: "billing.notice_sent", resourceId: "invoice-1", description: "Reminder for Courtney" };
  const api = historyApi("app/api/admin/audit/route.ts", [
    { ...base, _id: "old-event" },
    { ...base, _id: "new-event", status: "success", source: "automatic" },
    { ...base, _id: "routine", routine: true },
    { ...base, _id: "different-invoice", resourceId: "invoice-2" },
    { ...base, _id: "different-type", _type: "invoice" },
  ]);
  const filters = "?action=billing&resourceId=invoice-1&hideRoutine=true&q=Courtney";
  const response = await api.GET(request(`/api/admin/audit${filters}`));
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.total, 2);
  assert.deepEqual(data.events.map((event) => event._id), ["old-event", "new-event"]);
  assert.equal(data.events[0].status, "recorded");
  assert.equal(data.events[0].source, "manual");
  const automatic = await (await api.GET(request(`/api/admin/audit${filters}&source=automatic`))).json();
  assert.deepEqual(automatic.events.map((event) => event._id), ["new-event"]);
  const csv = await api.GET(request(`/api/admin/audit${filters}&format=csv`));
  assert.match(csv.headers.get("content-type"), /text\/csv/);
  assert.equal((await csv.text()).split("\r\n").length, 3);
});

test("job query reads the latest run per job and reports disabled billing without executing it", async () => {
  const base = { _type: "auditEvent", kind: "job", resourceId: "billing-enforcement", status: "success" };
  const api = historyApi("app/api/admin/audit/jobs/route.ts", [
    { ...base, _id: "old", timestamp: "2026-09-15T13:00:00.000Z" },
    { ...base, _id: "latest", timestamp: new Date().toISOString(), status: "skipped" },
    { ...base, _id: "unrelated", kind: "action", timestamp: "2099-09-16T13:00:00.000Z" },
  ]);
  const response = await api.GET(request("/api/admin/audit/jobs"));
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.jobs.length, jobs.ACTIVITY_JOBS.length);
  const billing = data.jobs.find((job) => job.id === "billing-enforcement");
  assert.equal(billing.lastRun._id, "latest");
  assert.equal(billing.collectionsEnabled, false);
  assert.equal(data.jobs.find((job) => job.id === "task-reminders").health, "unobserved");
});

function automationFixture(config, execute) {
  const dataset = [];
  const save = async (doc) => { const row = { _id: `record-${dataset.length + 1}`, ...doc }; dataset.push(row); return row; };
  const database = {
    create: save,
    patch: (id) => {
      const patch = {
        set: (values) => { Object.assign(dataset.find((doc) => doc._id === id), values); return patch; },
        inc: () => patch,
        commit: async () => dataset.find((doc) => doc._id === id),
      };
      return patch;
    },
    fetch: async (groq, params) => (await evaluate(parse(groq), { dataset, params })).get(),
  };
  const { AutomationEngine } = load("lib/automations/engine.ts", {
    "next/server": { ...next, after() {} },
    "@/lib/sanityServer": { sanityServer: database },
    "@/lib/sanity.write": { sanityWriteClient: database },
    "@/lib/audit/log": { writeAudit: async (_req, event) => { await save({ _type: "auditEvent", ...event }); return true; } },
    "@/lib/notifications/push": {},
    "./types": { summariseNode: (node) => node.type },
  });
  const automation = { _id: "automation-1", name: "Follow up", nodes: { nodes: [
    { id: "trigger", type: "trigger", next: "action" },
    { id: "action", type: "action", config: { action_type: "send_email", on_error: "skip", ...config } },
  ] } };
  dataset.push(automation);
  const engine = new AutomationEngine();
  engine._executeAction = execute;
  return { dataset, run: () => engine._evaluate(automation, { orgId: "default", entityType: "contact", entityId: "client-1", triggerType: "invoice_overdue" }) };
}

test("automation approval stays pending and never claims its action executed", async () => {
  let executions = 0;
  const f = automationFixture({ require_approval: true }, async () => { executions++; return { sent: true }; });
  await f.run();
  assert.equal(executions, 0);
  assert.equal(f.dataset.find((doc) => doc.action === "automation.action_processed").status, "accepted");
  assert.equal(f.dataset.find((doc) => doc.action === "automation.waiting").metadata.pendingSteps, 1);
  assert.ok(!f.dataset.some((doc) => doc.action === "automation.completed"));
});

test("automation action errors remain visible when the workflow continues", async () => {
  for (const execute of [async () => ({ error: "No recipient" }), async () => { throw new Error("Provider unavailable"); }]) {
    const f = automationFixture({}, execute);
    await f.run();
    assert.equal(f.dataset.find((doc) => doc.action === "automation.action_processed").status, "failed");
    const completed = f.dataset.find((doc) => doc.action === "automation.completed");
    assert.equal(completed.status, "partial");
    assert.equal(completed.metadata.failedActions, 1);
  }
});
