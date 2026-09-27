import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInThisContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const next = require("next/server");
const route = "app/api/mockups/electric-sun-society/choice/route.ts";
const { outputText } = ts.transpileModule(readFileSync(new URL(`../${route}`, import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
});
const origin = "https://www.cel3interactive.com";
const payload = { choice: "B", notes: "Love the warm colors.\nKeep A's sun.", requestId: "8577234f-4095-415d-8a51-9d08a22a4e33" };

function fixture({ result = { data: { id: "email-123" }, error: null }, throws = false, key = "test-key" } = {}) {
  const emails = [], events = [], wrappers = [];
  const loaded = { exports: {} };
  const dependencies = {
    "next/server": next,
    resend: { Resend: class {
      emails = { send: async (...args) => { emails.push(args); if (throws) throw new Error("Network unavailable"); return result; } };
    } },
    "@/lib/audit/log": { logAudit: (_req, event) => events.push(event) },
    "@/lib/audit/withActivity": { withActivity: (path, method, handler) => { wrappers.push({ path, method }); return handler; } },
  };
  runInThisContext(`(function(require,module,exports,process){${outputText}\n})`, { filename: route })(
    (name) => { if (Object.hasOwn(dependencies, name)) return dependencies[name]; throw new Error(`Unexpected import ${name}`); },
    loaded, loaded.exports, { env: { RESEND_API_KEY: key, RESEND_FROM_EMAIL: "CEL3 <verified@example.com>" } },
  );
  const send = (body = payload, headers = {}, raw = false) => loaded.exports.POST(new next.NextRequest(origin + "/api/mockups/electric-sun-society/choice", {
    method: "POST", headers: { origin, "content-type": "application/json", "x-forwarded-for": "192.0.2.10", ...headers },
    body: raw ? body : JSON.stringify(body),
  }));
  return { send, emails, events, wrappers };
}

test("emails the selected direction and notes only to CEL3 and records the activity", async () => {
  const f = fixture();
  const response = await f.send({ ...payload, to: "someone@example.com", subject: "ignore this", project: "ignore this" });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  const [email, options] = f.emails[0];
  assert.deepEqual(email.to, ["info@cel3interactive.com"]);
  assert.equal(email.from, "CEL3 <verified@example.com>");
  assert.equal(email.subject, "Electric Sun Society: design choice B — Hillside Press");
  assert.ok(email.text.includes(payload.notes));
  assert.ok(email.text.includes(origin + "/mockups/electric-sun-society/"));
  assert.equal(options.idempotencyKey, `electric-sun-society-choice/${payload.requestId}`);
  assert.equal(f.events[0].action, "mockup.choice_sent");
  assert.equal(f.events[0].metadata.emailId, "email-123");
  assert.equal(JSON.stringify(f.events).includes("Love the warm colors"), false);
  assert.deepEqual(f.wrappers, [{ path: "/api/mockups/electric-sun-society/choice", method: "POST" }]);
});

test("all three options accept optional notes; retries use the same provider idempotency key", async () => {
  for (const [choice, name] of [["A", "The Headliner"], ["B", "Hillside Press"], ["C", "Sound System"]]) {
    const f = fixture();
    assert.equal((await f.send({ choice, requestId: payload.requestId })).status, 200);
    assert.equal((await f.send({ choice, requestId: payload.requestId })).status, 200);
    assert.ok(f.emails[0][0].text.includes(name));
    assert.ok(f.emails[0][0].text.includes("No notes provided."));
    assert.deepEqual(f.emails[0], f.emails[1]);
  }
});

test("notes remain plain text even when they contain HTML", async () => {
  const f = fixture();
  await f.send({ ...payload, notes: '<script>alert("hello")</script> & <b>bold</b>' });
  assert.equal(f.emails[0][0].html, undefined);
  assert.ok(f.emails[0][0].text.includes('<script>alert("hello")</script>'));
});

test("invalid options, notes, request IDs and JSON never send email", async () => {
  const f = fixture();
  for (const body of [null, [], {}, { ...payload, choice: "D" }, { ...payload, choice: "constructor" },
    { ...payload, choice: ["A"] }, { ...payload, notes: 42 }, { ...payload, notes: "a".repeat(4001) },
    { ...payload, requestId: "" }, { ...payload, requestId: "not-a-uuid" }]) {
    assert.equal((await f.send(body)).status, 400);
  }
  assert.equal((await f.send("{broken", {}, true)).status, 400);
  assert.deepEqual(f.emails, []);
});

test("rejects foreign origins, invalid content types and oversized requests", async () => {
  const f = fixture();
  assert.equal((await f.send(payload, { origin: "https://unrelated.example" })).status, 403);
  assert.equal((await f.send(payload, { origin: "" })).status, 403);
  assert.equal((await f.send(payload, { "content-type": "text/plain" })).status, 415);
  assert.equal((await f.send(payload, { "content-length": "32769" })).status, 413);
  assert.equal((await f.send({ ...payload, notes: "a".repeat(32769) })).status, 413);
  assert.deepEqual(f.emails, []);
});

test("allows the apex site origin", async () => {
  assert.equal((await fixture().send(payload, { origin: "https://cel3interactive.com" })).status, 200);
});

test("missing email configuration fails without a false success", async () => {
  const f = fixture({ key: "" });
  assert.equal((await f.send()).status, 503);
  assert.deepEqual(f.emails, []);
  assert.deepEqual(f.events, []);
});

test("provider rejection, missing confirmation and network failure remain retryable failures", async () => {
  for (const config of [{ result: { data: null, error: { message: "provider secret details" } } },
    { result: { data: null, error: null } }, { throws: true }]) {
    const f = fixture(config);
    const response = await f.send();
    assert.equal(response.status, 502);
    const body = await response.json();
    assert.equal(body.ok, undefined);
    assert.ok(body.error.includes("try again"));
    assert.equal(body.error.includes("provider secret details"), false);
    assert.deepEqual(f.events, []);
  }
});

test("throttles repeated requests before contacting the email provider", async () => {
  const f = fixture();
  for (let i = 0; i < 5; i++) assert.equal((await f.send()).status, 200);
  const response = await f.send();
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get("retry-after")) > 0);
  assert.equal(f.emails.length, 5);
  assert.equal((await f.send(payload, { "x-forwarded-for": "192.0.2.11" })).status, 200);
});
