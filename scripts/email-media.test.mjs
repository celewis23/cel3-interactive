import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInThisContext } from "node:vm";
import ts from "typescript";
import { simpleParser } from "mailparser";

const require = createRequire(import.meta.url);
function load(path, dependencies = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const module = { exports: {} };
  runInThisContext(`(function(require,module,exports){${outputText}\n})`, { filename: path })(name => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    if (name === "next/server") return require(name);
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  return module.exports;
}
const mime = load("lib/gmail/mime.ts");
const preview = load("lib/gmail/attachment-preview.ts");
const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9WQAAAAASUVORK5CYII=", "base64");
const imageHtml = `<img src="data:image/png;base64,${image.toString("base64")}" alt="test">`;

test("MIME parser recovers separate inline images and file attachments, including Unicode names", async () => {
  const raw = mime.buildRawMessage({ to: "reader@example.com", subject: "Photos — café", htmlBody: `<p>Hello</p>${imageHtml}${imageHtml}`,
    attachments: [{ filename: "café photo.png", mimeType: "image/png", data: image }] });
  assert.match(raw, /^[a-zA-Z0-9_-]+$/);
  const parsed = await simpleParser(Buffer.from(raw, "base64url"), { skipImageLinks: true });
  assert.equal(parsed.subject, "Photos — café");
  assert.equal(parsed.attachments.length, 2);
  const inline = parsed.attachments.find(a => a.contentDisposition === "inline");
  const attached = parsed.attachments.find(a => a.contentDisposition === "attachment");
  assert.ok(inline.contentId);
  assert.deepEqual(inline.content, image);
  assert.deepEqual(attached.content, image);
  assert.equal(attached.filename, "café photo.png");
  assert.equal((parsed.html.match(/cid:/g) ?? []).length, 2);
  assert.doesNotMatch(parsed.html, /data:image/);
  assert.match(parsed.text, /Hello/);
});

test("image-only replies retain threading and recipients", async () => {
  const parsed = await simpleParser(mime.buildMimeMessage({ to: "a@example.com", cc: "b@example.com", bcc: "c@example.com", subject: "Re: Image", htmlBody: imageHtml,
    inReplyTo: "<parent@example.com>", references: "<first@example.com> <parent@example.com>" }), { skipImageLinks: true });
  assert.equal(parsed.inReplyTo, "<parent@example.com>");
  assert.deepEqual(parsed.references, ["<first@example.com>", "<parent@example.com>"]);
  assert.equal(parsed.cc.value[0].address, "b@example.com");
  assert.equal(parsed.bcc.value[0].address, "c@example.com");
  assert.equal(mime.hasMessageContent(imageHtml), true);
  assert.equal(mime.hasMessageContent("<p>&nbsp;<br></p>"), false);
});

test("reject header injection, unsupported inline files and excessive total size", () => {
  assert.throws(() => mime.buildRawMessage({ to: "a@example.com\r\nBcc: injected@example.com", subject: "Test" }), /header/);
  assert.throws(() => mime.buildRawMessage({ to: "a@example.com", subject: "Test", htmlBody: '<img src="data:image/svg+xml;base64,PHN2Zz4=">' }), /PNG/);
  assert.throws(() => mime.buildRawMessage({ to: "a@example.com", subject: "Test", htmlBody: imageHtml,
    attachments: [{ filename: "big.bin", mimeType: "application/octet-stream", data: new Uint8Array(mime.MAX_ATTACHMENT_BYTES) }] }), /25 MB/);
});

test("HTML/SVG attachments are download-only and filenames cannot inject response headers", () => {
  for (const type of ["text/html", "image/svg+xml", "application/javascript"]) {
    const headers = preview.attachmentHeaders('photo"\r\nInjected: true.html', type, true, 4);
    assert.equal(headers["Content-Type"], "application/octet-stream");
    assert.match(headers["Content-Disposition"], /^attachment;/);
    assert.doesNotMatch(headers["Content-Disposition"], /\r|\n/);
    assert.equal(headers["X-Content-Type-Options"], "nosniff");
    assert.match(headers["Content-Security-Policy"], /sandbox/);
  }
  assert.match(preview.attachmentHeaders("photo.png", "image/png", true, 4)["Content-Disposition"], /^inline;/);
});

test("attachment response uses verified metadata and only the exact Buffer slice", async () => {
  const backing = Buffer.alloc(8192, 88); image.copy(backing, 73);
  const route = load("app/api/admin/email/attachment/[messageId]/[attachmentId]/route.ts", {
    "@/lib/admin/permissions": { requirePermission: async () => null },
    "@/lib/gmail/attachment-preview": preview,
    "@/lib/gmail/api": { getVerifiedAttachment: async () => ({ data: backing.subarray(73, 73 + image.length), attachment: { filename: "real.png", mimeType: "image/png" } }) },
  });
  const response = await route.GET({ nextUrl: new URL("https://example.com/?inline=1&mime=text/html&filename=evil.html") }, { params: Promise.resolve({ messageId: "m", attachmentId: "a" }) });
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), image);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.match(response.headers.get("content-disposition"), /real.png/);
});

