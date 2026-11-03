import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function setup({ accessible = true, target = true } = {}) {
  const calls = [];
  const sql = { query: async (query, params) => {
    calls.push({ query, params });
    if (query.includes("FROM messaging_conversations")) return [{ id: "conversation", client_id: accessible ? "client" : "other" }];
    if (query.includes("FROM messaging_conversation_participants")) return [];
    if (query.includes("SELECT id FROM messaging_messages")) return target ? [{ id: "message" }] : [];
    return [];
  } };
  const source = ts.transpileModule(readFileSync("lib/messaging/service.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  runInNewContext(source, { exports: module.exports, require: (name) => name === "@/lib/postgres" ? { sql } : {}, console });
  return { service: module.exports, calls };
}
const actor = { actorId: "portal:client", userId: "client", kind: "client", name: "Client" };
test("reactions enforce conversation access and message membership", async () => {
  for (const options of [{ accessible: false }, { target: false }]) {
    const { service, calls } = setup(options);
    assert.equal((await service.setMessageReaction(actor, "conversation", "message", "👍", true)).status, 404);
    assert.ok(!calls.some(({ query }) => /INSERT|DELETE/.test(query)));
  }
});
test("reaction writes use authenticated actor and idempotent add/remove", async () => {
  const { service, calls } = setup();
  assert.equal((await service.setMessageReaction(actor, "conversation", "message", "👍", true)).status, 200);
  assert.match(calls.at(-1).query, /ON CONFLICT.*DO NOTHING/);
  assert.deepEqual(Array.from(calls.at(-1).params), ["message", "portal:client", "👍", "Client"]);
  await service.setMessageReaction(actor, "conversation", "message", "👍", false);
  assert.match(calls.at(-1).query, /DELETE.*actor_id = \$2/);
});
test("invalid reactions and cross-conversation replies are rejected", async () => {
  const { service, calls } = setup();
  assert.equal((await service.setMessageReaction(actor, "conversation", "message", "arbitrary", true)).status, 400);
  const result = await service.sendConversationMessage(actor, "conversation", "Reply", undefined, [], "foreign-message");
  assert.equal(result.status, 400);
  assert.match(calls.at(-1).query, /id = \$1 AND conversation_id = \$2/);
  assert.ok(!calls.some(({ query }) => /INSERT/.test(query)));
});
