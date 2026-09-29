import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInThisContext } from "node:vm";
import ts from "typescript";
import { parse, evaluate } from "groq-js";

const require = createRequire(import.meta.url);
const next = require("next/server");
const now = new Date("2026-09-29T16:00:00.000Z");
function load(path, dependencies) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const loaded = { exports: {} };
  runInThisContext(`(function(require,module,exports,console){${outputText}\n})`, { filename: path })(name => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    if (name === "next/server") return next;
    throw new Error(`Unexpected dependency: ${name}`);
  }, loaded, loaded.exports, { error() {} });
  return loaded.exports;
}
function event(id, overrides = {}) {
  return { _id: id, _rev: `${id}-v1`, _type: "auditEvent", kind: "job", source: "automatic",
    routine: true, status: "skipped", timestamp: "2026-09-20T00:00:00.000Z", ...overrides };
}
function fixture(documents, options = {}) {
  const dataset = structuredClone(documents);
  const archive = new Map();
  let deletes = 0;
  let failDelete = options.failDelete;
  const query = async (groq, params) => structuredClone(await (await evaluate(parse(groq), { dataset, params })).get());
  const retention = load("lib/audit/retention.ts", {
    "@/lib/sanity.write": { sanityWriteClient: {
      config: () => ({ projectId: "test-project", dataset: "production" }), fetch: query,
      delete: async ({ query: groq, params }) => {
        deletes++;
        if (failDelete) { failDelete = false; throw new Error("Delete unavailable"); }
        const matching = await query(groq, params);
        for (const doc of matching) {
          assert.deepEqual(archive.get(`${doc._id}:${doc._rev}`), doc, "Delete requires a complete archive of this revision");
          dataset.splice(dataset.findIndex(item => item._id === doc._id), 1);
        }
      },
    } },
    "@/lib/postgres": { sql: { query: async (_sql, params) => {
      if (options.failArchive) throw new Error("Archive unavailable");
      assert.deepEqual(params.slice(0, 2), ["test-project", "production"]);
      const docs = JSON.parse(params[2]);
      for (const doc of docs) archive.set(`${doc._id}:${doc._rev}`, doc);
      options.afterArchive?.(dataset);
      return options.incompleteArchive ? [] : docs.map(doc => ({ event_id: doc._id, revision: doc._rev }));
    } } },
  });
  return { run: () => retention.archiveRoutineActivity(now), dataset, archive, deletes: () => deletes };
}

test("archives only expired routine job checks; preserves client records, failures, and recent checks", async () => {
  const protectedDocs = [
    event("client", { _type: "clientPortalTicket" }), event("manual", { source: "manual" }),
    event("action", { kind: "action" }), event("important", { routine: false }),
    ...["failed", "partial", "running", "success", "accepted"].map(status => event(status, { status })),
    event("recent", { timestamp: "2026-09-29T15:00:00.000Z" }),
    event("boundary", { timestamp: "2026-09-27T16:00:00.000Z" }), event("legacy", { timestamp: null }),
  ];
  const old = event("old", { metadata: { reason: "Nothing due" } });
  const f = fixture([old, ...protectedDocs]);
  assert.deepEqual(await f.run(), { archived: 1, removed: 1, remaining: 0, cutoff: "2026-09-27T16:00:00.000Z" });
  assert.deepEqual(f.dataset, protectedDocs);
  assert.deepEqual(f.archive.get("old:old-v1"), old);
});

test("an unavailable or incomplete archive never deletes a Sanity document", async () => {
  for (const options of [{ failArchive: true }, { incompleteArchive: true }]) {
    const f = fixture([event("old")], options);
    await assert.rejects(f.run());
    assert.equal(f.dataset.length, 1);
    assert.equal(f.deletes(), 0);
  }
});

test("a document changed while archiving is preserved", async () => {
  const f = fixture([event("old")], { afterArchive: dataset => {
    dataset[0]._rev = "new-revision"; dataset[0].status = "failed";
  } });
  const result = await f.run();
  assert.equal(result.removed, 0);
  assert.equal(f.dataset[0].status, "failed");
  assert.equal(f.archive.get("old:old-v1").status, "skipped");
});

test("retrying after an interrupted delete reuses the archive without losing records", async () => {
  const f = fixture([event("old")], { failDelete: true });
  await assert.rejects(f.run(), /Delete unavailable/);
  assert.equal(f.dataset.length, 1);
  assert.equal(f.archive.size, 1);
  assert.equal((await f.run()).removed, 1);
  assert.equal(f.archive.size, 1);
  assert.equal((await f.run()).removed, 0);
});

test("cleanup is bounded and subsequent runs finish a backlog", async () => {
  const f = fixture(Array.from({ length: 2501 }, (_, i) => event(`old-${String(i).padStart(4, "0")}`)));
  const first = await f.run();
  assert.equal(first.removed, 2500);
  assert.equal(first.remaining, 1);
  assert.equal((await f.run()).removed, 1);
  assert.equal(f.archive.size, 2501);
});

test("retention endpoint requires the configured secret and reports archive failures", async t => {
  const previous = process.env.CRON_SECRET;
  t.after(() => { if (previous === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previous; });
  process.env.CRON_SECRET = "test-retention-secret";
  let calls = 0;
  let fail = false;
  const route = load("app/api/cron/audit-retention/route.ts", {
    "@/lib/audit/withActivity": { withActivity: (_route, _method, handler) => handler },
    "@/lib/audit/retention": { archiveRoutineActivity: async () => {
      calls++; if (fail) throw new Error("Private database error");
      return { archived: 0, removed: 0, remaining: 0, cutoff: now.toISOString() };
    } },
  });
  const request = headers => new next.NextRequest("https://example.com/api/cron/audit-retention", { headers });
  for (const headers of [{}, { "x-vercel-cron": "1" }, { authorization: "Bearer wrong" }]) {
    assert.equal((await route.GET(request(headers))).status, 401);
  }
  assert.equal(calls, 0);
  const auth = { authorization: "Bearer test-retention-secret" };
  const success = await route.GET(request(auth));
  assert.equal(success.status, 200);
  assert.equal((await success.json()).skipped, true);
  fail = true;
  const failure = await route.GET(request(auth));
  assert.equal(failure.status, 500);
  assert.ok(!(await failure.text()).includes("Private database error"));
  delete process.env.CRON_SECRET;
  assert.equal((await route.GET(request(auth))).status, 401);
});