test("preview requires email view permission before retrieving any bytes", async () => {
  let reads = 0;
  const route = load("app/api/admin/email/attachment/[messageId]/[attachmentId]/route.ts", {
    "@/lib/admin/permissions": { requirePermission: async () => new Response(null, { status: 403 }) },
    "@/lib/gmail/attachment-preview": preview,
    "@/lib/gmail/api": { getVerifiedAttachment: async () => { reads++; } },
  });
  const response = await route.GET({}, { params: Promise.resolve({ messageId: "m", attachmentId: "a" }) });
  assert.equal(response.status, 403); assert.equal(reads, 0);
});

test("Drive saves require both permissions and upload the verified private attachment", async () => {
  for (const blocked of ["email", "drive", null]) {
    let uploads = 0, reads = 0;
    const route = load("app/api/admin/email/attachment/[messageId]/[attachmentId]/drive/route.ts", {
      "@/lib/audit/withActivity": { withActivity: (_path, _method, handler) => handler },
      "@/lib/admin/permissions": { requirePermission: async (_req, resource) => resource === blocked ? new Response(null, { status: 403 }) : null },
      "@/lib/gmail/api": { getVerifiedAttachment: async () => { reads++; return { attachment: { filename: "real.png", mimeType: "image/png" }, data: image }; } },
      "@/lib/google/drive": { uploadFile: async opts => { uploads++; assert.deepEqual(opts, { name: "real.png", mimeType: "image/png", data: image }); return { id: "drive-file", name: "real.png" }; } },
    });
    const response = await route.POST({}, { params: Promise.resolve({ messageId: "m", attachmentId: "a" }) });
    assert.equal(response.status, blocked ? 403 : 201);
    assert.equal(uploads, blocked ? 0 : 1); assert.equal(reads, blocked ? 0 : 1);
  }
});

test("reply endpoint accepts an image-only body plus attachments and preserves thread headers", async () => {
  const composeRequest = load("lib/gmail/compose-request.ts");
  let sent;
  const route = load("app/api/admin/email/reply/route.ts", {
    "@/lib/audit/withActivity": { withActivity: (_path, _method, handler) => handler },
    "@/lib/admin/permissions": { requirePermission: async () => null },
    "@/lib/gmail/compose-request": composeRequest,
    "@/lib/gmail/mime": mime,
    "@/lib/gmail/api": { replyToThread: async opts => { sent = opts; return { messageId: "sent", threadId: opts.threadId }; } },
  });
  const form = new FormData();
  form.set("payload", JSON.stringify({ threadId: "thread", to: "a@example.com", subject: "Images", htmlBody: imageHtml, inReplyTo: "<original>" }));
  form.append("attachments", new File([image], "photo.png", { type: "image/png" }));
  const response = await route.POST(new Request("https://example.com/reply", { method: "POST", body: form }));
  assert.equal(response.status, 201); assert.equal(sent.threadId, "thread"); assert.equal(sent.inReplyTo, "<original>");
  assert.deepEqual(Buffer.from(sent.attachments[0].data), image);
});
