import assert from "node:assert/strict";
import { createHmac, timingSafeEqual, createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";
import { runInThisContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const next = require("next/server");
const origin = "https://www.cel3interactive.com";
const env = { MOCKUPS_DIRECTORY_CODE: "7142", MOCKUPS_DIRECTORY_SECRET: "a".repeat(64), NODE_ENV: "production" };
function load(file, dependencies, environment = env) {
  const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } });
  const loaded = { exports: {} };
  runInThisContext(`(function(require,module,exports,process,console){${outputText}\n})`, { filename: file })(name => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  }, loaded, loaded.exports, { env: environment, cwd: () => process.cwd() }, { error() {} });
  return loaded.exports;
}
const access = load("lib/mockups/directory-access.ts", { "node:crypto": { createHmac, timingSafeEqual } });
function fixture(options = {}) {
  const calls = [];
  const auth = load("app/api/mockups/access/route.ts", {
    "node:crypto": { createHash }, "next/server": next,
    "@/lib/mockups/directory-access": access,
    "@/lib/postgres": { sql: { query: async (query, params) => {
      calls.push({ query, params }); if (options.databaseFailure) throw new Error("Private database error");
      return query.startsWith("INSERT") ? [{ attempts: options.limited ? 11 : 1 }] : [];
    } } },
  });
  const request = (code = "7142", headers = {}) => new next.NextRequest(origin + "/api/mockups/access", { method: "POST", headers: { "content-type": "application/json", origin, "x-vercel-forwarded-for": "192.0.2.1", ...headers }, body: JSON.stringify({ code }) });
  return { post: auth.POST, request, calls };
}

test("tokens are signed, expire, and cannot be reused after code rotation", () => {
  const now = Date.now(); const token = access.createDirectoryToken(now);
  assert.equal(access.verifyDirectoryToken(token, now), true);
  assert.equal(access.verifyDirectoryToken(token + "x", now), false);
  const [expires, signature] = token.split(".");
  assert.equal(access.verifyDirectoryToken(`${Number(expires) + 1}.${signature}`, now), false);
  assert.equal(access.verifyDirectoryToken(token, now + 8 * 3600000), false);
  assert.equal(access.verifyDirectoryToken("fake"), false);
  const rotated = load("lib/mockups/directory-access.ts", { "node:crypto": { createHmac, timingSafeEqual } }, { ...env, MOCKUPS_DIRECTORY_CODE: "6123" });
  assert.equal(rotated.verifyDirectoryToken(token, now), false);
  const missing = load("lib/mockups/directory-access.ts", { "node:crypto": { createHmac, timingSafeEqual } }, {});
  assert.equal(missing.verifyDirectoryToken(token, now), false);
  assert.throws(() => missing.checkDirectoryCode("7142"));
});
test("correct code, including spaces, sets a secure directory-only cookie", async () => {
  const f = fixture(); const response = await f.post(f.request("7 1 4 2"));
  assert.equal(response.status, 200);
  const cookie = response.cookies.get(access.DIRECTORY_COOKIE);
  assert.equal(access.verifyDirectoryToken(cookie.value), true);
  assert.equal(cookie.path, "/mockups"); assert.equal(cookie.httpOnly, true); assert.equal(cookie.secure, true); assert.equal(cookie.sameSite, "lax");
  assert.equal(cookie.maxAge, 28800); assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(JSON.stringify(f.calls).includes("7142"), false);
  assert.equal(JSON.stringify(f.calls).includes("192.0.2.1"), false);
});
test("incorrect codes and throttled attempts never grant access", async () => {
  const f = fixture(); const wrong = await f.post(f.request("0000"));
  assert.equal(wrong.status, 401); assert.equal(wrong.cookies.get(access.DIRECTORY_COOKIE), undefined);
  const limited = fixture({ limited: true }); const blocked = await limited.post(limited.request());
  assert.equal(blocked.status, 429); assert.equal(blocked.headers.get("retry-after"), "900"); assert.equal(blocked.cookies.get(access.DIRECTORY_COOKIE), undefined);
});
test("uses the incoming host when Next's internal development URL differs", async () => {
  const f = fixture();
  const request = new next.NextRequest("http://localhost:8782/api/mockups/access", { method: "POST", headers: {
    "content-type": "application/json", origin: "http://127.0.0.1:8782", host: "127.0.0.1:8782",
  }, body: JSON.stringify({ code: "7142" }) });
  assert.equal((await f.post(request)).status, 200);
});
test("bad origins, oversized bodies and invalid codes are rejected without a database read", async () => {
  const f = fixture();
  assert.equal((await f.post(f.request("7142", { origin: "https://other.example" }))).status, 403);
  assert.equal((await f.post(f.request("x".repeat(300)))).status, 413);
  assert.equal((await f.post(f.request("7142", { "content-type": "text/plain" }))).status, 415);
  assert.equal((await f.post(f.request("12345"))).status, 400);
  assert.equal((await f.post(f.request(7142))).status, 400);
  assert.equal(f.calls.length, 0);
});
test("database outages fail closed without exposing details", async () => {
  const f = fixture({ databaseFailure: true }); const response = await f.post(f.request());
  assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /Private database error/); assert.equal(response.cookies.get(access.DIRECTORY_COOKIE), undefined);
});
test("directory HTML is only read after cookie verification; static index cannot bypass the gate", async () => {
  const reads = [];
  const directory = load("app/mockups/route.ts", {
    "node:fs/promises": { readFile: async file => { reads.push(file); return readFileSync(file, "utf8"); } },
    "node:path": path, "@/lib/mockups/directory-access": access,
  });
  const request = token => new next.NextRequest(origin + "/mockups", { headers: token ? { cookie: `${access.DIRECTORY_COOKIE}=${token}` } : {} });
  for (const token of [undefined, "forged"]) {
    const response = await directory.GET(request(token)); const html = await response.text();
    assert.match(html, /4-digit access code/); assert.doesNotMatch(html, /UnlockingRVA|Secret Squares|7142/);
    assert.equal(reads.at(-1), path.join(process.cwd(), "app/mockups/access.html"));
    assert.match(response.headers.get("cache-control"), /no-store/);
  }
  const unlocked = await directory.GET(request(access.createDirectoryToken()));
  assert.match(await unlocked.text(), /UnlockingRVA/); assert.equal(unlocked.headers.get("vary"), "Cookie");
  assert.equal(existsSync("public/mockups/index.html"), false);
  assert.match(readFileSync("next.config.ts", "utf8"), /source: "\/mockups\/index.html", destination: "\/mockups"/);
  for (const client of ["unlockingrva", "electric-sun-society", "neejah-styles", "secret-squares", "frith-yorkies", "glue-craft-studio"]) assert.equal(existsSync(`public/mockups/${client}/index.html`), true);
});
