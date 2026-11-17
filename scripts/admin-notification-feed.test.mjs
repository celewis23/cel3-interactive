import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const source = ts.transpileModule(readFileSync("app/api/admin/notifications/feed/route.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
function feed({ session = { step: "full" }, permissions = {}, failEmail = false } = {}) {
  const calls = [];
  const dependencies = {
    "next/server": { NextResponse: { json: (body, init) => ({ status: init?.status ?? 200, json: async () => body }) } },
    "@/lib/admin/auth": { COOKIE_NAME: "session", verifySessionToken: () => session },
    "@/lib/sanityServer": { sanityServer: { fetch: async query => query.includes("staffRole") ? { permissions } : [] } },
    "@/lib/gmail/api": { listThreads: async opts => {
      calls.push(opts);
      if (failEmail) throw new Error("Gmail unavailable");
      return { threads: Array.from({ length: 12 }, (_, id) => ({
        id: `thread${id}`, subject: `Email ${id}`, date: 100000 + id, messageCount: 1, isRead: false,
      })) };
    } },
    "@/lib/messaging/service": { listUnreadMessageNotifications: async () => [{
      _id: "message1", title: "Client message", body: "Hi", entityId: "client-conversation", createdAt: new Date(100000).toISOString(),
    }] },
  };
  const loaded = { exports: {} };
  new Function("require", "exports", "console", source)(name => dependencies[name], loaded.exports, { error() {} });
  return { calls, get: kind => loaded.exports.GET({
    cookies: { get: () => ({ value: "test-session" }) }, nextUrl: new URL(`https://example.com/api/admin/notifications/feed${kind ? `?kind=${kind}` : ""}`),
  }) };
}
test("category view includes all matching unread email threads with exact links and queries only that category", async () => {
  const f = feed();
  const response = await f.get("email");
  assert.equal(response.status, 200);
  const { notifications } = await response.json();
  assert.equal(notifications.length, 12);
  assert.equal(notifications[0].href, "/admin/email/thread/thread11");
  assert.ok(notifications.every(item => item.kind === "email"));
  assert.equal(f.calls[0].q, "is:unread");
  assert.equal(f.calls[0].maxResults, 50);
  const messages = await (await f.get("message")).json();
  assert.equal(messages.notifications[0].href, "/admin/messages/client-conversation");
  assert.equal(f.calls.length, 1);
});
test("category feed rejects expired sessions and respects staff module permissions", async () => {
  assert.equal((await feed({ session: null }).get("email")).status, 401);
  const staff = feed({ session: { step: "full", staffId: "staff1", roleSlug: "limited" } });
  assert.deepEqual((await (await staff.get("email")).json()).notifications, []);
  assert.equal(staff.calls.length, 0);
});
test("category service failures return an error instead of a misleading empty list", async () => {
  assert.equal((await feed({ failEmail: true }).get("email")).status, 503);
});
