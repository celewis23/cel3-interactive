import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInThisContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadModule(path, dependencies = {}, logger = console) {
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const loaded = { exports: {} };
  runInThisContext(`(function(require,module,exports,console){${outputText}\n})`, { filename: path })(name => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    if (name === "next/server") return require(name);
    throw new Error(`Unexpected dependency: ${name}`);
  }, loaded, loaded.exports, logger);
  return loaded.exports;
}

const errors = loadModule("lib/gmail/oauthErrors.ts");

function fixture(failureStage, statusCode = 500, email = "owner@example.com") {
  const calls = [], logs = [];
  const tokens = { access_token: "private-access-token", refresh_token: "private-refresh-token" };
  async function step(name) {
    calls.push(name);
    if (name === failureStage) throw Object.assign(new Error("private-provider-error"), {
      statusCode, request: { code: "private-authorization-code", tokens },
    });
  }
  const route = loadModule("app/api/admin/email/auth/callback/route.ts", {
    "@/lib/audit/withActivity": { withActivity: (_route, _method, handler) => handler },
    "@/lib/gmail/oauthErrors": errors,
    "@/lib/gmail/client": {
      createOAuthClient: () => ({
        getToken: async () => { await step("token_exchange"); return { tokens }; },
        setCredentials: () => {},
      }),
      storeTokens: async (saved, account) => {
        assert.deepEqual(saved, tokens);
        assert.equal(account, email);
        await step("connection_save");
      },
    },
    googleapis: { google: { oauth2: () => ({ userinfo: { get: async () => {
      await step("profile_lookup"); return { data: { email } };
    } } }) } },
  }, { error: (...args) => logs.push(args) });
  return { calls, logs, run: (state = "matching-state") => route.GET({
    url: `https://example.com/api/admin/email/auth/callback?code=private-code&state=${state}`,
    cookies: { get: () => ({ value: "matching-state" }) },
  }) };
}

test("Sanity payment block explains that Google sign-in succeeded but storage failed", async () => {
  const f = fixture("connection_save", 402);
  const response = await f.run();
  assert.equal(new URL(response.headers.get("location")).searchParams.get("error"), "storage_billing");
  assert.deepEqual(f.calls, ["token_exchange", "profile_lookup", "connection_save"]);
  assert.match(errors.oauthErrorMessage("storage_billing"), /data storage is unavailable/);
  assert.doesNotMatch(JSON.stringify(f.logs), /private-/);
});

test("each callback failure reports its actual stage without exposing credentials", async () => {
  for (const stage of ["token_exchange", "profile_lookup", "connection_save"]) {
    const f = fixture(stage);
    const response = await f.run();
    assert.equal(new URL(response.headers.get("location")).searchParams.get("error"), stage);
    assert.doesNotMatch(JSON.stringify(f.logs), /private-/);
  }
});

test("successful sign-in saves the connection and clears the state cookie", async () => {
  const f = fixture();
  const response = await f.run();
  assert.equal(response.headers.get("location"), "https://example.com/admin/email?connected=1");
  assert.match(response.headers.get("set-cookie"), /gmail_oauth_state=.*Max-Age=0/);
  assert.deepEqual(f.calls, ["token_exchange", "profile_lookup", "connection_save"]);
});

test("invalid state cannot exchange or save Google tokens", async () => {
  const f = fixture();
  const response = await f.run("wrong-state");
  assert.equal(new URL(response.headers.get("location")).searchParams.get("error"), "invalid_state");
  assert.deepEqual(f.calls, []);
});

test("missing account email cannot overwrite the stored connection", async () => {
  const empty = fixture(undefined, 500, "");
  const response = await empty.run();
  assert.equal(new URL(response.headers.get("location")).searchParams.get("error"), "profile_lookup");
  assert.deepEqual(empty.calls, ["token_exchange", "profile_lookup"]);
});

test("unknown or malformed error codes render a safe fallback", () => {
  for (const code of ["%", "__proto__", "unrecognized"]) {
    assert.equal(typeof errors.oauthErrorMessage(code), "string");
    assert.match(errors.oauthErrorMessage(code), /could not be completed/);
  }
});
