import assert from "node:assert/strict";
import { createHash, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInThisContext } from "node:vm";
import ts from "typescript";

const hash = value => createHash("sha256").update(value).digest("hex");
const code = "ABCDEFGH23456789JKLM";
const bytes = Buffer.from("PK-test-private-archive");
function fixture(options = {}) {
  const calls = [];
  let attempts = 0;
  const { outputText } = ts.transpileModule(readFileSync("lib/client-downloads.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const loaded = { exports: {} };
  runInThisContext(`(function(require,module,exports,console){${outputText}\n})`)(name => {
    if (name === "node:crypto") return { createHash, timingSafeEqual };
    if (name === "@/lib/postgres") return { sql: { query: async (query, params) => {
      calls.push({ query, params });
      if (options.databaseFailure) throw new Error("private failure detail");
      if (query.startsWith("DELETE")) return [];
      if (query.startsWith("INSERT")) return [{ attempts: options.limited ? 11 : ++attempts }];
      if (query.startsWith("SELECT code_hash")) return options.disabled ? [] : [{ code_hash: hash(code) }];
      if (query.startsWith("SELECT filename")) return options.revoked ? [] : [{ filename: "Client-Website.zip", archive_base64: bytes.toString("base64"), sha256: options.corrupt ? "0".repeat(64) : hash(bytes), byte_size: bytes.length }];
      throw new Error("Unexpected query");
    } } };
    throw new Error(`Unexpected dependency: ${name}`);
  }, loaded, loaded.exports, { error() {} });
  const request = (value = code, headers = {}) => new Request("https://example.com/api/downloads/client", { method: "POST", headers: { "content-type": "application/json", origin: "https://example.com", "x-vercel-forwarded-for": "192.0.2.1", ...headers }, body: JSON.stringify({ code: value }) });
  return { run: (req = request(), slug = "client") => loaded.exports.downloadPackage(req, slug), request, calls };
}
test("valid access returns the complete private archive with download and no-store headers", async () => {
  const f = fixture(); const result = await f.run(f.request("abcd efgh-2345-6789-jklm"));
  assert.equal(result.status, 200); assert.deepEqual(Buffer.from(await result.arrayBuffer()), bytes);
  assert.match(result.headers.get("content-disposition"), /attachment; filename="Client-Website.zip"/);
  assert.equal(result.headers.get("content-type"), "application/zip");
  assert.match(result.headers.get("cache-control"), /no-store/);
  assert.equal(result.headers.get("x-archive-sha256"), hash(bytes));
  assert.equal(JSON.stringify(f.calls).includes(code), false);
  assert.equal(JSON.stringify(f.calls).includes("192.0.2.1"), false);
});
test("wrong, malformed, missing and disabled codes never read archive data", async () => {
  for (const [input, options] of [["Z".repeat(20), {}], ["short", {}], [undefined, {}], [code, { disabled: true }]]) {
    const f = fixture(options); const req = new Request("https://example.com/api/downloads/client", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: input }) });
    assert.ok([400, 403].includes((await f.run(req)).status));
    assert.equal(f.calls.some(c => c.query.startsWith("SELECT filename")), false);
  }
});
test("revocation between authorization and file retrieval still blocks the download", async () => {
  const result = await fixture({ revoked: true }).run(); assert.equal(result.status, 403); assert.equal(result.headers.get("content-type").includes("zip"), false);
});
test("persistent rate limit stops requests before archive lookup", async () => {
  const f = fixture({ limited: true }); const result = await f.run();
  assert.equal(result.status, 429); assert.equal(result.headers.get("retry-after"), "900");
  assert.equal(f.calls.some(c => c.query.startsWith("SELECT")), false);
});
test("database failure and archive corruption fail closed without leaking internal errors", async () => {
  for (const options of [{ databaseFailure: true }, { corrupt: true }]) {
    const result = await fixture(options).run(); assert.equal(result.status, 503);
    assert.doesNotMatch(await result.text(), /private failure|Archive integrity|PK-test/);
    assert.match(result.headers.get("cache-control"), /no-store/);
  }
});
test("cross-origin, oversized, non-JSON, invalid-slug and malformed requests are rejected before database access", async () => {
  const f = fixture();
  assert.equal((await f.run(f.request(code, { origin: "https://attacker.example" }))).status, 403);
  assert.equal((await f.run(f.request(code, { "content-length": "9999" }))).status, 413);
  assert.equal((await f.run(f.request("A".repeat(2000)))).status, 413);
  assert.equal((await f.run(f.request(code, { "content-type": "text/plain" }))).status, 415);
  assert.equal((await f.run(f.request(), "../secret")).status, 404);
  assert.equal((await f.run(new Request("https://example.com", { method: "POST", headers: { "content-type": "application/json" }, body: "{" }))).status, 400);
  assert.equal(f.calls.length, 0);
});
test("the API exposes no GET download and access codes are excluded from activity capture", () => {
  const route = readFileSync("app/api/downloads/[slug]/route.ts", "utf8");
  assert.doesNotMatch(route, /export (?:async function|const) GET/);
  assert.match(readFileSync("scripts/instrument-activity.mjs", "utf8"), /excluded = new Set\(\[.*\/api\/downloads\/\[slug\]/);
});
