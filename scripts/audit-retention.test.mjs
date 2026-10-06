import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInThisContext } from "node:vm";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import ts from "typescript";

const require = createRequire(import.meta.url);
const now = new Date("2026-10-05T16:00:00.000Z");
function load(path, dependencies) {
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const loaded = { exports: {} };
  runInThisContext(`(function(require,module,exports,console){${outputText}\n})`, { filename: path })(name => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    if (name.startsWith("node:") || name === "next/server") return require(name);
    throw new Error(`Unexpected dependency: ${name}`);
  }, loaded, loaded.exports, { error() {} });
  return loaded.exports;
}
function event(id, overrides = {}) {
  return { _id: id, _rev: `${id}-v1`, _type: "auditEvent", kind: "job", source: "automatic",
    routine: true, status: "skipped", timestamp: "2026-10-01T00:00:00.000Z", ...overrides };
}
function fixture(documents, options = {}) {
  const dataset = structuredClone(documents), archives = new Map();
  let writes = 0;
  const eligible = (doc, cutoff, history) => doc._type === "auditEvent" && doc.status !== "running" && typeof doc.timestamp === "string"
    && (doc.timestamp < history || doc.timestamp < cutoff && doc.kind === "job" && doc.source === "automatic" && doc.routine === true && doc.status === "skipped");
  const retention = load("lib/audit/retention.ts", { "@/lib/postgres": { sql: { query: async (query, params) => {
    if (query.startsWith("SELECT document")) return dataset.filter(doc => eligible(doc, ...params)).slice(0, 500).map(document => ({ document: structuredClone(document) }));
    if (query.startsWith("SELECT count")) return [{ remaining: dataset.filter(doc => eligible(doc, ...params)).length }];
    assert.match(query, /WITH saved AS/);
    assert.match(query, /d\.document->>'_rev' = original->>'_rev'/);
    writes++;
    if (options.failArchive) throw new Error("Archive unavailable");
    const bytes = Buffer.from(params[4], "base64");
    assert.equal(createHash("sha256").update(bytes).digest("hex"), params[0]);
    const docs = gunzipSync(bytes).toString().trim().split("\n").map(JSON.parse);
    assert.equal(docs.length, params[1]);
    archives.set(params[0], docs);
    options.beforeDelete?.(dataset);
    let removed = 0;
    for (const saved of JSON.parse(params[5])) {
      const index = dataset.findIndex(doc => doc._id === saved._id && doc._rev === saved._rev);
      if (index >= 0) { dataset.splice(index, 1); removed++; }
    }
    return [{ removed }];
  } } } });
  return { run: () => retention.archiveRoutineActivity(now), dataset, archives, writes: () => writes };
}

test("recent business activity and unfinished runs stay searchable; old records are preserved in gzip", async () => {
  const protectedDocs = [event("client", { _type: "clientPortalTicket" }), event("manual", { source: "manual" }),
    event("failure", { status: "failed" }), event("running", { status: "running", timestamp: "2020-01-01T00:00:00.000Z" }),
    event("recent", { timestamp: "2026-10-05T15:00:00.000Z" }), event("missing-time", { timestamp: null })];
  const old = [event("routine"), event("old-business", { source: "manual", kind: "action", status: "success", timestamp: "2026-08-01T00:00:00.000Z" })];
  const f = fixture([...old, ...protectedDocs]);
  const result = await f.run();
  assert.equal(result.removed, 2);
  assert.equal(result.remaining, 0);
  assert.deepEqual(f.dataset, protectedDocs);
  assert.deepEqual([...f.archives.values()].flat(), old);
});

test("an archive failure leaves source records untouched", async () => {
  const f = fixture([event("old")], { failArchive: true });
  await assert.rejects(f.run(), /Archive unavailable/);
  assert.equal(f.dataset.length, 1);
  assert.equal(f.archives.size, 0);
});

test("a concurrent change survives revision-matched cleanup", async () => {
  const f = fixture([event("old")], { beforeDelete: docs => { docs[0]._rev = "new"; docs[0].status = "failed"; } });
  assert.equal((await f.run()).removed, 0);
  assert.equal(f.dataset[0].status, "failed");
  assert.equal([...f.archives.values()][0][0].status, "skipped");
});

test("cleanup batches are bounded and retries finish the remaining history", async () => {
  const f = fixture(Array.from({ length: 5001 }, (_, i) => event(`old-${i}`)));
  assert.equal((await f.run()).remaining, 1);
  assert.equal((await f.run()).removed, 1);
  assert.equal([...f.archives.values()].flat().length, 5001);
});

test("retention endpoint requires its configured scheduler secret", async t => {
  const previous = process.env.CRON_SECRET;
  t.after(() => { if (previous === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previous; });
  process.env.CRON_SECRET = "test-retention-secret";
  let calls = 0;
  const route = load("app/api/cron/audit-retention/route.ts", {
    "@/lib/audit/withActivity": { withActivity: (_route, _method, handler) => handler },
    "@/lib/audit/retention": { archiveRoutineActivity: async () => { calls++; return { archived: 0, removed: 0 }; } },
  });
  assert.equal((await route.GET(new Request("https://example.com"))).status, 401);
  assert.equal(calls, 0);
  assert.equal((await route.GET(new Request("https://example.com", { headers: { authorization: "Bearer test-retention-secret" } }))).status, 200);
  assert.equal(calls, 1);
});
