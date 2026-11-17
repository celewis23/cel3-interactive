import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const source = ts.transpileModule(readFileSync("lib/gmail/reply-recipients.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const loaded = { exports: {} };
new Function("exports", source)(loaded.exports);
const { replyRecipients, mailboxAddresses } = loaded.exports;
const headers = {
  from: '"Julian, Owner" <julian@example.com>',
  to: 'Me <me@example.com>, Partner <partner@example.com>',
  cc: 'PARTNER@example.com, Team <team@example.com>, ME@example.com',
};

test("reply all keeps sender and To recipients, deduplicates Cc, and excludes self", () => {
  assert.deepEqual(replyRecipients(headers, "me@example.com", true), {
    to: ["julian@example.com", "partner@example.com"], cc: ["team@example.com"],
  });
});
test("regular reply only targets the sender and honors Reply-To", () => {
  assert.deepEqual(replyRecipients(headers, "me@example.com"), { to: ["julian@example.com"], cc: [] });
  assert.deepEqual(replyRecipients({ ...headers, replyTo: "Help <help@example.com>" }, "me@example.com", true), {
    to: ["help@example.com", "partner@example.com"], cc: ["team@example.com"],
  });
});
test("sent messages reply to original recipients instead of self", () => {
  assert.deepEqual(replyRecipients({ ...headers, from: "ME@example.com" }, "me@example.com", true), {
    to: ["partner@example.com"], cc: ["team@example.com"],
  });
});
test("mailbox parser handles quoted commas, multiple addresses, and empty input", () => {
  assert.deepEqual(mailboxAddresses('"Owner, Julian" <julian@example.com>, other@example.com'), ["julian@example.com", "other@example.com"]);
  assert.deepEqual(mailboxAddresses(""), []);
});
